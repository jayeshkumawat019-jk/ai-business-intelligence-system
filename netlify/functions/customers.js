// netlify/functions/customers.js
// REST API for Customer Management, Purchase History & Top Spenders

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString } = require('./_lib/validate');
const { round } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/customers - List customers with stats & purchase histories
  if (method === 'GET') {
    const customers = await db.getAll('customers', { orderBy: { column: 'name', ascending: true } });
    const sales = await db.getAll('sales');
    const products = await db.getAll('products');
    const productMap = new Map(products.map(p => [p.id, p]));

    // Group sales by customer
    const salesByCustomer = new Map();
    sales.forEach(s => {
      if (!s.customer_id) return;
      const list = salesByCustomer.get(s.customer_id) || [];
      const prod = productMap.get(s.product_id);
      list.push({
        id: s.id,
        sale_date: s.sale_date,
        product_name: prod ? prod.name : 'Item',
        quantity: s.quantity,
        amount: Number(s.amount) || 0,
        payment_mode: s.payment_mode
      });
      salesByCustomer.set(s.customer_id, list);
    });

    const enrichedCustomers = customers.map(c => {
      const history = salesByCustomer.get(c.id) || [];
      const totalSpent = round(history.reduce((sum, item) => sum + item.amount, 0));
      return {
        ...c,
        orders_count: history.length,
        total_spent: totalSpent,
        purchase_history: history.sort((a, b) => b.sale_date.localeCompare(a.sale_date))
      };
    });

    // Top customers sorted by spend
    const topCustomers = [...enrichedCustomers]
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        total_spent: c.total_spent,
        orders_count: c.orders_count
      }));

    return success({
      customers: enrichedCustomers,
      topCustomers
    });
  }

  // 2. POST /api/customers - Register customer
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['name']);
    const name = validateString(body.name, 'name', { minLength: 2, maxLength: 255 });
    const phone = body.phone ? validateString(body.phone, 'phone', { maxLength: 30 }) : '';
    const email = body.email ? validateString(body.email, 'email', { maxLength: 255 }) : '';
    const gstNumber = body.gst_number ? validateString(body.gst_number, 'gst_number', { maxLength: 30 }).toUpperCase() : '';
    const address = body.address ? validateString(body.address, 'address', { maxLength: 500 }) : '';
    const city = body.city ? validateString(body.city, 'city', { maxLength: 100 }) : '';
    const state = body.state ? validateString(body.state, 'state', { maxLength: 100 }) : 'Maharashtra';

    const newCustomer = await db.insert('customers', {
      name,
      phone,
      email,
      gst_number: gstNumber,
      address,
      city,
      state
    });

    return success({ customer: newCustomer }, 201);
  }

  // 3. PUT /api/customers - Update customer
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Customer ID is required', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.name) updates.name = validateString(body.name, 'name');
    if (body.phone !== undefined) updates.phone = validateString(body.phone, 'phone');
    if (body.email !== undefined) updates.email = validateString(body.email, 'email');
    if (body.gst_number !== undefined) updates.gst_number = validateString(body.gst_number, 'gst_number').toUpperCase();
    if (body.address !== undefined) updates.address = validateString(body.address, 'address');
    if (body.city !== undefined) updates.city = validateString(body.city, 'city');
    if (body.state !== undefined) updates.state = validateString(body.state, 'state');

    const updated = await db.update('customers', id, updates);
    if (!updated) return error('Customer not found', 404);

    return success({ customer: updated });
  }

  // 4. DELETE /api/customers - Remove customer
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Customer ID is required', 400);

    await db.delete('customers', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
