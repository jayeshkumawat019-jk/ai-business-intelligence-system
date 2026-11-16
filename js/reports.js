// js/reports.js
// Client module for Feature 19: Automatic Business Reports
// Previews and exports multi-period reports to PDF, Excel, and CSV

import api from './api.js';
import ui from './ui.js';

let currentReport = null;

export async function mount(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Automatic Business Reports</h1>
        <p class="page-subtitle">Generate, analyze, and export executive statements for sales, expenses, profit & loss, taxes, and inventory.</p>
      </div>
      <div class="page-actions" id="report-export-actions" style="display: none;">
        <button class="btn btn-secondary" id="btn-export-csv">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
        <button class="btn btn-secondary" id="btn-export-excel">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
          Export Excel (.xlsx)
        </button>
        <button class="btn btn-primary" id="btn-export-pdf">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12h4"/><path d="M10 16h4"/></svg>
          Download Official PDF
        </button>
      </div>
    </div>

    <!-- Report Parameter Form -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row align-items-end g-3">
          <div class="col-md-3">
            <label class="form-label" for="report-type">Report Category</label>
            <select class="form-control" id="report-type">
              <option value="sales" selected>Commercial Sales Report</option>
              <option value="expenses">Operational Expenses Report</option>
              <option value="profit-loss">Profit & Loss Statement (P&L)</option>
              <option value="tax">GST & Tax Compliance Report</option>
              <option value="inventory">Stock Valuation & Audit Report</option>
            </select>
          </div>
          <div class="col-md-3" id="group-start-date">
            <label class="form-label" for="report-start-date">Start Date</label>
            <input type="date" class="form-control" id="report-start-date" value="2025-12-01">
          </div>
          <div class="col-md-3" id="group-end-date">
            <label class="form-label" for="report-end-date">End Date</label>
            <input type="date" class="form-control" id="report-end-date" value="2026-11-30">
          </div>
          <div class="col-md-3 d-flex gap-2">
            <button class="btn btn-primary w-100" id="btn-run-report">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Generate Statement
            </button>
          </div>
        </div>

        <div class="mt-3 pt-3 border-top d-flex gap-2 flex-wrap align-items-center" id="quick-preset-bar">
          <span class="text-muted text-sm me-2">Quick Date Ranges:</span>
          <button class="btn btn-sm btn-outline" data-preset="30d">Last 30 Days</button>
          <button class="btn btn-sm btn-outline" data-preset="quarter">Current Quarter (Q4)</button>
          <button class="btn btn-sm btn-outline active" data-preset="fy26">Full FY2026 (Dec 25 - Nov 26)</button>
        </div>
      </div>
    </div>

    <!-- Preview Container -->
    <div id="report-preview-container">
      <div class="card p-5 text-center text-muted">
        <svg class="mx-auto mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p class="font-semibold">Select parameters above and click "Generate Statement" to preview the live report.</p>
      </div>
    </div>
  `;

  bindEvents(container);
  // Auto-generate sales report by default
  generateReport(container);
}

function bindEvents(container) {
  const typeSelect = container.querySelector('#report-type');
  const groupStart = container.querySelector('#group-start-date');
  const groupEnd = container.querySelector('#group-end-date');
  const quickBar = container.querySelector('#quick-preset-bar');

  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === 'inventory') {
      groupStart.style.opacity = '0.4';
      groupEnd.style.opacity = '0.4';
      quickBar.style.display = 'none';
    } else {
      groupStart.style.opacity = '1';
      groupEnd.style.opacity = '1';
      quickBar.style.display = 'flex';
    }
  });

  // Preset Buttons
  container.querySelectorAll('#quick-preset-bar button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#quick-preset-bar button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const preset = e.target.dataset.preset;
      const startEl = container.querySelector('#report-start-date');
      const endEl = container.querySelector('#report-end-date');

      if (preset === '30d') {
        startEl.value = '2026-10-15';
        endEl.value = '2026-11-15';
      } else if (preset === 'quarter') {
        startEl.value = '2026-09-01';
        endEl.value = '2026-11-30';
      } else if (preset === 'fy26') {
        startEl.value = '2025-12-01';
        endEl.value = '2026-11-30';
      }
      generateReport(container);
    });
  });

  // Generate Button
  container.querySelector('#btn-run-report').addEventListener('click', () => {
    generateReport(container);
  });

  // Export Buttons
  container.querySelector('#btn-export-csv').addEventListener('click', exportCSV);
  container.querySelector('#btn-export-excel').addEventListener('click', exportExcel);
  container.querySelector('#btn-export-pdf').addEventListener('click', exportPDF);
}

async function generateReport(container) {
  const preview = container.querySelector('#report-preview-container');
  const actions = container.querySelector('#report-export-actions');
  const type = container.querySelector('#report-type').value;
  const startDate = container.querySelector('#report-start-date').value;
  const endDate = container.querySelector('#report-end-date').value;

  preview.innerHTML = `
    <div class="card p-5 text-center">
      <div class="spinner mb-3"></div>
      <p class="text-muted">Compiling financial metrics and audit trail...</p>
    </div>
  `;

  try {
    const res = await api.get(`/api/reports?type=${encodeURIComponent(type)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
    currentReport = res;

    actions.style.display = 'flex';
    renderReportPreview(preview, currentReport);
  } catch (err) {
    actions.style.display = 'none';
    preview.innerHTML = `
      <div class="card p-4 border-danger text-center">
        <p class="text-danger font-semibold mb-2">Failed to generate report</p>
        <p class="text-sm text-muted">${ui.escape(err.message)}</p>
      </div>
    `;
  }
}

