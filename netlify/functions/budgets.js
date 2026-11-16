// netlify/functions/budgets.js
// REST API for Monthly Budget Management with Real-time Expense Tracking & Threshold Alerts

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber, validateEnum, VALID_EXPENSE_CATEGORIES } = require('./_lib/validate');
const { round, subtract } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/budgets - Get monthly budget vs actual spent
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};
    const month = queryParams.month || new Date().toISOString().slice(0, 7); // YYYY-MM

    const allBudgets = await db.getAll('budgets', { filter: { month } });
    const allExpenses = await db.getAll('expenses');

    // Filter actual expenses for this month
    const monthlyExpenses = allExpenses.filter(e => (e.expense_date || '').startsWith(month));

    const spentByCategory = {};
    VALID_EXPENSE_CATEGORIES.forEach(cat => { spentByCategory[cat] = 0; });
    monthlyExpenses.forEach(e => {
      const cat = e.category;
      if (spentByCategory[cat] !== undefined) {
        spentByCategory[cat] = round(spentByCategory[cat] + (Number(e.amount) || 0));
      }
    });

    const budgetMap = new Map(allBudgets.map(b => [b.category, b]));

    const comparison = VALID_EXPENSE_CATEGORIES.map(cat => {
      const budgetEntry = budgetMap.get(cat);
      const budgetAmount = budgetEntry ? Number(budgetEntry.budget_amount) : 0;
      const spent = spentByCategory[cat] || 0;
      const pct = budgetAmount > 0 ? round((spent / budgetAmount) * 100) : (spent > 0 ? 100 : 0);

      let status = 'Normal';
      if (pct >= 100) {
        status = 'Alert';
      } else if (pct >= 80) {
        status = 'Warning';
      }

      return {
        id: budgetEntry ? budgetEntry.id : null,
        month,
        category: cat,
        budget_amount: round(budgetAmount),
        actual_spent: round(spent),
        remaining: round(subtract(budgetAmount, spent)),
        percentage: pct,
        status
      };
    });

    const totalBudget = round(comparison.reduce((sum, c) => sum + c.budget_amount, 0));
    const totalSpent = round(comparison.reduce((sum, c) => sum + c.actual_spent, 0));

    return success({
      month,
      comparison,
      totalBudget,
      totalSpent,
      availableMonths: ['2026-11', '2026-10', '2026-09', '2026-08']
    });
  }

  // 2. POST /api/budgets - Set or update budget for a category
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['month', 'category', 'budget_amount']);

    const month = validateString(body.month, 'month', { minLength: 7, maxLength: 7 });
    const category = validateEnum(body.category, VALID_EXPENSE_CATEGORIES, 'category');
    const budgetAmount = validateNumber(body.budget_amount, 'budget_amount', { min: 0 });

    const existing = await db.getAll('budgets', { filter: { month, category } });
    let result;
    if (existing && existing.length > 0) {
      result = await db.update('budgets', existing[0].id, { budget_amount: round(budgetAmount) });
    } else {
      result = await db.insert('budgets', {
        month,
        category,
        budget_amount: round(budgetAmount)
      });
    }

    return success({ budget: result });
  }

  // 3. DELETE /api/budgets - Reset category budget
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Budget ID required', 400);

    await db.delete('budgets', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
