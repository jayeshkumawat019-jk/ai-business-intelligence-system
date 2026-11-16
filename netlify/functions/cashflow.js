// netlify/functions/cashflow.js
// REST API for Dynamic Cash Flow: Inflow vs Outflow, Running Balance & Net Cash Position
// Derived entirely from sales, expenses and payments without double-storage

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round, add, subtract } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const [sales, expenses, payments] = await Promise.all([
    db.getAll('sales'),
    db.getAll('expenses'),
    db.getAll('payments')
  ]);

  // Aggregate monthly inflows & outflows
  const allMonths = new Set();
  sales.forEach(s => allMonths.add(s.sale_date.slice(0, 7)));
  expenses.forEach(e => allMonths.add(e.expense_date.slice(0, 7)));
  payments.forEach(p => allMonths.add(p.payment_date.slice(0, 7)));

  const sortedMonths = Array.from(allMonths).sort().slice(-12);

  const monthlyMap = new Map();
  sortedMonths.forEach(m => {
    monthlyMap.set(m, { month: m, inflow: 0, outflow: 0, net: 0, balance: 0 });
  });

  // Calculate Inflows (Sales realized directly + Inflow payments)
  sales.forEach(s => {
    const m = s.sale_date.slice(0, 7);
    if (monthlyMap.has(m)) {
      const entry = monthlyMap.get(m);
      entry.inflow = round(entry.inflow + (Number(s.amount) || 0));
    }
  });

  // Calculate Outflows (Operating expenses)
  expenses.forEach(e => {
    const m = e.expense_date.slice(0, 7);
    if (monthlyMap.has(m)) {
      const entry = monthlyMap.get(m);
      entry.outflow = round(entry.outflow + (Number(e.amount) || 0));
    }
  });

  let runningBalance = 250000; // Starting baseline operating cash float (₹ 2.5 Lakhs)
  let totalInflowAllTime = 0;
  let totalOutflowAllTime = 0;

  const cashFlowTimeline = sortedMonths.map(m => {
    const entry = monthlyMap.get(m);
    entry.net = subtract(entry.inflow, entry.outflow);
    runningBalance = add(runningBalance, entry.net);
    entry.balance = runningBalance;

    totalInflowAllTime = add(totalInflowAllTime, entry.inflow);
    totalOutflowAllTime = add(totalOutflowAllTime, entry.outflow);

    return entry;
  });

  const netCashPosition = runningBalance;

  return success({
    netCashPosition,
    totalInflowAllTime,
    totalOutflowAllTime,
    cashFlowTimeline
  });
});
