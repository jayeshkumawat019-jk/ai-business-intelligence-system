// js/profitLoss.js - Profit & Loss Statement UI with Waterfall Chart & Printable Statement

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let plData = null;

export async function mountProfitLoss(container) {
  const currentMonthStart = '2026-11-01';
  const currentMonthEnd = '2026-11-30';

  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Profit &amp; Loss Statement</h1>
        <p>Comprehensive income statement, gross/net margins &amp; operational waterfall ledger</p>
      </div>
      <div class="filter-actions-row">
        <select class="form-select" id="pl-range-preset" style="width: 160px; font-weight:600;">
          <option value="current-month">This Month (Nov 2026)</option>
          <option value="last-month">Last Month (Oct 2026)</option>
          <option value="ytd">Full Financial Year</option>
          <option value="custom">Custom Date Range</option>
        </select>
        <button type="button" class="btn btn-secondary" id="btn-print-statement">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Statement
        </button>
      </div>
    </div>

    <!-- Custom Date Range Bar (collapsible) -->
    <div id="pl-custom-inputs" style="display:none; margin-bottom:1.25rem; padding:1rem; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); display:none; gap:1rem; align-items:flex-end;">
      <div class="form-group" style="margin-bottom:0; flex:1;">
        <label class="form-label">Start Date</label>
        <input type="date" id="pl-start-date" class="form-input" value="${currentMonthStart}">
      </div>
      <div class="form-group" style="margin-bottom:0; flex:1;">
        <label class="form-label">End Date</label>
        <input type="date" id="pl-end-date" class="form-input" value="${currentMonthEnd}">
      </div>
      <button type="button" class="btn btn-primary" id="btn-apply-dates">Apply Filter</button>
    </div>

    <!-- Margins KPI Summary Row -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Gross Sales Revenue</span>
          <div class="kpi-icon-pill" style="color:var(--status-info-text); background-color:var(--status-info-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="pl-rev">-</div>
        <div class="kpi-footer">Top-line trading receipts</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Cost of Goods Sold (COGS)</span>
          <div class="kpi-icon-pill" style="color:var(--status-warning-text); background-color:var(--status-warning-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="pl-cogs">-</div>
        <div class="kpi-footer">Direct raw materials &amp; supplies</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Gross Profit (Margin)</span>
          <div class="kpi-icon-pill" style="color:var(--status-success-text); background-color:var(--status-success-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-success-text);" id="pl-gross-profit">-</div>
        <div class="kpi-footer" id="pl-gross-margin">Gross Margin: -%</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Net Net Profit (Margin)</span>
          <div class="kpi-icon-pill" style="color:var(--status-success-text); background-color:var(--status-success-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-success-text);" id="pl-net-profit">-</div>
        <div class="kpi-footer" id="pl-net-margin">Net Margin: -%</div>
      </div>
    </div>

    <!-- Waterfall Style Bar Chart Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">P&amp;L Waterfall Progression</h2>
          <span class="card-subtitle">From Gross Sales &rarr; Cost Deductions &rarr; Net Operating Profit</span>
        </div>
      </div>
      <div class="card-body">
        <div id="pl-waterfall-chart" style="height: 280px; position: relative;">
          <!-- Chart -->
        </div>
      </div>
    </div>

    <!-- Printable Income Statement Ledger Table Card -->
    <div class="card" id="printable-statement-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Income Statement (P&amp;L Ledger)</h2>
          <span class="card-subtitle" id="pl-period-label">Period: -</span>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="pl-statement-wrapper">
          <!-- Statement Table -->
        </div>
      </div>
    </div>
  `;

  const presetSelect = container.querySelector('#pl-range-preset');
  const customInputs = container.querySelector('#pl-custom-inputs');
  const startDateInput = container.querySelector('#pl-start-date');
  const endDateInput = container.querySelector('#pl-end-date');

  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (val === 'current-month') {
      customInputs.style.display = 'none';
      loadPL('2026-11-01', '2026-11-30');
    } else if (val === 'last-month') {
      customInputs.style.display = 'none';
      loadPL('2026-10-01', '2026-10-31');
    } else if (val === 'ytd') {
      customInputs.style.display = 'none';
      loadPL('2025-12-01', '2026-11-30');
    } else {
      customInputs.style.display = 'flex';
    }
  });

  container.querySelector('#btn-apply-dates').addEventListener('click', () => {
    loadPL(startDateInput.value, endDateInput.value);
  });

  container.querySelector('#btn-print-statement').addEventListener('click', () => {
    window.print();
  });

  await loadPL('2025-12-01', '2026-11-30');
}

async function loadPL(startDate, endDate) {
  try {
    const res = await api.get('/api/profit-loss', { startDate, endDate });
    plData = res;
    const { summary, waterfall, dateRange } = res;

    document.getElementById('pl-period-label').textContent = `${ui.formatDate(dateRange.startDate)} to ${ui.formatDate(dateRange.endDate)}`;
    document.getElementById('pl-rev').textContent = ui.formatINR(summary.grossRevenue);
    document.getElementById('pl-cogs').textContent = ui.formatINR(summary.cogs);
    document.getElementById('pl-gross-profit').textContent = ui.formatINR(summary.grossProfit);
    document.getElementById('pl-gross-margin').textContent = `Gross Margin: ${summary.grossMarginPct}%`;
    document.getElementById('pl-net-profit').textContent = ui.formatINR(summary.netProfit);
    document.getElementById('pl-net-margin').textContent = `Net Margin: ${summary.netMarginPct}%`;

    // Render Waterfall Bar Chart
    charts.bar('pl-waterfall-chart', {
      labels: waterfall.map(w => w.label),
      datasets: [{
        label: 'Financial Flow (₹)',
        data: waterfall.map(w => w.amount),
        backgroundColor: waterfall.map(w => {
          if (w.amount < 0) return '#DC2626';
          if (w.label === 'Gross Revenue') return '#2563EB';
          if (w.label === 'Gross Profit') return '#D97706';
          return '#059669';
        })
      }]
    });

    // Render Printable Statement Table
    const tableWrap = document.getElementById('pl-statement-wrapper');
    const op = summary.opExBreakdown || {};

    tableWrap.innerHTML = `
      <table class="data-table" style="font-size:0.85rem;">
        <thead>
          <tr>
            <th>Financial Line Item</th>
            <th class="table-col-num">Amount (₹)</th>
            <th class="table-col-num">% of Gross Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:var(--bg-surface-alt); font-weight:700;">
            <td>Gross Revenue (Sales Invoiced)</td>
            <td class="table-col-num" style="color:var(--status-info-text);">${ui.formatINR(summary.grossRevenue)}</td>
            <td class="table-col-num">100.0%</td>
          </tr>
          <tr>
            <td style="padding-left:1.5rem;">Less: Cost of Goods Sold (Raw Materials &amp; Spares)</td>
            <td class="table-col-num" style="color:var(--status-danger-text);">(${ui.formatINR(summary.cogs)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? ((summary.cogs / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>
          <tr style="font-weight:700; border-top:1px solid var(--border-strong);">
            <td>Gross Profit</td>
            <td class="table-col-num" style="color:var(--status-success-text);">${ui.formatINR(summary.grossProfit)}</td>
            <td class="table-col-num">${summary.grossMarginPct}%</td>
          </tr>

          <tr style="background:var(--bg-surface-alt); font-weight:700; margin-top:0.5rem;">
            <td colspan="3">Operating Expenses (OpEx)</td>
          </tr>
          <tr>
            <td style="padding-left:1.5rem;">Factory Shed &amp; Office Rent</td>
            <td class="table-col-num">(${ui.formatINR(op.Rent || 0)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? (((op.Rent || 0) / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>
          <tr>
            <td style="padding-left:1.5rem;">Employee Salaries &amp; Wages</td>
            <td class="table-col-num">(${ui.formatINR(op.Salaries || 0)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? (((op.Salaries || 0) / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>
          <tr>
            <td style="padding-left:1.5rem;">Utilities (Industrial Power &amp; Water)</td>
            <td class="table-col-num">(${ui.formatINR(op.Utilities || 0)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? (((op.Utilities || 0) / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>
          <tr>
            <td style="padding-left:1.5rem;">Logistics &amp; Container Freight Transport</td>
            <td class="table-col-num">(${ui.formatINR(op.Transport || 0)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? (((op.Transport || 0) / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>
          <tr>
            <td style="padding-left:1.5rem;">Trade Marketing &amp; Directory Ads</td>
            <td class="table-col-num">(${ui.formatINR(op.Marketing || 0)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? (((op.Marketing || 0) / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>
          <tr>
            <td style="padding-left:1.5rem;">Other Consumables &amp; Maintenance</td>
            <td class="table-col-num">(${ui.formatINR(op.Other || 0)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? (((op.Other || 0) / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>
          <tr style="font-weight:700;">
            <td style="padding-left:1.5rem;">Total Operating Expenses</td>
            <td class="table-col-num" style="color:var(--status-danger-text);">(${ui.formatINR(summary.operatingExpenses)})</td>
            <td class="table-col-num">${summary.grossRevenue > 0 ? ((summary.operatingExpenses / summary.grossRevenue) * 100).toFixed(1) : '0'}%</td>
          </tr>

          <tr style="background:var(--bg-app); font-weight:800; font-size:1rem; border-top:2px solid var(--accent-primary);">
            <td>NET OPERATING PROFIT</td>
            <td class="table-col-num" style="color:var(--status-success-text);">${ui.formatINR(summary.netProfit)}</td>
            <td class="table-col-num">${summary.netMarginPct}%</td>
          </tr>
        </tbody>
      </table>
    `;
  } catch (err) {
    ui.toast(`P&L statement error: ${err.message}`, 'error');
  }
}
