// netlify/functions/comparison.js
// REST API for Side-by-Side Period Comparison (Months or Years) with Variance & Directional Indicators

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round, subtract, divide } = require('./_lib/money');
const db = require('./_lib/db');

function calculatePeriodMetrics(sales, expenses, periodKey) {
  const pSales = sales.filter(s => (s.sale_date || '').startsWith(periodKey));
  const pExpenses = expenses.filter(e => (e.expense_date || '').startsWith(periodKey));

  let totalSales = 0;
  pSales.forEach(s => { totalSales = round(totalSales + Number(s.amount || 0)); });

  let totalExpenses = 0;
  pExpenses.forEach(e => { totalExpenses = round(totalExpenses + Number(e.amount || 0)); });

  const netProfit = subtract(totalSales, totalExpenses);
  const ordersCount = pSales.length;
  const aov = ordersCount > 0 ? round(totalSales / ordersCount) : 0;
  const marginPct = totalSales > 0 ? round((netProfit / totalSales) * 100) : 0;

  return {
    periodKey,
    totalSales,
    totalExpenses,
    netProfit,
    ordersCount,
    aov,
    marginPct
  };
}

function computeChange(val1, val2) {
  const diff = subtract(val2, val1);
  const pct = val1 !== 0 ? round(((val2 - val1) / Math.abs(val1)) * 100) : (val2 > 0 ? 100 : 0);
  return {
    diff,
    pct,
    isPositive: pct >= 0,
    direction: pct >= 0 ? 'up' : 'down'
  };
}

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const queryParams = event.queryStringParameters || {};
  const period1 = queryParams.period1 || '2026-10'; // e.g. October 2026
  const period2 = queryParams.period2 || '2026-11'; // e.g. November 2026

  const [sales, expenses] = await Promise.all([
    db.getAll('sales'),
    db.getAll('expenses')
  ]);

  const p1Metrics = calculatePeriodMetrics(sales, expenses, period1);
  const p2Metrics = calculatePeriodMetrics(sales, expenses, period2);

  const changes = {
    sales: computeChange(p1Metrics.totalSales, p2Metrics.totalSales),
    expenses: computeChange(p1Metrics.totalExpenses, p2Metrics.totalExpenses),
    profit: computeChange(p1Metrics.netProfit, p2Metrics.netProfit),
    orders: computeChange(p1Metrics.ordersCount, p2Metrics.ordersCount),
    aov: computeChange(p1Metrics.aov, p2Metrics.aov),
    margin: computeChange(p1Metrics.marginPct, p2Metrics.marginPct)
  };

  // Grouped Bar Chart structure
  const chart = {
    labels: ['Sales Revenue', 'Total Expenses', 'Net Profit'],
    datasets: [
      {
        label: period1,
        data: [p1Metrics.totalSales, p1Metrics.totalExpenses, p1Metrics.netProfit],
        backgroundColor: '#78716C'
      },
      {
        label: period2,
        data: [p2Metrics.totalSales, p2Metrics.totalExpenses, p2Metrics.netProfit],
        backgroundColor: '#2563EB'
      }
    ]
  };

  // List of distinct months and years available in database for selector dropdowns
  const availablePeriods = new Set();
  sales.forEach(s => {
    availablePeriods.add(s.sale_date.slice(0, 7)); // Month
    availablePeriods.add(s.sale_date.slice(0, 4)); // Year
  });

  return success({
    period1: p1Metrics,
    period2: p2Metrics,
    changes,
    chart,
    availablePeriods: Array.from(availablePeriods).sort().reverse()
  });
});
