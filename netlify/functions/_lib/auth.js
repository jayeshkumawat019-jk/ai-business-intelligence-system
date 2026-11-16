// netlify/functions/_lib/auth.js
// JWT Authentication & authorization middleware for Netlify Functions

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { handleOptions, error } = require('./respond');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-bi-2026';
const TOKEN_EXPIRY = '8h';

function signToken(payload = {}) {
  return jwt.sign(
    {
      sub: 'business-admin',
      role: 'admin',
      ...payload
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  if (!token) return { valid: false, error: 'Token missing' };
  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (err) {
    return { valid: false, error: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid authentication token.' };
  }
}

function extractToken(event) {
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader) return null;
  return authHeader;
}

function requireAuth(handler) {
  return async function (event, context) {
    // 1. Always permit OPTIONS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions();
    }

    // 2. Extract and verify JWT
    const rawToken = extractToken(event);
    if (!rawToken) {
      return error('Access denied. Authentication token required.', 401);
    }

    const { valid, user, error: authError } = verifyToken(rawToken);
    if (!valid) {
      return error(authError || 'Unauthorized access.', 401);
    }

    // 3. Attach authenticated user payload to event
    event.user = user;

    // 4. Execute function handler wrapped in safe try/catch
    try {
      return await handler(event, context);
    } catch (err) {
      console.error(`[Handler Error] ${event.path || ''}:`, err);
      return error(err.message || 'An internal server error occurred', 500);
    }
  };
}

module.exports = {
  signToken,
  verifyToken,
  extractToken,
  requireAuth
};
