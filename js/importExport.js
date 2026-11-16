// js/importExport.js - Import & Export Landed Cost Calculator with Frankfurter & Open-Meteo Weather

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let availablePorts = [];

export async function mountImportExport(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Import &amp; Export Landed Cost Calculator</h1>
        <p>Convert foreign invoices, compute customs tariffs, IGST assessables &amp; inspect port dispatch weather</p>
      </div>
    </div>

    <!-- Dockyard Animated Scene: Cargo Ship Docking in Port -->
    <div class="dockyard-scene" title="Maritime Cargo Ship Docking at Container Berth">
      <img src="assets/svg/cargo-ship.svg" class="dockyard-svg" alt="Cargo Vessel Docking">
    </div>

    <!-- Weather Widget & Live Exchange Alert Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- Open-Meteo Port Weather Widget -->
      <div class="card" style="border-left: 4px solid #2563EB;">
        <div class="card-header" style="padding:0.75rem 1.25rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            <strong style="font-size:0.85rem;">Maritime Port Weather Dispatch</strong>
          </div>
          <select id="ie-port-selector" class="form-select" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.75rem;">
            <!-- Ports injected -->
          </select>
        </div>
        <div class="card-body" style="padding:1rem 1.25rem;" id="ie-weather-display">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:1.5rem; font-weight:800;" id="w-temp">--°C</div>
              <div style="font-size:0.75rem; color:var(--text-muted);" id="w-advisory">Connecting to Open-Meteo...</div>
            </div>
            <div style="text-align:right; font-size:0.75rem; color:var(--text-secondary);">
              <div>Wind: <strong id="w-wind">-- km/h</strong></div>
              <div>Humidity: <strong id="w-humidity">--%</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Currency Status Box -->
      <div class="card" style="border-left: 4px solid #059669;">
        <div class="card-header" style="padding:0.75rem 1.25rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <strong style="font-size:0.85rem;">Foreign Exchange Conversion Rate</strong>
          </div>
        </div>
        <div class="card-body" style="padding:1rem 1.25rem;">
          <div style="font-size:1.5rem; font-weight:800; color:var(--status-success-text);" id="fx-rate-display">
            1 USD = ₹ 84.50
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;" id="fx-source-note">
            Frankfurter Central Bank Exchange Rate API
          </div>
        </div>
      </div>
    </div>

    <!-- Inputs & Outputs Layout -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- Form Input Parameters -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Commercial Import Shipment Details</h2>
        </div>
        <div class="card-body">
          <form id="landed-cost-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Invoice Value <span class="required-star">*</span></label>
                <input type="number" id="ie-prod-val" class="form-input" min="1" step="0.01" value="10000" required>
              </div>
              <div class="form-group">
                <label class="form-label">Currency <span class="required-star">*</span></label>
                <select id="ie-currency" class="form-select">
                  <option value="USD" selected>USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                  <option value="AED">AED (د.إ - UAE Dirham)</option>
                  <option value="CNY">CNY (¥ - Chinese Yuan)</option>
                  <option value="JPY">JPY (¥ - Japanese Yen)</option>
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Manual Exchange Rate Override (Optional Fallback)</label>
              <input type="number" id="ie-manual-rate" class="form-input" placeholder="Leave empty for live auto-conversion" step="0.01">
              <span style="font-size:0.7rem; color:var(--text-muted);">Useful if internet or foreign rate service is offline</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Quantity (Units) <span class="required-star">*</span></label>
                <input type="number" id="ie-qty" class="form-input" min="1" value="100" required>
              </div>
              <div class="form-group">
                <label class="form-label">Ocean / Air Freight</label>
                <input type="number" id="ie-freight" class="form-input" min="0" value="800" placeholder="In invoice currency">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Transit Marine Insurance</label>
                <input type="number" id="ie-insurance" class="form-input" min="0" value="120" placeholder="In invoice currency">
              </div>
              <div class="form-group">
                <label class="form-label">Basic Customs Duty (BCD %)</label>
                <input type="number" id="ie-bcd-rate" class="form-input" min="0" max="100" step="0.5" value="7.5">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Import IGST Tax Slab %</label>
                <select id="ie-igst-rate" class="form-select">
                  <option value="18" selected>18% Standard Industrial GST</option>
                  <option value="12">12% GST</option>
                  <option value="28">28% Heavy Machinery</option>
                  <option value="5">5% Essential Goods</option>
                  <option value="0">0% Duty Free</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Port &amp; Demurrage Handling (₹)</label>
                <input type="number" id="ie-port-charges" class="form-input" min="0" value="15000">
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;" id="btn-calc-landed">
              Compute Total Landed Cost (INR)
            </button>
          </form>
        </div>
      </div>

      <!-- Output Summary & Stacked Bar Breakdown Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Landed Tariff &amp; Cost Breakdown</h2>
        </div>
        <div class="card-body">
          <div class="kpi-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:1rem;">
            <div style="background:var(--bg-surface-alt); padding:0.75rem 1rem; border-radius:var(--radius-sm);">
              <span style="font-size:0.72rem; color:var(--text-muted);">Total Landed Cost (INR)</span>
              <div style="font-size:1.35rem; font-weight:800; color:var(--status-info-text);" id="res-total-landed">₹ 0.00</div>
            </div>
            <div style="background:var(--bg-surface-alt); padding:0.75rem 1rem; border-radius:var(--radius-sm);">
              <span style="font-size:0.72rem; color:var(--text-muted);">Per-Unit Landed Cost</span>
              <div style="font-size:1.35rem; font-weight:800; color:var(--status-success-text);" id="res-unit-landed">₹ 0.00</div>
            </div>
          </div>

          <!-- Stacked Cost Breakdown Chart -->
          <div id="ie-breakdown-chart" style="height: 180px; position: relative; margin-bottom:1rem;">
            <!-- Chart -->
          </div>

          <table class="data-table" style="font-size:0.8rem;">
            <tbody>
              <tr>
                <td>FOB Goods Value (in INR):</td>
                <td class="table-col-num" id="row-fob">₹ 0.00</td>
              </tr>
              <tr>
                <td>CIF Base (FOB + Freight + Insurance):</td>
                <td class="table-col-num" id="row-cif">₹ 0.00</td>
              </tr>
              <tr>
                <td>Basic Customs Duty (BCD) + SWS Surcharge:</td>
                <td class="table-col-num" style="color:var(--status-warning-text);" id="row-bcd">₹ 0.00</td>
              </tr>
              <tr>
                <td>Import Integrated GST (IGST Credit):</td>
                <td class="table-col-num" style="color:var(--status-info-text);" id="row-igst">₹ 0.00</td>
              </tr>
              <tr>
                <td>Terminal Clearance &amp; Port Handling:</td>
                <td class="table-col-num" id="row-port">₹ 0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Fetch initial ports & weather
  await initPortWeatherAndRates(container);

  const form = container.querySelector('#landed-cost-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateLandedCost();
  });

  const currencySelect = container.querySelector('#ie-currency');
  currencySelect.addEventListener('change', () => {
    fetchRateForCurrency(currencySelect.value);
  });

  calculateLandedCost();
}

