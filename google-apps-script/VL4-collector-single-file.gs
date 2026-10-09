/** VL4 Antibiotic collector: paste this entire file into Code.gs. */
const VL4_MODULE = 'VL_BIO_ANTIBIOTICS';
const VL4_TEACHER_EMAIL = 'tzechingchan0605@gmail.com';
const VL4_RECORDS_SHEET = 'VL4_Records';
const VL4_CHUNKS_SHEET = 'VL4_PayloadChunks';
const VL4_CHUNK_SIZE = 40000; // Below Google Sheets' 50,000-character cell limit.
const VL4_MAX_PAYLOAD = 8 * 1024 * 1024;
const VL4_HEADERS = ['Module', 'ID', 'Version', 'SavedAt', 'Email', 'Name', 'Class', 'Chunks', 'SHA256', 'Batch'];

/** Run setupCollector from the editor with the teacher account. */
function setupCollector() {
  const user = Session.getActiveUser().getEmail().trim().toLowerCase();
  if (user !== VL4_TEACHER_EMAIL) throw new Error('OWNER_SETUP_ONLY');
  return initializeVL4_();
}

function initializeVL4_() {
  const props = PropertiesService.getScriptProperties();
  let source = String(props.getProperty('SPREADSHEET_ID') || '').trim();
  if (!source) {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) source = active.getId();
  }
  const match = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:[/?#]|$)/.exec(source);
  const id = match ? match[1] : source;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) throw new Error('SPREADSHEET_ID_REQUIRED_OR_INVALID');
  const origins = (props.getProperty('ALLOWED_APP_ORIGINS') || 'https://tzechingchan0605-cloud.github.io')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length || origins.some(s => !/^https?:\/\/[A-Za-z0-9.-]+(?::[0-9]+)?$/.test(s))) {
    throw new Error('ALLOWED_APP_ORIGINS_INVALID');
  }
  const password = props.getProperty('SETUP_TEACHER_PASSWORD');
  const reset = password !== null;
  const existingHash = props.getProperty('TEACHER_PASSWORD_HASH');
  const existingSalt = props.getProperty('TEACHER_PASSWORD_SALT');
  if (reset && password.length < 12) throw new Error('LONG_SETUP_PASSWORD_REQUIRED');
  if (!reset && (!existingSalt || !/^[a-f0-9]{64}$/.test(existingHash || ''))) {
    throw new Error('LONG_SETUP_PASSWORD_REQUIRED');
  }
  // Prepare sheets before changing password/configuration properties.
  const ss = SpreadsheetApp.openById(id);
  ensureSheet_(ss, VL4_RECORDS_SHEET, VL4_HEADERS);
  ensureSheet_(ss, VL4_CHUNKS_SHEET, ['Batch', 'Index', 'Payload']);
  SpreadsheetApp.flush();
  const values = {SPREADSHEET_ID: id, ALLOWED_APP_ORIGINS: origins.join(',')};
  if (reset) {
    const salt = Utilities.getUuid() + Utilities.getUuid();
    values.TEACHER_PASSWORD_SALT = salt;
    values.TEACHER_PASSWORD_HASH = digest_(salt + '\u0000' + password);
  }
  if (!props.getProperty('CURSOR_SECRET')) {
    values.CURSOR_SECRET = Utilities.getUuid() + Utilities.getUuid();
  }
  props.setProperties(values);
  if (reset) props.deleteProperty('SETUP_TEACHER_PASSWORD');
  return {ok: true, moduleId: VL4_MODULE, initialized: true};
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else if (JSON.stringify(sheet.getRange(1, 1, 1, headers.length).getValues()[0]) !== JSON.stringify(headers)) {
    throw new Error('VL4_SHEET_SCHEMA_MISMATCH');
  }
  return sheet;
}

function ensureRows_(sheet, needed) {
  const current = sheet.getMaxRows();
  if (needed > current) sheet.insertRowsAfter(current, Math.max(needed - current, 100));
}

