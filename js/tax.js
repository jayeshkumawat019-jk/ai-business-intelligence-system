// js/tax.js - Tax (GST) Calculator UI with Output vs Input ITC, Slabs Breakdown & Liability Chart

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let selectedMonth = '2026-11';
let taxHistory = [];
let currentCalc = null;

export async function mountTax(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Goods &amp; Services Tax (GST) Calculator</h1>
        <p>Output tax liabilities minus Input Tax Credit (ITC) equals Net Statutory Payable</p>
      </div>
      <div class="filter-actions-row">
        <select class="form-select" id="tax-month-select" style="width: 150px; font-weight:600;">
          <option value="2026-11" selected>Nov 2026</option>
          <option value="2026-10">Oct 2026</option>
          <option value="2026-09">Sep 2026</option>
          <option value="2026-08">Aug 2026</option>
        </select>
        <button type="button" class="btn btn-primary" id="btn-file-gst">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Record GST Filing
        </button>
      </div>
    </div>

    <!-- Official Compliance Notice Alert -->
    <div style="background-color:var(--status-info-bg); border-left:4px solid var(--status-info-text); padding:0.75rem 1rem; border-radius:var(--radius-sm); margin-bottom:1.5rem; display:flex; align-items:center; gap:0.75rem;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--status-info-text); flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <div style="font-size:0.8rem; color:var(--text-primary); line-height:1.4;">
        <strong>Statutory Compliance Advisory:</strong> Calculations are performed per standard GST schedules. Verify rates and ITC classifications against current official GST rules (Central Board of Indirect Taxes and Customs - CBIC) prior to filing GSTR-3B.
      </div>
    </div>

    <!-- Current Month Tax Summary KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Output GST (Collected)</span>
          <div class="kpi-icon-pill" style="color:var(--status-info-text); background-color:var(--status-info-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
          </div>
        </div>
        <div class="kpi-value" id="tax-output">-</div>
        <div class="kpi-footer">Tax levied on customer invoices</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Input Tax Credit (ITC)</span>
          <div class="kpi-icon-pill" style="color:var(--status-success-text); background-color:var(--status-success-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-success-text);" id="tax-input">-</div>
        <div class="kpi-footer">Eligible credit on raw purchases</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Net GST Cash Payable</span>
          <div class="kpi-icon-pill" style="color:var(--status-danger-text); background-color:var(--status-danger-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--status-danger-text);" id="tax-payable">-</div>
        <div class="kpi-footer">Net liability due to Govt of India</div>
      </div>
    </div>

    <!-- Monthly Liability Bar Chart Card -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <div>
          <h2 class="card-title">Monthly Tax Liability History</h2>
          <span class="card-subtitle">Output Tax vs. Input Tax Credit vs. Net Cash Remittance</span>
        </div>
      </div>
      <div class="card-body">
        <div id="tax-liability-chart" style="height: 280px; position: relative;">
          <!-- Chart -->
        </div>
      </div>
    </div>

    <!-- Statutory Filing Records Table Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">GST Filing Records (GSTR-3B)</h2>
        <span class="card-subtitle">Historical records archived in Supabase</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="tax-history-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  const monthSelect = container.querySelector('#tax-month-select');
  monthSelect.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    loadTax();
  });

  container.querySelector('#btn-file-gst').addEventListener('click', recordGstFiling);

  await loadTax();
}

async function loadTax() {
  const tableWrap = document.getElementById('tax-history-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/tax', { month: selectedMonth });
    currentCalc = res.currentMonthCalculation;
    taxHistory = res.history || [];

    document.getElementById('tax-output').textContent = ui.formatINR(currentCalc.outputGst);
    document.getElementById('tax-input').textContent = ui.formatINR(currentCalc.inputGst);
    document.getElementById('tax-payable').textContent = ui.formatINR(currentCalc.netPayable);

    renderChart();
    renderHistoryTable(taxHistory);
  } catch (err) {
    ui.toast(`Tax calculation error: ${err.message}`, 'error');
  }
}

function renderChart() {
  const sorted = [...taxHistory].sort((a, b) => a.month.localeCompare(b.month)).slice(-10);
  charts.bar('tax-liability-chart', {
    labels: sorted.map(t => t.month),
    datasets: [
      {
        label: 'Output GST (Collected)',
        data: sorted.map(t => t.output_gst),
        backgroundColor: '#2563EB'
      },
      {
        label: 'Input ITC (Reclaimed)',
        data: sorted.map(t => t.input_gst),
        backgroundColor: '#059669'
      },
      {
        label: 'Net Cash Paid',
        data: sorted.map(t => t.net_payable),
        backgroundColor: '#DC2626'
      }
    ]
  });
}

function renderHistoryTable(items) {
  const tableWrap = document.getElementById('tax-history-wrapper');
  if (!tableWrap) return;

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Filing Period</th>
          <th class="table-col-num">Output Tax (₹)</th>
          <th class="table-col-num">Input ITC (₹)</th>
          <th class="table-col-num">Net Payable (₹)</th>
          <th>Filing Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(t => `
          <tr>
            <td><strong>${t.month}</strong></td>
            <td class="table-col-num">${ui.formatINR(t.output_gst)}</td>
            <td class="table-col-num" style="color:var(--status-success-text);">${ui.formatINR(t.input_gst)}</td>
            <td class="table-col-num" style="font-weight:700; color:var(--status-danger-text);">${ui.formatINR(t.net_payable)}</td>
            <td>${t.filing_date ? ui.formatDate(t.filing_date) : 'Pending Return'}</td>
            <td>
              <span class="chip ${t.status === 'Paid' ? 'chip-success' : (t.status === 'Calculated' ? 'chip-warning' : 'chip-neutral')}">
                ${ui.escapeHtml(t.status)}
              </span>
            </td>
          </tr>
        `).reverse().join('')}
      </tbody>
    </table>
  `;
}

async function recordGstFiling() {
  if (!currentCalc) return;

  if (confirm(`Record statutory GSTR-3B return for ${selectedMonth} with Net Tax Payable of ${ui.formatINR(currentCalc.netPayable)}?`)) {
    try {
      await api.post('/api/tax', {
        month: selectedMonth,
        output_gst: currentCalc.outputGst,
        input_gst: currentCalc.inputGst,
        net_payable: currentCalc.netPayable,
        status: 'Paid'
      });
      ui.toast(`GST Return recorded as Paid for ${selectedMonth}.`, 'success');
      loadTax();
    } catch (err) {
      ui.toast(err.message, 'error');
    }
  }
}
