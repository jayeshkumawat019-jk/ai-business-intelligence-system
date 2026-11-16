// netlify/functions/reports.js
// REST API for Automated Multi-Category Business Reports (Sales, Expenses, P&L, Tax, Inventory)

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round, formatINR } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const queryParams = event.queryStringParameters || {};
  const type = (queryParams.type || 'sales').toLowerCase();
  let startDate = queryParams.startDate || '2025-12-01';
  let endDate = queryParams.endDate || '2026-11-30';

  try {
    let reportData = null;

    if (type === 'sales') {
      reportData = await generateSalesReport(startDate, endDate);
    } else if (type === 'expenses') {
      reportData = await generateExpensesReport(startDate, endDate);
    } else if (type === 'profit-loss' || type === 'profit') {
      reportData = await generateProfitLossReport(startDate, endDate);
    } else if (type === 'tax') {
      reportData = await generateTaxReport(startDate, endDate);
    } else if (type === 'inventory') {
      reportData = await generateInventoryReport();
    } else {
      return error(`Unsupported report type '${type}'. Available: sales, expenses, profit-loss, tax, inventory`, 400);
    }

    return success(reportData);
  } catch (err) {
    return error('Failed to generate business report: ' + err.message, 500);
  }
});

async function generateSalesReport(startDate, endDate) {
  const [sales, products, customers] = await Promise.all([
    db.getAll('sales'),
    db.getAll('products'),
    db.getAll('customers')
  ]);

  const prodMap = new Map(products.map(p => [p.id, p.name]));
  const custMap = new Map(customers.map(c => [c.id, c.name]));

  const filtered = sales
    .filter(s => s.sale_date >= startDate && s.sale_date <= endDate)
    .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));

  let totalRevenue = 0;
  let totalUnits = 0;
  const paymentBreakdown = {};

  const rows = filtered.map(s => {
    const amt = Number(s.amount || 0);
    const qty = Number(s.quantity || 0);
    totalRevenue = round(totalRevenue + amt);
    totalUnits += qty;
    paymentBreakdown[s.payment_mode] = (paymentBreakdown[s.payment_mode] || 0) + amt;

    return {
      id: s.id,
      date: s.sale_date,
      product: prodMap.get(s.product_id) || 'Unknown Product',
      customer: custMap.get(s.customer_id) || 'Direct Client',
      quantity: qty,
      unitPrice: qty > 0 ? round(amt / qty) : 0,
      paymentMode: s.payment_mode || 'Cash',
      amount: amt
    };
  });

  return {
    metadata: {
      type: 'sales',
      title: 'Commercial Sales & Revenue Statement',
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    },
    summary: {
      totalRevenue,
      totalTransactions: rows.length,
      totalUnits,
      avgOrderValue: rows.length > 0 ? round(totalRevenue / rows.length) : 0,
      paymentBreakdown
    },
    columns: [
      { key: 'date', label: 'Date', align: 'left' },
      { key: 'product', label: 'Product / Item', align: 'left' },
      { key: 'customer', label: 'Customer', align: 'left' },
      { key: 'quantity', label: 'Quantity', align: 'right' },
      { key: 'unitPrice', label: 'Unit Price (₹)', align: 'right', format: 'currency' },
      { key: 'paymentMode', label: 'Mode', align: 'center' },
      { key: 'amount', label: 'Total Amount (₹)', align: 'right', format: 'currency' }
    ],
    rows
  };
}

async function generateExpensesReport(startDate, endDate) {
  const allExpenses = await db.getAll('expenses');
  const filtered = allExpenses
    .filter(e => e.expense_date >= startDate && e.expense_date <= endDate)
    .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));

  let totalExpenses = 0;
  const categoryTotals = {};

  const rows = filtered.map(e => {
    const amt = Number(e.amount || 0);
    totalExpenses = round(totalExpenses + amt);
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amt;

    return {
      id: e.id,
      date: e.expense_date,
      category: e.category,
      description: e.description || '-',
      paymentMode: e.payment_mode || 'Bank Transfer',
      amount: amt
    };
  });

  return {
    metadata: {
      type: 'expenses',
      title: 'Operational Expenditure & Cost Statement',
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    },
    summary: {
      totalExpenses,
      totalEntries: rows.length,
      categoryTotals,
      avgExpensePerEntry: rows.length > 0 ? round(totalExpenses / rows.length) : 0
    },
    columns: [
      { key: 'date', label: 'Date', align: 'left' },
      { key: 'category', label: 'Category', align: 'left' },
      { key: 'description', label: 'Description', align: 'left' },
      { key: 'paymentMode', label: 'Payment Mode', align: 'center' },
      { key: 'amount', label: 'Amount (₹)', align: 'right', format: 'currency' }
    ],
    rows
  };
}

