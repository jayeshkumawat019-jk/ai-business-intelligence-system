// js/sales.js - Sales Management UI with Daily/Monthly/Yearly Views & Stock Deduction

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let currentView = 'list'; // 'list' | 'monthly' | 'yearly'
let salesData = [];
let monthlyData = [];
let yearlyData = [];

export async function mountSales(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Sales Management</h1>
        <p>Record transactions, monitor sales performance across timeframes &amp; auto-track inventory deduction</p>
      </div>
      <div class="filter-actions-row">
        <div class="btn-group" style="display:inline-flex; border:1px solid var(--border-strong); border-radius:var(--radius-sm); overflow:hidden;">
          <button type="button" class="btn btn-sm ${currentView === 'list' ? 'btn-primary' : 'btn-ghost'}" id="btn-view-list">Daily / All</button>
          <button type="button" class="btn btn-sm ${currentView === 'monthly' ? 'btn-primary' : 'btn-ghost'}" id="btn-view-monthly">Monthly</button>
          <button type="button" class="btn btn-sm ${currentView === 'yearly' ? 'btn-primary' : 'btn-ghost'}" id="btn-view-yearly">Yearly</button>
        </div>
        <button type="button" class="btn btn-primary" id="btn-new-sale">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Sale
        </button>
      </div>
    </div>

    <!-- Chart Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title" id="sales-chart-title">Revenue Trajectory</h2>
          <span class="card-subtitle" id="sales-chart-subtitle">Aggregated sales performance</span>
        </div>
      </div>
      <div class="card-body">
        <div id="sales-chart-container" style="height: 280px; position: relative;">
          <!-- Chart.js canvas injected here -->
        </div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Sales Records</h2>
        <div class="filter-search-box">
          <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="sales-search-input" placeholder="Search customer or product..." style="padding-left: 2.2rem; font-size: 0.8rem;">
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="sales-table-wrapper">
          <!-- Table dynamically injected -->
        </div>
      </div>
    </div>
  `;

  // Bind view toggle buttons
  container.querySelector('#btn-view-list').addEventListener('click', () => switchView('list'));
  container.querySelector('#btn-view-monthly').addEventListener('click', () => switchView('monthly'));
  container.querySelector('#btn-view-yearly').addEventListener('click', () => switchView('yearly'));

  container.querySelector('#btn-new-sale').addEventListener('click', openNewSaleModal);

  const searchInput = container.querySelector('#sales-search-input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    filterTable(term);
  });

  await loadSales();
}

async function loadSales() {
  const tableWrap = document.getElementById('sales-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/sales', { view: currentView });
    salesData = res.sales || [];
    if (currentView === 'monthly') monthlyData = res.summary || [];
    if (currentView === 'yearly') yearlyData = res.summary || [];

    renderChart();
    renderTable(salesData);
  } catch (err) {
    ui.toast(`Failed to load sales: ${err.message}`, 'error');
  }
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('#btn-view-list, #btn-view-monthly, #btn-view-yearly').forEach(btn => {
    btn.className = `btn btn-sm ${btn.id === `btn-view-${view}` ? 'btn-primary' : 'btn-ghost'}`;
  });
  loadSales();
}

function renderChart() {
  const chartTitle = document.getElementById('sales-chart-title');
  const chartSubtitle = document.getElementById('sales-chart-subtitle');

  if (currentView === 'monthly' && monthlyData.length > 0) {
    chartTitle.textContent = 'Monthly Sales Revenue';
    chartSubtitle.textContent = 'Last 12+ months trend';
    charts.bar('sales-chart-container', {
      labels: monthlyData.map(d => d.month),
      datasets: [{
        label: 'Monthly Revenue (₹)',
        data: monthlyData.map(d => d.total_amount),
        backgroundColor: '#2563EB'
      }]
    });
  } else if (currentView === 'yearly' && yearlyData.length > 0) {
    chartTitle.textContent = 'Yearly Sales Revenue';
    chartSubtitle.textContent = 'Annual turnover comparisons';
    charts.bar('sales-chart-container', {
      labels: yearlyData.map(d => d.year),
      datasets: [{
        label: 'Annual Revenue (₹)',
        data: yearlyData.map(d => d.total_amount),
        backgroundColor: '#059669'
      }]
    });
  } else {
    // Recent 15 daily sales
    chartTitle.textContent = 'Recent Sales Distribution';
    chartSubtitle.textContent = 'Latest transactions by value';
    const recent = salesData.slice(0, 15).reverse();
    charts.bar('sales-chart-container', {
      labels: recent.map(s => `${ui.formatDate(s.sale_date)} (${s.product_name.slice(0, 14)}...)`),
      datasets: [{
        label: 'Sale Value (₹)',
        data: recent.map(s => s.amount),
        backgroundColor: '#D97706'
      }]
    });
  }
}

function renderTable(items) {
  const tableWrap = document.getElementById('sales-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Sales Recorded</h3>
        <p class="empty-desc">Begin recording your commercial sales transactions to see them appear here.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Customer</th>
          <th>Product / SKU</th>
          <th class="table-col-num">Qty</th>
          <th class="table-col-num">Rate</th>
          <th class="table-col-num">Total Amount</th>
          <th>Payment</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(s => `
          <tr data-sale-id="${s.id}">
            <td>${ui.formatDate(s.sale_date)}</td>
            <td><strong>${ui.escapeHtml(s.customer_name)}</strong></td>
            <td>
              <div>${ui.escapeHtml(s.product_name)}</div>
              <span style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${ui.escapeHtml(s.product_sku)}</span>
            </td>
            <td class="table-col-num">${s.quantity}</td>
            <td class="table-col-num">${ui.formatINR(s.unit_price)}</td>
            <td class="table-col-num" style="font-weight:700;">${ui.formatINR(s.amount)}</td>
            <td><span class="chip chip-neutral">${ui.escapeHtml(s.payment_mode)}</span></td>
            <td style="text-align:right;">
              <button type="button" class="btn-ghost btn-sm btn-delete-sale" data-id="${s.id}" title="Delete Sale">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  tableWrap.querySelectorAll('.btn-delete-sale').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const saleId = e.currentTarget.dataset.id;
      if (confirm('Are you sure you want to delete this sale? This will automatically restore the product stock.')) {
        try {
          await api.delete('/api/sales', { id: saleId });
          ui.toast('Sale deleted and inventory stock restored.', 'success');
          loadSales();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function filterTable(term) {
  if (!term) {
    renderTable(salesData);
    return;
  }
  const filtered = salesData.filter(s =>
    (s.customer_name && s.customer_name.toLowerCase().includes(term)) ||
    (s.product_name && s.product_name.toLowerCase().includes(term)) ||
    (s.payment_mode && s.payment_mode.toLowerCase().includes(term))
  );
  renderTable(filtered);
}

async function openNewSaleModal() {
  // Fetch available products and customers
  let products = [];
  let customers = [];
  try {
    const [pRes, cRes] = await Promise.all([
      api.get('/api/inventory'),
      api.get('/api/customers')
    ]);
    products = pRes.products || [];
    customers = cRes.customers || [];
  } catch (err) {
    ui.toast('Failed to load products/customers for sale', 'error');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const contentHtml = `
    <form id="new-sale-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Sale Date <span class="required-star">*</span></label>
          <input type="date" id="ns-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Payment Mode <span class="required-star">*</span></label>
          <select id="ns-payment-mode" class="form-select" required>
            <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
            <option value="UPI" selected>UPI</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Credit">Credit (30 Days)</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Customer <span class="required-star">*</span></label>
        <select id="ns-customer" class="form-select" required>
          <option value="">-- Choose Customer --</option>
          ${customers.map(c => `<option value="${c.id}">${ui.escapeHtml(c.name)} (${c.city || 'India'})</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Product <span class="required-star">*</span></label>
        <select id="ns-product" class="form-select" required>
          <option value="">-- Choose Product --</option>
          ${products.map(p => `
            <option value="${p.id}" data-price="${p.selling_price}" data-stock="${p.stock}" data-unit="${p.unit || 'pcs'}">
              ${ui.escapeHtml(p.name)} [SKU: ${p.sku}] - Stock: ${p.stock} ${p.unit || 'pcs'} (₹${p.selling_price})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Quantity <span class="required-star">*</span></label>
          <input type="number" id="ns-qty" class="form-input" min="1" value="1" required>
          <span id="ns-stock-hint" style="font-size:0.72rem; color:var(--text-muted);"></span>
        </div>
        <div class="form-group">
          <label class="form-label">Unit Price (₹) <span class="required-star">*</span></label>
          <input type="number" id="ns-unit-price" class="form-input" min="0" step="0.01" required>
        </div>
        <div class="form-group">
          <label class="form-label">Total Amount (₹)</label>
          <input type="text" id="ns-total" class="form-input" readonly style="background:var(--bg-app); font-weight:700;">
        </div>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Record Commercial Sale',
    contentHtml,
    confirmText: 'Complete Sale',
    onConfirm: async (bodyEl) => {
      const saleDate = bodyEl.querySelector('#ns-date').value;
      const customerId = bodyEl.querySelector('#ns-customer').value;
      const productId = bodyEl.querySelector('#ns-product').value;
      const quantity = parseInt(bodyEl.querySelector('#ns-qty').value, 10);
      const unitPrice = parseFloat(bodyEl.querySelector('#ns-unit-price').value);
      const paymentMode = bodyEl.querySelector('#ns-payment-mode').value;

      if (!saleDate || !customerId || !productId || !quantity || isNaN(unitPrice)) {
        throw new Error('Please fill in all mandatory fields.');
      }

      await api.post('/api/sales', {
        sale_date: saleDate,
        customer_id: customerId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        amount: Math.round(quantity * unitPrice * 100) / 100,
        payment_mode: paymentMode
      });

      ui.toast('Sale recorded successfully & inventory stock deducted!', 'success');
      loadSales();
      return true;
    }
  });

  // Wire auto-calculation
  const modalEl = document.getElementById('global-modal-backdrop');
  if (modalEl) {
    const prodSelect = modalEl.querySelector('#ns-product');
    const unitPriceInput = modalEl.querySelector('#ns-unit-price');
    const qtyInput = modalEl.querySelector('#ns-qty');
    const totalInput = modalEl.querySelector('#ns-total');
    const stockHint = modalEl.querySelector('#ns-stock-hint');

    const updateCalc = () => {
      const q = parseFloat(qtyInput.value) || 0;
      const p = parseFloat(unitPriceInput.value) || 0;
      totalInput.value = ui.formatINR(q * p);
    };

    prodSelect.addEventListener('change', () => {
      const opt = prodSelect.selectedOptions[0];
      if (opt && opt.dataset.price) {
        unitPriceInput.value = opt.dataset.price;
        stockHint.textContent = `Current available: ${opt.dataset.stock} ${opt.dataset.unit}`;
      } else {
        stockHint.textContent = '';
      }
      updateCalc();
    });

    qtyInput.addEventListener('input', updateCalc);
    unitPriceInput.addEventListener('input', updateCalc);
  }
}
