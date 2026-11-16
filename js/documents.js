// js/documents.js - Document Management UI with File Upload, Signed URLs & Format Validation

import { api } from './api.js';
import { ui } from './ui.js';

let documentList = [];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function mountDocuments(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Corporate Document Vault</h1>
        <p>Encrypted file storage in Supabase Storage &bull; Invoices, vendor bills, tax receipts &amp; contracts</p>
      </div>
      <div class="filter-actions-row">
        <button type="button" class="btn btn-primary" id="btn-upload-doc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          Upload Document
        </button>
      </div>
    </div>

    <!-- Documents Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Stored Documents</h2>
        <div class="filter-actions-row">
          <select id="doc-category-filter" class="form-select" style="width: 140px; font-size:0.8rem;">
            <option value="">All Categories</option>
            <option value="Invoices">Invoices</option>
            <option value="Bills">Bills &amp; Receipts</option>
            <option value="Tax Records">Tax Records</option>
            <option value="Contracts">Contracts</option>
            <option value="Certificates">Certificates</option>
          </select>
          <div class="filter-search-box">
            <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="form-input" id="doc-search-input" placeholder="Search file name..." style="padding-left: 2.2rem; font-size: 0.8rem;">
          </div>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="documents-table-wrapper">
          <!-- Injected Table -->
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-upload-doc').addEventListener('click', openUploadModal);

  const searchInput = container.querySelector('#doc-search-input');
  const catFilter = container.querySelector('#doc-category-filter');

  const filterHandler = () => {
    const term = searchInput.value.toLowerCase().trim();
    const cat = catFilter.value;
    let filtered = documentList;
    if (cat) filtered = filtered.filter(d => d.category === cat);
    if (term) filtered = filtered.filter(d => d.file_name.toLowerCase().includes(term));
    renderTable(filtered);
  };

  searchInput.addEventListener('input', filterHandler);
  catFilter.addEventListener('change', filterHandler);

  await loadDocuments();
}

async function loadDocuments() {
  const tableWrap = document.getElementById('documents-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/documents');
    documentList = res.documents || [];
    renderTable(documentList);
  } catch (err) {
    ui.toast(`Document loading error: ${err.message}`, 'error');
  }
}

function renderTable(items) {
  const tableWrap = document.getElementById('documents-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">Document Vault Empty</h3>
        <p class="empty-desc">Upload bills, vendor purchase orders, and PDF invoices to secure them in cloud storage.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Document Name</th>
          <th>Classification</th>
          <th>File Size</th>
          <th>Uploaded On</th>
          <th style="text-align:right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(doc => {
          const sizeKb = (doc.file_size / 1024).toFixed(1);
          return `
            <tr data-doc-id="${doc.id}">
              <td>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <strong>${ui.escapeHtml(doc.file_name)}</strong>
                </div>
              </td>
              <td><span class="chip chip-info">${ui.escapeHtml(doc.category || 'General')}</span></td>
              <td style="font-family:var(--font-mono); font-size:0.75rem;">${sizeKb} KB</td>
              <td>${ui.formatDate(doc.created_at)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button type="button" class="btn btn-secondary btn-sm btn-download-doc" data-id="${doc.id}" data-name="${ui.escapeHtml(doc.file_name)}" title="Download File">
                  Download
                </button>
                <button type="button" class="btn-ghost btn-sm btn-delete-doc" data-id="${doc.id}" title="Delete Document">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Bind download signed URL
  tableWrap.querySelectorAll('.btn-download-doc').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const name = e.currentTarget.dataset.name;
      try {
        const res = await api.get('/api/documents', { action: 'signed_url', id });
        if (res.signedUrl) {
          const a = document.createElement('a');
          a.href = res.signedUrl;
          a.download = name;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          a.remove();
          ui.toast(`Initiated download for ${name}`, 'success');
        }
      } catch (err) {
        ui.toast(err.message, 'error');
      }
    });
  });

  // Bind delete button
  tableWrap.querySelectorAll('.btn-delete-doc').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Delete this document permanently from the vault?')) {
        try {
          await api.delete('/api/documents', { id });
          ui.toast('Document deleted from cloud storage.', 'success');
          loadDocuments();
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      }
    });
  });
}

function openUploadModal() {
  const contentHtml = `
    <form id="upload-doc-form">
      <div class="form-group">
        <label class="form-label">Classification Category <span class="required-star">*</span></label>
        <select id="ud-cat" class="form-select" required>
          <option value="Invoices" selected>Sales / Customer Invoices</option>
          <option value="Bills">Vendor / Supplier Bills</option>
          <option value="Tax Records">GST Return Receipts</option>
          <option value="Contracts">Lease &amp; Legal Agreements</option>
          <option value="Certificates">ISO / Quality Certificates</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Select File (PDF, PNG, JPG, XLSX, CSV - Max 5 MB) <span class="required-star">*</span></label>
        <input type="file" id="ud-file" class="form-input" accept=".pdf,image/png,image/jpeg,image/jpg,.xlsx,.csv" required>
        <span style="font-size:0.72rem; color:var(--text-muted); margin-top:0.25rem;">Validated on client &amp; server before storage upload.</span>
      </div>

      <div id="ud-file-preview" style="display:none; padding:0.75rem; background:var(--bg-app); border-radius:var(--radius-sm); font-size:0.8rem;">
        <div>Selected: <strong id="ud-prev-name">-</strong></div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Size: <span id="ud-prev-size">-</span></div>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Upload to Cloud Storage',
    contentHtml,
    confirmText: 'Upload File',
    onConfirm: async (bodyEl, confirmBtn) => {
      const fileInput = bodyEl.querySelector('#ud-file');
      const category = bodyEl.querySelector('#ud-cat').value;

      if (!fileInput.files || fileInput.files.length === 0) {
        throw new Error('Please select a file to upload.');
      }

      const file = fileInput.files[0];

      if (file.size > MAX_BYTES) {
        throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`);
      }

      ui.setButtonLoading(confirmBtn, true, 'Uploading...');

      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result;
          const base64 = res.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await api.post('/api/documents', {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        category,
        file_base64: base64Data
      });

      ui.toast(`Uploaded ${file.name} to documents bucket.`, 'success');
      loadDocuments();
      return true;
    }
  });

  const modalEl = document.getElementById('global-modal-backdrop');
  if (modalEl) {
    const fileInput = modalEl.querySelector('#ud-file');
    const prevWrap = modalEl.querySelector('#ud-file-preview');
    const prevName = modalEl.querySelector('#ud-prev-name');
    const prevSize = modalEl.querySelector('#ud-prev-size');

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const f = fileInput.files[0];
        prevName.textContent = f.name;
        prevSize.textContent = `${(f.size / 1024).toFixed(1)} KB`;
        prevWrap.style.display = 'block';
      } else {
        prevWrap.style.display = 'none';
      }
    });
  }
}
