// netlify/functions/payments.js
// REST API for Payment Tracking with Dynamic Overdue Computation & Partial Payments

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber, validateDate } = require('./_lib/validate');
const { round, add, subtract } = require('./_lib/money');
const db = require('./_lib/db');

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/payments - List payments with server-computed overdue statuses
  if (method === 'GET') {
    const rawPayments = await db.getAll('payments', { orderBy: { column: 'payment_date', ascending: false } });
    const todayStr = new Date().toISOString().slice(0, 10);

    const statusCounts = { Received: 0, Pending: 0, Overdue: 0, Paid: 0 };
    let totalInflowReceived = 0;
    let totalInflowPending = 0;

    const enriched = rawPayments.map(p => {
      let currentStatus = p.status || 'Pending';

      // Dynamic server check: if Pending and due_date < today -> marked Overdue!
      if (currentStatus === 'Pending' && p.due_date && p.due_date < todayStr) {
        currentStatus = 'Overdue';
      }

      const amt = Number(p.amount) || 0;
      const totalDue = Number(p.total_due) || amt;
      const remainingBalance = Math.max(0, subtract(totalDue, amt));

      if (currentStatus === 'Received' || currentStatus === 'Paid') {
        totalInflowReceived = round(totalInflowReceived + amt);
      } else {
        totalInflowPending = round(totalInflowPending + remainingBalance);
      }

      if (statusCounts[currentStatus] !== undefined) {
        statusCounts[currentStatus]++;
      }

      return {
        ...p,
        status: currentStatus,
        amount: round(amt),
        total_due: round(totalDue),
        remaining_balance: round(remainingBalance)
      };
    });

    return success({
      payments: enriched,
      statusCounts,
      totalInflowReceived,
      totalInflowPending
    });
  }

  // 2. POST /api/payments - Record payment or partial receipt
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['entity_name', 'amount', 'type']);

    const entityName = validateString(body.entity_name, 'entity_name');
    const amount = validateNumber(body.amount, 'amount', { min: 0.01 });
    const type = body.type === 'outflow' ? 'outflow' : 'inflow';
    const category = body.category ? validateString(body.category, 'category') : (type === 'inflow' ? 'Customer Invoice' : 'Supplier Bill');
    const paymentDate = body.payment_date ? validateDate(body.payment_date, 'payment_date') : new Date().toISOString().slice(0, 10);
    const dueDate = body.due_date ? validateDate(body.due_date, 'due_date') : null;
    const totalDue = body.total_due !== undefined ? validateNumber(body.total_due, 'total_due', { min: 0 }) : amount;
    const paymentMode = body.payment_mode ? validateString(body.payment_mode, 'payment_mode') : 'Bank Transfer';
    const referenceId = body.reference_id ? validateString(body.reference_id, 'reference_id') : '';

    const status = amount >= totalDue ? (type === 'inflow' ? 'Received' : 'Paid') : 'Pending';

    const newPayment = await db.insert('payments', {
      payment_date: paymentDate,
      type,
      category,
      reference_id: referenceId,
      entity_name: entityName,
      amount: round(amount),
      total_due: round(totalDue),
      due_date: dueDate,
      status,
      payment_mode: paymentMode,
      notes: body.notes || ''
    });

    return success({ payment: newPayment }, 201);
  }

  // 3. PUT /api/payments - Record partial payment installment
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Payment ID required', 400);

    const body = parseJsonBody(event);
    const payment = await db.getById('payments', id);
    if (!payment) return error('Payment record not found', 404);

    const installment = validateNumber(body.installment_amount || body.amount, 'installment amount', { min: 0.01 });
    const currentAmount = Number(payment.amount) || 0;
    const totalDue = Number(payment.total_due) || currentAmount;
    const newAmount = round(currentAmount + installment);

    const isFullySettled = newAmount >= totalDue;
    const nextStatus = isFullySettled ? (payment.type === 'inflow' ? 'Received' : 'Paid') : 'Pending';

    const updated = await db.update('payments', id, {
      amount: newAmount,
      status: nextStatus,
      payment_date: new Date().toISOString().slice(0, 10)
    });

    return success({ payment: updated, isFullySettled });
  }

  // 4. DELETE /api/payments - Remove payment
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Payment ID required', 400);

    await db.delete('payments', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
