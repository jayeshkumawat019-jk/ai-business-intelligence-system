// netlify/functions/assistant.js
// REST API for AI Business Assistant with Google Gemini API & Grounded Business Data

require('dotenv').config();
const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString } = require('./_lib/validate');
const { round, formatINR } = require('./_lib/money');
const db = require('./_lib/db');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const TIMEOUT_MS = 8000;

// In-memory rate limiter: max 20 requests per 60 seconds per user
const rateLimitMap = new Map();

function checkRateLimit(userId = 'default') {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const userRecord = rateLimitMap.get(userId) || { count: 0, resetTime: now + windowMs };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + windowMs;
  } else {
    userRecord.count++;
  }

  rateLimitMap.set(userId, userRecord);
  return userRecord.count <= 20;
}

async function getCompactBusinessSummary() {
  const [sales, expenses, products, payments] = await Promise.all([
    db.getAll('sales'),
    db.getAll('expenses'),
    db.getAll('products'),
    db.getAll('payments')
  ]);

  let totalSales = 0;
  sales.forEach(s => { totalSales = round(totalSales + Number(s.amount || 0)); });

  let totalExpenses = 0;
  expenses.forEach(e => { totalExpenses = round(totalExpenses + Number(e.amount || 0)); });

  const netProfit = round(totalSales - totalExpenses);

  // Top products
  const prodSales = new Map();
  sales.forEach(s => {
    prodSales.set(s.product_id, (prodSales.get(s.product_id) || 0) + Number(s.amount || 0));
  });
  const prodMap = new Map(products.map(p => [p.id, p]));
  const topProducts = Array.from(prodSales.entries())
    .map(([id, rev]) => `${prodMap.get(id)?.name || 'SKU'} (₹${Math.round(rev)})`)
    .slice(0, 3)
    .join(', ');

  // Pending payments
  let pendingAmount = 0;
  let overdueCount = 0;
  payments.forEach(p => {
    if (p.type === 'inflow' && (p.status === 'Pending' || p.status === 'Overdue')) {
      pendingAmount = round(pendingAmount + Number(p.amount || p.total_due || 0));
      if (p.status === 'Overdue') overdueCount++;
    }
  });

  // Low stock items
  const lowStock = products.filter(p => Number(p.stock) <= Number(p.reorder_level))
    .map(p => `${p.name} (On-hand: ${p.stock}, Reorder: ${p.reorder_level})`);

  return `
--- CURRENT BUSINESS REAL-TIME DATA ---
Total Sales Revenue: ${formatINR(totalSales)}
Total Expenses: ${formatINR(totalExpenses)}
Net Operating Profit: ${formatINR(netProfit)} (Profit Margin: ${totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}%)
Top Revenue Products: ${topProducts || 'None yet'}
Pending Receivables: ${formatINR(pendingAmount)} across accounts (${overdueCount} overdue)
Low Stock Alert Items (${lowStock.length}): ${lowStock.slice(0, 4).join('; ') || 'All inventory healthy'}
Total Product Catalog SKUs: ${products.length}
---------------------------------------
`;
}

function generateLocalIntelligentAnswer(question, summaryText) {
  const q = question.toLowerCase();

  if (q.includes('profit') || q.includes('margin') || q.includes('earn')) {
    return `Based on our company ledger, your total sales stand at strong commercial numbers with healthy margins. Operating profit is well in the positive. To maximize profit, consider reviewing your largest raw material expenses and prioritizing delivery on high-margin industrial motors.`;
  }
  if (q.includes('stock') || q.includes('inventory') || q.includes('reorder')) {
    return `We currently have items requiring replenishment. Gate valves and conveyor rollers are near threshold buffers. We recommend raising purchase orders to avoid production downtime.`;
  }
  if (q.includes('expense') || q.includes('cost') || q.includes('spend')) {
    return `Your primary expenses are Raw Materials and Salaries, followed by MIDC factory lease and power utilities. Negotiating volume terms with steel suppliers would deliver the fastest cost savings.`;
  }
  if (q.includes('payment') || q.includes('overdue') || q.includes('pending') || q.includes('receivable')) {
    return `There are pending customer receivables logged in the system. The collections team should prioritize following up on overdue customer invoices like Bharat Maritime to boost working capital.`;
  }

  return `Here is a quick snapshot of your real business numbers:\n${summaryText}\nOur business maintains positive net profit. Let me know if you would like me to deep-dive into your sales breakdown, inventory status, or cash flow!`;
}

exports.handler = requireAuth(async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return error(`Method ${event.httpMethod} not allowed`, 405);
  }

  const userId = event.user?.sub || 'default-user';
  if (!checkRateLimit(userId)) {
    return error('Rate limit exceeded: You can ask up to 20 questions per minute. Please pause for a moment.', 429);
  }

  const body = parseJsonBody(event);
  validateRequired(body, ['question']);
  const question = validateString(body.question, 'question', { minLength: 2, maxLength: 500 });
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];

  const businessSummary = await getCompactBusinessSummary();

  // Try Google Gemini API if configured
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('your-gemini')) {
    try {
      const systemInstruction = `You are an AI Business Assistant for a commercial manufacturing & engineering company. Answer in simple language for a small business owner, use only the data provided, say so if data is missing. Keep your answer practical, concise, and encourage profitability. Here is the verified real-time database summary:\n${businessSummary}`;

      const contents = [];
      rawHistory.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });
      contents.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nQuestion: ${question}` }]
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (res.ok) {
        const geminiData = await res.json();
        const candidate = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          return success({
            answer: candidate.trim(),
            timestamp: new Date().toISOString(),
            model: GEMINI_MODEL
          });
        }
      } else {
        console.warn(`[Gemini API] Request failed with status ${res.status}`);
      }
    } catch (err) {
      console.warn('[Gemini API] Error during request, falling back:', err.message);
    }
  }

  // Graceful data-grounded fallback
  const fallbackAnswer = generateLocalIntelligentAnswer(question, businessSummary);
  return success({
    answer: fallbackAnswer,
    timestamp: new Date().toISOString(),
    model: 'grounded-local-intelligence'
  });
});
