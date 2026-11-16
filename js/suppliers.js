// js/suppliers.js - Supplier Management UI with Payables, Purchase Logs, Spend Chart & Truck Animation

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let supplierList = [];
let spendPerSupplier = [];

export async function mountSuppliers(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Supplier &amp; Vendor Management</h1>
        <p>Oversee raw material vendors, purchase orders &amp; outstanding trade payables</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-secondary" id="btn-record-purchase">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Record Purchase
        </button>
        <button type="button" class="btn btn-primary" id="btn-new-supplier">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Supplier
        </button>
      </div>
    </div>

    <!-- Dockyard Animated Scene: Container Truck Driving Across -->
    <div class="dockyard-scene" title="Industrial Logistics: Container Truck in Transit">
      <img src="assets/svg/truck.svg" class="dockyard-svg" alt="Container Truck Driving Across">
    </div>

    <!-- KPI Payables & Spend Chart Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div class="kpi-card" style="justify-content: center;">
        <div class="kpi-header">
          <span class="kpi-label">Total Outstanding Payables</span>
          <div class="kpi-icon-pill" style="color:var(--status-danger-text); background-color:var(--status-danger-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-danger-text); margin-top:0.5rem;" id="sup-grand-owed">-</div>
        <div class="kpi-footer">Due to material suppliers &amp; distributors</div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Procurement Spend by Supplier</h2>
            <span class="card-subtitle">Annual procurement volume</span>
          </div>
        </div>
        <div class="card-body">
          <div id="supplier-spend-chart" style="height: 180px; position: relative;">
            <!-- Chart -->
          </div>
        </div>
      </div>
    </div>

    <!-- Suppliers Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Registered Suppliers Directory</h2>
        <div class="filter-search-box">
          <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="suppliers-search-input" placeholder="Search supplier, contact, category..." style="padding-left: 2.2rem; font-size: 0.8rem;">
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="suppliers-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-new-supplier').addEventListener('click', openNewSupplierModal);
  container.querySelector('#btn-record-purchase').addEventListener('click', openRecordPurchaseModal);

  const searchInput = container.querySelector('#suppliers-search-input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = supplierList.filter(s =>
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.category && s.category.toLowerCase().includes(term)) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(term))
    );
    renderTable(filtered);
  });

  await loadSuppliers();
}

async function loadSuppliers() {
  const tableWrap = document.getElementById('suppliers-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/suppliers');
    supplierList = res.suppliers || [];
    spendPerSupplier = res.spendPerSupplier || [];

    document.getElementById('sup-grand-owed').textContent = ui.formatINR(res.grandTotalOwed || 0);

    renderChart();
    renderTable(supplierList);
  } catch (err) {
    ui.toast(`Failed to load suppliers: ${err.message}`, 'error');
  }
}

function renderChart() {
  if (spendPerSupplier.length > 0) {
    charts.bar('supplier-spend-chart', {
      labels: spendPerSupplier.map(s => s.name.slice(0, 15)),
      datasets: [{
        label: 'Procurement Spend (₹)',
        data: spendPerSupplier.map(s => s.total_purchases),
        backgroundColor: '#D97706'
      }]
    });
  }
}

