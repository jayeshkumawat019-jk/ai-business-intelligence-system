// js/comparison.js - Period Comparison UI with Directional Arrows & Grouped Bar Chart

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let availablePeriods = [];
let period1 = '2026-10';
let period2 = '2026-11';

export async function mountComparison(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Period-over-Period Performance Comparison</h1>
        <p>Compare any two months or fiscal years side-by-side &bull; Track variances, direction indicators &amp; order growth</p>
      </div>
      <div class="filter-actions-row">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <label style="font-size:0.75rem; font-weight:700;">Base Period:</label>
          <select id="comp-period-1" class="form-select" style="width: 140px; font-weight:600;">
            <!-- Injected -->
          </select>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <label style="font-size:0.75rem; font-weight:700;">Comparison:</label>
          <select id="comp-period-2" class="form-select" style="width: 140px; font-weight:600;">
            <!-- Injected -->
          </select>
        </div>
        <button type="button" class="btn btn-primary" id="btn-run-compare">Compare</button>
      </div>
    </div>

    <!-- Comparative Side-by-Side KPI Cards Grid -->
    <div class="kpi-grid" id="comp-kpi-grid">
      <!-- Injected -->
    </div>

    <!-- Grouped Bar Chart Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">Side-by-Side Financial Comparison</h2>
          <span class="card-subtitle" id="comp-chart-subtitle">Gross Revenue &bull; Operational Overhead &bull; Net Profit</span>
        </div>
      </div>
      <div class="card-body">
        <div id="comp-grouped-chart" style="height: 300px; position: relative;">
          <!-- Chart -->
        </div>
      </div>
    </div>

    <!-- Metric Variance Comparison Table Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Variance Analysis Ledger</h2>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="comp-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  await initComparisonDropdowns(container);

  container.querySelector('#btn-run-compare').addEventListener('click', () => {
    period1 = container.querySelector('#comp-period-1').value;
    period2 = container.querySelector('#comp-period-2').value;
    loadComparison();
  });

  await loadComparison();
}

async function initComparisonDropdowns(container) {
  try {
    const res = await api.get('/api/comparison', { period1, period2 });
    availablePeriods = res.availablePeriods || ['2026-11', '2026-10', '2026-09', '2026', '2025'];

    const sel1 = container.querySelector('#comp-period-1');
    const sel2 = container.querySelector('#comp-period-2');

    availablePeriods.forEach(p => {
      const opt1 = document.createElement('option');
      opt1.value = p;
      opt1.textContent = p;
      if (p === period1) opt1.selected = true;
      sel1.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = p;
      opt2.textContent = p;
      if (p === period2) opt2.selected = true;
      sel2.appendChild(opt2);
    });
  } catch (err) {}
}

