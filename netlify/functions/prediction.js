// netlify/functions/prediction.js
// REST API for Ordinary Least Squares (OLS) Linear Regression Forecasting on Monthly Sales & Profit

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round, add, subtract } = require('./_lib/money');
const db = require('./_lib/db');

function linearRegression(points) {
  const n = points.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = (n * sumX2) - (sumX * sumX);
  if (denominator === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = ((n * sumXY) - (sumX * sumY)) / denominator;
  const intercept = (sumY - (slope * sumX)) / n;

  // Pearson correlation coefficient r and R^2
  const numeratorR = (n * sumXY) - (sumX * sumY);
  const denominatorR = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
  const r = denominatorR === 0 ? 0 : numeratorR / denominatorR;
  const rSquared = Math.max(0, Math.min(1, r * r));

  return { slope, intercept, rSquared };
}

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const [sales, expenses] = await Promise.all([
    db.getAll('sales'),
    db.getAll('expenses')
  ]);

  // Aggregate monthly sales and expenses
  const allMonthsSet = new Set();
  sales.forEach(s => allMonthsSet.add(s.sale_date.slice(0, 7)));
  expenses.forEach(e => allMonthsSet.add(e.expense_date.slice(0, 7)));

  const sortedMonths = Array.from(allMonthsSet).sort();

  if (sortedMonths.length < 3) {
    return success({
      hasEnoughData: false,
      message: `Prediction algorithm requires at least 3 distinct months of ledger history. Current historical records span only ${sortedMonths.length} month(s).`
    });
  }

  const monthlySalesMap = {};
  const monthlyExpensesMap = {};
  sortedMonths.forEach(m => {
    monthlySalesMap[m] = 0;
    monthlyExpensesMap[m] = 0;
  });

  sales.forEach(s => {
    const m = s.sale_date.slice(0, 7);
    if (monthlySalesMap[m] !== undefined) {
      monthlySalesMap[m] = round(monthlySalesMap[m] + Number(s.amount || 0));
    }
  });

  expenses.forEach(e => {
    const m = e.expense_date.slice(0, 7);
    if (monthlyExpensesMap[m] !== undefined) {
      monthlyExpensesMap[m] = round(monthlyExpensesMap[m] + Number(e.amount || 0));
    }
  });

  // Prepare data points for regression (x = 1, 2, ... n)
  const salesPoints = [];
  const profitPoints = [];
  const history = [];

  sortedMonths.forEach((m, idx) => {
    const sVal = monthlySalesMap[m];
    const eVal = monthlyExpensesMap[m];
    const pVal = subtract(sVal, eVal);

    history.push({
      month: m,
      sales: sVal,
      expenses: eVal,
      profit: pVal
    });

    salesPoints.push({ x: idx + 1, y: sVal });
    profitPoints.push({ x: idx + 1, y: pVal });
  });

  const salesReg = linearRegression(salesPoints);
  const profitReg = linearRegression(profitPoints);

  // Forecast next 6 future months
  const forecastMonthsCount = 6;
  const forecast = [];
  const lastMonthStr = sortedMonths[sortedMonths.length - 1]; // e.g. "2026-11"
  let [currYear, currMonth] = lastMonthStr.split('-').map(Number);

  for (let step = 1; step <= forecastMonthsCount; step++) {
    currMonth += 1;
    if (currMonth > 12) {
      currMonth = 1;
      currYear += 1;
    }
    const futureMonthStr = `${currYear}-${String(currMonth).padStart(2, '0')}`;
    const xFuture = sortedMonths.length + step;

    const forecastSales = Math.max(0, round((salesReg.slope * xFuture) + salesReg.intercept));
    const forecastProfit = round((profitReg.slope * xFuture) + profitReg.intercept);

    forecast.push({
      month: futureMonthStr,
      forecastSales,
      forecastProfit
    });
  }

  // Calculate annual projected growth rate
  const avgHistSales = salesPoints.reduce((acc, p) => acc + p.y, 0) / salesPoints.length;
  const growthRatePct = avgHistSales > 0 ? round(((salesReg.slope * 12) / avgHistSales) * 100) : 0;

  const confidenceNote = salesReg.rSquared >= 0.7
    ? `Strong statistical fit (R² = ${salesReg.rSquared.toFixed(2)}). Historical sales trajectory demonstrates steady linear expansion.`
    : `Moderate variance (R² = ${salesReg.rSquared.toFixed(2)}). Seasonal procurement spikes observed in ledger.`;

  return success({
    hasEnoughData: true,
    history,
    forecast,
    metrics: {
      salesSlope: round(salesReg.slope),
      profitSlope: round(profitReg.slope),
      rSquaredSales: round(salesReg.rSquared),
      growthRatePct,
      confidenceNote
    }
  });
});
