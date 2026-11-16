// js/cashflow.js - Cash Flow Management UI with Inflow vs Outflow, Running Balance & Net Position

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

export async function mountCashflow(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Cash Flow Management</h1>
        <p>Track cash liquidity, capital inflow velocity &amp; cumulative operating cash reserves</p>
      </div>
    </div>

    <!-- Net Cash Position KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Net Liquidity Position</span>
          <div class="kpi-icon-pill" style="color:var(--status-success-text); background-color:var(--status-success-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-success-text);" id="cf-net-position">-</div>
        <div class="kpi-footer">Current running bank &amp; cash reserve</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Cumulative Inflows</span>
          <div class="kpi-icon-pill" style="color:var(--status-info-text); background-color:var(--status-info-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="cf-total-inflows">-</div>
        <div class="kpi-footer">Realized receivables &amp; sales</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Cumulative Outflows</span>
          <div class="kpi-icon-pill" style="color:var(--status-danger-text); background-color:var(--status-danger-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="cf-total-outflows">-</div>
        <div class="kpi-footer">Operating &amp; procurement disbursements</div>
      </div>
    </div>

    <!-- Running Balance Line Chart Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">Cumulative Cash Reserves Trend</h2>
          <span class="card-subtitle">Running bank liquidity balance over 12 months</span>
        </div>
      </div>
      <div class="card-body">
        <div id="cf-balance-chart" style="height: 280px; position: relative;">
          <!-- Chart -->
        </div>
      </div>
    </div>

    <!-- Monthly Inflow vs Outflow Table Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Monthly Liquidity Statement</h2>
        <span class="card-subtitle">Derived dynamically from sales, expenses &amp; payments</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="cf-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  await loadCashflow();
}

async function loadCashflow() {
  const tableWrap = document.getElementById('cf-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/cashflow');
    const { netCashPosition, totalInflowAllTime, totalOutflowAllTime, cashFlowTimeline } = res;

    document.getElementById('cf-net-position').textContent = ui.formatINR(netCashPosition);
    document.getElementById('cf-total-inflows').textContent = ui.formatINR(totalInflowAllTime);
    document.getElementById('cf-total-outflows').textContent = ui.formatINR(totalOutflowAllTime);

    // Render Running Balance Chart
    charts.line('cf-balance-chart', {
      labels: cashFlowTimeline.map(c => c.month),
      datasets: [
        {
          label: 'Cumulative Cash Float (₹)',
          data: cashFlowTimeline.map(c => c.balance),
          color: '#059669',
          fill: true
        },
        {
          label: 'Monthly Net Flow (₹)',
          data: cashFlowTimeline.map(c => c.net),
          color: '#2563EB',
          fill: false,
          borderDash: [4, 4]
        }
      ]
    });

    // Render Monthly Table
    tableWrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Month</th>
            <th class="table-col-num">Inflows (Receipts)</th>
            <th class="table-col-num">Outflows (Disbursements)</th>
            <th class="table-col-num">Net Monthly Flow</th>
            <th class="table-col-num">Running Cash Balance</th>
            <th>Flow Health</th>
          </tr>
        </thead>
        <tbody>
          ${cashFlowTimeline.map(c => {
            const isPositive = c.net >= 0;
            return `
              <tr>
                <td><strong>${c.month}</strong></td>
                <td class="table-col-num" style="color:var(--status-success-text); font-weight:600;">+${ui.formatINR(c.inflow)}</td>
                <td class="table-col-num" style="color:var(--status-danger-text); font-weight:600;">-${ui.formatINR(c.outflow)}</td>
                <td class="table-col-num" style="font-weight:700; color:${isPositive ? 'var(--status-success-text)' : 'var(--status-danger-text)'};">
                  ${isPositive ? '+' : ''}${ui.formatINR(c.net)}
                </td>
                <td class="table-col-num" style="font-weight:800; font-family:var(--font-mono);">
                  ${ui.formatINR(c.balance)}
                </td>
                <td>
                  <span class="chip ${isPositive ? 'chip-success' : 'chip-danger'}">
                    ${isPositive ? 'Surplus Flow' : 'Deficit Flow'}
                  </span>
                </td>
              </tr>
            `;
          }).reverse().join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    ui.toast(`Failed to load cash flow: ${err.message}`, 'error');
  }
}
