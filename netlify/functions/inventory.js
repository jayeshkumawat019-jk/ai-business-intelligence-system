// netlify/functions/inventory.js
// REST API for Inventory Management, Stock In/Out Adjustments & Shortage Tracking

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateNumber, validateString } = require('./_lib/validate');
const { round } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/inventory - List products & stock movements
  if (method === 'GET') {
    const products = await db.getAll('products', { orderBy: { column: 'name', ascending: true } });
    const movements = await db.getAll('stock_movements', { orderBy: { column: 'movement_date', ascending: false }, limit: 50 });

    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const enrichedProducts = products.map(p => {
      const stock = Number(p.stock) || 0;
      const reorderLevel = Number(p.reorder_level) || 10;
      const costPrice = Number(p.cost_price) || 0;
      const sellingPrice = Number(p.selling_price) || 0;
      const valuation = round(stock * costPrice);

      totalValuation = round(totalValuation + valuation);

      let status = 'Healthy';
      if (stock === 0) {
        status = 'Out of Stock';
        outOfStockCount++;
      } else if (stock <= reorderLevel) {
        status = 'Critical Low';
        lowStockCount++;
      } else if (stock <= reorderLevel * 1.5) {
        status = 'Warning';
      }

      return {
        ...p,
        stock,
        reorder_level: reorderLevel,
        cost_price: round(costPrice),
        selling_price: round(sellingPrice),
        inventory_value: valuation,
        status
      };
    });

    return success({
      products: enrichedProducts,
      movements,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      totalSKUs: products.length
    });
  }

  // 2. POST /api/inventory - Create product OR record stock movement
  if (method === 'POST') {
    const body = parseJsonBody(event);

    // Stock Movement Action: { action: 'movement', product_id, type: 'in'|'out', quantity, reason }
    if (body.action === 'movement') {
      validateRequired(body, ['product_id', 'type', 'quantity', 'reason']);
      const productId = validateString(body.product_id, 'product_id');
      const type = body.type === 'in' ? 'in' : 'out';
      const quantity = validateNumber(body.quantity, 'quantity', { min: 1, integer: true });
      const reason = validateString(body.reason, 'reason', { minLength: 2, maxLength: 255 });

      const product = await db.getById('products', productId);
      if (!product) return error('Product not found', 404);

      let currentStock = Number(product.stock) || 0;
      if (type === 'out' && currentStock < quantity) {
        return error(`Cannot dispatch ${quantity} items. Available stock is only ${currentStock}.`, 400);
      }

      const newStock = type === 'in' ? currentStock + quantity : currentStock - quantity;
      await db.update('products', productId, { stock: newStock });

      const movement = await db.insert('stock_movements', {
        product_id: productId,
        movement_date: new Date().toISOString(),
        type,
        quantity,
        reason,
        reference_id: body.reference_id || 'manual-adjustment'
      });

      return success({ movement, newStock });
    }

    // New Product Creation
    validateRequired(body, ['sku', 'name', 'category', 'cost_price', 'selling_price', 'stock']);
    const sku = validateString(body.sku, 'sku', { minLength: 2, maxLength: 64 }).toUpperCase();
    const name = validateString(body.name, 'name', { minLength: 2, maxLength: 255 });
    const category = validateString(body.category, 'category', { minLength: 2, maxLength: 100 });
    const costPrice = validateNumber(body.cost_price, 'cost_price', { min: 0 });
    const sellingPrice = validateNumber(body.selling_price, 'selling_price', { min: 0 });
    const stock = validateNumber(body.stock, 'stock', { min: 0, integer: true });
    const reorderLevel = body.reorder_level !== undefined ? validateNumber(body.reorder_level, 'reorder_level', { min: 0, integer: true }) : 10;
    const unit = body.unit ? validateString(body.unit, 'unit', { maxLength: 20 }) : 'pcs';

    // Verify SKU uniqueness
    const existing = await db.getAll('products');
    if (existing.some(p => p.sku === sku)) {
      return error(`SKU '${sku}' is already registered to another item.`, 400);
    }

    const newProduct = await db.insert('products', {
      sku,
      name,
      category,
      cost_price: round(costPrice),
      selling_price: round(sellingPrice),
      stock,
      reorder_level: reorderLevel,
      unit
    });

    if (stock > 0) {
      await db.insert('stock_movements', {
        product_id: newProduct.id,
        movement_date: new Date().toISOString(),
        type: 'in',
        quantity: stock,
        reason: 'Initial Inventory Opening Stock',
        reference_id: 'init'
      });
    }

    return success({ product: newProduct }, 201);
  }

  // 3. PUT /api/inventory - Update product
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Product ID is required in query parameters', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.name) updates.name = validateString(body.name, 'name');
    if (body.category) updates.category = validateString(body.category, 'category');
    if (body.cost_price !== undefined) updates.cost_price = validateNumber(body.cost_price, 'cost_price', { min: 0 });
    if (body.selling_price !== undefined) updates.selling_price = validateNumber(body.selling_price, 'selling_price', { min: 0 });
    if (body.stock !== undefined) updates.stock = validateNumber(body.stock, 'stock', { min: 0, integer: true });
    if (body.reorder_level !== undefined) updates.reorder_level = validateNumber(body.reorder_level, 'reorder_level', { min: 0, integer: true });
    if (body.unit) updates.unit = validateString(body.unit, 'unit');

    const updated = await db.update('products', id, updates);
    if (!updated) return error('Product not found', 404);

    return success({ product: updated });
  }

  // 4. DELETE /api/inventory - Delete product
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Product ID is required in query parameters', 400);

    await db.delete('products', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
