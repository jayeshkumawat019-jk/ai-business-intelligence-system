// js/employees.js - Employee Workforce Management UI with Daily Attendance, Salary Slips & jsPDF Pay Slip

import { api } from './api.js';
import { ui } from './ui.js';
import { charts } from './charts.js';

let employeeList = [];
let selectedMonth = '2026-11';
let attendanceStats = { present: 0, absent: 0, leave: 0 };

export async function mountEmployees(container) {
  container.innerHTML = `
    <div class="section-header-row">
      <div class="section-title-wrap">
        <h1>Human Resources &amp; Payroll</h1>
        <p>Workforce directory, daily biometric attendance tracking &amp; automated salary slip generation</p>
      </div>
      <div class="filter-actions-row">
        <select class="form-select" id="emp-month-select" style="width: 150px; font-weight:600;">
          <option value="2026-11" selected>Nov 2026</option>
          <option value="2026-10">Oct 2026</option>
          <option value="2026-09">Sep 2026</option>
        </select>
        <button type="button" class="btn btn-secondary" id="btn-mark-attendance">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Mark Daily Attendance
        </button>
        <button type="button" class="btn btn-primary" id="btn-add-employee">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Employee
        </button>
      </div>
    </div>

    <!-- Dockyard Animated Scene: Worker in Hard Hat Holding Clipboard -->
    <div class="dockyard-scene" title="Industrial Operations: Floor Supervisor Inspecting Plant">
      <img src="assets/svg/worker.svg" class="dockyard-svg" alt="Supervisor with Clipboard">
    </div>

    <!-- Attendance Chart & Payroll KPI Row -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Monthly Attendance Distribution</h2>
            <span class="card-subtitle">Present vs. Absent vs. Approved Leaves</span>
          </div>
        </div>
        <div class="card-body">
          <div id="emp-attendance-chart" style="height: 200px; position: relative;">
            <!-- Chart -->
          </div>
        </div>
      </div>

      <div class="kpi-card" style="justify-content: center;">
        <div class="kpi-header">
          <span class="kpi-label">Monthly Payroll Outlay</span>
          <div class="kpi-icon-pill" style="color:var(--status-info-text); background-color:var(--status-info-bg);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color:var(--text-primary); margin-top:0.5rem;" id="emp-payroll-total">-</div>
        <div class="kpi-footer" id="emp-count-footer">5 active staff &amp; technicians</div>
      </div>
    </div>

    <!-- Employee Table Card -->
    <div class="card">
      <div class="card-header" style="flex-wrap: wrap;">
        <h2 class="card-title">Employee Master &amp; Salary Ledger</h2>
        <div class="filter-search-box">
          <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="form-input" id="emp-search-input" placeholder="Search employee name, role..." style="padding-left: 2.2rem; font-size: 0.8rem;">
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-responsive" id="emp-table-wrapper">
          <!-- Table -->
        </div>
      </div>
    </div>
  `;

  const monthSelect = container.querySelector('#emp-month-select');
  monthSelect.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    loadEmployees();
  });

  container.querySelector('#btn-add-employee').addEventListener('click', openAddEmployeeModal);
  container.querySelector('#btn-mark-attendance').addEventListener('click', openMarkAttendanceModal);

  const searchInput = container.querySelector('#emp-search-input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = employeeList.filter(emp =>
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.code && emp.code.toLowerCase().includes(term)) ||
      (emp.role && emp.role.toLowerCase().includes(term)) ||
      (emp.department && emp.department.toLowerCase().includes(term))
    );
    renderTable(filtered);
  });

  await loadEmployees();
}

async function loadEmployees() {
  const tableWrap = document.getElementById('emp-table-wrapper');
  if (tableWrap) {
    tableWrap.innerHTML = '<div style="padding: 3rem; text-align: center;"><span class="spinner"></span></div>';
  }

  try {
    const res = await api.get('/api/employees', { month: selectedMonth });
    employeeList = res.employees || [];
    attendanceStats = res.attendanceStats || { present: 0, absent: 0, leave: 0 };

    const totalNetPayroll = employeeList.reduce((sum, e) => sum + (e.salaryBreakdown?.netSalary || 0), 0);
    document.getElementById('emp-payroll-total').textContent = ui.formatINR(totalNetPayroll);
    document.getElementById('emp-count-footer').textContent = `${employeeList.length} Active employees in ${selectedMonth}`;

    renderChart();
    renderTable(employeeList);
  } catch (err) {
    ui.toast(`Failed to load employee workforce: ${err.message}`, 'error');
  }
}

function renderChart() {
  charts.doughnut('emp-attendance-chart', {
    labels: ['Present Shifts', 'Absences', 'Approved Leaves'],
    data: [attendanceStats.present || 10, attendanceStats.absent || 1, attendanceStats.leave || 2],
    colors: ['#059669', '#DC2626', '#D97706'],
    isCurrency: false
  });
}

