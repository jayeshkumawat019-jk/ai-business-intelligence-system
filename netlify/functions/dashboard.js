// netlify/functions/dashboard.js
// REST API for Executive Business Dashboard with real-time database KPIs & charts

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round, subtract } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  // Fetch tables concurrently
  const [sales, expenses, products, invoices, payments, movements] = await Promise.all([
    db.getAll('sales', { orderBy: { column: 'sale_date', ascending: false } }),
    db.getAll('expenses', { orderBy: { column: 'expense_date', ascending: false } }),
    db.getAll('products'),
    db.getAll('invoices'),
    db.getAll('payments'),
    db.getAll('stock_movements', { orderBy: { column: 'movement_date', ascending: false }, limit: 10 })
  ]);

  // 1. KPI Aggregates
  let totalSales = 0;
  sales.forEach(s => { totalSales = round(totalSales + Number(s.amount || 0)); });

  let totalExpenses = 0;
  const categoryMap = {};
  expenses.forEach(e => {
    const amt = Number(e.amount || 0);
    totalExpenses = round(totalExpenses + amt);
    categoryMap[e.category] = round((categoryMap[e.category] || 0) + amt);
  });

  const netProfit = subtract(totalSales, totalExpenses);

  // Pending Payments Calculation
  let pendingPaymentsSum = 0;
  let pendingPaymentsCount = 0;
  payments.forEach(p => {
    if (p.type === 'inflow' && (p.status === 'Pending' || p.status === 'Overdue')) {
      const balance = subtract(Number(p.total_due || p.amount || 0), Number(p.amount || 0));
      pendingPaymentsSum = round(pendingPaymentsSum + (balance > 0 ? balance : Number(p.total_due || p.amount || 0)));
      pendingPaymentsCount++;
    }
  });

  // Low Stock Count
  let lowStockCount = 0;
  products.forEach(p => {
    if ((Number(p.stock) || 0) <= (Number(p.reorder_level) || 10)) {
      lowStockCount++;
    }
  });

  // 2. Monthly Sales vs Expenses Line Chart (Last 12 Months)
  const allMonthsSet = new Set();
  sales.forEach(s => allMonthsSet.add(s.sale_date.slice(0, 7)));
  expenses.forEach(e => allMonthsSet.add(e.expense_date.slice(0, 7)));
  const sortedMonths = Array.from(allMonthsSet).sort().slice(-12);

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

  // 3. Top 5 Products by Revenue
  const productRevenueMap = new Map();
  const productMap = new Map(products.map(p => [p.id, p]));
  sales.forEach(s => {
    const current = productRevenueMap.get(s.product_id) || 0;
    productRevenueMap.set(s.product_id, round(current + Number(s.amount || 0)));
  });

  const topProducts = Array.from(productRevenueMap.entries())
    .map(([prodId, revenue]) => {
      const p = productMap.get(prodId);
      return {
        id: prodId,
        name: p ? p.name : 'Unknown Product',
        sku: p ? p.sku : '-',
        revenue
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // 4. Recent Activity Feed
  const activity = [];
  sales.slice(0, 5).forEach(s => {
    const p = productMap.get(s.product_id);
    activity.push({
      type: 'sale',
      title: `Sale: ${p ? p.name : 'Item'} (Qty: ${s.quantity})`,
      amount: s.amount,
      date: s.sale_date,
      badge: 'Sale'
    });
  });

  expenses.slice(0, 5).forEach(e => {
    activity.push({
      type: 'expense',
      title: `Expense: ${e.description}`,
      amount: e.amount,
      date: e.expense_date,
      badge: e.category
    });
  });

  activity.sort((a, b) => b.date.localeCompare(a.date));

  return success({
    kpis: {
      totalSales,
      totalExpenses,
      netProfit,
      pendingPaymentsSum,
      pendingPaymentsCount,
      lowStockCount,
      totalSKUs: products.length
    },
    monthlyComparison: {
      months: sortedMonths,
      sales: sortedMonths.map(m => monthlySalesMap[m]),
      expenses: sortedMonths.map(m => monthlyExpensesMap[m])
    },
    expenseCategories: {
      labels: Object.keys(categoryMap),
      data: Object.values(categoryMap)
    },
    topProducts,
    recentActivity: activity.slice(0, 8)
  });
});
