const fs = require('fs');
const path = require('path');

const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');

const REP_HEADERS = ['id', 'name', 'home_address', 'home_lat', 'home_lng', 'status', 'employment_type'];
const AVAIL_HEADERS = ['id', 'rep_id', 'date', 'start_time', 'end_time'];

function getEnvAny(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
}

function getSupabaseConfig() {
  const supabaseUrl = getEnvAny(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnvAny(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are missing (need SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY).');
  }

  return { supabaseUrl, supabaseAnonKey };
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase();
}

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader) return '';
  const value = String(authorizationHeader).trim();
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function isValidIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidIsoTime(value) {
  return /^\d{2}:\d{2}$/.test(value);
}

function safeReadFileBuffer(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function getDefaultTemplatePaths() {
  return {
    rep: ['/mnt/data/rep_table_v4_hours.xlsx', path.join(process.cwd(), 'rep_table_v4_hours.xlsx')],
    availability: [
      '/mnt/data/availability_v4_forced_6h.xlsx',
      path.join(process.cwd(), 'availability_v4_forced_6h.xlsx')
    ]
  };
}

async function loadTemplateWorkbook(templateCandidates) {
  for (const candidate of templateCandidates) {
    if (!candidate) continue;
    const buffer = safeReadFileBuffer(candidate);
    if (!buffer) continue;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error(`Template has no worksheets: ${candidate}`);
    return { workbook, worksheet, templatePath: candidate };
  }
  return null;
}

function readHeaderRow(worksheet, expectedCount) {
  const headerRow = worksheet.getRow(1);
  const headers = [];
  for (let i = 1; i <= expectedCount; i += 1) {
    const raw = headerRow.getCell(i).value;
    const value = typeof raw === 'object' && raw && 'text' in raw ? raw.text : raw;
    headers.push(String(value ?? '').trim());
  }
  return headers;
}

function readExtraHeaderValue(worksheet, expectedCount) {
  const headerRow = worksheet.getRow(1);
  const raw = headerRow.getCell(expectedCount + 1).value;
  const value = typeof raw === 'object' && raw && 'text' in raw ? raw.text : raw;
  const text = String(value ?? '').trim();
  return text || '';
}

function assertHeadersMatch({ context, actualHeaders, expectedHeaders, templatePath }) {
  const sameLength = actualHeaders.length === expectedHeaders.length;
  const sameValues = sameLength && actualHeaders.every((h, idx) => h === expectedHeaders[idx]);
  if (sameValues) return;

  const where = templatePath ? ` (template: ${templatePath})` : '';
  throw new Error(
    `${context}: header mismatch${where}.\nExpected: ${JSON.stringify(expectedHeaders)}\nActual:   ${JSON.stringify(
      actualHeaders
    )}`
  );
}

function validateWorksheetHeaders({ context, worksheet, expectedHeaders, templatePath }) {
  const headers = readHeaderRow(worksheet, expectedHeaders.length);
  assertHeadersMatch({ context, actualHeaders: headers, expectedHeaders, templatePath });

  const extra = readExtraHeaderValue(worksheet, expectedHeaders.length);
  if (extra) {
    const where = templatePath ? ` (template: ${templatePath})` : '';
    throw new Error(`${context}: unexpected extra header column${where}: ${JSON.stringify(extra)}`);
  }
}

function verifyAvailabilityFormats(worksheet, { dateCol, startCol, endCol }) {
  const bad = [];
  for (let r = 2; r <= worksheet.rowCount; r += 1) {
    const row = worksheet.getRow(r);
    const date = row.getCell(dateCol).value;
    const start = row.getCell(startCol).value;
    const end = row.getCell(endCol).value;

    if (date != null && (typeof date !== 'string' || !isValidIsoDate(date))) bad.push({ row: r, column: 'date', value: date });
    if (start != null && (typeof start !== 'string' || !isValidIsoTime(start)))
      bad.push({ row: r, column: 'start_time', value: start });
    if (end != null && (typeof end !== 'string' || !isValidIsoTime(end))) bad.push({ row: r, column: 'end_time', value: end });

    if (bad.length >= 10) break;
  }

  if (bad.length === 0) return;
  throw new Error(`Availability export formatting check failed (showing up to 10 issues): ${JSON.stringify(bad)}`);
}

async function buildWorkbook({ headers, rows, templateCandidates, verifyFn }) {
  const template = await loadTemplateWorkbook(templateCandidates);

  let workbook;
  let worksheet;
  let templatePath = '';

  if (template) {
    ({ workbook, worksheet, templatePath } = template);
    validateWorksheetHeaders({
      context: 'Template validation',
      worksheet,
      expectedHeaders: headers,
      templatePath
    });

    if (worksheet.rowCount > 1) {
      worksheet.spliceRows(2, worksheet.rowCount - 1);
    }
  } else {
    workbook = new ExcelJS.Workbook();
    worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(headers);
  }

  for (const row of rows) {
    worksheet.addRow(row);
  }

  validateWorksheetHeaders({
    context: 'Export verification',
    worksheet,
    expectedHeaders: headers,
    templatePath: templatePath || null
  });

  if (verifyFn) verifyFn(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

async function requireManager(authorizationHeader) {
  const token = getBearerToken(authorizationHeader);
  if (!token) return { ok: false, statusCode: 401, message: 'Missing Authorization: Bearer <token>' };

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return { ok: false, statusCode: 401, message: 'Invalid or expired token' };

  if (data.user.app_metadata?.role !== 'manager') {
    return { ok: false, statusCode: 403, message: 'Forbidden (manager-only)' };
  }

  return { ok: true, client, user: data.user };
}

function parseAvailabilityFilters(query) {
  const startDate = query?.start_date ? String(query.start_date) : '';
  const endDate = query?.end_date ? String(query.end_date) : '';

  if (startDate && !isValidIsoDate(startDate)) {
    return { ok: false, statusCode: 400, message: 'Invalid start_date. Use YYYY-MM-DD.' };
  }
  if (endDate && !isValidIsoDate(endDate)) {
    return { ok: false, statusCode: 400, message: 'Invalid end_date. Use YYYY-MM-DD.' };
  }
  if (startDate && endDate && startDate > endDate) {
    return { ok: false, statusCode: 400, message: 'start_date must be <= end_date.' };
  }
  return { ok: true, startDate, endDate };
}

function parseRepFilters(query) {
  const status = query?.status ? String(query.status) : '';
  if (!status) return { ok: true, status: '' };
  if (status !== 'active' && status !== 'inactive') {
    return { ok: false, statusCode: 400, message: 'Invalid status. Use active|inactive.' };
  }
  return { ok: true, status };
}

async function handleRepTableExport({ authorizationHeader, query }) {
  try {
    const auth = await requireManager(authorizationHeader);
    if (!auth.ok) return { statusCode: auth.statusCode, json: { error: auth.message } };

    const repFilter = parseRepFilters(query);
    if (!repFilter.ok) return { statusCode: repFilter.statusCode, json: { error: repFilter.message } };

    const templatePaths = getDefaultTemplatePaths();
    const templateCandidates = [
      process.env.EXPORT_REP_TEMPLATE_PATH,
      ...templatePaths.rep
    ].filter(Boolean);

    let repQuery = auth.client
      .from('rep_allowlist')
      .select('rep_id, email, full_name, home_address, home_lat, home_lng, status, employment_type')
      .order('email', { ascending: true });
    if (repFilter.status) repQuery = repQuery.eq('status', repFilter.status);

    const { data: reps, error } = await repQuery;
    if (error) throw error;

    const filtered = (reps || [])
      .map((r) => {
        const repId = Number(r.rep_id);
        const email = normalizeEmail(r.email);
        if (!email || !Number.isFinite(repId)) return null;

        const lat = r.home_lat != null ? Number(r.home_lat) : null;
        const lng = r.home_lng != null ? Number(r.home_lng) : null;

        return [
          repId,
          String(r.full_name || r.email || '').trim(),
          r.home_address || '',
          Number.isFinite(lat) ? lat : null,
          Number.isFinite(lng) ? lng : null,
          r.status || 'active',
          r.employment_type || ''
        ];
      })
      .filter(Boolean);

    const buffer = await buildWorkbook({
      headers: REP_HEADERS,
      rows: filtered,
      templateCandidates
    });

    return {
      statusCode: 200,
      buffer,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="rep_table_v4_hours.xlsx"',
        'Cache-Control': 'no-store'
      }
    };
  } catch (error) {
    console.error('Rep table export failed:', error);
    return { statusCode: 500, json: { error: error?.message || 'Export failed' } };
  }
}

async function handleAvailabilityExport({ authorizationHeader, query }) {
  try {
    const auth = await requireManager(authorizationHeader);
    if (!auth.ok) return { statusCode: auth.statusCode, json: { error: auth.message } };

    const filters = parseAvailabilityFilters(query);
    if (!filters.ok) return { statusCode: filters.statusCode, json: { error: filters.message } };

    const templatePaths = getDefaultTemplatePaths();
    const templateCandidates = [
      process.env.EXPORT_AVAIL_TEMPLATE_PATH,
      ...templatePaths.availability
    ].filter(Boolean);

    const exportStartTime = process.env.EXPORT_AVAIL_START_TIME || '08:00';
    const exportEndTime = process.env.EXPORT_AVAIL_END_TIME || '20:00';
    if (!isValidIsoTime(exportStartTime) || !isValidIsoTime(exportEndTime)) {
      return {
        statusCode: 500,
        json: { error: 'Server misconfiguration: EXPORT_AVAIL_START_TIME/EXPORT_AVAIL_END_TIME must be HH:MM.' }
      };
    }

    const { data: allowlist, error: allowErr } = await auth.client
      .from('rep_allowlist')
      .select('rep_id, email')
      .order('email', { ascending: true });
    if (allowErr) throw allowErr;

    const repIdByEmail = new Map();
    (allowlist || []).forEach((r) => {
      const email = normalizeEmail(r.email);
      const repId = Number(r.rep_id);
      if (email && Number.isFinite(repId)) repIdByEmail.set(email, repId);
    });

    const { data: submissions, error: subErr } = await auth.client
      .from('submissions')
      .select('rep_email, availability')
      .order('rep_email', { ascending: true });
    if (subErr) throw subErr;

    const rows = [];
    let nextId = 1;

    for (const sub of submissions || []) {
      const email = normalizeEmail(sub.rep_email);
      const repId = repIdByEmail.get(email);
      if (!repId) continue;

      const availability = sub.availability && typeof sub.availability === 'object' ? sub.availability : {};
      for (const [date, isAvailable] of Object.entries(availability)) {
        if (!isAvailable) continue;
        const dateStr = String(date);
        if (!isValidIsoDate(dateStr)) continue;
        if (filters.startDate && dateStr < filters.startDate) continue;
        if (filters.endDate && dateStr > filters.endDate) continue;

        rows.push([nextId, repId, dateStr, exportStartTime, exportEndTime]);
        nextId += 1;
      }
    }

    const buffer = await buildWorkbook({
      headers: AVAIL_HEADERS,
      rows,
      templateCandidates,
      verifyFn: (worksheet) =>
        verifyAvailabilityFormats(worksheet, { dateCol: 3, startCol: 4, endCol: 5 })
    });

    return {
      statusCode: 200,
      buffer,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="availability_v4_forced_6h.xlsx"',
        'Cache-Control': 'no-store'
      }
    };
  } catch (error) {
    console.error('Availability export failed:', error);
    return { statusCode: 500, json: { error: error?.message || 'Export failed' } };
  }
}

module.exports = {
  handleRepTableExport,
  handleAvailabilityExport,
  requireManager,
  normalizeEmail
};