async function generateProfitLossReport(startDate, endDate) {
  const [sales, expenses] = await Promise.all([
    db.getAll('sales'),
    db.getAll('expenses')
  ]);

  const filteredSales = sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate);
  const filteredExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

  let grossRevenue = 0;
  filteredSales.forEach(s => { grossRevenue = round(grossRevenue + Number(s.amount || 0)); });

  let cogs = 0;
  const opExBreakdown = {
    Rent: 0,
    Salaries: 0,
    Utilities: 0,
    Transport: 0,
    Marketing: 0,
    Other: 0
  };

  filteredExpenses.forEach(e => {
    const amt = Number(e.amount || 0);
    if (e.category === 'Raw Material') {
      cogs = round(cogs + amt);
    } else if (opExBreakdown.hasOwnProperty(e.category)) {
      opExBreakdown[e.category] = round(opExBreakdown[e.category] + amt);
    } else {
      opExBreakdown.Other = round(opExBreakdown.Other + amt);
    }
  });

  let totalOperatingExpenses = 0;
  Object.values(opExBreakdown).forEach(val => {
    totalOperatingExpenses = round(totalOperatingExpenses + val);
  });

  const grossProfit = round(grossRevenue - cogs);
  const totalCost = round(cogs + totalOperatingExpenses);
  const netProfit = round(grossRevenue - totalCost);
  const marginPercent = grossRevenue > 0 ? round((netProfit / grossRevenue) * 100) : 0;

  const rows = [
    { lineItem: '1. Gross Revenue from Operations', type: 'Income', amount: grossRevenue, note: `${filteredSales.length} commercial sales transactions` },
    { lineItem: '2. Cost of Goods Sold (Raw Materials)', type: 'Direct Cost', amount: -cogs, note: 'Direct material procurement' },
    { lineItem: '3. Gross Operating Profit', type: 'Subtotal', amount: grossProfit, note: `Gross Margin: ${grossRevenue > 0 ? round((grossProfit/grossRevenue)*100) : 0}%` },
    { lineItem: '   - Rent & Yard Facilities', type: 'OpEx', amount: -opExBreakdown.Rent, note: 'Yard lease & office premises' },
    { lineItem: '   - Staff Payroll & Wages', type: 'OpEx', amount: -opExBreakdown.Salaries, note: 'Wages and employee salaries' },
    { lineItem: '   - Power, Water & Utilities', type: 'OpEx', amount: -opExBreakdown.Utilities, note: 'Operational utilities' },
    { lineItem: '   - Freight, Haulage & Fuel', type: 'OpEx', amount: -opExBreakdown.Transport, note: 'Logistics and delivery fleet' },
    { lineItem: '   - Commercial Promotion & Ads', type: 'OpEx', amount: -opExBreakdown.Marketing, note: 'B2B outreach & listing' },
    { lineItem: '   - Sundry & Maintenance', type: 'OpEx', amount: -opExBreakdown.Other, note: 'Repair, consumables & general' },
    { lineItem: '4. Total Operating Expenses', type: 'Subtotal', amount: -totalOperatingExpenses, note: 'Overheads & operations' },
    { lineItem: '5. Net Profit Before Taxes', type: 'Net Profit', amount: netProfit, note: `Net Margin: ${marginPercent}%` }
  ];

  return {
    metadata: {
      type: 'profit-loss',
      title: 'Consolidated Profit & Loss Statement',
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    },
    summary: {
      grossRevenue,
      cogs,
      grossProfit,
      totalOperatingExpenses,
      netProfit,
      marginPercent
    },
    columns: [
      { key: 'lineItem', label: 'Financial Line Item', align: 'left' },
      { key: 'type', label: 'Classification', align: 'center' },
      { key: 'amount', label: 'Amount (₹)', align: 'right', format: 'currency' },
      { key: 'note', label: 'Analysis & Notes', align: 'left' }
    ],
    rows
  };
}

