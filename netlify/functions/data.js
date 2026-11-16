// netlify/functions/data.js
// REST API for Feature 25: Bulk Data Import & Export
// Handles multi-table exports and batch row-by-row validated imports with detailed error reporting

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round } = require('./_lib/money');
const {
  validateRequired,
  validatePositiveNumber,
  validateNonNegativeNumber,
  validateDate,
  validateStringLength,
  validateEnum,
  validateGSTNumber,
  validateEmail,
  validatePhone
} = require('./_lib/validate');
const db = require('./_lib/db');

const ALLOWED_TABLES = ['sales', 'expenses', 'products', 'customers', 'suppliers', 'invoices', 'employees'];

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET: Export table records
  if (method === 'GET') {
    const table = (event.queryStringParameters?.table || 'sales').toLowerCase();
    if (!ALLOWED_TABLES.includes(table)) {
      return error(`Table '${table}' not permitted. Allowed: ${ALLOWED_TABLES.join(', ')}`, 400);
    }

    try {
      const records = await db.getAll(table);
      return success({
        table,
        count: records.length,
        exportedAt: new Date().toISOString(),
        records
      });
    } catch (err) {
      return error(`Failed to fetch records for table '${table}': ${err.message}`, 500);
    }
  }

  // 2. POST: Batch Import with Row-by-Row Validation
  if (method === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return error('Invalid JSON payload in request body', 400);
    }

    const table = (body.table || '').toLowerCase();
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!['sales', 'expenses', 'products', 'customers'].includes(table)) {
      return error(`Table '${table}' is not supported for batch import. Allowed: sales, expenses, products, customers`, 400);
    }

    if (rows.length === 0) {
      return error('No rows provided for import', 400);
    }

    if (rows.length > 500) {
      return error('Batch import limited to 500 rows per operation', 400);
    }

    try {
      const result = await processBatchImport(table, rows);
      return success(result, 201);
    } catch (err) {
      return error('Batch import failed: ' + err.message, 500);
    }
  }

  return error(`Method ${method} not allowed`, 405);
});