async function initPortWeatherAndRates(container) {
  try {
    const res = await api.get('/api/import-export', { port: 'JNPT_Mumbai', currency: 'USD' });
    availablePorts = res.availablePorts || [];
    const portSelect = container.querySelector('#ie-port-selector');
    availablePorts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.key;
      opt.textContent = p.name;
      portSelect.appendChild(opt);
    });

    portSelect.addEventListener('change', async () => {
      const pRes = await api.get('/api/import-export', { port: portSelect.value, currency: 'USD' });
      updateWeatherDisplay(pRes.weather);
    });

    updateWeatherDisplay(res.weather);
    updateRateDisplay(res.rateInfo, 'USD');
  } catch (err) {}
}

function updateWeatherDisplay(weather) {
  if (!weather) return;
  document.getElementById('w-temp').textContent = weather.temperature;
  document.getElementById('w-advisory').textContent = weather.advisory;
  document.getElementById('w-wind').textContent = weather.windSpeed;
  document.getElementById('w-humidity').textContent = weather.humidity;
}

function updateRateDisplay(rateInfo, curr) {
  if (!rateInfo) return;
  document.getElementById('fx-rate-display').textContent = `1 ${curr} = ₹ ${rateInfo.rate.toFixed(2)}`;
  document.getElementById('fx-source-note').textContent = rateInfo.isLive
    ? 'Live Real-Time Rate via Frankfurter Central Bank API'
    : rateInfo.fallbackReason || 'Official Benchmark Rate (Cached)';
}

async function fetchRateForCurrency(curr) {
  try {
    const res = await api.get('/api/import-export', { currency: curr });
    updateRateDisplay(res.rateInfo, curr);
    calculateLandedCost();
  } catch (err) {}
}

async function calculateLandedCost() {
  const product_value = parseFloat(document.getElementById('ie-prod-val').value) || 0;
  const currency = document.getElementById('ie-currency').value;
  const quantity = parseInt(document.getElementById('ie-qty').value, 10) || 1;
  const freight = parseFloat(document.getElementById('ie-freight').value) || 0;
  const insurance = parseFloat(document.getElementById('ie-insurance').value) || 0;
  const customs_duty_pct = parseFloat(document.getElementById('ie-bcd-rate').value) || 0;
  const igst_pct = parseFloat(document.getElementById('ie-igst-rate').value) || 0;
  const port_charges_inr = parseFloat(document.getElementById('ie-port-charges').value) || 0;
  const manual_exchange_rate = parseFloat(document.getElementById('ie-manual-rate').value) || null;
  const port_key = document.getElementById('ie-port-selector')?.value || 'JNPT_Mumbai';

  try {
    const res = await api.post('/api/import-export', {
      product_value,
      currency,
      quantity,
      freight,
      insurance,
      customs_duty_pct,
      igst_pct,
      port_charges_inr,
      manual_exchange_rate,
      port_key
    });

    const { costs, breakdown, exchangeRateUsed } = res;

    document.getElementById('res-total-landed').textContent = ui.formatINR(costs.totalLandedCost);
    document.getElementById('res-unit-landed').textContent = ui.formatINR(costs.perUnitLandedCost);

    document.getElementById('row-fob').textContent = ui.formatINR(costs.goodsValueINR);
    document.getElementById('row-cif').textContent = ui.formatINR(costs.cifValueINR);
    document.getElementById('row-bcd').textContent = ui.formatINR(costs.bcdAmount + costs.swsAmount);
    document.getElementById('row-igst').textContent = ui.formatINR(costs.igstAmount);
    document.getElementById('row-port').textContent = ui.formatINR(costs.portChargesINR);

    updateRateDisplay(exchangeRateUsed, currency);

    // Render Stacked Bar Breakdown Chart
    charts.bar('ie-breakdown-chart', {
      labels: ['Shipment Landed Cost Breakdown'],
      stacked: true,
      datasets: breakdown.map(b => ({
        label: b.name,
        data: [b.amount],
        backgroundColor: b.color
      }))
    });
  } catch (err) {
    ui.toast(err.message, 'error');
  }
}
