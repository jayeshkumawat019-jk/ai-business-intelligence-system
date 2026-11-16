// netlify/functions/sales.js
// REST API for Sales Management with automatic stock deduction

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateNumber, validateDate, validateString } = require('./_lib/validate');
const { round, multiply } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/sales - List all sales or view aggregations
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};
    const view = queryParams.view || 'list'; // 'daily' | 'monthly' | 'yearly' | 'list'

    const allSales = await db.getAll('sales', { orderBy: { column: 'sale_date', ascending: false } });
    const products = await db.getAll('products');
    const customers = await db.getAll('customers');

    const productMap = new Map(products.map(p => [p.id, p]));
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const enrichedSales = allSales.map(s => {
      const prod = productMap.get(s.product_id);
      const cust = customerMap.get(s.customer_id);
      return {
        ...s,
        product_name: prod ? prod.name : 'Unknown Product',
        product_sku: prod ? prod.sku : '-',
        customer_name: cust ? cust.name : 'Direct Customer'
      };
    });

    if (view === 'monthly') {
      const monthlyMap = new Map();
      enrichedSales.forEach(s => {
        const monthKey = s.sale_date.slice(0, 7); // YYYY-MM
        const current = monthlyMap.get(monthKey) || { month: monthKey, total_amount: 0, count: 0, quantity: 0 };
        current.total_amount = round(current.total_amount + Number(s.amount));
        current.count += 1;
        current.quantity += Number(s.quantity);
        monthlyMap.set(monthKey, current);
      });
      const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
      return success({ sales: enrichedSales, summary: monthlyData });
    }

    if (view === 'yearly') {
      const yearlyMap = new Map();
      enrichedSales.forEach(s => {
        const yearKey = s.sale_date.slice(0, 4); // YYYY
        const current = yearlyMap.get(yearKey) || { year: yearKey, total_amount: 0, count: 0, quantity: 0 };
        current.total_amount = round(current.total_amount + Number(s.amount));
        current.count += 1;
        current.quantity += Number(s.quantity);
        yearlyMap.set(yearKey, current);
      });
      const yearlyData = Array.from(yearlyMap.values()).sort((a, b) => a.year.localeCompare(b.year));
      return success({ sales: enrichedSales, summary: yearlyData });
    }

    return success({ sales: enrichedSales });
  }

  // 2. POST /api/sales - Create sale & reduce product stock
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['sale_date', 'product_id', 'quantity', 'unit_price', 'payment_mode']);

    const saleDate = validateDate(body.sale_date, 'sale_date');
    const productId = validateString(body.product_id, 'product_id');
    const customerId = body.customer_id ? validateString(body.customer_id, 'customer_id') : null;
    const quantity = validateNumber(body.quantity, 'quantity', { min: 1, integer: true });
    const unitPrice = validateNumber(body.unit_price, 'unit_price', { min: 0 });
    const amount = body.amount !== undefined ? validateNumber(body.amount, 'amount', { min: 0 }) : multiply(quantity, unitPrice);
    const paymentMode = validateString(body.payment_mode, 'payment_mode', { minLength: 2, maxLength: 50 });

    // Fetch product to verify stock
    const product = await db.getById('products', productId);
    if (!product) {
      return error('Selected product was not found in database', 404);
    }

    const currentStock = Number(product.stock) || 0;
    if (currentStock < quantity) {
      return error(`Insufficient inventory! Available stock: ${currentStock} ${product.unit || 'units'}, requested: ${quantity}.`, 400);
    }

    // Insert sale record
    const newSale = await db.insert('sales', {
      sale_date: saleDate,
      product_id: productId,
      customer_id: customerId,
      quantity,
      unit_price: round(unitPrice),
      amount: round(amount),
      payment_mode: paymentMode
    });

    // Reduce product stock
    const newStock = Math.max(0, currentStock - quantity);
    await db.update('products', productId, { stock: newStock });

    // Record stock movement
    await db.insert('stock_movements', {
      product_id: productId,
      movement_date: new Date().toISOString(),
      type: 'out',
      quantity,
      reason: `Sale transaction #${newSale.id.slice(0, 8)}`,
      reference_id: newSale.id
    });

    return success({ sale: newSale, remainingStock: newStock }, 201);
  }

  // 3. PUT /api/sales - Update sale
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Sale ID is required in query parameters', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.sale_date) updates.sale_date = validateDate(body.sale_date, 'sale_date');
    if (body.payment_mode) updates.payment_mode = validateString(body.payment_mode, 'payment_mode');
    if (body.amount !== undefined) updates.amount = validateNumber(body.amount, 'amount', { min: 0 });

    const updatedSale = await db.update('sales', id, updates);
    if (!updatedSale) return error('Sale record not found', 404);

    return success({ sale: updatedSale });
  }

  // 4. DELETE /api/sales - Delete sale & restore stock
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Sale ID is required in query parameters', 400);

    const sale = await db.getById('sales', id);
    if (!sale) return error('Sale record not found', 404);

    // Restore stock to product
    if (sale.product_id) {
      const product = await db.getById('products', sale.product_id);
      if (product) {
        const restoredStock = (Number(product.stock) || 0) + Number(sale.quantity || 0);
        await db.update('products', product.id, { stock: restoredStock });

        await db.insert('stock_movements', {
          product_id: product.id,
          movement_date: new Date().toISOString(),
          type: 'in',
          quantity: sale.quantity,
          reason: `Reversal of deleted sale #${sale.id.slice(0, 8)}`,
          reference_id: sale.id
        });
      }
    }

    await db.delete('sales', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
