// netlify/functions/reminders.js
// REST API for Reminders with Nager.Date Public Holiday Warnings & Auto-Invoice Alerts

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateDate } = require('./_lib/validate');
const db = require('./_lib/db');

const TIMEOUT_MS = 8000;

// Standard Indian Statutory Gazetted Holidays fallback
const FALLBACK_INDIAN_HOLIDAYS_2026 = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-25', name: 'Holi' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { date: '2026-05-01', name: 'Maharashtra Day / May Day' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-09-04', name: 'Janmashtami' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra' },
  { date: '2026-11-08', name: 'Diwali (Deepavali)' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
  { date: '2026-12-25', name: 'Christmas Day' }
];

async function fetchIndianHolidays(year = 2026) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://date.nager.at/api/v3/publicholidays/${year}/IN`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(h => ({ date: h.date, name: h.localName || h.name }));
      }
    }
  } catch (err) {
    clearTimeout(timer);
    console.warn('[Nager.Date] Holiday fetch failed, falling back to statutory calendar:', err.message);
  }

  return FALLBACK_INDIAN_HOLIDAYS_2026;
}

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/reminders - List reminders with public holiday alerts
  if (method === 'GET') {
    const [rawReminders, overdueInvoices, holidays] = await Promise.all([
      db.getAll('reminders', { orderBy: { column: 'due_date', ascending: true } }),
      db.getAll('invoices', { filter: { status: 'Overdue' } }),
      fetchIndianHolidays(2026)
    ]);

    const holidayMap = new Map(holidays.map(h => [h.date, h.name]));
    const todayStr = new Date().toISOString().slice(0, 10);

    // Auto-create reminder alerts for overdue invoices if not already logged
    const existingTitles = new Set(rawReminders.map(r => r.title));
    for (const inv of overdueInvoices) {
      const autoTitle = `Overdue Invoice ${inv.invoice_number} (₹${inv.grand_total})`;
      if (!existingTitles.has(autoTitle)) {
        const newRem = await db.insert('reminders', {
          title: autoTitle,
          type: 'payment',
          due_date: inv.due_date || todayStr,
          priority: 'high',
          is_done: false,
          notes: `Automatic alert: Client invoice has crossed payment deadline.`,
          auto_generated: true
        });
        rawReminders.push(newRem);
      }
    }

    const enriched = rawReminders.map(r => {
      const holidayName = holidayMap.get(r.due_date);
      const isOverdue = !r.is_done && r.due_date < todayStr;
      return {
        ...r,
        is_overdue: isOverdue,
        holiday_warning: holidayName ? `Public Holiday: ${holidayName}` : null
      };
    });

    const pendingCount = enriched.filter(r => !r.is_done).length;
    const overdueCount = enriched.filter(r => r.is_overdue).length;

    return success({
      reminders: enriched,
      pendingCount,
      overdueCount
    });
  }

  // 2. POST /api/reminders - Create reminder
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['title', 'type', 'due_date']);

    const title = validateString(body.title, 'title', { minLength: 2, maxLength: 255 });
    const type = validateString(body.type, 'type');
    const dueDate = validateDate(body.due_date, 'due_date');
    const priority = body.priority || 'medium';
    const notes = body.notes ? validateString(body.notes, 'notes') : '';

    const newReminder = await db.insert('reminders', {
      title,
      type,
      due_date: dueDate,
      priority,
      is_done: false,
      notes,
      auto_generated: false
    });

    return success({ reminder: newReminder }, 201);
  }

  // 3. PUT /api/reminders - Update reminder (mark completed or edit)
  if (method === 'PUT') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Reminder ID required', 400);

    const body = parseJsonBody(event);
    const updates = {};
    if (body.is_done !== undefined) updates.is_done = Boolean(body.is_done);
    if (body.title) updates.title = validateString(body.title, 'title');
    if (body.due_date) updates.due_date = validateDate(body.due_date, 'due_date');
    if (body.priority) updates.priority = body.priority;

    const updated = await db.update('reminders', id, updates);
    if (!updated) return error('Reminder not found', 404);

    return success({ reminder: updated });
  }

  // 4. DELETE /api/reminders - Remove reminder
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Reminder ID required', 400);

    await db.delete('reminders', id);
    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