function allowedOrigins_() {
  return (PropertiesService.getScriptProperties().getProperty('ALLOWED_APP_ORIGINS') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.channel && !p.requestId && !p.parentOrigin) {
    return ContentService.createTextOutput(JSON.stringify({ok: true, service: 'VL4', moduleId: VL4_MODULE}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const token = /^[A-Za-z0-9_-]{24,80}$/;
  if (!allowedOrigins_().includes(p.parentOrigin) ||
      !token.test(p.channel || '') || !token.test(p.requestId || '')) {
    return HtmlService.createHtmlOutput('VL4: open the configured laboratory website.');
  }
  const safe = value => JSON.stringify(value).replace(/</g, '\u003c');
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
    (() => {
      const parentOrigin = ${safe(p.parentOrigin)};
      const channel = ${safe(p.channel)};
      const handshakeId = ${safe(p.requestId)};
      const moduleId = 'VL_BIO_ANTIBIOTICS';
      const target = window.top, active = new Set();
      function reply(requestId, ok, result, code) {
        target.postMessage({type:'VL4_RESPONSE', moduleId, channel, requestId,
          ok, ...(ok ? {result} : {code:code || 'CLOUD_REQUEST_FAILED'})}, parentOrigin);
      }
      window.addEventListener('message', event => {
        const m = event.data;
        if (event.source !== target || event.origin !== parentOrigin || !m ||
            m.type !== 'VL4_REQUEST' || m.moduleId !== moduleId || m.channel !== channel ||
            !/^[A-Za-z0-9_-]{24,80}$/.test(m.requestId || '') || active.has(m.requestId) ||
            (m.action !== 'save' && m.action !== 'list')) return;
        active.add(m.requestId);
        const done = result => {active.delete(m.requestId); reply(m.requestId, true, result);};
        const failed = error => {
          active.delete(m.requestId);
          const match = String(error && error.message || '').match(/\\b[A-Z][A-Z0-9_]{4,}\\b/);
          reply(m.requestId, false, null, match ? match[0] : 'CLOUD_REQUEST_FAILED');
        };
        const runner = google.script.run.withSuccessHandler(done).withFailureHandler(failed);
        const payload = m.payload || {};
        if (m.action === 'save') runner.saveRecord(payload.record);
        else runner.listRecords(payload.password, payload.cursor || '', payload.limit || 25);
      });
      target.postMessage({type:'VL4_READY', moduleId, channel, requestId:handshakeId}, parentOrigin);
    })();
  </script></body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle('VL4 cloud bridge')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function digest_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(n => ('0' + (n & 255).toString(16)).slice(-2)).join('');
}

function constantEqual_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let different = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    different |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return different === 0;
}

function authenticate_(password) {
  const props = PropertiesService.getScriptProperties();
  const salt = props.getProperty('TEACHER_PASSWORD_SALT');
  const expected = props.getProperty('TEACHER_PASSWORD_HASH');
  if (!salt || !expected) throw new Error('BACKEND_NOT_INITIALIZED');
  if (typeof password !== 'string' || password.length > 500 ||
    !constantEqual_(digest_(salt + '\u0000' + password), expected)) throw new Error('TEACHER_AUTH_FAILED');
}

function sheets_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('BACKEND_NOT_INITIALIZED');
  const ss = SpreadsheetApp.openById(id);
  const records = ss.getSheetByName(VL4_RECORDS_SHEET), chunks = ss.getSheetByName(VL4_CHUNKS_SHEET);
  if (!records || !chunks) throw new Error('BACKEND_NOT_INITIALIZED');
  return { records: records, chunks: chunks };
}

function validateRecord_(record) {
  if (!record || record.schemaVersion !== 1 || record.moduleId !== VL4_MODULE || record.demo !== false ||
    record.role === 'teacher' || typeof record.id !== 'string' || !/^[A-Za-z0-9_-]{8,120}$/.test(record.id) ||
    !Number.isSafeInteger(record.version) || record.version < 1 || !record.profile ||
    typeof record.profile.email !== 'string' || record.profile.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.profile.email) ||
    record.profile.email.trim().toLowerCase() === VL4_TEACHER_EMAIL ||
    typeof record.profile.name !== 'string' || record.profile.name.length > 100 ||
    typeof record.profile.className !== 'string' || record.profile.className.length > 100) {
    throw new Error('STUDENT_RECORD_REQUIRED');
  }
  const json = JSON.stringify(record);
  if (json.length > VL4_MAX_PAYLOAD) throw new Error('RECORD_TOO_LARGE');
  // Credentials have no place in research answers or event envelopes.
  const forbidden = /^(password|teacherPassword|teacherKey|cloudTeacherKey|SETUP_TEACHER_PASSWORD)$/i;
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(key => {
      if (forbidden.test(key)) throw new Error('CREDENTIAL_FIELD_FORBIDDEN');
      inspect(value[key]);
    });
  }
  inspect(record);
  return json;
}

