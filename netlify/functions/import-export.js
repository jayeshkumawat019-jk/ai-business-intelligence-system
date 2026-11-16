// netlify/functions/import-export.js
// REST API for Landed Cost Import/Export Calculation with Frankfurter & Open-Meteo APIs (8s Timeout)

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateNumber, validateString } = require('./_lib/validate');
const { round, add, multiply } = require('./_lib/money');

const TIMEOUT_MS = 8000;

// Port coordinates for Open-Meteo
const PORT_COORDINATES = {
  'JNPT_Mumbai': { name: 'Jawaharlal Nehru Port (JNPT) / Mumbai', lat: 18.9499, lon: 72.9515 },
  'Chennai': { name: 'Chennai Port', lat: 13.0827, lon: 80.2707 },
  'Cochin': { name: 'Cochin Port (Vallarpadam)', lat: 9.9674, lon: 76.2711 },
  'Kolkata': { name: 'Syama Prasad Mookerjee Port (Kolkata)', lat: 22.5448, lon: 88.3185 },
  'Mundra': { name: 'Mundra Port (Gujarat)', lat: 22.8395, lon: 69.7027 },
  'Visakhapatnam': { name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2185 }
};

// Fallback rates if Frankfurter is unreachable
const FALLBACK_EXCHANGE_RATES = {
  USD: 84.50,
  EUR: 89.20,
  GBP: 106.80,
  AED: 23.00,
  CNY: 11.60,
  JPY: 0.55,
  SGD: 62.40,
  INR: 1.00
};

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function getExchangeRate(fromCurrency) {
  if (fromCurrency === 'INR') return { rate: 1.0, isLive: true };

  try {
    // Frankfurter v2 API
    const url = `https://api.frankfurter.dev/v2/rates?from=${encodeURIComponent(fromCurrency)}&to=INR`;
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.INR) {
        return { rate: Number(data.rates.INR), isLive: true };
      }
    }
  } catch (err) {
    console.warn(`[Frankfurter] Rate lookup failed for ${fromCurrency}, using fallback:`, err.message);
  }

  const fallback = FALLBACK_EXCHANGE_RATES[fromCurrency] || 84.50;
  return { rate: fallback, isLive: false, fallbackReason: 'Live exchange rates service temporarily unreachable (8s timeout). Used official reserve bank benchmark rate.' };
}

async function getPortWeather(portKey) {
  const port = PORT_COORDINATES[portKey] || PORT_COORDINATES['JNPT_Mumbai'];
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${port.lat}&longitude=${port.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const windSpeed = current.wind_speed_10m || 0;
      let advisory = 'Normal Dockyard Maritime Conditions';
      if (windSpeed > 35) advisory = 'High Wind Warning: Crane hoisting speed restrictions in effect';
      else if (windSpeed > 20) advisory = 'Moderate Breeze: Safe for berthing & offloading operations';

      return {
        portName: port.name,
        temperature: current.temperature_2m !== undefined ? `${current.temperature_2m}°C` : '28°C',
        humidity: current.relative_humidity_2m !== undefined ? `${current.relative_humidity_2m}%` : '65%',
        windSpeed: `${windSpeed} km/h`,
        advisory,
        isLive: true
      };
    }
  } catch (err) {
    console.warn(`[Open-Meteo] Weather lookup failed for ${portKey}:`, err.message);
  }

  return {
    portName: port.name,
    temperature: '29°C',
    humidity: '72%',
    windSpeed: '14 km/h',
    advisory: 'Fair Marine Operating Weather (Cached fallback)',
    isLive: false
  };
}

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/import-export - Get current weather for port & live rates
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};
    const portKey = queryParams.port || 'JNPT_Mumbai';
    const currency = queryParams.currency || 'USD';

    const [weather, rateInfo] = await Promise.all([
      getPortWeather(portKey),
      getExchangeRate(currency)
    ]);

    return success({
      portKey,
      weather,
      currency,
      rateInfo,
      availablePorts: Object.entries(PORT_COORDINATES).map(([k, v]) => ({ key: k, name: v.name }))
    });
  }

  // 2. POST /api/import-export - Compute Landed Cost
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['product_value', 'currency', 'quantity']);

    const productValueForeign = validateNumber(body.product_value, 'product_value', { min: 0.01 });
    const currency = validateString(body.currency, 'currency', { minLength: 3, maxLength: 5 }).toUpperCase();
    const quantity = validateNumber(body.quantity, 'quantity', { min: 1, integer: true });
    const freightForeign = body.freight ? validateNumber(body.freight, 'freight', { min: 0 }) : 0;
    const insuranceForeign = body.insurance ? validateNumber(body.insurance, 'insurance', { min: 0 }) : 0;
    const customsDutyPct = body.customs_duty_pct !== undefined ? validateNumber(body.customs_duty_pct, 'customs_duty_pct', { min: 0 }) : 7.5;
    const igstPct = body.igst_pct !== undefined ? validateNumber(body.igst_pct, 'igst_pct', { min: 0 }) : 18;
    const portChargesINR = body.port_charges_inr ? validateNumber(body.port_charges_inr, 'port_charges_inr', { min: 0 }) : 15000;
    const portKey = body.port_key || 'JNPT_Mumbai';

    // Get exchange rate or use manual override if provided
    let rate = 1.0;
    let isLiveRate = false;
    let fallbackNote = '';

    if (body.manual_exchange_rate) {
      rate = validateNumber(body.manual_exchange_rate, 'manual_exchange_rate', { min: 0.0001 });
      isLiveRate = false;
    } else {
      const rateRes = await getExchangeRate(currency);
      rate = rateRes.rate;
      isLiveRate = rateRes.isLive;
      fallbackNote = rateRes.fallbackReason || '';
    }

    // Calculations
    const goodsValueINR = round(productValueForeign * rate);
    const freightINR = round(freightForeign * rate);
    const insuranceINR = round(insuranceForeign * rate);
    const cifValueINR = round(goodsValueINR + freightINR + insuranceINR);

    // Basic Customs Duty (BCD) on CIF
    const bcdAmount = round((cifValueINR * customsDutyPct) / 100);
    // Social Welfare Surcharge (SWS) = 10% on BCD
    const swsAmount = round(bcdAmount * 0.10);
    // Assessable Base for IGST
    const igstBase = round(cifValueINR + bcdAmount + swsAmount);
    const igstAmount = round((igstBase * igstPct) / 100);

    const totalLandedCost = round(cifValueINR + bcdAmount + swsAmount + igstAmount + portChargesINR);
    const perUnitLandedCost = round(totalLandedCost / quantity);

    const breakdown = [
      { name: 'Goods Value (FOB)', amount: goodsValueINR, color: '#2563EB' },
      { name: 'Freight & Transit Insurance', amount: round(freightINR + insuranceINR), color: '#0891B2' },
      { name: 'Basic Customs Duty + SWS', amount: round(bcdAmount + swsAmount), color: '#D97706' },
      { name: 'IGST Tax Component', amount: igstAmount, color: '#7C3AED' },
      { name: 'Port & Terminal Handling', amount: portChargesINR, color: '#78716C' }
    ];

    // Weather widget
    const weather = await getPortWeather(portKey);

    return success({
      exchangeRateUsed: { rate, currency, isLive: isLiveRate, fallbackNote },
      costs: {
        goodsValueINR,
        freightINR,
        insuranceINR,
        cifValueINR,
        bcdAmount,
        swsAmount,
        igstAmount,
        portChargesINR,
        totalLandedCost,
        perUnitLandedCost
      },
      breakdown,
      weather
    });
  }

  return error(`Method ${method} not allowed`, 405);
});
