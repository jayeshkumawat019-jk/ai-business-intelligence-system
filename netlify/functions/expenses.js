// netlify/functions/expenses.js
// REST API for Expense Management with category breakdowns & monthly trends

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateNumber, validateDate, validateString, validateEnum, VALID_EXPENSE_CATEGORIES } = require('./_lib/validate');
const { round } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/expenses - List expenses, category breakdowns & trend
  if (method === 'GET') {
    const expenses = await db.getAll('expenses', { orderBy: { column: 'expense_date', ascending: false } });

    // Category Aggregates for Pie/Doughnut Chart
    const categoryTotals = {};
    VALID_EXPENSE_CATEGORIES.forEach(cat => { categoryTotals[cat] = 0; });

    // Monthly Trend Line
    const monthlyMap = new Map();

    let grandTotal = 0;
    expenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      grandTotal = round(grandTotal + amt);

      if (categoryTotals[exp.category] !== undefined) {
        categoryTotals[exp.category] = round(categoryTotals[exp.category] + amt);
      }

      const monthKey = exp.expense_date.slice(0, 7); // YYYY-MM
      const currentMonthVal = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, round(currentMonthVal + amt));
    });

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return success({
      expenses,
      grandTotal,
      categoryBreakdown: categoryTotals,
      monthlyTrend
    });
  }

  // 2. POST /api/expenses - Create new expense
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['expense_date', 'category', 'description', 'amount', 'payment_mode']);

    const expenseDate = validateDate(body.expense_date, 'expense_date');
    const category = validateEnum(body.category, VALID_EXPENSE_CATEGORIES, 'category');
    const description = validateString(body.description, 'description', { minLength: 3, maxLength: 255 });
    const amount = validateNumber(body.amount, 'amount', { min: 0.01 });
    const paymentMode = validateString(body.payment_mode, 'payment_mode', { minLength: 2, maxLength: 50 });
    const vendor = body.vendor ? validateString(body.vendor, 'vendor', { maxLength: 255 }) : 'General Vendor';

    const newExpense = await db.insert('expenses', {
      expense_date: expenseDate,
      category,
      description,
      amount: round(amount),
      payment_mode: paymentMode,
      vendor
    });

    return success({ expense: newExpense }, 201);
  }

  // 3. PUT /api/expenses - Update expense
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Expense ID is required in query string', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.expense_date) updates.expense_date = validateDate(body.expense_date, 'expense_date');
    if (body.category) updates.category = validateEnum(body.category, VALID_EXPENSE_CATEGORIES, 'category');
    if (body.description) updates.description = validateString(body.description, 'description');
    if (body.amount !== undefined) updates.amount = validateNumber(body.amount, 'amount', { min: 0.01 });
    if (body.payment_mode) updates.payment_mode = validateString(body.payment_mode, 'payment_mode');
    if (body.vendor !== undefined) updates.vendor = validateString(body.vendor, 'vendor');

    const updated = await db.update('expenses', id, updates);
    if (!updated) return error('Expense not found', 404);

    return success({ expense: updated });
  }

  // 4. DELETE /api/expenses - Delete expense
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Expense ID is required in query string', 400);

    await db.delete('expenses', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