/** Public student writer: validated, idempotent, serialized, and acknowledged after flush. */
function saveRecord(record) {
  const json = validateRecord_(record);
  const hash = digest_(json);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('BACKEND_BUSY');
  try {
    const sheets = sheets_();
    const records = sheets.records, chunks = sheets.chunks;
    const rows = records.getLastRow() > 1 ? records.getRange(2, 1, records.getLastRow() - 1, VL4_HEADERS.length).getValues() : [];
    const existingIndex = rows.findIndex(row => row[0] === VL4_MODULE && row[1] === record.id);
    const existing = existingIndex >= 0 ? rows[existingIndex] : null;
    if (existing && Number(existing[2]) >= record.version) {
      if (Number(existing[2]) === record.version && existing[8] !== hash) throw new Error('VERSION_CONFLICT');
      return { ok: true, saved: true, moduleId: VL4_MODULE, id: record.id,
        acceptedVersion: Number(existing[2]), savedAt: String(existing[3]), duplicate: true };
    }
    const batch = Utilities.getUuid();
    const payloadRows = [];
    for (let offset = 0, index = 0; offset < json.length; index++) {
      let end = Math.min(json.length, offset + VL4_CHUNK_SIZE);
      // Never split a Unicode surrogate pair across two spreadsheet cells.
      if (end < json.length && /[\uD800-\uDBFF]/.test(json.charAt(end - 1)) &&
          /[\uDC00-\uDFFF]/.test(json.charAt(end))) end--;
      payloadRows.push([batch, index, json.slice(offset, end)]);
      offset = end;
    }
    // Every chunk has a fixed text prefix, so student text can never become
    // a Sheet formula. The prefix is removed before reconstruction/checksum.
    ensureRows_(chunks, chunks.getLastRow() + payloadRows.length);
    const chunkRange = chunks.getRange(chunks.getLastRow() + 1, 1, payloadRows.length, 3);
    chunkRange.setNumberFormat('@');
    chunkRange.setValues(payloadRows.map(row => [row[0], row[1], 'json:' + row[2]]));
    SpreadsheetApp.flush();
    const savedAt = new Date().toISOString();
    const metadata = [[VL4_MODULE, record.id, record.version, savedAt,
      record.profile.email, record.profile.name, record.profile.className, payloadRows.length, hash, batch]];
    const rowIndex = existing ? existingIndex + 2 : records.getLastRow() + 1;
    ensureRows_(records, rowIndex);
    const target = records.getRange(rowIndex, 1, 1, VL4_HEADERS.length);
    target.setNumberFormat('@');
    // Profile columns also need formula protection; payload remains original.
    metadata[0][4] = "'" + metadata[0][4];
    metadata[0][5] = "'" + metadata[0][5];
    metadata[0][6] = "'" + metadata[0][6];
    target.setValues(metadata);
    SpreadsheetApp.flush();
    return { ok: true, saved: true, moduleId: VL4_MODULE, id: record.id,
      acceptedVersion: record.version, savedAt: savedAt, duplicate: false };
  } finally { lock.releaseLock(); }
}

function cursorSecret_() {
  const secret = PropertiesService.getScriptProperties().getProperty('CURSOR_SECRET');
  if (!secret) throw new Error('BACKEND_NOT_INITIALIZED');
  return secret;
}

function cursorSignature_(payload) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, cursorSecret_())).replace(/=+$/, '');
}

function makeCursor_(offset, total) {
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify({ moduleId: VL4_MODULE,
    offset: offset, total: total, expires: Date.now() + 10 * 60 * 1000 })).replace(/=+$/, '');
  return payload + '.' + cursorSignature_(payload);
}