function renderTable(items) {
  const tableWrap = document.getElementById('suppliers-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Suppliers Configured</h3>
        <p class="empty-desc">Register industrial suppliers to log purchases and balance outstandings.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Supplier Company</th>
          <th>Category</th>
          <th>Contact Person</th>
          <th>GSTIN</th>
          <th class="table-col-num">Total Billed</th>
          <th class="table-col-num">Amount Owed</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(s => `
          <tr data-supplier-id="${s.id}">
            <td>
              <strong>${ui.escapeHtml(s.name)}</strong>
              ${s.address ? `<div style="font-size:0.72rem; color:var(--text-muted);">${ui.escapeHtml(s.address)}</div>` : ''}
            </td>
            <td><span class="chip chip-info">${ui.escapeHtml(s.category || 'Vendor')}</span></td>
            <td>
              <div>${ui.escapeHtml(s.contact_person || '-')}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${ui.escapeHtml(s.phone || '')}</div>
            </td>
            <td><code style="font-size:0.75rem;">${ui.escapeHtml(s.gst_number || '-')}</code></td>
            <td class="table-col-num">${ui.formatINR(s.total_purchases)}</td>
            <td class="table-col-num" style="font-weight:700; ${s.amount_owed > 0 ? 'color:var(--status-danger-text);' : 'color:var(--status-success-text);'}">
              ${ui.formatINR(s.amount_owed)}
            </td>
            <td style="text-align:right;">
              <button type="button" class="btn-ghost btn-sm btn-delete-supplier" data-id="${s.id}" title="Delete Supplier">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  tableWrap.querySelectorAll('.btn-delete-supplier').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Delete this supplier record?')) {
        try {
          await api.delete('/api/suppliers', { id });
          ui.toast('Supplier deleted.', 'success');
          loadSuppliers();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openNewSupplierModal() {
  const contentHtml = `
    <form id="new-supplier-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Supplier Name <span class="required-star">*</span></label>
          <input type="text" id="ns-name" class="form-input" placeholder="e.g. Jindal Steel & Alloys Corp" required>
        </div>
        <div class="form-group">
          <label class="form-label">Category <span class="required-star">*</span></label>
          <input type="text" id="ns-cat" class="form-input" placeholder="e.g. Raw Material, Bearings, Motors" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Contact Person</label>
          <input type="text" id="ns-contact" class="form-input" placeholder="e.g. Mr. R. K. Jindal">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="tel" id="ns-phone" class="form-input" placeholder="+91 98111 00000">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="ns-email" class="form-input" placeholder="sales@vendor.in">
        </div>
        <div class="form-group">
          <label class="form-label">GSTIN</label>
          <input type="text" id="ns-gst" class="form-input" placeholder="27AABCS9876Q1Z2" style="text-transform:uppercase;">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Address</label>
        <textarea id="ns-address" class="form-textarea" rows="2" placeholder="Plant / warehouse location"></textarea>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Register Industrial Supplier',
    contentHtml,
    confirmText: 'Save Supplier',
    onConfirm: async (bodyEl) => {
      const name = bodyEl.querySelector('#ns-name').value.trim();
      const category = bodyEl.querySelector('#ns-cat').value.trim();
      const contact_person = bodyEl.querySelector('#ns-contact').value.trim();
      const phone = bodyEl.querySelector('#ns-phone').value.trim();
      const email = bodyEl.querySelector('#ns-email').value.trim();
      const gst_number = bodyEl.querySelector('#ns-gst').value.trim().toUpperCase();
      const address = bodyEl.querySelector('#ns-address').value.trim();

      if (!name || !category) {
        throw new Error('Supplier name and category are required.');
      }

      await api.post('/api/suppliers', {
        name,
        category,
        contact_person,
        phone,
        email,
        gst_number,
        address
      });

      ui.toast('Supplier registered successfully.', 'success');
      loadSuppliers();
      return true;
    }
  });
}

function openRecordPurchaseModal() {
  const today = new Date().toISOString().slice(0, 10);
  const contentHtml = `
    <form id="record-purchase-form">
      <div class="form-group">
        <label class="form-label">Supplier <span class="required-star">*</span></label>
        <select id="rp-supplier" class="form-select" required>
          <option value="">-- Choose Supplier --</option>
          ${supplierList.map(s => `<option value="${s.id}">${ui.escapeHtml(s.name)} (${ui.escapeHtml(s.category)})</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Purchase Date <span class="required-star">*</span></label>
          <input type="date" id="rp-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Total Bill Amount (₹) <span class="required-star">*</span></label>
          <input type="number" id="rp-amount" class="form-input" min="0.01" step="0.01" placeholder="0.00" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Items / Description Summary <span class="required-star">*</span></label>
        <input type="text" id="rp-summary" class="form-input" placeholder="e.g. 50 Alloy steel billets batch #4" required>
      </div>

      <div class="form-group">
        <label class="form-label">Immediate Paid Amount (₹)</label>
        <input type="number" id="rp-paid" class="form-input" min="0" step="0.01" value="0.00" placeholder="0.00">
        <span style="font-size:0.72rem; color:var(--text-muted);">Leave 0 if full invoice is on credit</span>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Record Procurement Purchase',
    contentHtml,
    confirmText: 'Record Bill',
    onConfirm: async (bodyEl) => {
      const supplier_id = bodyEl.querySelector('#rp-supplier').value;
      const purchase_date = bodyEl.querySelector('#rp-date').value;
      const amount = parseFloat(bodyEl.querySelector('#rp-amount').value);
      const items_summary = bodyEl.querySelector('#rp-summary').value.trim();
      const paid_amount = parseFloat(bodyEl.querySelector('#rp-paid').value) || 0;

      if (!supplier_id || !purchase_date || isNaN(amount) || amount <= 0 || !items_summary) {
        throw new Error('Please enter all required purchase details.');
      }

      await api.post('/api/suppliers', {
        action: 'purchase',
        supplier_id,
        purchase_date,
        items_summary,
        amount,
        paid_amount
      });

      ui.toast('Purchase order recorded successfully.', 'success');
      loadSuppliers();
      return true;
    }
  });
}
