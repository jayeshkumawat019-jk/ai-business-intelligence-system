// netlify/functions/tax.js
// REST API for GST Computation: Output Tax - Input Tax Credit = Net Payable

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber } = require('./_lib/validate');
const { round, subtract } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/tax - Calculate tax for month & retrieve historical records
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};
    const selectedMonth = queryParams.month || '2026-11'; // YYYY-MM

    const [sales, expenses, invoices, invoiceItems, taxRecords] = await Promise.all([
      db.getAll('sales'),
      db.getAll('expenses'),
      db.getAll('invoices'),
      db.getAll('invoice_items'),
      db.getAll('tax_records', { orderBy: { column: 'month', ascending: true } })
    ]);

    // 1. Calculate Output GST from Invoices in this month
    let outputGst = 0;
    const slabOutputBreakdown = { '0': 0, '5': 0, '12': 0, '18': 0, '28': 0 };

    const monthInvoices = invoices.filter(i => (i.invoice_date || '').startsWith(selectedMonth));
    const invoiceIdSet = new Set(monthInvoices.map(i => i.id));

    invoiceItems.forEach(item => {
      if (invoiceIdSet.has(item.invoice_id)) {
        const tax = Number(item.tax_amount) || 0;
        const rate = String(Math.round(Number(item.gst_rate) || 18));
        outputGst = round(outputGst + tax);
        if (slabOutputBreakdown[rate] !== undefined) {
          slabOutputBreakdown[rate] = round(slabOutputBreakdown[rate] + tax);
        }
      }
    });

    // If no invoices yet for month, compute 18% standard GST estimation on direct sales
    if (outputGst === 0) {
      const monthSales = sales.filter(s => (s.sale_date || '').startsWith(selectedMonth));
      monthSales.forEach(s => {
        const taxable = Number(s.amount) || 0;
        const tax = round((taxable * 18) / 118); // embedded 18% GST
        outputGst = round(outputGst + tax);
        slabOutputBreakdown['18'] = round(slabOutputBreakdown['18'] + tax);
      });
    }

    // 2. Calculate Input GST (Input Tax Credit) from Raw Material & Capital Purchases in this month
    let inputGst = 0;
    const monthExpenses = expenses.filter(e => (e.expense_date || '').startsWith(selectedMonth));
    monthExpenses.forEach(e => {
      if (e.category === 'Raw Material' || e.category === 'Utilities') {
        const amt = Number(e.amount) || 0;
        const itc = round((amt * 18) / 118); // 18% ITC reclaimable
        inputGst = round(inputGst + itc);
      }
    });

    const netPayable = Math.max(0, subtract(outputGst, inputGst));

    return success({
      selectedMonth,
      currentMonthCalculation: {
        outputGst: round(outputGst),
        inputGst: round(inputGst),
        netPayable: round(netPayable),
        slabOutputBreakdown
      },
      history: taxRecords
    });
  }

  // 2. POST /api/tax - Save or file GST return record
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['month', 'output_gst', 'input_gst', 'net_payable']);

    const month = validateString(body.month, 'month', { minLength: 7, maxLength: 7 });
    const outputGst = validateNumber(body.output_gst, 'output_gst', { min: 0 });
    const inputGst = validateNumber(body.input_gst, 'input_gst', { min: 0 });
    const netPayable = validateNumber(body.net_payable, 'net_payable', { min: 0 });
    const status = body.status || 'Filed';

    const existing = await db.getAll('tax_records', { filter: { month } });
    let saved;
    if (existing && existing.length > 0) {
      saved = await db.update('tax_records', existing[0].id, {
        output_gst: round(outputGst),
        input_gst: round(inputGst),
        net_payable: round(netPayable),
        status,
        filing_date: new Date().toISOString().slice(0, 10)
      });
    } else {
      saved = await db.insert('tax_records', {
        month,
        output_gst: round(outputGst),
        input_gst: round(inputGst),
        net_payable: round(netPayable),
        status,
        filing_date: new Date().toISOString().slice(0, 10)
      });
    }

    return success({ record: saved });
  }

  return error(`Method ${method} not allowed`, 405);
});