function readCursor_(cursor) {
  if (typeof cursor !== 'string' || cursor.length > 1000) throw new Error('CURSOR_INVALID');
  const parts = cursor.split('.');
  if (parts.length !== 2 || !constantEqual_(cursorSignature_(parts[0]), parts[1])) throw new Error('CURSOR_INVALID');
  let parsed;
  try { parsed = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString()); }
  catch (_) { throw new Error('CURSOR_INVALID'); }
  if (!parsed || parsed.moduleId !== VL4_MODULE || parsed.expires < Date.now() ||
    !Number.isSafeInteger(parsed.offset) || !Number.isSafeInteger(parsed.total) ||
    parsed.offset < 0 || parsed.total < parsed.offset) throw new Error('CURSOR_EXPIRED_OR_INVALID');
  return parsed;
}

/** Authentication is checked on every page, including signed cursor requests. */
function listRecords(password, cursor, limit) {
  authenticate_(password);
  const pageSize = Math.max(1, Math.min(25, Number.isSafeInteger(limit) ? limit : 25));
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('BACKEND_BUSY');
  try {
    const sheets = sheets_();
    const total = Math.max(0, sheets.records.getLastRow() - 1);
    const page = cursor ? readCursor_(cursor) : { offset: 0, total: total };
    if (page.total > total) throw new Error('SNAPSHOT_UNAVAILABLE');
    const amount = Math.min(pageSize, page.total - page.offset);
    const rows = amount ? sheets.records.getRange(page.offset + 2, 1, amount, VL4_HEADERS.length).getValues() : [];
    const batches = new Set(rows.map(row => row[9]));
    const allChunks = sheets.chunks.getLastRow() > 1 ? sheets.chunks.getRange(2, 1, sheets.chunks.getLastRow() - 1, 3).getValues() : [];
    const payloads = {};
    allChunks.forEach(row => {
      if (batches.has(row[0])) {
        if (!payloads[row[0]]) payloads[row[0]] = [];
        const content = String(row[2]);
        if (!content.startsWith('json:')) throw new Error('STORED_CHUNK_INVALID');
        payloads[row[0]][Number(row[1])] = content.slice(5);
      }
    });
    const result = rows.map(row => {
      const parts = payloads[row[9]] || [];
      if (row[0] !== VL4_MODULE || parts.length !== Number(row[7]) ||
          Array.from({ length: Number(row[7]) }, (_, i) => parts[i]).some(part => typeof part !== 'string')) {
        throw new Error('STORED_RECORD_INCOMPLETE');
      }
      const json = parts.join('');
      if (digest_(json) !== row[8]) throw new Error('STORED_RECORD_CHECKSUM_FAILED');
      const record = JSON.parse(json);
      validateRecord_(record);
      if (record.id !== row[1] || record.version !== Number(row[2])) throw new Error('STORED_RECORD_MISMATCH');
      return record;
    });
    const nextOffset = page.offset + amount;
    const nextCursor = nextOffset < page.total ? makeCursor_(nextOffset, page.total) : null;
    return { ok: true, records: result, nextCursor: nextCursor,
      complete: nextCursor === null, snapshotCount: page.total };
  } finally { lock.releaseLock(); }
}

/** Optional owner-only maintenance from the script editor after making a backup. */
function pruneOrphanChunks_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('BACKEND_BUSY');
  try {
    const sheets = sheets_();
    const manifests = sheets.records.getLastRow() > 1 ? sheets.records.getRange(2, 10, sheets.records.getLastRow() - 1, 1).getValues() : [];
    const active = new Set(manifests.map(row => row[0]));
    const rows = sheets.chunks.getLastRow() > 1 ? sheets.chunks.getRange(2, 1, sheets.chunks.getLastRow() - 1, 1).getValues() : [];
    let removed = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (!active.has(rows[i][0])) { sheets.chunks.deleteRow(i + 2); removed++; }
    }
    SpreadsheetApp.flush();
    return { ok: true, removed: removed };
  } finally { lock.releaseLock(); }
}
