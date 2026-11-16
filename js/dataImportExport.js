// js/dataImportExport.js
// Client module for Feature 25: Bulk Data Import & Export
// Provides file parsing (CSV & Excel), column mapping, row-by-row validation results, and full table exports

import api from './api.js';
import ui from './ui.js';

let parsedRows = [];
let detectedHeaders = [];
let activeTable = 'products';

const TABLE_SCHEMAS = {
  products: {
    label: 'Inventory Products',
    fields: [
      { key: 'name', label: 'Product Name', required: true, aliases: ['name', 'product', 'item', 'title'] },
      { key: 'sku', label: 'SKU Code', required: false, aliases: ['sku', 'code', 'item_code'] },
      { key: 'category', label: 'Category', required: false, aliases: ['category', 'type', 'group'] },
      { key: 'cost_price', label: 'Cost Price (₹)', required: true, aliases: ['cost', 'cost_price', 'costprice', 'cp'] },
      { key: 'selling_price', label: 'Selling Price (₹)', required: true, aliases: ['selling_price', 'price', 'sellingprice', 'sp', 'rate'] },
      { key: 'stock', label: 'Initial Stock Qty', required: false, aliases: ['stock', 'qty', 'quantity', 'count'] },
      { key: 'reorder_level', label: 'Reorder Level', required: false, aliases: ['reorder', 'reorder_level', 'min_stock'] }
    ],
    sample: [
      { name: 'Hydraulic Seal Kit 50mm', sku: 'HYD-SEAL-50', category: 'Hydraulics', cost_price: 1800, selling_price: 2450, stock: 45, reorder_level: 15 },
      { name: 'Heavy Duty Greasing Pump', sku: 'PUMP-GR-01', category: 'Machinery', cost_price: 12500, selling_price: 16800, stock: 12, reorder_level: 5 }
    ]
  },
  sales: {
    label: 'Commercial Sales',
    fields: [
      { key: 'sale_date', label: 'Sale Date (YYYY-MM-DD)', required: true, aliases: ['date', 'sale_date', 'invoice_date'] },
      { key: 'product', label: 'Product Name or SKU', required: true, aliases: ['product', 'item', 'product_name', 'sku'] },
      { key: 'customer', label: 'Customer Name', required: false, aliases: ['customer', 'client', 'buyer'] },
      { key: 'quantity', label: 'Quantity', required: true, aliases: ['qty', 'quantity', 'units'] },
      { key: 'amount', label: 'Total Amount (₹)', required: true, aliases: ['amount', 'total', 'price', 'net_amount'] },
      { key: 'payment_mode', label: 'Payment Mode', required: false, aliases: ['mode', 'payment_mode', 'payment_method'] }
    ],
    sample: [
      { sale_date: '2026-11-10', product: 'Hydraulic Seal Kit 50mm', customer: 'Tata Projects Ltd', quantity: 10, amount: 24500, payment_mode: 'Bank Transfer' },
      { sale_date: '2026-11-12', product: 'Heavy Duty Greasing Pump', customer: 'L&T Infrastructure', quantity: 2, amount: 33600, payment_mode: 'UPI' }
    ]
  },
  expenses: {
    label: 'Operating Expenses',
    fields: [
      { key: 'expense_date', label: 'Date (YYYY-MM-DD)', required: true, aliases: ['date', 'expense_date'] },
      { key: 'category', label: 'Category', required: true, aliases: ['category', 'type', 'head'] },
      { key: 'description', label: 'Description', required: false, aliases: ['description', 'particulars', 'desc', 'note'] },
      { key: 'amount', label: 'Amount (₹)', required: true, aliases: ['amount', 'cost', 'total'] },
      { key: 'payment_mode', label: 'Payment Mode', required: false, aliases: ['mode', 'payment_mode'] }
    ],
    sample: [
      { expense_date: '2026-11-05', category: 'Transport', description: 'Port Container Haulage Nhava Sheva', amount: 18500, payment_mode: 'Bank Transfer' },
      { expense_date: '2026-11-08', category: 'Utilities', description: 'Yard High-Tension Power Bill', amount: 42000, payment_mode: 'Bank Transfer' }
    ]
  },
  customers: {
    label: 'Clients & Customers',
    fields: [
      { key: 'name', label: 'Customer / Company Name', required: true, aliases: ['name', 'company', 'client', 'customer'] },
      { key: 'phone', label: 'Phone Number', required: false, aliases: ['phone', 'mobile', 'contact'] },
      { key: 'email', label: 'Email Address', required: false, aliases: ['email', 'mail'] },
      { key: 'gst_number', label: 'GST Number (15 chars)', required: false, aliases: ['gst', 'gstin', 'gst_number'] },
      { key: 'address', label: 'Billing Address', required: false, aliases: ['address', 'location', 'city'] }
    ],
    sample: [
      { name: 'Afcons Marine Engineering', phone: '9820199887', email: 'procurement@afcons.com', gst_number: '27AAACA1234F1Z8', address: 'Plot 42, Dockyard Road, Mumbai' },
      { name: 'Shapoorji Heavy Plant', phone: '9811223344', email: 'billing@shapoorji.com', gst_number: '27AABCS5678Q1Z2', address: 'Colaba Depot, Mumbai' }
    ]
  }
};