function renderTable(items) {
  const tableWrap = document.getElementById('emp-table-wrapper');
  if (!tableWrap) return;

  if (items.length === 0) {
    tableWrap.innerHTML = `
      <div class="empty-state">
        <h3 class="empty-title">No Employees Found</h3>
        <p class="empty-desc">Register company staff to track attendance and compute payslips.</p>
      </div>
    `;
    return;
  }

  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Emp Code</th>
          <th>Employee Name</th>
          <th>Role &amp; Department</th>
          <th class="table-col-num">Base Pay</th>
          <th class="table-col-num">Attendance (P/A/L)</th>
          <th class="table-col-num">LOP Deduction</th>
          <th class="table-col-num">Net Salary</th>
          <th style="text-align:right;">Salary Slip</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(e => {
          const s = e.salaryBreakdown || {};
          return `
            <tr data-emp-id="${e.id}">
              <td><code style="font-size:0.75rem;">${ui.escapeHtml(e.code)}</code></td>
              <td>
                <strong>${ui.escapeHtml(e.name)}</strong>
                <div style="font-size:0.72rem; color:var(--text-muted);">${ui.escapeHtml(e.phone || '')}</div>
              </td>
              <td>
                <div>${ui.escapeHtml(e.role)}</div>
                <span class="chip chip-neutral" style="font-size:0.68rem;">${ui.escapeHtml(e.department)}</span>
              </td>
              <td class="table-col-num">${ui.formatINR(e.base_salary)}</td>
              <td class="table-col-num">
                <span style="color:var(--status-success-text); font-weight:700;">${e.presentDays}P</span> / 
                <span style="color:var(--status-danger-text); font-weight:700;">${e.absentDays}A</span> / 
                <span style="color:var(--status-warning-text); font-weight:700;">${e.leaveDays}L</span>
              </td>
              <td class="table-col-num" style="color:var(--status-danger-text);">
                ${s.lossOfPay > 0 ? `-${ui.formatINR(s.lossOfPay)}` : '₹ 0.00'}
              </td>
              <td class="table-col-num" style="font-weight:700; color:var(--status-success-text);">
                ${ui.formatINR(s.netSalary)}
              </td>
              <td style="text-align:right;">
                <button type="button" class="btn btn-secondary btn-sm btn-payslip-pdf" data-id="${e.id}" title="Download Pay Slip PDF">
                  Pay Slip PDF
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  tableWrap.querySelectorAll('.btn-payslip-pdf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const emp = employeeList.find(item => item.id === id);
      if (emp) generateSalarySlipPDF(emp);
    });
  });
}

function generateSalarySlipPDF(emp) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const s = emp.salaryBreakdown || {};

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('AI BUSINESS INTELLIGENCE CORP', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Plot 42, Heavy Industrial MIDC, Taloja, Navi Mumbai', 14, 26);
    doc.text(`MONTHLY SALARY SLIP - ${selectedMonth.toUpperCase()}`, 14, 32);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 36, 196, 36);

    // Employee Meta Info
    doc.setFontSize(10);
    doc.text(`Employee Code: ${emp.code}`, 14, 44);
    doc.text(`Employee Name: ${emp.name}`, 14, 50);
    doc.text(`Department: ${emp.department}`, 14, 56);
    doc.text(`Designation: ${emp.role}`, 14, 62);

    doc.text(`Total Days in Month: 30`, 120, 44);
    doc.text(`Days Present: ${emp.presentDays}`, 120, 50);
    doc.text(`Days Absent: ${emp.absentDays}`, 120, 56);
    doc.text(`Leaves Approved: ${emp.leaveDays}`, 120, 62);

    // Earnings & Deductions AutoTable
    doc.autoTable({
      startY: 70,
      head: [['Earnings', 'Amount (INR)', 'Deductions', 'Amount (INR)']],
      body: [
        ['Basic Pay', `INR ${s.baseSalary.toFixed(2)}`, 'Provident Fund (PF)', `INR ${(s.deductions * 0.7).toFixed(2)}`],
        ['House Rent Allowance (HRA)', `INR ${(s.allowances * 0.6).toFixed(2)}`, 'ESI Healthcare', `INR ${(s.deductions * 0.3).toFixed(2)}`],
        ['Special Allowance', `INR ${(s.allowances * 0.4).toFixed(2)}`, 'Loss of Pay (LOP Absence)', `INR ${s.lossOfPay.toFixed(2)}`],
        ['Gross Earnings', `INR ${s.grossSalary.toFixed(2)}`, 'Total Deductions', `INR ${(s.deductions + s.lossOfPay).toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [28, 25, 23], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable.finalY + 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`NET SALARY PAYABLE: INR ${s.netSalary.toFixed(2)}`, 14, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Amount in Words: ${s.amountInWords || 'Rupees Only'}`, 14, finalY + 6);

    doc.line(14, finalY + 28, 70, finalY + 28);
    doc.text('Employee Signature', 14, finalY + 33);

    doc.line(130, finalY + 28, 196, finalY + 28);
    doc.text('Director / HR Signatory', 130, finalY + 33);

    doc.save(`SalarySlip_${emp.code}_${selectedMonth}.pdf`);
    ui.toast(`Downloaded salary slip for ${emp.name}`, 'success');
  } catch (err) {
    ui.toast(`Payslip generation error: ${err.message}`, 'error');
  }
}

function openMarkAttendanceModal() {
  const today = new Date().toISOString().slice(0, 10);
  const contentHtml = `
    <form id="mark-attendance-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Employee <span class="required-star">*</span></label>
          <select id="att-emp" class="form-select" required>
            ${employeeList.map(e => `<option value="${e.id}">${ui.escapeHtml(e.name)} (${e.code})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date <span class="required-star">*</span></label>
          <input type="date" id="att-date" class="form-input" value="${today}" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Attendance Status <span class="required-star">*</span></label>
        <select id="att-status" class="form-select" required>
          <option value="Present" selected>Present (Full Shift)</option>
          <option value="Absent">Absent (Loss of Pay)</option>
          <option value="Leave">Casual / Medical Leave</option>
          <option value="Half-Day">Half-Day Shift</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Daily Shift Notes</label>
        <input type="text" id="att-notes" class="form-input" placeholder="e.g. Overtime completed, morning shift on-time">
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Mark Daily Attendance Record',
    contentHtml,
    confirmText: 'Log Attendance',
    onConfirm: async (bodyEl) => {
      const employee_id = bodyEl.querySelector('#att-emp').value;
      const date = bodyEl.querySelector('#att-date').value;
      const status = bodyEl.querySelector('#att-status').value;
      const notes = bodyEl.querySelector('#att-notes').value.trim();

      await api.post('/api/employees', {
        action: 'attendance',
        employee_id,
        date,
        status,
        notes
      });

      ui.toast('Attendance marked successfully.', 'success');
      loadEmployees();
      return true;
    }
  });
}

function openAddEmployeeModal() {
  const today = new Date().toISOString().slice(0, 10);
  const contentHtml = `
    <form id="add-employee-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Employee Code <span class="required-star">*</span></label>
          <input type="text" id="aemp-code" class="form-input" placeholder="e.g. EMP-106" required style="text-transform:uppercase;">
        </div>
        <div class="form-group">
          <label class="form-label">Full Name <span class="required-star">*</span></label>
          <input type="text" id="aemp-name" class="form-input" placeholder="e.g. Manoj K. Tawde" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Role / Designation <span class="required-star">*</span></label>
          <input type="text" id="aemp-role" class="form-input" placeholder="e.g. Production Welder" required>
        </div>
        <div class="form-group">
          <label class="form-label">Department <span class="required-star">*</span></label>
          <input type="text" id="aemp-dept" class="form-input" placeholder="e.g. Production / QA / Operations" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Base Monthly Salary (₹) <span class="required-star">*</span></label>
          <input type="number" id="aemp-base" class="form-input" min="0" step="500" value="25000" required>
        </div>
        <div class="form-group">
          <label class="form-label">Allowances (HRA / Conveyance ₹)</label>
          <input type="number" id="aemp-allow" class="form-input" min="0" value="3000">
        </div>
        <div class="form-group">
          <label class="form-label">PF &amp; Tax Deductions (₹)</label>
          <input type="number" id="aemp-deduct" class="form-input" min="0" value="1500">
        </div>
      </div>
    </form>
  `;

  ui.showModal({
    title: 'Register New Employee',
    contentHtml,
    confirmText: 'Save Employee',
    onConfirm: async (bodyEl) => {
      const code = bodyEl.querySelector('#aemp-code').value.trim().toUpperCase();
      const name = bodyEl.querySelector('#aemp-name').value.trim();
      const role = bodyEl.querySelector('#aemp-role').value.trim();
      const department = bodyEl.querySelector('#aemp-dept').value.trim();
      const base_salary = parseFloat(bodyEl.querySelector('#aemp-base').value);
      const allowances = parseFloat(bodyEl.querySelector('#aemp-allow').value) || 0;
      const deductions = parseFloat(bodyEl.querySelector('#aemp-deduct').value) || 0;

      if (!code || !name || !role || !department || isNaN(base_salary)) {
        throw new Error('Please fill in all mandatory employee fields.');
      }

      await api.post('/api/employees', {
        code,
        name,
        role,
        department,
        base_salary,
        allowances,
        deductions
      });

      ui.toast('New employee registered in workforce master.', 'success');
      loadEmployees();
      return true;
    }
  });
}
