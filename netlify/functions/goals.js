// netlify/functions/goals.js
// REST API for Strategic Business Goals, Pace Tracking & Target Achievement

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber, validateDate } = require('./_lib/validate');
const { round, subtract } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/goals - Calculate real-time progress against sales & profit targets
  if (method === 'GET') {
    const [goals, sales, expenses] = await Promise.all([
      db.getAll('goals', { orderBy: { column: 'period_end', ascending: true } }),
      db.getAll('sales'),
      db.getAll('expenses')
    ]);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const enrichedGoals = goals.map(g => {
      const target = Number(g.target_amount) || 1;
      const start = g.period_start;
      const end = g.period_end;

      // Filter transactions within the goal's date window
      const periodSales = sales.filter(s => s.sale_date >= start && s.sale_date <= end);
      const periodExpenses = expenses.filter(e => e.expense_date >= start && e.expense_date <= end);

      let achieved = 0;
      if (g.metric === 'sales') {
        achieved = periodSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      } else {
        // profit
        const rev = periodSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const exp = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        achieved = Math.max(0, subtract(rev, exp));
      }
      achieved = round(achieved);

      const percentage = round((achieved / target) * 100);

      // Days Remaining & Expected Pace
      const dStart = new Date(start).getTime();
      const dEnd = new Date(end).getTime();
      const dToday = today.getTime();

      const totalDays = Math.max(1, Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, Math.round((dEnd - dToday) / (1000 * 60 * 60 * 24)));
      const daysElapsed = Math.min(totalDays, Math.max(0, Math.round((dToday - dStart) / (1000 * 60 * 60 * 24))));

      const expectedPaceAmount = round((daysElapsed / totalDays) * target);

      let status = 'On Track';
      if (achieved >= target) {
        status = 'Achieved!';
      } else if (daysRemaining === 0) {
        status = 'Missed';
      } else if (achieved < expectedPaceAmount * 0.85) {
        status = 'Behind Pace';
      }

      return {
        ...g,
        achieved_amount: achieved,
        percentage,
        days_remaining: daysRemaining,
        total_days: totalDays,
        expected_pace_amount: expectedPaceAmount,
        status
      };
    });

    const achievedCount = enrichedGoals.filter(g => g.status === 'Achieved!').length;

    return success({
      goals: enrichedGoals,
      achievedCount
    });
  }

  // 2. POST /api/goals - Set new target
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['title', 'metric', 'target_amount', 'period_start', 'period_end']);

    const title = validateString(body.title, 'title', { minLength: 3, maxLength: 255 });
    const metric = body.metric === 'profit' ? 'profit' : 'sales';
    const targetAmount = validateNumber(body.target_amount, 'target_amount', { min: 1 });
    const periodStart = validateDate(body.period_start, 'period_start');
    const periodEnd = validateDate(body.period_end, 'period_end');
    const notes = body.notes ? validateString(body.notes, 'notes') : '';

    if (periodEnd < periodStart) {
      return error('Target end date cannot precede start date', 400);
    }

    const newGoal = await db.insert('goals', {
      title,
      metric,
      target_amount: round(targetAmount),
      period_start: periodStart,
      period_end: periodEnd,
      status: 'In Progress',
      notes
    });

    return success({ goal: newGoal }, 201);
  }

  // 3. DELETE /api/goals - Remove goal
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Goal ID required', 400);

    await db.delete('goals', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
