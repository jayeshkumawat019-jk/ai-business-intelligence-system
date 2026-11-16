// netlify/functions/pricing.js
// REST API for Industrial Product Pricing Calculator, Margin vs Markup & Break-Even Analysis

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateNumber } = require('./_lib/validate');
const { round, divide, multiply } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/pricing - Get pricing benchmarks & product options
  if (method === 'GET') {
    const products = await db.getAll('products');
    return success({
      products: products.map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        cost_price: p.cost_price,
        selling_price: p.selling_price
      }))
    });
  }

  // 2. POST /api/pricing - Compute pricing & optionally save to product
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['direct_cost', 'overhead_allocation', 'desired_margin_pct']);

    const directCost = validateNumber(body.direct_cost, 'direct_cost', { min: 0 });
    const overhead = validateNumber(body.overhead_allocation, 'overhead_allocation', { min: 0 });
    const marginPct = validateNumber(body.desired_margin_pct, 'desired_margin_pct', { min: 0, max: 99.9 });
    const gstRate = body.gst_rate !== undefined ? validateNumber(body.gst_rate, 'gst_rate', { min: 0 }) : 18;
    const discountPct = body.discount_pct !== undefined ? validateNumber(body.discount_pct, 'discount_pct', { min: 0, max: 90 }) : 0;
    const fixedOverheadMonthly = body.fixed_overhead_monthly ? validateNumber(body.fixed_overhead_monthly, 'fixed_overhead_monthly', { min: 0 }) : 100000;

    // Calculations
    const totalUnitCost = round(directCost + overhead);

    // Selling price before discount to achieve target margin
    // Formula: Margin % = (Selling Price - Cost) / Selling Price  =>  Selling Price = Cost / (1 - Margin/100)
    const baseSellingPrice = round(totalUnitCost / (1 - (marginPct / 100)));
    const unitProfit = round(baseSellingPrice - totalUnitCost);
    const markupPct = totalUnitCost > 0 ? round((unitProfit / totalUnitCost) * 100) : 0;

    // Factoring discount buffer if retailer provides trade discount
    const listPrice = discountPct > 0 ? round(baseSellingPrice / (1 - (discountPct / 100))) : baseSellingPrice;
    const gstAmount = round((listPrice * gstRate) / 100);
    const finalMspInclusiveTax = round(listPrice + gstAmount);

    // Break-even Analysis
    // Contribution Margin per unit = baseSellingPrice - directCost
    const contributionMargin = Math.max(1, baseSellingPrice - directCost);
    const breakEvenUnits = Math.ceil(fixedOverheadMonthly / contributionMargin);

    const marginChart = [
      { component: 'Direct Material & Labor', amount: directCost, color: '#78716C' },
      { component: 'Overhead Allocation', amount: overhead, color: '#D97706' },
      { component: 'Unit Net Profit', amount: unitProfit, color: '#059669' },
      { component: 'GST Tax Component', amount: gstAmount, color: '#2563EB' }
    ];

    // Optional save directly into product catalog
    if (body.action === 'save_to_product' && body.product_id) {
      await db.update('products', body.product_id, {
        cost_price: totalUnitCost,
        selling_price: baseSellingPrice
      });
    }

    return success({
      inputs: { directCost, overhead, totalUnitCost, marginPct, gstRate, discountPct },
      results: {
        totalUnitCost,
        baseSellingPrice,
        unitProfit,
        markupPct,
        listPrice,
        gstAmount,
        finalMspInclusiveTax,
        breakEvenUnits
      },
      marginChart
    });
  }

  return error(`Method ${method} not allowed`, 405);
});