async function processBatchImport(table, rows) {
  const successful = [];
  const failed = [];

  // Pre-load lookup maps for relational integrity
  let products = [];
  let customers = [];
  if (table === 'sales') {
    [products, customers] = await Promise.all([
      db.getAll('products'),
      db.getAll('customers')
    ]);
  }

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const raw = rows[i];
    const errors = [];
    let cleanRow = null;

    if (table === 'products') {
      const name = String(raw.name || '').trim();
      const sku = String(raw.sku || `SKU-IMP-${Date.now().toString(36)}-${i}`).trim().toUpperCase();
      const category = String(raw.category || 'General').trim();
      const cost_price = Number(raw.cost_price ?? raw.costPrice ?? 0);
      const selling_price = Number(raw.selling_price ?? raw.sellingPrice ?? 0);
      const stock = parseInt(raw.stock ?? 0, 10);
      const reorder_level = parseInt(raw.reorder_level ?? raw.reorderLevel ?? 10, 10);

      if (!validateRequired(name)) errors.push('Product name is required');
      if (!validateStringLength(name, 200)) errors.push('Product name must not exceed 200 chars');
      if (!validatePositiveNumber(cost_price)) errors.push('Cost price must be greater than 0');
      if (!validatePositiveNumber(selling_price)) errors.push('Selling price must be greater than 0');
      if (selling_price < cost_price) errors.push('Selling price should not be lower than cost price');
      if (!validateNonNegativeNumber(stock)) errors.push('Stock cannot be negative');
      if (!validateNonNegativeNumber(reorder_level)) errors.push('Reorder level cannot be negative');

      if (errors.length === 0) {
        cleanRow = {
          name,
          sku,
          category,
          cost_price: round(cost_price),
          selling_price: round(selling_price),
          stock,
          reorder_level
        };
      }
    } else if (table === 'expenses') {
      const expense_date = String(raw.expense_date ?? raw.date ?? '').trim();
      const category = String(raw.category || '').trim();
      const description = String(raw.description || 'Imported expense').trim();
      const amount = Number(raw.amount || 0);
      const payment_mode = String(raw.payment_mode ?? raw.paymentMode ?? 'Bank Transfer').trim();

      if (!validateRequired(expense_date) || !validateDate(expense_date)) errors.push('Valid expense date (YYYY-MM-DD) is required');
      if (!validateEnum(category, ['Rent', 'Salaries', 'Utilities', 'Raw Material', 'Transport', 'Marketing', 'Other'])) {
        errors.push("Category must be one of: Rent, Salaries, Utilities, Raw Material, Transport, Marketing, Other");
      }
      if (!validatePositiveNumber(amount)) errors.push('Amount must be greater than 0');
      if (!validateEnum(payment_mode, ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit Card'])) {
        errors.push("Payment mode must be: Cash, UPI, Bank Transfer, Cheque, or Credit Card");
      }

      if (errors.length === 0) {
        cleanRow = {
          expense_date,
          category,
          description: description.slice(0, 500),
          amount: round(amount),
          payment_mode
        };
      }
    } else if (table === 'customers') {
      const name = String(raw.name || '').trim();
      const phone = String(raw.phone || '').trim();
      const email = String(raw.email || '').trim();
      const gst_number = String(raw.gst_number ?? raw.gstNumber ?? '').trim().toUpperCase();
      const address = String(raw.address || '').trim();

      if (!validateRequired(name)) errors.push('Customer name is required');
      if (phone && !validatePhone(phone)) errors.push('Phone number must be 10-15 digits');
      if (email && !validateEmail(email)) errors.push('Invalid email format');
      if (gst_number && !validateGSTNumber(gst_number)) errors.push('Invalid GST format (expected 15 alphanumeric characters)');

      if (errors.length === 0) {
        cleanRow = {
          name,
          phone,
          email,
          gst_number,
          address: address.slice(0, 500)
        };
      }
    } else if (table === 'sales') {
      const sale_date = String(raw.sale_date ?? raw.date ?? '').trim();
      const quantity = parseInt(raw.quantity || 1, 10);
      const amount = Number(raw.amount || 0);
      const payment_mode = String(raw.payment_mode ?? raw.paymentMode ?? 'Bank Transfer').trim();

      if (!validateRequired(sale_date) || !validateDate(sale_date)) errors.push('Valid sale date (YYYY-MM-DD) is required');
      if (!validatePositiveNumber(quantity)) errors.push('Quantity must be at least 1');
      if (!validatePositiveNumber(amount)) errors.push('Amount must be greater than 0');
      if (!validateEnum(payment_mode, ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit Card'])) {
        errors.push("Payment mode must be: Cash, UPI, Bank Transfer, Cheque, or Credit Card");
      }

      // Resolve Product
      let matchedProduct = null;
      if (raw.product_id) {
        matchedProduct = products.find(p => p.id === raw.product_id);
      } else if (raw.product || raw.product_name) {
        const pName = String(raw.product || raw.product_name).toLowerCase().trim();
        matchedProduct = products.find(p => p.name.toLowerCase() === pName);
      }
      if (!matchedProduct && products.length > 0) {
        // Fallback to first product or fail
        matchedProduct = products[0];
      }
      if (!matchedProduct) {
        errors.push('No valid product found for sale record');
      }

      // Resolve Customer
      let matchedCustomer = null;
      if (raw.customer_id) {
        matchedCustomer = customers.find(c => c.id === raw.customer_id);
      } else if (raw.customer || raw.customer_name) {
        const cName = String(raw.customer || raw.customer_name).toLowerCase().trim();
        matchedCustomer = customers.find(c => c.name.toLowerCase() === cName);
      }
      if (!matchedCustomer && customers.length > 0) {
        matchedCustomer = customers[0];
      }

      if (errors.length === 0 && matchedProduct) {
        cleanRow = {
          sale_date,
          product_id: matchedProduct.id,
          customer_id: matchedCustomer ? matchedCustomer.id : null,
          quantity,
          amount: round(amount),
          payment_mode
        };
      }
    }

    if (errors.length > 0) {
      failed.push({
        rowNumber: rowNum,
        rowData: raw,
        errors
      });
    } else if (cleanRow) {
      try {
        const inserted = await db.insert(table, cleanRow);
        successful.push(inserted);

        // If product was inserted or sales made, adjust stock movements
        if (table === 'sales' && cleanRow.product_id) {
          const prod = await db.getById('products', cleanRow.product_id);
          if (prod) {
            const nextStock = Math.max(0, (prod.stock || 0) - cleanRow.quantity);
            await db.update('products', prod.id, { stock: nextStock });
            await db.insert('stock_movements', {
              product_id: prod.id,
              movement_type: 'OUT',
              quantity: cleanRow.quantity,
              reason: 'Bulk Imported Sale',
              reference_id: inserted.id
            });
          }
        }
      } catch (insertErr) {
        failed.push({
          rowNumber: rowNum,
          rowData: raw,
          errors: [insertErr.message]
        });
      }
    }
  }

  return {
    table,
    totalRows: rows.length,
    insertedCount: successful.length,
    failedCount: failed.length,
    failedRows: failed
  };
}
