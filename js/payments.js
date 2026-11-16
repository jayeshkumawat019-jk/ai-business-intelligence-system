// js/payments.js - Payment Tracking UI with Status Donut, Partial Payment Modal & Overdue Highlighting

import { api } from './api.js';
import { ui } from './ui.js';
import { charts, CHART_COLORS } from './charts.js';

let paymentList = [];
let statusCounts = {};

export async function mountPayments(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Payment Tracking &amp; Collections</h1>
        <p>Monitor cash receipts, overdue accounts receivable &amp; record partial installment collections</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-primary" id="btn-record-payment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Payment
        </button>
      </div>
    </div>

    <!-- Status Distribution & Summary Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Payment Status Breakdown</h2>
            <span class="card-subtitle">Distribution of settlements and dues</span>
          </div>
        </div>
        <div class="card-body">
          <div id="payments-donut-chart" style="height: 220px; position: relative;">
            <!-- Donut Chart -->
          </div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="kpi-card" style="flex: 1;">
          <div class="kpi-header">
            <span class="kpi-label">Total Realized Collections</span>
            <div class="kpi-icon-pill" style="color:var(--status-success-text); background-color:var(--status-success-bg);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div class="kpi-value" style="color:var(--status-success-text);" id="pay-realized">-</div>
          <div class="kpi-footer">Deposited into corporate bank accounts</div>
        </div>

        <div class="kpi-card" style="flex: 1;">
          <div class="kpi-header">
            <span class="kpi-label">Pending &amp; Overdue Inflows</span>
            <div class="kpi-icon-pill" style="color:var(--status-danger-text); background-color:var(--status-danger-bg);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
          </div>
          <div class="kpi-value" style="color:var(--status-danger-text);" id="pay-pending">-</div>
          <div class="kpi-footer">Awaiting client remittance</div>
        </div>
      </div>
    </div>

    <!-- Payments Ledger Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Payment Transactions</h2>
        <div class="filter-actions-row">
          <select class="form-select" id="pay-status-filter" style="width: 140px; font-size: 0.8rem;">
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
          <div class="filter-search-box">
            <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="form-input" id="payments-search-input" placeholder="Search entity, invoice ref..." style="padding-left: 2.2rem; font-size: 0.8rem;">
          </div>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="payments-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-record-payment').addEventListener('click', openRecordPaymentModal);

  const searchInput = container.querySelector('#payments-search-input');
  const statusFilter = container.querySelector('#pay-status-filter');

  const filterHandler = () => {
    const term = searchInput.value.toLowerCase().trim();
    const st = statusFilter.value;
    let filtered = paymentList;
    if (st) filtered = filtered.filter(p => p.status === st);
    if (term) filtered = filtered.filter(p =>
      (p.entity_name && p.entity_name.toLowerCase().includes(term)) ||
      (p.reference_id && p.reference_id.toLowerCase().includes(term))
    );
    renderTable(filtered);
  };

  searchInput.addEventListener('input', filterHandler);
  statusFilter.addEventListener('change', filterHandler);

  await loadPayments();
}

async function loadPayments() {
  const tableWrap = document.getElementById('payments-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/payments');
    paymentList = res.payments || [];
    statusCounts = res.statusCounts || {};

    document.getElementById('pay-realized').textContent = ui.formatINR(res.totalInflowReceived || 0);
    document.getElementById('pay-pending').textContent = ui.formatINR(res.totalInflowPending || 0);

    renderDonut();
    renderTable(paymentList);
  } catch (err) {
    ui.toast(`Failed to load payments: ${err.message}`, 'error');
  }
}

function renderDonut() {
  const labels = ['Received', 'Pending', 'Overdue'];
  const values = [
    (statusCounts.Received || 0) + (statusCounts.Paid || 0),
    statusCounts.Pending || 0,
    statusCounts.Overdue || 0
  ];

  charts.doughnut('payments-donut-chart', {
    labels,
    data: values,
    colors: ['#059669', '#D97706', '#DC2626'],
    isCurrency: false
  });
}

