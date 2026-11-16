// test/self-test.js
// Automated End-to-End Verification Suite for AI Business Intelligence System
// Verifies JWT Auth, 401 Rejection, and all 25 Function Endpoints

require('dotenv').config();
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-jwt-secret-key-super-secure-32chars';
const APP_PASSWORD = process.env.APP_PASSWORD || 'Admin@BI2026';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log(' AI Business Intelligence System - Self Test Suite');
  console.log('===============================================================\n');

  // --- SUITE 1: AUTHENTICATION & SECURITY ---
  console.log('--- 1. Testing Authentication & JWT Verification ---');
  const authModule = require('../netlify/functions/auth');

  // 1a. Invalid password
  const badAuthEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ password: 'WrongPassword123' })
  };
  const badAuthRes = await authModule.handler(badAuthEvent, {});
  assert(badAuthRes.statusCode === 401, 'Invalid password returns HTTP 401');

  // 1b. Correct password
  const goodAuthEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({ password: APP_PASSWORD })
  };
  const goodAuthRes = await authModule.handler(goodAuthEvent, {});
  assert(goodAuthRes.statusCode === 200, 'Valid password returns HTTP 200');

  const authData = JSON.parse(goodAuthRes.body);
  assert(authData.ok === true && authData.data.token, 'Auth returns signed JWT token');
  const validToken = authData.data.token;

  // --- SUITE 2: 401 UNAUTHORIZED REJECTION ON PROTECTED ROUTES ---
  console.log('\n--- 2. Testing 401 Enforcement on Unauthenticated Requests ---');
  const dashboardModule = require('../netlify/functions/dashboard');
  const unauthRes = await dashboardModule.handler({ httpMethod: 'GET', headers: {} }, {});
  assert(unauthRes.statusCode === 401, 'Missing Bearer token returns HTTP 401');

  const badTokenRes = await dashboardModule.handler({
    httpMethod: 'GET',
    headers: { authorization: 'Bearer invalid.token.payload' }
  }, {});
  assert(badTokenRes.statusCode === 401, 'Invalid Bearer token returns HTTP 401');

  // --- SUITE 3: ALL 25 BUSINESS INTELLIGENCE FUNCTIONS ---
  console.log('\n--- 3. Testing All 25 Business Intelligence Endpoints ---');

  const authHeaders = { authorization: `Bearer ${validToken}` };

  const endpoints = [
    { name: '1. Dashboard (/api/dashboard)', fn: 'dashboard', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '2. AI Assistant (/api/assistant)', fn: 'assistant', event: { httpMethod: 'POST', headers: authHeaders, body: JSON.stringify({ message: 'What is our total revenue?' }) } },
    { name: '3. Sales Management (/api/sales)', fn: 'sales', event: { httpMethod: 'GET', headers: authHeaders, queryStringParameters: { view: 'monthly' } } },
    { name: '4. Expense Management (/api/expenses)', fn: 'expenses', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '5. Profit & Loss (/api/profit-loss)', fn: 'profit-loss', event: { httpMethod: 'GET', headers: authHeaders, queryStringParameters: { startDate: '2025-12-01', endDate: '2026-11-30' } } },
    { name: '6. Inventory Management (/api/inventory)', fn: 'inventory', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '7. Customer Management (/api/customers)', fn: 'customers', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '8. Supplier Management (/api/suppliers)', fn: 'suppliers', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '9. Invoice Generator (/api/invoices)', fn: 'invoices', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '10. Payment Tracking (/api/payments)', fn: 'payments', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '11. Budget Management (/api/budgets)', fn: 'budgets', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '12. Cash Flow (/api/cashflow)', fn: 'cashflow', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '13. Pricing Calculator (/api/pricing)', fn: 'pricing', event: { httpMethod: 'POST', headers: authHeaders, body: JSON.stringify({ costPrice: 5000, overheadPercent: 10, desiredMarginPercent: 25, gstRate: 18, discountPercent: 5, fixedMonthlyCost: 50000 }) } },
    { name: '14. Import & Export (/api/import-export)', fn: 'import-export', event: { httpMethod: 'POST', headers: authHeaders, body: JSON.stringify({ productValueForeign: 10000, currency: 'USD', freightForeign: 500, insuranceForeign: 200, customsDutyPercent: 7.5, igstPercent: 18, otherChargesINR: 5000, units: 100, portCity: 'Mumbai' }) } },
    { name: '15. Employee Management (/api/employees)', fn: 'employees', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '16. Tax Calculator (/api/tax)', fn: 'tax', event: { httpMethod: 'GET', headers: authHeaders, queryStringParameters: { period: '2026-10' } } },
    { name: '17. Prediction Forecast (/api/prediction)', fn: 'prediction', event: { httpMethod: 'GET', headers: authHeaders, queryStringParameters: { months: '6' } } },
    { name: '18. Comparison Analysis (/api/comparison)', fn: 'comparison', event: { httpMethod: 'GET', headers: authHeaders, queryStringParameters: { periodA: '2026-09', periodB: '2026-10' } } },
    { name: '19. Reports Statement (/api/reports)', fn: 'reports', event: { httpMethod: 'GET', headers: authHeaders, queryStringParameters: { type: 'sales' } } },
    { name: '20. Low Stock Alerts (/api/low-stock)', fn: 'low-stock', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '21. Reminders & Holidays (/api/reminders)', fn: 'reminders', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '22. AI Suggestions (/api/suggestions)', fn: 'suggestions', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '23. Goal Tracker (/api/goals)', fn: 'goals', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '24. Document Vault (/api/documents)', fn: 'documents', event: { httpMethod: 'GET', headers: authHeaders } },
    { name: '25. Bulk Data Import/Export (/api/data)', fn: 'data', event: { httpMethod: 'GET', headers: authHeaders, queryStringParameters: { table: 'products' } } }
  ];

  for (const ep of endpoints) {
    try {
      const fnModule = require(`../netlify/functions/${ep.fn}`);
      const res = await fnModule.handler(ep.event, {});
      const isStatusOk = res.statusCode >= 200 && res.statusCode < 300;
      let bodyObj = null;
      try { bodyObj = JSON.parse(res.body); } catch (e) {}

      const isBodyOk = bodyObj && bodyObj.ok === true;
      assert(isStatusOk && isBodyOk, `${ep.name} -> HTTP ${res.statusCode} { ok: true }`);
    } catch (err) {
      assert(false, `${ep.name} threw error: ${err.message}`);
    }
  }

  // --- SUITE 4: DATA INTEGRITY & ROUNDING CHECKS ---
  console.log('\n--- 4. Testing Precision Money Arithmetic ---');
  const money = require('../netlify/functions/_lib/money');
  assert(money.round(0.1 + 0.2) === 0.3, 'Floating-point rounding (0.1 + 0.2 = 0.3)');
  assert(money.formatINR(1250000).includes('12,50,000'), 'Indian Lakhs currency formatting');
  assert(money.numberToWordsINR(1500000).toLowerCase().includes('fifteen lakh'), 'Amount in words converts correctly');

  // --- SUMMARY ---
  console.log('\n===============================================================');
  console.log(` Test Execution Complete: Total Tests: ${passed + failed}`);
  console.log(` Passed: \x1b[32m${passed}\x1b[0m | Failed: \x1b[31m${failed}\x1b[0m`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
