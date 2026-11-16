// netlify/functions/suggestions.js
// REST API for AI Business Optimization Suggestions with Grounded Data, JSON Parsing & Rule Fallback

require('dotenv').config();
const { requireAuth } = require('./_lib/auth');
const { success, error } = require('./_lib/respond');
const { round, formatINR } = require('./_lib/money');
const db = require('./_lib/db');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const TIMEOUT_MS = 8000;

function generateRuleBasedSuggestions(kpis, lowStockCount, topExpenses) {
  const tips = [];

  // 1. Raw Materials & Procurement Optimization
  const rawExpense = topExpenses['Raw Material'] || 0;
  if (rawExpense > 0) {
    tips.push({
      title: 'Bulk Sourcing & Vendor Volume Tier Negotiation',
      category: 'Cost Cutting',
      priority: 'High',
      impact: 'Est. 4% to 8% reduction in direct material outlays',
      action: `Raw materials account for ₹${Math.round(rawExpense).toLocaleString('en-IN')}. Negotiate consolidated quarterly batch delivery with suppliers like Jindal Steel & Alloys to secure bulk tier discounts.`
    });
  }

  // 2. Inventory Shortage Protection
  if (lowStockCount > 0) {
    tips.push({
      title: 'Replenish Threshold Safety Buffers on Fast-Moving SKUs',
      category: 'Inventory Efficiency',
      priority: 'High',
      impact: 'Prevents factory assembly halts & expedited shipping penalties',
      action: `${lowStockCount} catalog products are currently at or below safety reorder levels (e.g. Gate Valves, Fasteners). Issue automated purchase requisitions immediately.`
    });
  }

  // 3. Receivables & Cash Flow Acceleration
  const pending = kpis.pendingPayments || 0;
  if (pending > 0) {
    tips.push({
      title: 'Accelerate Overdue Client Accounts Collections',
      category: 'Cash Flow Optimization',
      priority: 'High',
      impact: `Unlocks up to ₹${Math.round(pending).toLocaleString('en-IN')} in working capital`,
      action: 'Implement 2% early settlement discounts (2/10 Net 30) for major accounts like Bharat Maritime to speed cash conversion.'
    });
  }

  // 4. Margin Expansion on Core Machinery
  tips.push({
    title: 'Package High-Margin Motors with Preventive Maintenance Contracts',
    category: 'Revenue Boost',
    priority: 'Medium',
    impact: 'Increases customer lifetime value (LTV) by 15-20%',
    action: 'Bundle 3-Phase Electric Motors with quarterly lubrication and test certifications to capture higher aftermarket service margins.'
  });

  // 5. Utility & Power Conservation
  tips.push({
    title: 'Shift High-Load CNC Machining to Off-Peak Power Hours',
    category: 'Cost Cutting',
    priority: 'Opportunity',
    impact: 'Lowers industrial electricity tariff surcharges by 8-12%',
    action: 'Schedule heavy turning operations during off-peak MSEDCL tariff windows (10 PM to 6 AM) to reduce monthly electricity bills.'
  });

  return tips.slice(0, 5);
}

function parseGeminiSuggestionsJson(rawText) {
  if (!rawText) return null;
  // Strip markdown ```json ... ``` code fences
  let clean = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gi, '').trim();

  // Find array [ ... ]
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    clean = clean.slice(firstBracket, lastBracket + 1);
  }

  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.map(item => ({
        title: String(item.title || 'Operational Optimization'),
        category: String(item.category || 'Efficiency'),
        priority: ['High', 'Medium', 'Opportunity'].includes(item.priority) ? item.priority : 'Medium',
        impact: String(item.impact || 'Positive EBITDA contribution'),
        action: String(item.action || 'Implement recommended operational workflow')
      })).slice(0, 5);
    }
  } catch (err) {
    console.warn('[Gemini Suggestions] JSON parse failed, falling back to rule tips:', err.message);
  }
  return null;
}

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'GET') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const [sales, expenses, products, payments] = await Promise.all([
    db.getAll('sales'),
    db.getAll('expenses'),
    db.getAll('products'),
    db.getAll('payments')
  ]);

  let totalSales = 0;
  sales.forEach(s => { totalSales = round(totalSales + Number(s.amount || 0)); });

  let totalExpenses = 0;
  const expenseCat = {};
  expenses.forEach(e => {
    const amt = Number(e.amount || 0);
    totalExpenses = round(totalExpenses + amt);
    expenseCat[e.category] = (expenseCat[e.category] || 0) + amt;
  });

  let pendingPayments = 0;
  payments.forEach(p => {
    if (p.type === 'inflow' && (p.status === 'Pending' || p.status === 'Overdue')) {
      pendingPayments = round(pendingPayments + Number(p.amount || p.total_due || 0));
    }
  });

  const lowStockCount = products.filter(p => Number(p.stock) <= Number(p.reorder_level)).length;
  const netProfit = round(totalSales - totalExpenses);

  const kpis = { totalSales, totalExpenses, netProfit, pendingPayments };

  // Attempt Gemini API Call if Key is present
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('your-gemini')) {
    try {
      const prompt = `You are a management consultant for a mid-sized Indian manufacturing & machinery equipment business.
Based on the actual numbers below, provide exactly 5 practical, specific ways to increase profit and cut expenses.
Real Data:
- Gross Sales: ${formatINR(totalSales)}
- Total Outlays: ${formatINR(totalExpenses)}
- Net Profit: ${formatINR(netProfit)}
- Pending Customer Receivables: ${formatINR(pendingPayments)}
- Low Stock Items: ${lowStockCount} SKUs below reorder level
- Top Expenses: Raw Materials (${formatINR(expenseCat['Raw Material'] || 0)}), Salaries (${formatINR(expenseCat['Salaries'] || 0)}), Rent (${formatINR(expenseCat['Rent'] || 0)})

RETURN ONLY A VALID JSON ARRAY OF 5 OBJECTS (no intro, no markdown explanation):
[
  {
    "title": "Clear action title",
    "category": "Cost Cutting" | "Revenue Boost" | "Cash Flow Optimization" | "Inventory Efficiency",
    "priority": "High" | "Medium" | "Opportunity",
    "impact": "Quantifiable estimated profit or cost impact",
    "action": "Specific 1-2 sentence recommendation using numbers"
  }
]`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedSuggestions = parseGeminiSuggestionsJson(text);
        if (parsedSuggestions) {
          return success({
            suggestions: parsedSuggestions,
            source: 'gemini-intelligence',
            model: GEMINI_MODEL
          });
        }
      }
    } catch (err) {
      console.warn('[Gemini Suggestions] Error during fetch, using rule engine:', err.message);
    }
  }

  // Grounded Rule-based fallback
  const ruleTips = generateRuleBasedSuggestions(kpis, lowStockCount, expenseCat);
  return success({
    suggestions: ruleTips,
    source: 'rule-based-intelligence',
    model: 'grounded-rules'
  });
});