export async function mount(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Bulk Data Import & Export</h1>
        <p class="page-subtitle">Batch ingest data with column mapping and row validation, or export whole tables to Excel/CSV.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" id="btn-switch-export">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Table Hub
        </button>
      </div>
    </div>

    <!-- Mode Selector Tabs -->
    <div class="d-flex gap-2 mb-4 border-bottom pb-3">
      <button class="btn btn-primary" id="tab-import-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Bulk Import Wizard
      </button>
      <button class="btn btn-outline" id="tab-export-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Instant Table Export Hub
      </button>
    </div>

    <!-- SECTION 1: IMPORT WIZARD -->
    <div id="section-import">
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h3 class="card-title">Step 1: Choose Target Table & Template</h3>
          <button class="btn btn-sm btn-outline" id="btn-download-sample">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Sample CSV
          </button>
        </div>
        <div class="card-body">
          <div class="row align-items-center g-3">
            <div class="col-md-6">
              <label class="form-label" for="import-target-table">Target Database Table</label>
              <select class="form-control" id="import-target-table">
                <option value="products" selected>Inventory Products (name, cost, selling price, stock)</option>
                <option value="sales">Commercial Sales (date, product, quantity, amount)</option>
                <option value="expenses">Operating Expenses (date, category, amount, description)</option>
                <option value="customers">Customers / Clients (name, phone, GST number)</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Supported Formats</label>
              <p class="text-sm text-muted mb-0">Upload standard Comma-Separated Values (<strong>.csv</strong>) or Microsoft Excel Workbooks (<strong>.xlsx, .xls</strong>). Max 500 rows per batch.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- File Upload Box -->
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title">Step 2: Upload Data File</h3>
        </div>
        <div class="card-body">
          <div class="upload-dropzone p-5 text-center border rounded" id="import-dropzone" style="border: 2px dashed var(--border-color); cursor: pointer; transition: all 0.2s;">
            <svg class="mx-auto mb-3 text-primary" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <h4 class="font-semibold mb-1">Click to browse or drag and drop your spreadsheet here</h4>
            <p class="text-xs text-muted mb-3">Accepts .CSV or .XLSX files</p>
            <input type="file" id="file-input" accept=".csv, .xlsx, .xls" style="display: none;">
            <button class="btn btn-secondary btn-sm" id="btn-browse-file">Browse Local File</button>
            <div class="mt-2 text-sm font-semibold text-primary" id="file-name-label"></div>
          </div>
        </div>
      </div>

      <!-- Step 3: Column Mapping & Live Preview -->
      <div id="step-mapping-preview" style="display: none;">
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="card-title">Step 3: Column Mapping & Verification</h3>
            <span class="text-xs text-muted">Confirm which columns in your uploaded file correspond to system fields.</span>
          </div>
          <div class="card-body">
            <div class="grid grid-3 g-3 mb-4" id="mapping-fields-container"></div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="font-semibold text-sm">Preview (First 5 Rows):</span>
              <span class="text-xs text-muted" id="total-parsed-count"></span>
            </div>
            <div class="table-responsive border rounded" style="max-height: 260px;">
              <table class="table mb-0 text-xs" id="parsed-preview-table">
                <thead></thead>
                <tbody></tbody>
              </table>
            </div>
            <div class="mt-4 d-flex justify-content-end gap-2">
              <button class="btn btn-secondary" id="btn-reset-import">Cancel</button>
              <button class="btn btn-primary" id="btn-execute-import">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Validate & Ingest Batch
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Import Results & Error Audit Trail -->
      <div id="import-results-container" style="display: none;"></div>
    </div>

    <!-- SECTION 2: INSTANT EXPORT HUB -->
    <div id="section-export" style="display: none;">
      <div class="grid grid-3 mb-4">
        ${renderExportCards()}
      </div>
    </div>
  `;

  bindEvents(container);
}

function renderExportCards() {
  const tables = [
    { key: 'sales', title: 'Commercial Sales', desc: 'All sales transactions, units, customers and amounts' },
    { key: 'expenses', title: 'Operational Expenses', desc: 'Expenditure vouchers, categories and payment modes' },
    { key: 'products', title: 'Products & Inventory', desc: 'SKUs, stock counts, cost prices and reorder levels' },
    { key: 'customers', title: 'Customer Directory', desc: 'Client names, contacts, GSTIN and billing addresses' },
    { key: 'suppliers', title: 'Suppliers & Vendors', desc: 'Vendor records, outstanding balances and contact info' },
    { key: 'invoices', title: 'Tax Invoices', desc: 'Invoices, GST amounts, customer totals and statuses' },
    { key: 'employees', title: 'Employee Payroll', desc: 'Staff records, designations, salaries and joining dates' }
  ];

  return tables.map(t => `
    <div class="card">
      <div class="card-body">
        <h3 class="card-title">${t.title}</h3>
        <p class="text-xs text-muted mb-4">${t.desc}</p>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-secondary flex-1 btn-export-tbl" data-tbl="${t.key}" data-format="csv">
            Export CSV
          </button>
          <button class="btn btn-sm btn-primary flex-1 btn-export-tbl" data-tbl="${t.key}" data-format="xlsx">
            Export Excel
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function bindEvents(container) {
  // Tab Switching
  const btnTabImport = container.querySelector('#tab-import-btn');
  const btnTabExport = container.querySelector('#tab-export-btn');
  const btnSwitchExport = container.querySelector('#btn-switch-export');
  const secImport = container.querySelector('#section-import');
  const secExport = container.querySelector('#section-export');

  function showExport() {
    btnTabExport.classList.replace('btn-outline', 'btn-primary');
    btnTabImport.classList.replace('btn-primary', 'btn-outline');
    secImport.style.display = 'none';
    secExport.style.display = 'block';
  }

  function showImport() {
    btnTabImport.classList.replace('btn-outline', 'btn-primary');
    btnTabExport.classList.replace('btn-primary', 'btn-outline');
    secImport.style.display = 'block';
    secExport.style.display = 'none';
  }

  btnTabImport.addEventListener('click', showImport);
  btnTabExport.addEventListener('click', showExport);
  btnSwitchExport.addEventListener('click', showExport);

  // Download Sample Template
  container.querySelector('#btn-download-sample').addEventListener('click', () => {
    downloadSampleTemplate(activeTable);
  });

  const targetSelect = container.querySelector('#import-target-table');
  targetSelect.addEventListener('change', (e) => {
    activeTable = e.target.value;
    resetImportUI(container);
  });

  // Dropzone and File Picker
  const dropzone = container.querySelector('#import-dropzone');
  const fileInput = container.querySelector('#file-input');
  const browseBtn = container.querySelector('#btn-browse-file');

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--color-primary)';
    dropzone.style.backgroundColor = 'var(--bg-card-hover, rgba(37,99,235,0.05))';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.backgroundColor = 'transparent';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    dropzone.style.backgroundColor = 'transparent';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(container, e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(container, e.target.files[0]);
    }
  });

  // Reset and Execute Import
  container.querySelector('#btn-reset-import').addEventListener('click', () => resetImportUI(container));
  container.querySelector('#btn-execute-import').addEventListener('click', () => executeBatchImport(container));

  // Export Table Hub buttons
  container.querySelectorAll('.btn-export-tbl').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tbl = e.currentTarget.dataset.tbl;
      const fmt = e.currentTarget.dataset.format;
      await exportTableData(tbl, fmt);
    });
  });
}

