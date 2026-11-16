// netlify/functions/documents.js
// REST API for Document Management with Supabase Storage Bucket & Short-Lived Signed URLs

const { requireAuth } = require('./_lib/auth');
const { success, error, parseJsonBody } = require('./_lib/respond');
const { validateRequired, validateString, validateNumber } = require('./_lib/validate');
const db = require('./_lib/db');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
];

exports.handler = requireAuth(async function (event, context) {
  const method = event.httpMethod;

  // 1. GET /api/documents - List documents OR get short-lived signed download URL
  if (method === 'GET') {
    const queryParams = event.queryStringParameters || {};

    // Generate signed download URL
    if (queryParams.action === 'signed_url' && queryParams.id) {
      const doc = await db.getById('documents', queryParams.id);
      if (!doc) return error('Document not found', 404);

      const signedUrl = await db.storage.createSignedUrl('documents', doc.storage_path, 3600); // 1 hour expiry
      return success({ signedUrl, fileName: doc.file_name });
    }

    const docs = await db.getAll('documents', { orderBy: { column: 'created_at', ascending: false } });
    return success({ documents: docs });
  }

  // 2. POST /api/documents - Upload document (Max 5MB, strict MIME check)
  if (method === 'POST') {
    const body = parseJsonBody(event);
    validateRequired(body, ['file_name', 'file_size', 'mime_type', 'file_base64']);

    const fileName = validateString(body.file_name, 'file_name', { minLength: 2, maxLength: 255 });
    const fileSize = validateNumber(body.file_size, 'file_size', { min: 1, max: MAX_FILE_SIZE });
    const mimeType = body.mime_type.toLowerCase();
    const category = body.category ? validateString(body.category, 'category') : 'Invoices';

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return error(`File type '${mimeType}' is not permitted. Allowed formats are: PDF, PNG, JPG, XLSX, CSV (Max 5MB).`, 400);
    }

    // Convert Base64 to Buffer
    const buffer = Buffer.from(body.file_base64, 'base64');
    if (buffer.length > MAX_FILE_SIZE) {
      return error(`File size exceeds 5 MB limit. Actual: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`, 400);
    }

    const cleanSafeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${category.toLowerCase()}/${Date.now()}_${cleanSafeName}`;

    // Upload to Supabase Storage "documents" bucket
    await db.storage.upload('documents', storagePath, buffer, mimeType);

    // Save metadata record
    const newDoc = await db.insert('documents', {
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      category,
      storage_path: storagePath
    });

    return success({ document: newDoc }, 201);
  }

  // 3. DELETE /api/documents - Delete document & purge from storage
  if (method === 'DELETE') {
    const queryParams = event.queryStringParameters || {};
    const id = queryParams.id;
    if (!id) return error('Document ID required', 400);

    const doc = await db.getById('documents', id);
    if (doc) {
      await db.storage.remove('documents', [doc.storage_path]);
      await db.delete('documents', id);
    }

    return success({ deleted: true });
  }

  return error(`Method ${method} not allowed`, 405);
});
