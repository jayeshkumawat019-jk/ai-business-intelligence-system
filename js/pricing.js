// js/pricing.js - Product Pricing Calculator UI with Margin vs Markup & Break-even

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let catalogProducts = [];

export async function mountPricing(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Product Pricing &amp; Margin Calculator</h1>
        <p>Optimize wholesale selling price, margin vs. markup ratio &amp; compute factory break-even production volume</p>
      </div>
      <div class="filter-actions-row">
        <select class="form-select" id="pricing-load-product" style="width: 220px; font-size:0.8rem;">
          <option value="">-- Load from Existing Product --</option>
        </select>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- Inputs Form Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Cost &amp; Profit Target Parameters</h2>
        </div>
        <div class="card-body">
          <form id="pricing-calc-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Direct Cost per Unit (₹) <span class="required-star">*</span></label>
                <input type="number" id="pc-direct-cost" class="form-input" min="0" step="0.01" value="2500" required>
                <span style="font-size:0.7rem; color:var(--text-muted);">Raw materials &amp; machine labor</span>
              </div>
              <div class="form-group">
                <label class="form-label">Overhead Allocation (₹) <span class="required-star">*</span></label>
                <input type="number" id="pc-overhead" class="form-input" min="0" step="0.01" value="500" required>
                <span style="font-size:0.7rem; color:var(--text-muted);">Electricity, rent &amp; admin share</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Desired Margin % <span class="required-star">*</span></label>
                <input type="number" id="pc-margin" class="form-input" min="1" max="95" step="0.5" value="30" required>
                <span style="font-size:0.7rem; color:var(--text-muted);">Gross margin percentage on price</span>
              </div>
              <div class="form-group">
                <label class="form-label">GST Tax Slab %</label>
                <select id="pc-gst" class="form-select">
                  <option value="18" selected>18% Standard GST</option>
                  <option value="12">12% GST</option>
                  <option value="5">5% Concessional</option>
                  <option value="28">28% Luxury/Heavy</option>
                  <option value="0">0% Exempt</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Allowed Trade Discount %</label>
                <input type="number" id="pc-discount" class="form-input" min="0" max="60" value="5">
                <span style="font-size:0.7rem; color:var(--text-muted);">Buffer for dealer discounts</span>
              </div>
              <div class="form-group">
                <label class="form-label">Monthly Fixed Costs (₹)</label>
                <input type="number" id="pc-fixed-costs" class="form-input" min="0" value="150000">
                <span style="font-size:0.7rem; color:var(--text-muted);">For break-even volume</span>
              </div>
            </div>

            <div style="display:flex; gap:0.75rem; margin-top:1rem;">
              <button type="submit" class="btn btn-primary" id="btn-calc-price" style="flex:1;">
                Calculate Pricing Model
              </button>
              <button type="button" class="btn btn-secondary" id="btn-save-to-product">
                Save to Product
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Results & Breakdown Card -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Commercial Outputs &amp; Margins</h2>
        </div>
        <div class="card-body">
          <div class="kpi-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:1rem;">
            <div style="background:var(--bg-surface-alt); padding:0.75rem 1rem; border-radius:var(--radius-sm);">
              <span style="font-size:0.72rem; color:var(--text-muted);">Recommended Wholesale Price</span>
              <div style="font-size:1.4rem; font-weight:800; color:var(--status-info-text);" id="res-selling-price">₹ 0.00</div>
            </div>
            <div style="background:var(--bg-surface-alt); padding:0.75rem 1rem; border-radius:var(--radius-sm);">
              <span style="font-size:0.72rem; color:var(--text-muted);">Net Profit per Unit</span>
              <div style="font-size:1.4rem; font-weight:800; color:var(--status-success-text);" id="res-unit-profit">₹ 0.00</div>
            </div>
          </div>

          <table class="data-table" style="font-size:0.8rem; margin-bottom:1rem;">
            <tbody>
              <tr>
                <td>Total Production Cost:</td>
                <td class="table-col-num" id="res-total-cost">₹ 0.00</td>
              </tr>
              <tr>
                <td>Target Margin vs. Markup:</td>
                <td class="table-col-num">
                  <span id="res-margin-display">0%</span> Margin / <strong id="res-markup-display" style="color:var(--status-info-text);">0%</strong> Markup
                </td>
              </tr>
              <tr>
                <td>List Price (with Discount Buffer):</td>
                <td class="table-col-num" id="res-list-price">₹ 0.00</td>
              </tr>
              <tr>
                <td>GST Component Amount:</td>
                <td class="table-col-num" id="res-gst-amount">₹ 0.00</td>
              </tr>
              <tr style="font-weight:700;">
                <td>Final Invoice Price (Incl. GST):</td>
                <td class="table-col-num" id="res-final-price">₹ 0.00</td>
              </tr>
              <tr style="background:var(--bg-app); font-weight:700;">
                <td>Factory Break-Even Production Volume:</td>
                <td class="table-col-num" style="color:var(--status-warning-text);" id="res-breakeven">0 units/mo</td>
              </tr>
            </tbody>
          </table>

          <!-- Margin Breakdown Bar Chart -->
          <div id="pricing-margin-chart" style="height: 140px; position: relative;">
            <!-- Chart -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Load existing products for dropdown
  loadProductsDropdown(container);

  const form = container.querySelector('#pricing-calc-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculatePricing();
  });

  container.querySelector('#btn-save-to-product').addEventListener('click', saveToSelectedProduct);

  calculatePricing();
}