function downloadSampleTemplate(tableKey) {
  const schema = TABLE_SCHEMAS[tableKey];
  if (!schema) return;

  try {
    const csv = window.Papa.unparse(schema.sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample-template-${tableKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    ui.toast(`Sample template for ${schema.label} downloaded.`, 'success');
  } catch (err) {
    ui.toast('Error generating sample template: ' + err.message, 'error');
  }
}

function handleFileSelected(container, file) {
  const nameLabel = container.querySelector('#file-name-label');
  nameLabel.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    parseCSVFile(container, file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    parseExcelFile(container, file);
  } else {
    ui.toast('Unsupported file format. Please upload .csv or .xlsx', 'error');
  }
}

function parseCSVFile(container, file) {
  window.Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors && results.errors.length > 0) {
        console.warn('CSV parse warnings:', results.errors);
      }
      detectedHeaders = results.meta.fields || [];
      parsedRows = results.data;
      showMappingAndPreview(container);
    },
    error: (err) => {
      ui.toast('Failed to parse CSV file: ' + err.message, 'error');
    }
  });
}

function parseExcelFile(container, file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = window.XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (json.length === 0) {
        ui.toast('Excel file contains no data rows.', 'warning');
        return;
      }

      detectedHeaders = Object.keys(json[0]);
      parsedRows = json;
      showMappingAndPreview(container);
    } catch (err) {
      ui.toast('Failed to read Excel workbook: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function showMappingAndPreview(container) {
  const mappingSection = container.querySelector('#step-mapping-preview');
  const fieldsContainer = container.querySelector('#mapping-fields-container');
  const countLabel = container.querySelector('#total-parsed-count');
  const table = container.querySelector('#parsed-preview-table');

  const schema = TABLE_SCHEMAS[activeTable];
  countLabel.textContent = `Total Rows Detected: ${parsedRows.length}`;

  // Render Mapping dropdowns
  fieldsContainer.innerHTML = schema.fields.map(f => {
    // Best effort auto-match
    let matchedHeader = '';
    for (const h of detectedHeaders) {
      const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (f.aliases.some(alias => cleanH.includes(alias.replace(/[^a-z0-9]/g, '')))) {
        matchedHeader = h;
        break;
      }
    }

    const optionsHtml = [
      '<option value="">-- Ignore / Unmapped --</option>',
      ...detectedHeaders.map(h => `<option value="${ui.escape(h)}" ${h === matchedHeader ? 'selected' : ''}>${ui.escape(h)}</option>`)
    ].join('');

    return `
      <div>
        <label class="form-label text-xs">
          ${ui.escape(f.label)} ${f.required ? '<span class="text-danger">*</span>' : ''}
        </label>
        <select class="form-control form-control-sm mapping-select" data-field="${f.key}">
          ${optionsHtml}
        </select>
      </div>
    `;
  }).join('');

  // Render Preview Table
  const previewData = parsedRows.slice(0, 5);
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  thead.innerHTML = `<tr>${detectedHeaders.map(h => `<th>${ui.escape(h)}</th>`).join('')}</tr>`;
  tbody.innerHTML = previewData.map(row => {
    const tds = detectedHeaders.map(h => `<td>${ui.escape(String(row[h] !== undefined ? row[h] : ''))}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  mappingSection.style.display = 'block';
  mappingSection.scrollIntoView({ behavior: 'smooth' });
}

function resetImportUI(container) {
  parsedRows = [];
  detectedHeaders = [];
  container.querySelector('#file-name-label').textContent = '';
  container.querySelector('#file-input').value = '';
  container.querySelector('#step-mapping-preview').style.display = 'none';
  container.querySelector('#import-results-container').style.display = 'none';
}

async function executeBatchImport(container) {
  const schema = TABLE_SCHEMAS[activeTable];
  const mappingSelects = container.querySelectorAll('.mapping-select');
  const mapping = {};

  mappingSelects.forEach(sel => {
    const fieldKey = sel.dataset.field;
    const headerVal = sel.value;
    if (headerVal) {
      mapping[fieldKey] = headerVal;
    }
  });

  // Verify required fields
  const missingRequired = schema.fields.filter(f => f.required && !mapping[f.key]);
  if (missingRequired.length > 0) {
    ui.toast(`Please map required field: ${missingRequired.map(f => f.label).join(', ')}`, 'warning');
    return;
  }

  // Transform rows according to mapping
  const transformedRows = parsedRows.map(raw => {
    const row = {};
    for (const [fieldKey, header] of Object.entries(mapping)) {
      row[fieldKey] = raw[header];
    }
    return row;
  });

  const execBtn = container.querySelector('#btn-execute-import');
  execBtn.disabled = true;
  execBtn.innerHTML = '<span class="spinner spinner-sm me-2"></span>Validating & Ingesting...';

  try {
    const res = await api.post('/api/data', {
      table: activeTable,
      rows: transformedRows
    });

    displayImportResults(container, res);
    ui.toast(`Batch processed: ${res.insertedCount} inserted, ${res.failedCount} failed.`, res.insertedCount > 0 ? 'success' : 'warning');
  } catch (err) {
    ui.toast('Batch import failed: ' + err.message, 'error');
  } finally {
    execBtn.disabled = false;
    execBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Validate & Ingest Batch';
  }
}

function displayImportResults(container, res) {
  const resContainer = container.querySelector('#import-results-container');
  resContainer.style.display = 'block';

  let failedRowsHtml = '';
  if (res.failedRows && res.failedRows.length > 0) {
    const failureTbody = res.failedRows.map(f => `
      <tr>
        <td class="font-semibold text-danger">Row #${f.rowNumber}</td>
        <td>
          <ul class="mb-0 ps-3 text-danger">
            ${f.errors.map(err => `<li>${ui.escape(err)}</li>`).join('')}
          </ul>
        </td>
        <td>
          <pre class="mb-0 text-xs p-1 bg-light rounded" style="max-height: 80px; overflow-y: auto;">${ui.escape(JSON.stringify(f.rowData, null, 2))}</pre>
        </td>
      </tr>
    `).join('');

    failedRowsHtml = `
      <div class="mt-4">
        <h4 class="font-semibold text-danger mb-2">Detailed Row Validation Errors (${res.failedCount} Failed)</h4>
        <div class="table-responsive border rounded" style="max-height: 320px;">
          <table class="table mb-0 text-xs">
            <thead>
              <tr>
                <th style="width: 100px;">Location</th>
                <th>Validation Failures</th>
                <th>Supplied Row Payload</th>
              </tr>
            </thead>
            <tbody>${failureTbody}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  resContainer.innerHTML = `
    <div class="card border-primary mb-4">
      <div class="card-header bg-light d-flex justify-content-between align-items-center">
        <h3 class="card-title">Batch Ingestion Audit Summary</h3>
        <span class="badge ${res.failedCount === 0 ? 'badge-success' : 'badge-warning'}">
          ${res.failedCount === 0 ? 'Flawless Ingestion' : 'Partial Ingestion with Rejections'}
        </span>
      </div>
      <div class="card-body">
        <div class="grid grid-3 mb-3">
          <div class="stat-card">
            <div class="stat-label">Total Submitted</div>
            <div class="stat-value">${res.totalRows} Rows</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Successfully Inserted</div>
            <div class="stat-value text-success">${res.insertedCount} Saved</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Rejected / Invalid</div>
            <div class="stat-value text-danger">${res.failedCount} Errors</div>
          </div>
        </div>

        ${failedRowsHtml}

        <div class="mt-4 pt-3 border-top d-flex justify-content-end">
          <button class="btn btn-secondary" id="btn-done-import">Close & Start New Import</button>
        </div>
      </div>
    </div>
  `;

  resContainer.scrollIntoView({ behavior: 'smooth' });
  resContainer.querySelector('#btn-done-import').addEventListener('click', () => resetImportUI(container));
}

async function exportTableData(tableKey, format) {
  try {
    ui.toast(`Preparing ${tableKey} export...`, 'info');
    const res = await api.get(`/api/data?table=${encodeURIComponent(tableKey)}`);
    const records = res.records || [];

    if (records.length === 0) {
      ui.toast(`No records found in table '${tableKey}'.`, 'warning');
      return;
    }

    const fileName = `${tableKey}-export-${new Date().toISOString().substring(0, 10)}`;

    if (format === 'csv') {
      const csv = window.Papa.unparse(records);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      ui.toast(`${records.length} records exported to CSV.`, 'success');
    } else {
      const worksheet = window.XLSX.utils.json_to_sheet(records);
      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, worksheet, tableKey.toUpperCase());
      window.XLSX.writeFile(workbook, `${fileName}.xlsx`);
      ui.toast(`${records.length} records exported to Excel.`, 'success');
    }
  } catch (err) {
    ui.toast('Export failed: ' + err.message, 'error');
  }
}

export const mountDataImportExport = mount;
export default { mount, mountDataImportExport };
