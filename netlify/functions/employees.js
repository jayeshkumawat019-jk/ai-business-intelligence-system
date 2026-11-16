// netlify/functions/employees.js
// REST API for Employee Management, Daily Attendance, Salary Slips & Absence Deduction

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber, validateDate } = require('./_lib/validate');
const { round, add, subtract, multiply, numberToWordsINR } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/employees - List employees with attendance summaries & salary calculations
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};
    const month = queryParams.month || '2026-11'; // YYYY-MM

    const [employees, attendanceList, salaries] = await Promise.all([
      db.getAll('employees', { orderBy: { column: 'name', ascending: true } }),
      db.getAll('attendance'),
      db.getAll('salaries', { filter: { month } })
    ]);

    // Group attendance for the month by employee
    const attByEmp = new Map();
    let totalPresentCount = 0;
    let totalAbsentCount = 0;
    let totalLeaveCount = 0;

    attendanceList.forEach(a => {
      if ((a.date || '').startsWith(month)) {
        const list = attByEmp.get(a.employee_id) || [];
        list.push(a);
        attByEmp.set(a.employee_id, list);

        if (a.status === 'Present') totalPresentCount++;
        else if (a.status === 'Absent') totalAbsentCount++;
        else if (a.status === 'Leave') totalLeaveCount++;
      }
    });

    const salaryMap = new Map(salaries.map(s => [s.employee_id, s]));

    const enrichedEmployees = employees.map(emp => {
      const records = attByEmp.get(emp.id) || [];
      const presentDays = records.filter(r => r.status === 'Present').length;
      const absentDays = records.filter(r => r.status === 'Absent').length;
      const leaveDays = records.filter(r => r.status === 'Leave').length;

      // Salary Calculation
      const base = Number(emp.base_salary) || 0;
      const allowances = Number(emp.allowances) || 0;
      const deductions = Number(emp.deductions) || 0;
      const workingDays = 30;

      const perDayRate = round(base / workingDays);
      const lossOfPay = round(perDayRate * absentDays);
      const grossSalary = round(base + allowances);
      const netSalary = Math.max(0, round(grossSalary - deductions - lossOfPay));

      const existingSalary = salaryMap.get(emp.id);

      return {
        ...emp,
        month,
        workingDays,
        presentDays,
        absentDays,
        leaveDays,
        salaryBreakdown: {
          baseSalary: base,
          allowances,
          grossSalary,
          deductions,
          perDayRate,
          lossOfPay,
          netSalary,
          amountInWords: numberToWordsINR(netSalary),
          status: existingSalary ? existingSalary.status : 'Pending'
        }
      };
    });

    return success({
      month,
      employees: enrichedEmployees,
      attendanceStats: {
        present: totalPresentCount,
        absent: totalAbsentCount,
        leave: totalLeaveCount
      }
    });
  }

  // 2. POST /api/employees - Create employee OR mark attendance
  if (method === 'POST') {
    const body = parseJsonBody(event);

    // Action: Mark Attendance
    if (body.action === 'attendance') {
      validateRequired(body, ['employee_id', 'date', 'status']);
      const employeeId = validateString(body.employee_id, 'employee_id');
      const date = validateDate(body.date, 'date');
      const status = validateString(body.status, 'status');
      const notes = body.notes ? validateString(body.notes, 'notes') : '';

      const existing = await db.getAll('attendance', { filter: { employee_id: employeeId, date } });
      let result;
      if (existing && existing.length > 0) {
        result = await db.update('attendance', existing[0].id, { status, notes });
      } else {
        result = await db.insert('attendance', {
          employee_id: employeeId,
          date,
          status,
          notes
        });
      }
      return success({ attendance: result });
    }

    // Action: Register New Employee
    validateRequired(body, ['name', 'code', 'role', 'department', 'base_salary']);
    const name = validateString(body.name, 'name', { minLength: 2, maxLength: 255 });
    const code = validateString(body.code, 'code', { minLength: 2, maxLength: 50 }).toUpperCase();
    const role = validateString(body.role, 'role', { minLength: 2, maxLength: 100 });
    const department = validateString(body.department, 'department', { minLength: 2, maxLength: 100 });
    const baseSalary = validateNumber(body.base_salary, 'base_salary', { min: 0 });
    const allowances = body.allowances !== undefined ? validateNumber(body.allowances, 'allowances', { min: 0 }) : 0;
    const deductions = body.deductions !== undefined ? validateNumber(body.deductions, 'deductions', { min: 0 }) : 0;
    const phone = body.phone ? validateString(body.phone, 'phone') : '';
    const email = body.email ? validateString(body.email, 'email') : '';
    const joinDate = body.join_date ? validateDate(body.join_date, 'join_date') : new Date().toISOString().slice(0, 10);

    const newEmp = await db.insert('employees', {
      name,
      code,
      role,
      department,
      base_salary: round(baseSalary),
      allowances: round(allowances),
      deductions: round(deductions),
      phone,
      email,
      join_date: joinDate,
      status: 'Active'
    });

    return success({ employee: newEmp }, 201);
  }

  // 3. PUT /api/employees - Update employee details
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Employee ID required', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.name) updates.name = validateString(body.name, 'name');
    if (body.role) updates.role = validateString(body.role, 'role');
    if (body.department) updates.department = validateString(body.department, 'department');
    if (body.base_salary !== undefined) updates.base_salary = validateNumber(body.base_salary, 'base_salary', { min: 0 });
    if (body.allowances !== undefined) updates.allowances = validateNumber(body.allowances, 'allowances', { min: 0 });
    if (body.deductions !== undefined) updates.deductions = validateNumber(body.deductions, 'deductions', { min: 0 });

    const updated = await db.update('employees', id, updates);
    if (!updated) return error('Employee not found', 404);

    return success({ employee: updated });
  }

  // 4. DELETE /api/employees - Delete employee
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Employee ID required', 400);

    await db.delete('employees', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