function renderReportPreview(previewEl, rep) {
  const meta = rep.metadata;
  const summary = rep.summary;
  const cols = rep.columns;
  const rows = rep.rows;

  // Build Summary KPI cards
  let summaryHtml = '';
  if (meta.type === 'sales') {
    summaryHtml = `
      <div class="grid grid-3 mb-4">
        <div class="stat-card">
          <div class="stat-label">Total Commercial Sales</div>
          <div class="stat-value text-primary">${ui.formatINR(summary.totalRevenue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Transactions Count</div>
          <div class="stat-value">${summary.totalTransactions} Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Average Order Size</div>
          <div class="stat-value">${ui.formatINR(summary.avgOrderValue)}</div>
        </div>
      </div>
    `;
  } else if (meta.type === 'expenses') {
    summaryHtml = `
      <div class="grid grid-3 mb-4">
        <div class="stat-card">
          <div class="stat-label">Total Operational Expenses</div>
          <div class="stat-value text-danger">${ui.formatINR(summary.totalExpenses)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Recorded Vouchers</div>
          <div class="stat-value">${summary.totalEntries} Entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Average Expense Ticket</div>
          <div class="stat-value">${ui.formatINR(summary.avgExpensePerEntry)}</div>
        </div>
      </div>
    `;
  } else if (meta.type === 'profit-loss') {
    summaryHtml = `
      <div class="grid grid-4 mb-4">
        <div class="stat-card">
          <div class="stat-label">Gross Revenue</div>
          <div class="stat-value text-primary">${ui.formatINR(summary.grossRevenue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Cost of Goods (COGS)</div>
          <div class="stat-value">${ui.formatINR(summary.cogs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Operating Overheads</div>
          <div class="stat-value">${ui.formatINR(summary.totalOperatingExpenses)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Net Profit Margin</div>
          <div class="stat-value text-success">${ui.formatINR(summary.netProfit)} (${summary.marginPercent}%)</div>
        </div>
      </div>
    `;
  } else if (meta.type === 'tax') {
    summaryHtml = `
      <div class="grid grid-3 mb-4">
        <div class="stat-card">
          <div class="stat-label">Total Output GST Collected</div>
          <div class="stat-value text-primary">${ui.formatINR(summary.totalOutputTax)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Input Tax Credit (ITC)</div>
          <div class="stat-value text-success">${ui.formatINR(summary.totalInputTax)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Net Payable GST</div>
          <div class="stat-value">${ui.formatINR(summary.netTaxPayable)}</div>
        </div>
      </div>
    `;
  } else if (meta.type === 'inventory') {
    summaryHtml = `
      <div class="grid grid-3 mb-4">
        <div class="stat-card">
          <div class="stat-label">Total Inventory Valuation</div>
          <div class="stat-value text-primary">${ui.formatINR(summary.totalValuation)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tracked SKUs</div>
          <div class="stat-value">${summary.totalSkus} Products</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Reorder Attention</div>
          <div class="stat-value text-warning">${summary.lowStockCount} Low Items</div>
        </div>
      </div>
    `;
  }

  // Build Table Preview
  const theadHtml = cols.map(c => `<th style="text-align: ${c.align || 'left'}">${ui.escape(c.label)}</th>`).join('');
  const tbodyHtml = rows.map(r => {
    const tds = cols.map(c => {
      let val = r[c.key];
      if (c.format === 'currency') {
        const num = Number(val || 0);
        val = num < 0 ? `(${ui.formatINR(Math.abs(num))})` : ui.formatINR(num);
      }
      return `<td style="text-align: ${c.align || 'left'}">${ui.escape(String(val !== undefined && val !== null ? val : '-'))}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  previewEl.innerHTML = `
    ${summaryHtml}
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h3 class="card-title">${ui.escape(meta.title)}</h3>
          <span class="text-xs text-muted">
            ${meta.startDate ? `Period: ${meta.startDate} to ${meta.endDate} • ` : ''}
            Generated on ${new Date(meta.generatedAt).toLocaleString('en-IN')}
          </span>
        </div>
        <span class="badge badge-success">${rows.length} Records Verified</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive" style="max-height: 520px; overflow-y: auto;">
          <table class="table mb-0">
            <thead><tr>${theadHtml}</tr></thead>
            <tbody>${tbodyHtml || '<tr><td colspan="10" class="text-center text-muted p-4">No records found for this period.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function exportCSV() {
  if (!currentReport || !currentReport.rows || currentReport.rows.length === 0) {
    ui.toast('No report rows available to export.', 'warning');
    return;
  }

  try {
    const cols = currentReport.columns;
    const cleanData = currentReport.rows.map(r => {
      const obj = {};
      cols.forEach(c => {
        obj[c.label] = r[c.key];
      });
      return obj;
    });

    if (!window.Papa) {
      throw new Error('PapaParse library is not loaded');
    }

    const csv = window.Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReport.metadata.type}-report-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    ui.toast('CSV report downloaded successfully.', 'success');
  } catch (err) {
    ui.toast('Failed to export CSV: ' + err.message, 'error');
  }
}

function exportExcel() {
  if (!currentReport || !currentReport.rows || currentReport.rows.length === 0) {
    ui.toast('No report rows available to export.', 'warning');
    return;
  }

  try {
    if (!window.XLSX) {
      throw new Error('SheetJS XLSX library is not loaded');
    }

    const cols = currentReport.columns;
    const cleanData = currentReport.rows.map(r => {
      const obj = {};
      cols.forEach(c => {
        obj[c.label] = r[c.key];
      });
      return obj;
    });

    const worksheet = window.XLSX.utils.json_to_sheet(cleanData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Statement');

    const fileName = `${currentReport.metadata.type}-report-${new Date().toISOString().substring(0, 10)}.xlsx`;
    window.XLSX.writeFile(workbook, fileName);
    ui.toast('Excel report exported successfully.', 'success');
  } catch (err) {
    ui.toast('Failed to export Excel: ' + err.message, 'error');
  }
}

function exportPDF() {
  if (!currentReport || !currentReport.rows || currentReport.rows.length === 0) {
    ui.toast('No report rows available to export.', 'warning');
    return;
  }

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF library is not loaded');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const meta = currentReport.metadata;

    // Header styling
    doc.setFillColor(28, 25, 23); // #1C1917
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AI BUSINESS INTELLIGENCE SYSTEM', 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(214, 211, 209);
    doc.text(meta.title.toUpperCase(), 14, 24);

    doc.setFontSize(8);
    const dateText = meta.startDate ? `Period: ${meta.startDate} to ${meta.endDate}` : `Generated: ${new Date().toLocaleDateString('en-IN')}`;
    doc.text(dateText, 196, 24, { align: 'right' });

    // Table mapping
    const headers = currentReport.columns.map(c => c.label);
    const body = currentReport.rows.map(r => {
      return currentReport.columns.map(c => {
        let val = r[c.key];
        if (c.format === 'currency') {
          const num = Number(val || 0);
          return num < 0 ? `(${ui.formatINR(Math.abs(num))})` : ui.formatINR(num);
        }
        return val !== undefined && val !== null ? String(val) : '-';
      });
    });

    doc.autoTable({
      head: [headers],
      body: body,
      startY: 44,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 3,
        textColor: [41, 37, 36]
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 246, 240]
      },
      margin: { left: 14, right: 14, bottom: 20 },
      didDrawPage: (data) => {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(168, 162, 158);
        doc.text(`Official Executive Document • Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, 14, 287);
        doc.text('Digital Literacy Capstone • Verified Ledger', 196, 287, { align: 'right' });
      }
    });

    const fileName = `${meta.type}-statement-${new Date().toISOString().substring(0, 10)}.pdf`;
    doc.save(fileName);
    ui.toast('PDF report downloaded successfully.', 'success');
  } catch (err) {
    ui.toast('Failed to generate PDF: ' + err.message, 'error');
  }
}

export const mountReports = mount;
export default { mount, mountReports };