async function loadProductsDropdown(container) {
  try {
    const res = await api.get('/api/pricing');
    catalogProducts = res.products || [];
    const select = container.querySelector('#pricing-load-product');
    catalogProducts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (SKU: ${p.sku}) - Current ₹${p.selling_price}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      const p = catalogProducts.find(item => item.id === select.value);
      if (p) {
        document.getElementById('pc-direct-cost').value = p.cost_price * 0.8;
        document.getElementById('pc-overhead').value = p.cost_price * 0.2;
        calculatePricing();
      }
    });
  } catch (err) {}
}

async function calculatePricing() {
  const direct_cost = parseFloat(document.getElementById('pc-direct-cost').value) || 0;
  const overhead_allocation = parseFloat(document.getElementById('pc-overhead').value) || 0;
  const desired_margin_pct = parseFloat(document.getElementById('pc-margin').value) || 0;
  const gst_rate = parseFloat(document.getElementById('pc-gst').value) || 18;
  const discount_pct = parseFloat(document.getElementById('pc-discount').value) || 0;
  const fixed_overhead_monthly = parseFloat(document.getElementById('pc-fixed-costs').value) || 100000;

  try {
    const res = await api.post('/api/pricing', {
      direct_cost,
      overhead_allocation,
      desired_margin_pct,
      gst_rate,
      discount_pct,
      fixed_overhead_monthly
    });

    const { results, marginChart } = res;

    document.getElementById('res-selling-price').textContent = ui.formatINR(results.baseSellingPrice);
    document.getElementById('res-unit-profit').textContent = ui.formatINR(results.unitProfit);
    document.getElementById('res-total-cost').textContent = ui.formatINR(results.totalUnitCost);
    document.getElementById('res-margin-display').textContent = `${desired_margin_pct}%`;
    document.getElementById('res-markup-display').textContent = `${results.markupPct}%`;
    document.getElementById('res-list-price').textContent = ui.formatINR(results.listPrice);
    document.getElementById('res-gst-amount').textContent = ui.formatINR(results.gstAmount);
    document.getElementById('res-final-price').textContent = ui.formatINR(results.finalMspInclusiveTax);
    document.getElementById('res-breakeven').textContent = `${results.breakEvenUnits} units`;

    // Render Component Breakdown Bar Chart
    charts.bar('pricing-margin-chart', {
      labels: marginChart.map(m => m.component),
      datasets: [{
        label: 'Price Component (₹)',
        data: marginChart.map(m => m.amount),
        backgroundColor: marginChart.map(m => m.color)
      }]
    });
  } catch (err) {
    ui.toast(err.message, 'error');
  }
}

async function saveToSelectedProduct() {
  const select = document.getElementById('pricing-load-product');
  const productId = select.value;
  if (!productId) {
    ui.toast('Please select a product from the dropdown above to update its pricing in catalog.', 'info');
    return;
  }

  const direct_cost = parseFloat(document.getElementById('pc-direct-cost').value) || 0;
  const overhead_allocation = parseFloat(document.getElementById('pc-overhead').value) || 0;
  const desired_margin_pct = parseFloat(document.getElementById('pc-margin').value) || 0;

  try {
    await api.post('/api/pricing', {
      action: 'save_to_product',
      product_id: productId,
      direct_cost,
      overhead_allocation,
      desired_margin_pct
    });
    ui.toast('Product selling price and cost updated in inventory catalog!', 'success');
  } catch (err) {
    ui.toast(err.message, 'error');
  }
}
