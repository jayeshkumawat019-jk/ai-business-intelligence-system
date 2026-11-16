// js/customers.js - Customer Management UI with Full Purchase History Modal & Top Customers Chart

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let customerList = [];
let topCustomersData = [];

export async function mountCustomers(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Customer Relationship Management</h1>
        <p>Maintain client ledgers, contact directories &amp; review client lifetime purchase value</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-primary" id="btn-new-customer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Customer
        </button>
      </div>
    </div>

    <!-- Top Spenders Horizontal Bar Chart Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">Top 5 Clients by Revenue</h2>
          <span class="card-subtitle">Highest grossing customer accounts</span>
        </div>
      </div>
      <div class="card-body">
        <div id="top-customers-chart" style="height: 240px; position: relative;">
          <!-- Chart -->
        </div>
      </div>
    </div>

    <!-- Customer Directory Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Customer Directory</h2>
        <div class="filter-search-box">
          <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="customers-search-input" placeholder="Search customer, GSTIN, city..." style="padding-left: 2.2rem; font-size: 0.8rem;">
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="customers-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-new-customer').addEventListener('click', openNewCustomerModal);

  const searchInput = container.querySelector('#customers-search-input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = customerList.filter(c =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.gst_number && c.gst_number.toLowerCase().includes(term)) ||
      (c.city && c.city.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
    renderTable(filtered);
  });

  await loadCustomers();
}

async function loadCustomers() {
  const tableWrap = document.getElementById('customers-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/customers');
    customerList = res.customers || [];
    topCustomersData = res.topCustomers || [];

    renderChart();
    renderTable(customerList);
  } catch (err) {
    ui.toast(`Failed to load customers: ${err.message}`, 'error');
  }
}

function renderChart() {
  if (topCustomersData.length > 0) {
    charts.bar('top-customers-chart', {
      labels: topCustomersData.map(c => c.name),
      datasets: [{
        label: 'Total Lifetime Spend (₹)',
        data: topCustomersData.map(c => c.total_spent),
        backgroundColor: '#2563EB'
      }],
      horizontal: true
    });
  }
}

function renderTable(items) {
  const tableWrap = document.getElementById('customers-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Customers Registered</h3>
        <p class="empty-desc">Add client details to track invoices, credit terms &amp; sales history.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Company / Customer</th>
          <th>GSTIN</th>
          <th>Contact &amp; Location</th>
          <th class="table-col-num">Orders</th>
          <th class="table-col-num">Total Spent</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(c => `
          <tr data-customer-id="${c.id}">
            <td>
              <strong>${ui.escapeHtml(c.name)}</strong>
              ${c.address ? `<div style="font-size:0.72rem; color:var(--text-muted);">${ui.escapeHtml(c.address)}</div>` : ''}
            </td>
            <td><code style="font-size:0.75rem;">${ui.escapeHtml(c.gst_number || '-')}</code></td>
            <td>
              <div>${ui.escapeHtml(c.phone || '-')}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${ui.escapeHtml(c.city || 'India')}, ${ui.escapeHtml(c.state || '')}</div>
            </td>
            <td class="table-col-num">${c.orders_count || 0}</td>
            <td class="table-col-num" style="font-weight:700; color:var(--status-success-text);">${ui.formatINR(c.total_spent || 0)}</td>
            <td style="text-align:right;">
              <button type="button" class="btn btn-secondary btn-sm btn-view-history" data-id="${c.id}" style="margin-right:4px;">
                History
              </button>
              <button type="button" class="btn-ghost btn-sm btn-delete-customer" data-id="${c.id}" title="Delete Customer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // History button
  tableWrap.querySelectorAll('.btn-view-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const customer = customerList.find(c => c.id === id);
      if (customer) openPurchaseHistoryModal(customer);
    });
  });

  // Delete button
  tableWrap.querySelectorAll('.btn-delete-customer').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Delete this customer account from the registry?')) {
        try {
          await api.delete('/api/customers', { id });
          ui.toast('Customer account removed.', 'success');
          loadCustomers();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openPurchaseHistoryModal(customer) {
  const history = customer.purchase_history || [];

  const historyHtml = history.length === 0 ? `
    <div class="empty-state" style="padding: 2rem;">
      <p class="empty-desc">No purchase orders recorded for ${ui.escapeHtml(customer.name)} yet.</p>
    </div>
  ` : `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Product Delivered</th>
            <th class="table-col-num">Qty</th>
            <th class="table-col-num">Amount</th>
            <th>Mode</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(h => `
            <tr>
              <td>${ui.formatDate(h.sale_date)}</td>
              <td>${ui.escapeHtml(h.product_name)}</td>
              <td class="table-col-num">${h.quantity}</td>
              <td class="table-col-num" style="font-weight:700;">${ui.formatINR(h.amount)}</td>
              <td><span class="chip chip-neutral">${ui.escapeHtml(h.payment_mode)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  ui.showModal({
    title: `Purchase History: ${customer.name}`,
    contentHtml: `
      <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background-color: var(--bg-app); border-radius: var(--radius-sm);">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted);">Total Spend:</span>
          <span style="font-weight:700; font-size:1.1rem; color:var(--status-success-text); margin-left:6px;">${ui.formatINR(customer.total_spent)}</span>
        </div>
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted);">Orders Count:</span>
          <span style="font-weight:700; margin-left:4px;">${customer.orders_count}</span>
        </div>
      </div>
      ${historyHtml}
    `,
    cancelText: 'Close',
    size: 'large'
  });
}

function openNewCustomerModal() {
  const contentHtml = `
    <form id="new-customer-form">
      <div class="form-group">
        <label class="form-label">Company / Client Name <span class="required-star">*</span></label>
        <input type="text" id="nc-name" class="form-input" placeholder="e.g. Bharat Maritime Shipbuilders" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" id="nc-phone" class="form-input" placeholder="+91 98200 00000">
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="nc-email" class="form-input" placeholder="procurement@client.com">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">GSTIN Identification</label>
          <input type="text" id="nc-gst" class="form-input" placeholder="27AABCA1234F1Z5" style="text-transform:uppercase;">
        </div>
        <div class="form-group">
          <label class="form-label">City &amp; State</label>
          <input type="text" id="nc-city" class="form-input" placeholder="e.g. Mumbai, Maharashtra">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Full Postal Address</label>
        <textarea id="nc-address" class="form-textarea" rows="2" placeholder="Factory / billing office address"></textarea>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Register New Client Account',
    contentHtml,
    confirmText: 'Save Customer',
    onConfirm: async (bodyEl) => {
      const name = bodyEl.querySelector('#nc-name').value.trim();
      const phone = bodyEl.querySelector('#nc-phone').value.trim();
      const email = bodyEl.querySelector('#nc-email').value.trim();
      const gst_number = bodyEl.querySelector('#nc-gst').value.trim().toUpperCase();
      const city = bodyEl.querySelector('#nc-city').value.trim();
      const address = bodyEl.querySelector('#nc-address').value.trim();

      if (!name) {
        throw new Error('Customer / Company name is required.');
      }

      await api.post('/api/customers', {
        name,
        phone,
        email,
        gst_number,
        city,
        address,
        state: 'Maharashtra'
      });

      ui.toast('Client registered successfully.', 'success');
      loadCustomers();
      return true;
    }
  });
}
