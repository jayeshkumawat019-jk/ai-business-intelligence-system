// netlify/functions/_lib/money.js
// High-precision financial calculations with 2 decimal rounding & Indian Rupee (INR) formatting

function round(num) {
  const n = Number(num);
  if (isNaN(n)) return 0.00;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function add(a, b) {
  return round(Number(a || 0) + Number(b || 0));
}

function subtract(a, b) {
  return round(Number(a || 0) - Number(b || 0));
}

function multiply(a, b) {
  return round(Number(a || 0) * Number(b || 0));
}

function divide(a, b) {
  const divisor = Number(b);
  if (!divisor || isNaN(divisor)) return 0.00;
  return round(Number(a || 0) / divisor);
}

function formatINR(amount) {
  const n = round(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

// Convert amount to words in Indian Numbering System (Lakhs, Crores)
function numberToWordsINR(amount) {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n) {
    let str = '';
    if (n > 99) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  const remainderCrore = num % 10000000;
  const lakh = Math.floor(remainderCrore / 100000);
  const remainderLakh = remainderCrore % 100000;
  const thousand = Math.floor(remainderLakh / 1000);
  const remainderThousand = remainderLakh % 1000;

  if (crore > 0) words += convertHundreds(crore) + ' Crore ';
  if (lakh > 0) words += convertHundreds(lakh) + ' Lakh ';
  if (thousand > 0) words += convertHundreds(thousand) + ' Thousand ';
  if (remainderThousand > 0) words += convertHundreds(remainderThousand);

  const paise = Math.round((Math.abs(Number(amount) || 0) - num) * 100);
  let result = words.trim() + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convertHundreds(paise) + ' Paise';
  }
  return result + ' Only';
}

module.exports = {
  round,
  add,
  subtract,
  multiply,
  divide,
  formatINR,
  numberToWordsINR
};
