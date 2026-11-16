// netlify/functions/suppliers.js
// REST API for Supplier Relationship Management, Procurement Purchases & Payables

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber, validateDate } = require('./_lib/validate');
const { round, subtract } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/suppliers - List suppliers, payables & spend breakdown
  if (method === 'GET') {
    const suppliers = await db.getAll('suppliers', { orderBy: { column: 'name', ascending: true } });
    const purchases = await db.getAll('supplier_purchases', { orderBy: { column: 'purchase_date', ascending: false } });

    // Group purchases by supplier
    const purchasesBySupplier = new Map();
    purchases.forEach(p => {
      const list = purchasesBySupplier.get(p.supplier_id) || [];
      list.push(p);
      purchasesBySupplier.set(p.supplier_id, list);
    });

    let grandTotalOwed = 0;
    const enrichedSuppliers = suppliers.map(s => {
      const list = purchasesBySupplier.get(s.id) || [];
      const totalAmount = round(list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
      const totalPaid = round(list.reduce((sum, item) => sum + (Number(item.paid_amount) || 0), 0));
      const amountOwed = Math.max(0, subtract(totalAmount, totalPaid));

      grandTotalOwed = round(grandTotalOwed + amountOwed);

      return {
        ...s,
        purchases_count: list.length,
        total_purchases: totalAmount,
        total_paid: totalPaid,
        amount_owed: amountOwed,
        purchases: list
      };
    });

    const spendPerSupplier = enrichedSuppliers
      .filter(s => s.total_purchases > 0)
      .map(s => ({
        name: s.name,
        category: s.category || 'Vendor',
        total_purchases: s.total_purchases,
        amount_owed: s.amount_owed
      }))
      .sort((a, b) => b.total_purchases - a.total_purchases);

    return success({
      suppliers: enrichedSuppliers,
      grandTotalOwed,
      spendPerSupplier
    });
  }

  // 2. POST /api/suppliers - Create supplier OR record purchase
  if (method === 'POST') {
    const body = parseJsonBody(event);

    // Record Supplier Purchase
    if (body.action === 'purchase') {
      validateRequired(body, ['supplier_id', 'items_summary', 'amount']);
      const supplierId = validateString(body.supplier_id, 'supplier_id');
      const itemsSummary = validateString(body.items_summary, 'items_summary', { minLength: 3, maxLength: 255 });
      const amount = validateNumber(body.amount, 'amount', { min: 0.01 });
      const paidAmount = body.paid_amount !== undefined ? validateNumber(body.paid_amount, 'paid_amount', { min: 0 }) : 0;
      const purchaseDate = body.purchase_date ? validateDate(body.purchase_date, 'purchase_date') : new Date().toISOString().slice(0, 10);

      const status = paidAmount >= amount ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending');

      const purchase = await db.insert('supplier_purchases', {
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        items_summary: itemsSummary,
        amount: round(amount),
        paid_amount: round(paidAmount),
        status
      });

      return success({ purchase }, 201);
    }

    // Create Supplier
    validateRequired(body, ['name']);
    const name = validateString(body.name, 'name', { minLength: 2, maxLength: 255 });
    const contactPerson = body.contact_person ? validateString(body.contact_person, 'contact_person') : '';
    const phone = body.phone ? validateString(body.phone, 'phone') : '';
    const email = body.email ? validateString(body.email, 'email') : '';
    const gstNumber = body.gst_number ? validateString(body.gst_number, 'gst_number').toUpperCase() : '';
    const address = body.address ? validateString(body.address, 'address') : '';
    const category = body.category ? validateString(body.category, 'category') : 'Raw Material';

    const newSupplier = await db.insert('suppliers', {
      name,
      contact_person: contactPerson,
      phone,
      email,
      gst_number: gstNumber,
      address,
      category
    });

    return success({ supplier: newSupplier }, 201);
  }

  // 3. PUT /api/suppliers - Update supplier
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Supplier ID required', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.name) updates.name = validateString(body.name, 'name');
    if (body.contact_person !== undefined) updates.contact_person = validateString(body.contact_person, 'contact_person');
    if (body.phone !== undefined) updates.phone = validateString(body.phone, 'phone');
    if (body.email !== undefined) updates.email = validateString(body.email, 'email');
    if (body.gst_number !== undefined) updates.gst_number = validateString(body.gst_number, 'gst_number').toUpperCase();
    if (body.address !== undefined) updates.address = validateString(body.address, 'address');
    if (body.category !== undefined) updates.category = validateString(body.category, 'category');

    const updated = await db.update('suppliers', id, updates);
    if (!updated) return error('Supplier not found', 404);

    return success({ supplier: updated });
  }

  // 4. DELETE /api/suppliers - Delete supplier
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Supplier ID required', 400);

    await db.delete('suppliers', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
