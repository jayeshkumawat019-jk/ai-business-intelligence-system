// netlify/functions/_lib/validate.js
// Server-side input validation helpers. Never trust the frontend.

const VALID_GST_RATES = [0, 5, 12, 18, 28];
const VALID_EXPENSE_CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Raw Material', 'Transport', 'Marketing', 'Other'];
const VALID_PAYMENT_STATUSES = ['Received', 'Pending', 'Overdue', 'Paid'];
const VALID_PAYMENT_TYPES = ['inflow', 'outflow'];
const VALID_INVOICE_STATUSES = ['Draft', 'Pending', 'Paid', 'Overdue'];

function validateRequired(obj, fieldNames = []) {
  for (const field of fieldNames) {
    const val = obj ? obj[field] : undefined;
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      throw new Error(`Field '${field}' is required and cannot be empty.`);
    }
  }
}

function validateString(val, fieldName, { minLength = 1, maxLength = 255 } = {}) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str.length < minLength) {
    throw new Error(`Field '${fieldName}' must be at least ${minLength} characters long.`);
  }
  if (str.length > maxLength) {
    throw new Error(`Field '${fieldName}' must not exceed ${maxLength} characters.`);
  }
  return str;
}

function validateNumber(val, fieldName, { min = 0, max = 1000000000, integer = false } = {}) {
  const num = Number(val);
  if (isNaN(num)) {
    throw new Error(`Field '${fieldName}' must be a valid number.`);
  }
  if (integer && !Number.isInteger(num)) {
    throw new Error(`Field '${fieldName}' must be a whole number (integer).`);
  }
  if (min !== undefined && num < min) {
    throw new Error(`Field '${fieldName}' must be at least ${min}.`);
  }
  if (max !== undefined && num > max) {
    throw new Error(`Field '${fieldName}' must not exceed ${max}.`);
  }
  return num;
}

function validateDate(val, fieldName = 'date') {
  if (!val) {
    throw new Error(`Field '${fieldName}' must be a valid date.`);
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    throw new Error(`Field '${fieldName}' has an invalid date format (expected YYYY-MM-DD).`);
  }
  return val.slice(0, 10);
}

function validateGSTRate(val) {
  const rate = Number(val);
  if (!VALID_GST_RATES.includes(rate)) {
    throw new Error(`Invalid GST rate ${val}%. Allowed rates are: ${VALID_GST_RATES.join('%, ')}%.`);
  }
  return rate;
}

function validateEnum(val, allowedValues, fieldName) {
  if (!allowedValues.includes(val)) {
    throw new Error(`Field '${fieldName}' must be one of: ${allowedValues.join(', ')}.`);
  }
  return val;
}

function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[<>]/g, '')
    .trim();
}

module.exports = {
  VALID_GST_RATES,
  VALID_EXPENSE_CATEGORIES,
  VALID_PAYMENT_STATUSES,
  VALID_PAYMENT_TYPES,
  VALID_INVOICE_STATUSES,
  validateRequired,
  validateString,
  validateNumber,
  validateDate,
  validateGSTRate,
  validateEnum,
  sanitizeText
};