function renderTable(items) {
  const tableWrap = document.getElementById('payments-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Payment Records</h3>
        <p class="empty-desc">Record client collections or vendor disbursements to track balances.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Entity / Client</th>
          <th>Reference</th>
          <th>Type</th>
          <th class="table-col-num">Collected</th>
          <th class="table-col-num">Total Due</th>
          <th class="table-col-num">Balance</th>
          <th>Status</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(p => {
          let statusBadge = '<span class="chip chip-warning">Pending</span>';
          if (p.status === 'Received' || p.status === 'Paid') {
            statusBadge = '<span class="chip chip-success">Settled</span>';
          } else if (p.status === 'Overdue') {
            statusBadge = '<span class="chip chip-danger">Overdue</span>';
          }

          const hasBalance = p.remaining_balance > 0;

          return `
            <tr data-payment-id="${p.id}">
              <td>${ui.formatDate(p.payment_date)}</td>
              <td><strong>${ui.escapeHtml(p.entity_name)}</strong></td>
              <td><code style="font-size:0.75rem;">${ui.escapeHtml(p.reference_id || '-')}</code></td>
              <td><span class="chip chip-neutral">${ui.escapeHtml(p.type)}</span></td>
              <td class="table-col-num">${ui.formatINR(p.amount)}</td>
              <td class="table-col-num">${ui.formatINR(p.total_due)}</td>
              <td class="table-col-num" style="font-weight:700; ${hasBalance ? 'color:var(--status-danger-text);' : ''}">
                ${ui.formatINR(p.remaining_balance)}
              </td>
              <td>${statusBadge}</td>
              <td style="text-align:right; white-space:nowrap;">
                ${hasBalance ? `
                  <button type="button" class="btn btn-secondary btn-sm btn-partial-pay" data-id="${p.id}" data-name="${ui.escapeHtml(p.entity_name)}" data-bal="${p.remaining_balance}">
                    Pay Partial
                  </button>
                ` : ''}
                <button type="button" class="btn-ghost btn-sm btn-delete-payment" data-id="${p.id}" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Partial payment button
  tableWrap.querySelectorAll('.btn-partial-pay').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const entity = e.currentTarget.dataset.name;
      const balance = parseFloat(e.currentTarget.dataset.bal);
      openPartialPaymentModal(id, entity, balance);
    });
  });

  // Delete button
  tableWrap.querySelectorAll('.btn-delete-payment').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Delete this payment transaction?')) {
        try {
          await api.delete('/api/payments', { id });
          ui.toast('Payment entry removed.', 'success');
          loadPayments();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openPartialPaymentModal(paymentId, entityName, remainingBalance) {
  const contentHtml = `
    <div style="margin-bottom:1rem; padding:0.75rem 1rem; background:var(--bg-app); border-radius:var(--radius-sm);">
      <div style="font-size:0.8rem; color:var(--text-muted);">Account: <strong>${ui.escapeHtml(entityName)}</strong></div>
      <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Current Outstanding: <strong style="color:var(--status-danger-text);">${ui.formatINR(remainingBalance)}</strong></div>
    </div>
    <form id="partial-pay-form">
      <div class="form-group">
        <label class="form-label">Installment Amount to Receive (₹) <span class="required-star">*</span></label>
        <input type="number" id="pp-amount" class="form-input" min="0.01" max="${remainingBalance}" step="0.01" value="${remainingBalance}" required>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Record Partial Payment Receipt',
    contentHtml,
    confirmText: 'Submit Installment',
    onConfirm: async (bodyEl) => {
      const installment = parseFloat(bodyEl.querySelector('#pp-amount').value);
      if (isNaN(installment) || installment <= 0) {
        throw new Error('Please enter a valid installment amount.');
      }

      await api.put(`/api/payments?id=${paymentId}`, {
        installment_amount: installment
      });

      ui.toast('Installment recorded and balance updated.', 'success');
      loadPayments();
      return true;
    }
  });
}

function openRecordPaymentModal() {
  const today = new Date().toISOString().slice(0, 10);
  const contentHtml = `
    <form id="record-payment-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Payment Date <span class="required-star">*</span></label>
          <input type="date" id="rpm-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Transaction Flow <span class="required-star">*</span></label>
          <select id="rpm-type" class="form-select" required>
            <option value="inflow" selected>Inflow (Customer Receipt)</option>
            <option value="outflow">Outflow (Vendor Disbursement)</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Party / Entity Name <span class="required-star">*</span></label>
        <input type="text" id="rpm-party" class="form-input" placeholder="e.g. Apex Heavy Engineering Ltd" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Amount Received / Paid (₹) <span class="required-star">*</span></label>
          <input type="number" id="rpm-amount" class="form-input" min="0.01" step="0.01" placeholder="0.00" required>
        </div>
        <div class="form-group">
          <label class="form-label">Total Invoice Amount (₹)</label>
          <input type="number" id="rpm-total" class="form-input" min="0" step="0.01" placeholder="Same as amount if full">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Reference ID (e.g. Invoice #)</label>
          <input type="text" id="rpm-ref" class="form-input" placeholder="INV-2026-0005">
        </div>
        <div class="form-group">
          <label class="form-label">Mode</label>
          <select id="rpm-mode" class="form-select">
            <option value="Bank Transfer" selected>Bank Transfer (NEFT/RTGS)</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Record Financial Payment',
    contentHtml,
    confirmText: 'Save Payment',
    onConfirm: async (bodyEl) => {
      const paymentDate = bodyEl.querySelector('#rpm-date').value;
      const type = bodyEl.querySelector('#rpm-type').value;
      const entityName = bodyEl.querySelector('#rpm-party').value.trim();
      const amount = parseFloat(bodyEl.querySelector('#rpm-amount').value);
      const totalDue = parseFloat(bodyEl.querySelector('#rpm-total').value) || amount;
      const referenceId = bodyEl.querySelector('#rpm-ref').value.trim();
      const paymentMode = bodyEl.querySelector('#rpm-mode').value;

      if (!paymentDate || !entityName || isNaN(amount) || amount <= 0) {
        throw new Error('Please fill in valid payment information.');
      }

      await api.post('/api/payments', {
        payment_date: paymentDate,
        type,
        entity_name: entityName,
        amount,
        total_due: totalDue,
        reference_id: referenceId,
        payment_mode: paymentMode
      });

      ui.toast('Payment successfully logged.', 'success');
      loadPayments();
      return true;
    }
  });
}