async function loadComparison() {
  const tableWrap = document.getElementById('comp-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/comparison', { period1, period2 });
    const { period1: p1, period2: p2, changes, chart } = res;

    document.getElementById('comp-chart-subtitle').textContent =
      `Comparing ${p1.periodKey} against ${p2.periodKey}`;

    // Render KPIs
    const kpiGrid = document.getElementById('comp-kpi-grid');
    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <!-- Sales Card -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Sales Turnover</span>
            <div style="font-weight:700; font-size:0.8rem; color:${changes.sales.isPositive ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
              ${changes.sales.direction === 'up' ? '▲' : '▼'} ${changes.sales.pct > 0 ? '+' : ''}${changes.sales.pct}%
            </div>
          </div>
          <div class="kpi-value">${ui.formatINR(p2.totalSales)}</div>
          <div class="kpi-footer">vs ${ui.formatINR(p1.totalSales)} in ${p1.periodKey}</div>
        </div>

        <!-- Profit Card -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Net Operating Profit</span>
            <div style="font-weight:700; font-size:0.8rem; color:${changes.profit.isPositive ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
              ${changes.profit.direction === 'up' ? '▲' : '▼'} ${changes.profit.pct > 0 ? '+' : ''}${changes.profit.pct}%
            </div>
          </div>
          <div class="kpi-value" style="color:var(--status-success-text);">${ui.formatINR(p2.netProfit)}</div>
          <div class="kpi-footer">vs ${ui.formatINR(p1.netProfit)} in ${p1.periodKey}</div>
        </div>

        <!-- Expenses Card -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total Outlays</span>
            <div style="font-weight:700; font-size:0.8rem; color:${changes.expenses.pct > 0 ? 'var(--status-danger-text)' : 'var(--status-success-text)'};">
              ${changes.expenses.direction === 'up' ? '▲' : '▼'} ${changes.expenses.pct > 0 ? '+' : ''}${changes.expenses.pct}%
            </div>
          </div>
          <div class="kpi-value">${ui.formatINR(p2.totalExpenses)}</div>
          <div class="kpi-footer">vs ${ui.formatINR(p1.totalExpenses)} in ${p1.periodKey}</div>
        </div>

        <!-- Orders Card -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Dispatched Orders</span>
            <div style="font-weight:700; font-size:0.8rem; color:${changes.orders.isPositive ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
              ${changes.orders.direction === 'up' ? '▲' : '▼'} ${changes.orders.pct > 0 ? '+' : ''}${changes.orders.pct}%
            </div>
          </div>
          <div class="kpi-value">${p2.ordersCount} orders</div>
          <div class="kpi-footer">vs ${p1.ordersCount} orders in ${p1.periodKey}</div>
        </div>
      `;
    }

    // Render Grouped Bar Chart
    charts.bar('comp-grouped-chart', {
      labels: chart.labels,
      datasets: chart.datasets
    });

    // Render Variance Table
    tableWrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Business Metric</th>
            <th class="table-col-num">Base (${p1.periodKey})</th>
            <th class="table-col-num">Comparison (${p2.periodKey})</th>
            <th class="table-col-num">Absolute Variance</th>
            <th class="table-col-num">Directional Shift</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Gross Sales Revenue</strong></td>
            <td class="table-col-num">${ui.formatINR(p1.totalSales)}</td>
            <td class="table-col-num">${ui.formatINR(p2.totalSales)}</td>
            <td class="table-col-num" style="font-weight:700;">${changes.sales.diff >= 0 ? '+' : ''}${ui.formatINR(changes.sales.diff)}</td>
            <td class="table-col-num">
              <span class="chip ${changes.sales.isPositive ? 'chip-success' : 'chip-danger'}">
                ${changes.sales.direction === 'up' ? '▲ +' : '▼ '}${changes.sales.pct}%
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Operating Expenses</strong></td>
            <td class="table-col-num">${ui.formatINR(p1.totalExpenses)}</td>
            <td class="table-col-num">${ui.formatINR(p2.totalExpenses)}</td>
            <td class="table-col-num" style="font-weight:700;">${changes.expenses.diff >= 0 ? '+' : ''}${ui.formatINR(changes.expenses.diff)}</td>
            <td class="table-col-num">
              <span class="chip ${changes.expenses.pct <= 0 ? 'chip-success' : 'chip-danger'}">
                ${changes.expenses.direction === 'up' ? '▲ +' : '▼ '}${changes.expenses.pct}%
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Net Operating Profit</strong></td>
            <td class="table-col-num">${ui.formatINR(p1.netProfit)}</td>
            <td class="table-col-num">${ui.formatINR(p2.netProfit)}</td>
            <td class="table-col-num" style="font-weight:700;">${changes.profit.diff >= 0 ? '+' : ''}${ui.formatINR(changes.profit.diff)}</td>
            <td class="table-col-num">
              <span class="chip ${changes.profit.isPositive ? 'chip-success' : 'chip-danger'}">
                ${changes.profit.direction === 'up' ? '▲ +' : '▼ '}${changes.profit.pct}%
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Net Margin Percentage</strong></td>
            <td class="table-col-num">${p1.marginPct}%</td>
            <td class="table-col-num">${p2.marginPct}%</td>
            <td class="table-col-num">${changes.margin.diff >= 0 ? '+' : ''}${changes.margin.diff}% pts</td>
            <td class="table-col-num">
              <span class="chip ${changes.margin.isPositive ? 'chip-success' : 'chip-danger'}">
                ${changes.margin.direction === 'up' ? '▲' : '▼'} ${changes.margin.pct}%
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Order Count</strong></td>
            <td class="table-col-num">${p1.ordersCount}</td>
            <td class="table-col-num">${p2.ordersCount}</td>
            <td class="table-col-num">${changes.orders.diff >= 0 ? '+' : ''}${changes.orders.diff}</td>
            <td class="table-col-num">
              <span class="chip ${changes.orders.isPositive ? 'chip-success' : 'chip-danger'}">
                ${changes.orders.direction === 'up' ? '▲ +' : '▼ '}${changes.orders.pct}%
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Average Order Value (AOV)</strong></td>
            <td class="table-col-num">${ui.formatINR(p1.aov)}</td>
            <td class="table-col-num">${ui.formatINR(p2.aov)}</td>
            <td class="table-col-num">${changes.aov.diff >= 0 ? '+' : ''}${ui.formatINR(changes.aov.diff)}</td>
            <td class="table-col-num">
              <span class="chip ${changes.aov.isPositive ? 'chip-success' : 'chip-danger'}">
                ${changes.aov.direction === 'up' ? '▲ +' : '▼ '}${changes.aov.pct}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  } catch (err) {
    ui.toast(`Comparison error: ${err.message}`, 'error');
  }
}
