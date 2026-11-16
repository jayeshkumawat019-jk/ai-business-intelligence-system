// netlify/functions/_lib/respond.js
// Standardized JSON response helpers for Netlify Functions

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function handleOptions() {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: ''
  };
}

function success(data, statusCode = 200, customHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...customHeaders },
    body: JSON.stringify({ ok: true, data })
  };
}

function error(message, statusCode = 400, customHeaders = {}) {
  const safeMessage = typeof message === 'string' ? message : (message?.message || 'An unexpected error occurred');
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...customHeaders },
    body: JSON.stringify({ ok: false, error: safeMessage })
  };
}

function parseJsonBody(event) {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body;
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('Invalid JSON payload in request body');
  }
}

module.exports = {
  CORS_HEADERS,
  handleOptions,
  success,
  error,
  parseJsonBody
};
