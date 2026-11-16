// js/budgets.js - Budget Management UI with Progress Bars, 80%/100% Thresholds & Bar Comparison

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let selectedMonth = '2026-11';
let budgetComparison = [];

export async function mountBudgets(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Monthly Budget Allocations</h1>
        <p>Set operational spending caps, monitor run-rates &amp; trigger variance alerts at 80% &amp; 100%</p>
      </div>
      <div class="filter-actions-row">
        <select class="form-select" id="budget-month-select" style="width: 150px; font-weight:600;">
          <option value="2026-11" selected>Nov 2026</option>
          <option value="2026-10">Oct 2026</option>
          <option value="2026-09">Sep 2026</option>
          <option value="2026-08">Aug 2026</option>
        </select>
        <button type="button" class="btn btn-primary" id="btn-set-budget">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Set Category Budget
        </button>
      </div>
    </div>

    <!-- Overall Allocation KPI & Chart Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div class="kpi-card" style="justify-content: center;">
        <div class="kpi-header">
          <span class="kpi-label">Month Budget Utilization</span>
          <div class="kpi-icon-pill" id="bgt-icon-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="bgt-total-pct">-%</div>
        <div class="kpi-footer" id="bgt-total-footer">Total Spent vs Allocated</div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Budget vs. Actual Spent</h2>
            <span class="card-subtitle">Cost center comparison</span>
          </div>
        </div>
        <div class="card-body">
          <div id="budget-bar-chart" style="height: 200px; position: relative;">
            <!-- Bar Chart -->
          </div>
        </div>
      </div>
    </div>

    <!-- Categories Progress Bars Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Category Utilization Gauges</h2>
        <span class="card-subtitle">Warning at 80% &bull; Critical Alert at 100%</span>
      </div>
      <div class="card-body">
        <div id="budget-progress-container" style="display:flex; flex-direction:column; gap:1.25rem;">
          <!-- Progress items injected here -->
        </div>
      </div>
    </div>
  `;

  const monthSelect = container.querySelector('#budget-month-select');
  monthSelect.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    loadBudgets();
  });

  container.querySelector('#btn-set-budget').addEventListener('click', openSetBudgetModal);

  await loadBudgets();
}

async function loadBudgets() {
  const container = document.getElementById('budget-progress-container');
  if (container) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/budgets', { month: selectedMonth });
    budgetComparison = res.comparison || [];

    const totalBudget = res.totalBudget || 0;
    const totalSpent = res.totalSpent || 0;
    const overallPct = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0';

    document.getElementById('bgt-total-pct').textContent = `${overallPct}%`;
    document.getElementById('bgt-total-footer').textContent = `${ui.formatINR(totalSpent)} spent of ${ui.formatINR(totalBudget)} allocated`;

    const pill = document.getElementById('bgt-icon-pill');
    if (parseFloat(overallPct) >= 100) {
      pill.style.color = 'var(--status-danger-text)';
      pill.style.backgroundColor = 'var(--status-danger-bg)';
    } else if (parseFloat(overallPct) >= 80) {
      pill.style.color = 'var(--status-warning-text)';
      pill.style.backgroundColor = 'var(--status-warning-bg)';
    } else {
      pill.style.color = 'var(--status-success-text)';
      pill.style.backgroundColor = 'var(--status-success-bg)';
    }

    renderChart();
    renderProgressBars(budgetComparison);
  } catch (err) {
    ui.toast(`Failed to load budgets: ${err.message}`, 'error');
  }
}

function renderChart() {
  charts.bar('budget-bar-chart', {
    labels: budgetComparison.map(b => b.category),
    datasets: [
      {
        label: 'Budget Allocated (₹)',
        data: budgetComparison.map(b => b.budget_amount),
        backgroundColor: '#78716C'
      },
      {
        label: 'Actual Spent (₹)',
        data: budgetComparison.map(b => b.actual_spent),
        backgroundColor: '#DC2626'
      }
    ]
  });
}

function renderProgressBars(items) {
  const container = document.getElementById('budget-progress-container');
  if (!container) return;

  container.innerHTML = items.map(b => {
    let barColor = 'var(--status-success-text)';
    let badge = `<span class="chip chip-success">${b.percentage}% Used</span>`;

    if (b.status === 'Alert') {
      barColor = 'var(--status-danger-text)';
      badge = `<span class="chip chip-danger">Alert: ${b.percentage}% (Over Budget)</span>`;
    } else if (b.status === 'Warning') {
      barColor = 'var(--status-warning-text)';
      badge = `<span class="chip chip-warning">Warning: ${b.percentage}%</span>`;
    }

    const cappedPct = Math.min(100, b.percentage);

    return `
      <div style="display:flex; flex-direction:column; gap:0.4rem; padding-bottom:1rem; border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:0.9rem;">${ui.escapeHtml(b.category)}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-left:8px;">
              ${ui.formatINR(b.actual_spent)} of ${ui.formatINR(b.budget_amount)}
            </span>
          </div>
          <div>${badge}</div>
        </div>

        <!-- Progress Bar Background with 80% and 100% threshold markers -->
        <div style="position:relative; width:100%; height:12px; background:var(--bg-surface-alt); border-radius:var(--radius-full); overflow:hidden; border:1px solid var(--border-subtle);">
          <div style="width:${cappedPct}%; height:100%; background-color:${barColor}; border-radius:var(--radius-full); transition:width 0.4s ease;"></div>
          <!-- 80% Marker -->
          <div style="position:absolute; left:80%; top:0; bottom:0; width:2px; background:rgba(0,0,0,0.25);" title="80% Warning Threshold"></div>
        </div>
      </div>
    `;
  }).join('');
}

function openSetBudgetModal() {
  const contentHtml = `
    <form id="set-budget-form">
      <div class="form-group">
        <label class="form-label">Month <span class="required-star">*</span></label>
        <input type="text" id="sb-month" class="form-input" value="${selectedMonth}" readonly style="background:var(--bg-app); font-weight:700;">
      </div>

      <div class="form-group">
        <label class="form-label">Expense Category <span class="required-star">*</span></label>
        <select id="sb-category" class="form-select" required>
          ${budgetComparison.map(b => `<option value="${b.category}">${b.category} (Current: ₹${b.budget_amount})</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Budget Limit Amount (₹) <span class="required-star">*</span></label>
        <input type="number" id="sb-amount" class="form-input" min="0" step="1000" placeholder="e.g. 50000" required>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Set Monthly Expense Cap',
    contentHtml,
    confirmText: 'Save Budget Cap',
    onConfirm: async (bodyEl) => {
      const month = bodyEl.querySelector('#sb-month').value;
      const category = bodyEl.querySelector('#sb-category').value;
      const budgetAmount = parseFloat(bodyEl.querySelector('#sb-amount').value);

      if (isNaN(budgetAmount) || budgetAmount < 0) {
        throw new Error('Please enter a valid budget amount.');
      }

      await api.post('/api/budgets', {
        month,
        category,
        budget_amount: budgetAmount
      });

      ui.toast(`Budget cap for ${category} updated.`, 'success');
      loadBudgets();
      return true;
    }
  });
}
