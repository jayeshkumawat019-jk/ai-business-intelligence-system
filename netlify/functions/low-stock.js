// netlify/functions/low-stock.js
// REST API for Low Stock Alerts with Sales Speed Replenishment Formula & Severity Levels

const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const [products, sales] = await Promise.all([
    db.getAll('products'),
    db.getAll('sales')
  ]);

  // Calculate 30-day sales velocity per product
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const salesQtyMap = new Map();

  sales.forEach(s => {
    if (s.sale_date >= thirtyDaysAgo) {
      const q = salesQtyMap.get(s.product_id) || 0;
      salesQtyMap.set(s.product_id, q + Number(s.quantity || 0));
    }
  });

  const lowStockItems = [];

  products.forEach(p => {
    const stock = Number(p.stock) || 0;
    const reorderLevel = Number(p.reorder_level) || 10;

    if (stock <= reorderLevel) {
      const sales30d = salesQtyMap.get(p.id) || 0;
      const dailyVelocity = sales30d / 30; // units per day

      // Replenishment algorithm:
      // Safety buffer of 30 days + replenishment to reach reorder buffer
      const suggestedRestock = Math.max(reorderLevel * 2, Math.ceil((dailyVelocity * 30) + (reorderLevel - stock)));

      let severity = 'warning';
      let severityLabel = 'Low Stock Buffer';
      if (stock === 0) {
        severity = 'critical';
        severityLabel = 'STOCKOUT DEPLETED';
      } else if (stock <= reorderLevel * 0.5) {
        severity = 'critical';
        severityLabel = 'CRITICAL SHORTAGE';
      }

      lowStockItems.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        stock,
        reorder_level: reorderLevel,
        unit: p.unit || 'pcs',
        sales30d,
        dailyVelocity: dailyVelocity.toFixed(2),
        suggestedRestock,
        severity,
        severityLabel
      });
    }
  });

  // Sort critical first
  lowStockItems.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return a.stock - b.stock;
  });

  return success({
    lowStockItems,
    badgeCount: lowStockItems.length,
    criticalCount: lowStockItems.filter(i => i.severity === 'critical').length
  });
});
