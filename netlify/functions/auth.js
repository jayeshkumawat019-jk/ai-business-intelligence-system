// netlify/functions/auth.js
// Authentication Netlify Function: verifies APP_PASSWORD and issues signed JWT

require('dotenv').config();
const { handleOptions, success, error, parseJsonBody } = require('./_lib/respond');
const { signToken, verifyToken, extractToken } = require('./_lib/auth');

const APP_PASSWORD = process.env.APP_PASSWORD || 'Admin@BI2026';

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // 1. Session check: GET /api/auth
  if (event.httpMethod === 'GET') {
    const rawToken = extractToken(event);
    if (!rawToken) {
      return error('No active session token', 401);
    }
    const { valid, user, error: authError } = verifyToken(rawToken);
    if (!valid) {
      return error(authError || 'Session expired', 401);
    }
    return success({ authenticated: true, user });
  }

  // 2. Login: POST /api/auth
  if (event.httpMethod === 'POST') {
    try {
      const body = parseJsonBody(event);
      const password = body.password;

      if (!password) {
        return error('Password is required', 400);
      }

      if (password !== APP_PASSWORD) {
        return error('Incorrect password. Please try again.', 401);
      }

      const token = signToken({
        role: 'business_owner',
        name: 'Authorized Administrator'
      });

      return success({
        token,
        user: {
          role: 'business_owner',
          name: 'Authorized Administrator',
          expiresIn: '8 hours'
        }
      });
    } catch (err) {
      return error(err.message || 'Authentication failed', 400);
    }
  }

  return error(`HTTP Method ${event.httpMethod} not allowed on /api/auth`, 405);
};
