// netlify/functions/profit-loss.js
// REST API for Comprehensive Profit & Loss Statement, Waterfall Breakdown & Margins

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round, subtract, divide } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const queryParams = event.queryStringParameters || {};
  let startDate = queryParams.startDate;
  let endDate = queryParams.endDate;

  // Default to current financial year / past 12 months if not specified
  if (!startDate || !endDate) {
    startDate = '2025-12-01';
    endDate = '2026-11-30';
  }

  const [allSales, allExpenses] = await Promise.all([
    db.getAll('sales'),
    db.getAll('expenses')
  ]);

  // Filter within date range
  const sales = allSales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate);
  const expenses = allExpenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

  // 1. Gross Revenue
  let grossRevenue = 0;
  sales.forEach(s => { grossRevenue = round(grossRevenue + Number(s.amount || 0)); });

  // 2. COGS (Cost of Goods Sold = Raw Material expenses)
  let cogs = 0;
  // 3. Operating Expenses Breakdown
  const opExBreakdown = {
    Rent: 0,
    Salaries: 0,
    Utilities: 0,
    Transport: 0,
    Marketing: 0,
    Other: 0
  };

  expenses.forEach(e => {
    const amt = Number(e.amount || 0);
    if (e.category === 'Raw Material') {
      cogs = round(cogs + amt);
    } else if (opExBreakdown[e.category] !== undefined) {
      opExBreakdown[e.category] = round(opExBreakdown[e.category] + amt);
    } else {
      opExBreakdown.Other = round(opExBreakdown.Other + amt);
    }
  });

  const totalOperatingExpenses = round(
    opExBreakdown.Rent +
    opExBreakdown.Salaries +
    opExBreakdown.Utilities +
    opExBreakdown.Transport +
    opExBreakdown.Marketing +
    opExBreakdown.Other
  );

  // Calculations
  const grossProfit = round(subtract(grossRevenue, cogs));
  const grossMarginPct = grossRevenue > 0 ? round((grossProfit / grossRevenue) * 100) : 0;

  const netProfit = round(subtract(grossProfit, totalOperatingExpenses));
  const netMarginPct = grossRevenue > 0 ? round((netProfit / grossRevenue) * 100) : 0;

  // Waterfall Chart Steps
  const waterfall = [
    { label: 'Gross Revenue', amount: grossRevenue, type: 'inflow' },
    { label: 'COGS (Materials)', amount: -cogs, type: 'cogs' },
    { label: 'Gross Profit', amount: grossProfit, type: 'subtotal' },
    { label: 'Operating Expenses', amount: -totalOperatingExpenses, type: 'opex' },
    { label: 'Net Profit', amount: netProfit, type: 'net' }
  ];

  return success({
    dateRange: { startDate, endDate },
    summary: {
      grossRevenue,
      cogs,
      grossProfit,
      grossMarginPct,
      operatingExpenses: totalOperatingExpenses,
      opExBreakdown,
      netProfit,
      netMarginPct
    },
    waterfall
  });
});
