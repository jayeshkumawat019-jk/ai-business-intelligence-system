// js/expenses.js - Expense Management UI with Category Breakdown, Monthly Trends & JCB Animation

import { api } from './api.js';
import { ui } from './ui.js';
import { charts, CHART_COLORS } from './charts.js';

let expenseList = [];
let categoryTotals = {};
let monthlyTrend = [];

export async function mountExpenses(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Expense Management</h1>
        <p>Control operational overhead, raw material outlays &amp; monitor monthly burn rate</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-primary" id="btn-new-expense">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Expense
        </button>
      </div>
    </div>

    <!-- Dockyard Animated Scene: JCB Excavator Digging Earth -->
    <div class="dockyard-scene" title="Industrial Machinery: JCB Excavator at Work">
      <img src="assets/svg/excavator.svg" class="dockyard-svg" alt="JCB Excavator Digging">
    </div>

    <!-- Charts Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- Category Doughnut Chart -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Category Breakdown</h2>
            <span class="card-subtitle">Distribution by department/cost center</span>
          </div>
        </div>
        <div class="card-body">
          <div id="expense-pie-container" style="height: 250px; position: relative;">
            <!-- Doughnut Chart -->
          </div>
        </div>
      </div>

      <!-- Monthly Trend Line Chart -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Monthly Expense Run Rate</h2>
            <span class="card-subtitle">Expenditure over time</span>
          </div>
        </div>
        <div class="card-body">
          <div id="expense-trend-container" style="height: 250px; position: relative;">
            <!-- Line Chart -->
          </div>
        </div>
      </div>
    </div>

    <!-- Expense Ledger Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Expense Ledger</h2>
        <div class="filter-actions-row">
          <select class="form-select" id="expense-category-filter" style="width: 160px; font-size: 0.8rem;">
            <option value="">All Categories</option>
            <option value="Raw Material">Raw Material</option>
            <option value="Salaries">Salaries</option>
            <option value="Rent">Rent</option>
            <option value="Utilities">Utilities</option>
            <option value="Transport">Transport</option>
            <option value="Marketing">Marketing</option>
            <option value="Other">Other</option>
          </select>
          <div class="filter-search-box">
            <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="form-input" id="expense-search-input" placeholder="Search description, vendor..." style="padding-left: 2.2rem; font-size: 0.8rem;">
          </div>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="expenses-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-new-expense').addEventListener('click', openNewExpenseModal);

  const searchInput = container.querySelector('#expense-search-input');
  const catFilter = container.querySelector('#expense-category-filter');

  const handleFilter = () => {
    const term = searchInput.value.toLowerCase().trim();
    const cat = catFilter.value;
    let filtered = expenseList;
    if (cat) filtered = filtered.filter(e => e.category === cat);
    if (term) filtered = filtered.filter(e =>
      (e.description && e.description.toLowerCase().includes(term)) ||
      (e.vendor && e.vendor.toLowerCase().includes(term))
    );
    renderTable(filtered);
  };

  searchInput.addEventListener('input', handleFilter);
  catFilter.addEventListener('change', handleFilter);

  await loadExpenses();
}

async function loadExpenses() {
  const tableWrap = document.getElementById('expenses-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/expenses');
    expenseList = res.expenses || [];
    categoryTotals = res.categoryBreakdown || {};
    monthlyTrend = res.monthlyTrend || [];

    renderCharts();
    renderTable(expenseList);
  } catch (err) {
    ui.toast(`Failed to load expenses: ${err.message}`, 'error');
  }
}

function renderCharts() {
  // 1. Doughnut Chart
  const categories = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);
  charts.doughnut('expense-pie-container', {
    labels: categories,
    data: values,
    colors: CHART_COLORS.palette
  });

  // 2. Line Chart
  if (monthlyTrend.length > 0) {
    charts.line('expense-trend-container', {
      labels: monthlyTrend.map(m => m.month),
      datasets: [{
        label: 'Monthly Expenses (₹)',
        data: monthlyTrend.map(m => m.total),
        color: '#DC2626',
        fill: true
      }]
    });
  }
}

function renderTable(items) {
  const tableWrap = document.getElementById('expenses-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Expenses Found</h3>
        <p class="empty-desc">Record expenses to keep your burn rate and cost centers accounted for.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Description</th>
          <th>Vendor / Payee</th>
          <th class="table-col-num">Amount</th>
          <th>Payment Mode</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(e => `
          <tr data-expense-id="${e.id}">
            <td>${ui.formatDate(e.expense_date)}</td>
            <td><span class="chip chip-info">${ui.escapeHtml(e.category)}</span></td>
            <td><strong>${ui.escapeHtml(e.description)}</strong></td>
            <td>${ui.escapeHtml(e.vendor || '-')}</td>
            <td class="table-col-num" style="font-weight:700; color:var(--status-danger-text);">${ui.formatINR(e.amount)}</td>
            <td><span class="chip chip-neutral">${ui.escapeHtml(e.payment_mode)}</span></td>
            <td style="text-align:right;">
              <button type="button" class="btn-ghost btn-sm btn-delete-expense" data-id="${e.id}" title="Delete Expense">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  tableWrap.querySelectorAll('.btn-delete-expense').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Are you sure you want to delete this expense record?')) {
        try {
          await api.delete('/api/expenses', { id });
          ui.toast('Expense deleted successfully.', 'success');
          loadExpenses();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openNewExpenseModal() {
  const today = new Date().toISOString().slice(0, 10);
  const contentHtml = `
    <form id="new-expense-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Expense Date <span class="required-star">*</span></label>
          <input type="date" id="ne-date" class="form-input" value="${today}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Category <span class="required-star">*</span></label>
          <select id="ne-category" class="form-select" required>
            <option value="Raw Material">Raw Material</option>
            <option value="Salaries">Salaries</option>
            <option value="Rent">Rent</option>
            <option value="Utilities">Utilities</option>
            <option value="Transport">Transport</option>
            <option value="Marketing">Marketing</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Description <span class="required-star">*</span></label>
        <input type="text" id="ne-desc" class="form-input" placeholder="e.g. Factory unit electricity bill" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vendor / Payee</label>
          <input type="text" id="ne-vendor" class="form-input" placeholder="e.g. MSEDCL or Supplier Name">
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹) <span class="required-star">*</span></label>
          <input type="number" id="ne-amount" class="form-input" min="0.01" step="0.01" placeholder="0.00" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Payment Mode <span class="required-star">*</span></label>
        <select id="ne-payment-mode" class="form-select" required>
          <option value="Bank Transfer" selected>Bank Transfer (NEFT/RTGS)</option>
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
          <option value="Credit Card">Credit Card</option>
        </select>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Record Business Expense',
    contentHtml,
    confirmText: 'Save Expense',
    onConfirm: async (bodyEl) => {
      const expenseDate = bodyEl.querySelector('#ne-date').value;
      const category = bodyEl.querySelector('#ne-category').value;
      const description = bodyEl.querySelector('#ne-desc').value.trim();
      const vendor = bodyEl.querySelector('#ne-vendor').value.trim();
      const amount = parseFloat(bodyEl.querySelector('#ne-amount').value);
      const paymentMode = bodyEl.querySelector('#ne-payment-mode').value;

      if (!expenseDate || !category || !description || isNaN(amount) || amount <= 0) {
        throw new Error('Please enter valid required expense details.');
      }

      await api.post('/api/expenses', {
        expense_date: expenseDate,
        category,
        description,
        vendor: vendor || 'General',
        amount,
        payment_mode: paymentMode
      });

      ui.toast('Expense recorded successfully.', 'success');
      loadExpenses();
      return true;
    }
  });
}