async function generateTaxReport(startDate, endDate) {
  const taxRecords = await db.getAll('tax_records');
  const filtered = taxRecords
    .filter(t => (t.period >= startDate.substring(0, 7) && t.period <= endDate.substring(0, 7)) || (t.created_at >= startDate && t.created_at <= endDate))
    .sort((a, b) => (b.period || '').localeCompare(a.period || ''));

  let totalOutput = 0;
  let totalInput = 0;
  let totalNet = 0;

  const rows = filtered.map(t => {
    const out = Number(t.output_tax || 0);
    const inp = Number(t.input_tax || 0);
    const net = Number(t.net_payable || 0);

    totalOutput = round(totalOutput + out);
    totalInput = round(totalInput + inp);
    totalNet = round(totalNet + net);

    return {
      period: t.period,
      outputTax: out,
      inputTax: inp,
      netPayable: net,
      status: t.status || 'Filed',
      filedAt: t.created_at ? t.created_at.substring(0, 10) : '-'
    };
  });

  return {
    metadata: {
      type: 'tax',
      title: 'GST Compliance & Liability Statement',
      startDate,
      endDate,
      generatedAt: new Date().toISOString()
    },
    summary: {
      totalOutputTax: totalOutput,
      totalInputTax: totalInput,
      netTaxPayable: totalNet,
      periodsCount: rows.length
    },
    columns: [
      { key: 'period', label: 'GST Tax Period', align: 'center' },
      { key: 'outputTax', label: 'Output GST (₹)', align: 'right', format: 'currency' },
      { key: 'inputTax', label: 'Input Tax Credit (₹)', align: 'right', format: 'currency' },
      { key: 'netPayable', label: 'Net Payable / (Credit) (₹)', align: 'right', format: 'currency' },
      { key: 'status', label: 'Status', align: 'center' },
      { key: 'filedAt', label: 'Filing Date', align: 'left' }
    ],
    rows
  };
}

async function generateInventoryReport() {
  const products = await db.getAll('products');
  let totalValuation = 0;
  let lowStockCount = 0;
  let totalUnits = 0;

  const rows = products.map(p => {
    const stock = Number(p.stock || 0);
    const cost = Number(p.cost_price || 0);
    const sell = Number(p.selling_price || 0);
    const reorder = Number(p.reorder_level || 10);
    const valuation = round(stock * cost);

    totalValuation = round(totalValuation + valuation);
    totalUnits += stock;
    if (stock <= reorder) lowStockCount++;

    return {
      sku: p.sku || '-',
      name: p.name,
      category: p.category || 'Standard',
      stock,
      reorderLevel: reorder,
      costPrice: cost,
      sellingPrice: sell,
      valuation,
      status: stock <= reorder ? 'CRITICAL / LOW' : 'ADEQUATE'
    };
  });

  return {
    metadata: {
      type: 'inventory',
      title: 'Stock Valuation & Inventory Audit Report',
      generatedAt: new Date().toISOString()
    },
    summary: {
      totalValuation,
      totalSkus: products.length,
      totalUnits,
      lowStockCount
    },
    columns: [
      { key: 'sku', label: 'SKU Code', align: 'left' },
      { key: 'name', label: 'Item Name', align: 'left' },
      { key: 'category', label: 'Category', align: 'left' },
      { key: 'stock', label: 'Current Stock', align: 'right' },
      { key: 'reorderLevel', label: 'Reorder Point', align: 'right' },
      { key: 'costPrice', label: 'Cost (₹)', align: 'right', format: 'currency' },
      { key: 'valuation', label: 'Valuation (₹)', align: 'right', format: 'currency' },
      { key: 'status', label: 'Audit Status', align: 'center' }
    ],
    rows
  };
}
