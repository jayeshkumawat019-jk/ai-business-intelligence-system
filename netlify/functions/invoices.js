// netlify/functions/invoices.js
// REST API for Invoice Generation with Sequential Numbering, GST & Indian Currency Calculations

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber, validateDate, validateGSTRate, validateEnum, VALID_INVOICE_STATUSES } = require('./_lib/validate');
const { round, add, subtract, multiply, numberToWordsINR } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/invoices - List invoices with line items & customer details
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;

    const invoices = await db.getAll('invoices', { orderBy: { column: 'invoice_date', ascending: false } });
    const customers = await db.getAll('customers');
    const invoiceItems = await db.getAll('invoice_items');

    const customerMap = new Map(customers.map(c => [c.id, c]));
    const itemsByInvoice = new Map();
    invoiceItems.forEach(item => {
      const list = itemsByInvoice.get(item.invoice_id) || [];
      list.push(item);
      itemsByInvoice.set(item.invoice_id, list);
    });

    const enrichedInvoices = invoices.map(inv => {
      const cust = customerMap.get(inv.customer_id);
      const items = itemsByInvoice.get(inv.id) || [];
      return {
        ...inv,
        customer: cust || { name: 'Direct Customer', state: 'Maharashtra', city: 'Mumbai', gst_number: '' },
        items,
        amount_in_words: numberToWordsINR(inv.grand_total)
      };
    });

    if (id) {
      const single = enrichedInvoices.find(inv => inv.id === id);
      if (!single) return error('Invoice not found', 404);
      return success({ invoice: single });
    }

    return success({ invoices: enrichedInvoices });
  }

  // 2. POST /api/invoices - Generate new invoice with auto-sequence
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['customer_id', 'due_date', 'items']);

    const customerId = validateString(body.customer_id, 'customer_id');
    const invoiceDate = body.invoice_date ? validateDate(body.invoice_date, 'invoice_date') : new Date().toISOString().slice(0, 10);
    const dueDate = validateDate(body.due_date, 'due_date');
    const paymentMode = body.payment_mode ? validateString(body.payment_mode, 'payment_mode') : 'Bank Transfer';
    const notes = body.notes ? validateString(body.notes, 'notes', { maxLength: 500 }) : '';
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return error('Invoice must have at least one line item', 400);
    }

    const customer = await db.getById('customers', customerId);
    if (!customer) return error('Selected customer does not exist', 404);

    // Auto-generate invoice number (INV-YYYY-XXXX)
    const existingInvoices = await db.getAll('invoices');
    const currentYear = new Date().getFullYear();
    const countThisYear = existingInvoices.filter(i => (i.invoice_number || '').includes(String(currentYear))).length + 1;
    const invoiceNumber = `INV-${currentYear}-${String(countThisYear).padStart(4, '0')}`;

    // Calculate line items and totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    const computedItems = [];

    const isInterState = customer.state && customer.state.toLowerCase() !== 'maharashtra';

    for (const item of items) {
      validateRequired(item, ['description', 'quantity', 'unit_price']);
      const desc = validateString(item.description, 'item description');
      const qty = validateNumber(item.quantity, 'item quantity', { min: 1, integer: true });
      const rate = validateNumber(item.unit_price, 'item unit price', { min: 0 });
      const disc = item.discount ? validateNumber(item.discount, 'discount', { min: 0 }) : 0;
      const gstRate = item.gst_rate !== undefined ? validateGSTRate(item.gst_rate) : 18;

      const lineGross = multiply(qty, rate);
      const lineTaxable = Math.max(0, subtract(lineGross, disc));
      const lineTax = round((lineTaxable * gstRate) / 100);
      const lineTotal = add(lineTaxable, lineTax);

      subtotal = add(subtotal, lineGross);
      totalDiscount = add(totalDiscount, disc);
      totalTax = add(totalTax, lineTax);

      computedItems.push({
        product_id: item.product_id || null,
        description: desc,
        quantity: qty,
        unit_price: round(rate),
        discount: round(disc),
        gst_rate: gstRate,
        tax_amount: lineTax,
        total: lineTotal
      });
    }

    const grandTotal = round(subtotal - totalDiscount + totalTax);

    // Insert invoice header
    const newInvoice = await db.insert('invoices', {
      invoice_number: invoiceNumber,
      customer_id: customerId,
      invoice_date: invoiceDate,
      due_date: dueDate,
      subtotal: round(subtotal),
      discount: round(totalDiscount),
      tax_amount: round(totalTax),
      grand_total: round(grandTotal),
      status: body.status || 'Pending',
      payment_mode: paymentMode,
      notes
    });

    // Insert invoice items
    for (const item of computedItems) {
      await db.insert('invoice_items', {
        invoice_id: newInvoice.id,
        ...item
      });
    }

    // Auto-create tracking payment record
    await db.insert('payments', {
      payment_date: invoiceDate,
      type: 'inflow',
      category: 'Customer Invoice',
      reference_id: invoiceNumber,
      entity_name: customer.name,
      amount: 0,
      total_due: round(grandTotal),
      due_date: dueDate,
      status: body.status === 'Paid' ? 'Received' : 'Pending',
      payment_mode: paymentMode
    });

    return success({
      invoice: {
        ...newInvoice,
        customer,
        items: computedItems,
        isInterState,
        amount_in_words: numberToWordsINR(grandTotal)
      }
    }, 201);
  }

  // 3. PUT /api/invoices - Update invoice status
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Invoice ID is required', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.status) updates.status = validateEnum(body.status, VALID_INVOICE_STATUSES, 'status');
    if (body.due_date) updates.due_date = validateDate(body.due_date, 'due_date');

    const updated = await db.update('invoices', id, updates);
    if (!updated) return error('Invoice not found', 404);

    return success({ invoice: updated });
  }

  // 4. DELETE /api/invoices - Delete invoice
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Invoice ID is required', 400);

    await db.delete('invoices', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
