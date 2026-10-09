import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, createHmac, randomUUID, randomBytes } from 'node:crypto';
import vm from 'node:vm';
import { setImmediate } from 'node:timers/promises';
import { createCloudSync } from '../cloud-sync.js';
import { createCloudBridge, frameOwnsSource, validEndpoint } from '../cloud-bridge.js';
import { MODULE_ID, CLOUD_QUEUE_KEY, CLOUD_BACKUP_KEY, TEACHER_EMAIL } from '../cloud-config.js';

const endpoint = 'https://script.google.com/macros/s/VL4_ISOLATED_TEST/exec';
function storageMock() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function record(id = 'inquiry_student_01', version = 1) {
  return { schemaVersion: 1, moduleId: MODULE_ID, id, version, demo: false,
    profile: { name: '陳同學', className: 'S4X1-05', email: 'student@school.edu.hk' },
    submittedAt: null, reflectionSubmittedAt: null, answers: { hypothesis: '部分' },
    original: { plannedReplicates: 4, plannedReplicateReason: '比較是否一致' },
    plates: [{ id: `${id}-plate-1`, results: { X: 15 } }], measurements: {}, means: {},
    graph: {}, design: { image: 'data:image/png;base64,example', description: '保持距離' },
    events: [], timing: {}, savedAt: '2026-10-07T00:00:00.000Z' };
}
function ack(value) {
  return { ok: true, saved: true, moduleId: MODULE_ID, id: value.id, acceptedVersion: value.version };
}
function client(options = {}) {
  return createCloudSync({ endpoint, storage: storageMock(), autoFlush: false,
    retryBaseMs: 60000, ...options });
}

test('unconfigured VL4 keeps complete local backup and persistent retry queue', async () => {
  const storage = storageMock(), states = [];
  const sync = client({ endpoint: '', storage, status: s => states.push(s.key) });
  const source = record();
  await sync.enqueue(source);
  source.answers.hypothesis = 'later mutation';
  assert.equal(JSON.parse(storage.getItem(CLOUD_BACKUP_KEY))[0].answers.hypothesis, '部分');
  assert.equal(sync.pendingCount, 1);
  assert.equal((await sync.flush()).enabled, false);
  assert.equal(states.at(-1), 'unconfigured');
  sync.dispose();
  const restored = client({ storage, transport: { save: async item => ack(item) } });
  await restored.flush();
  assert.equal(restored.pendingCount, 0);
  assert.equal(restored.state.key, 'synced');
  assert.equal(JSON.parse(storage.getItem(CLOUD_BACKUP_KEY)).length, 1);
  restored.dispose();
});

test('network error preserves queue; retry requires real committed-save acknowledgment', async () => {
  let calls = 0;
  const sync = client({ transport: { save: async item => {
    calls++;
    if (calls === 1) throw new Error('OFFLINE');
    if (calls === 2) return { ok: true }; // Health/iframe load cannot acknowledge a save.
    return ack(item);
  } } });
  await sync.enqueue(record());
  await assert.rejects(sync.flush(), /OFFLINE/);
  assert.equal(sync.pendingCount, 1);
  assert.equal(sync.state.key, 'error');
  await assert.rejects(sync.flush(), /SAVE_ACK_INVALID/);
  assert.equal(sync.pendingCount, 1);
  await sync.flush();
  assert.equal(sync.pendingCount, 0);
  assert.equal(sync.state.key, 'synced');
  sync.dispose();
});

test('in-flight acknowledgment never removes a newer local edit', async () => {
  let release;
  const sent = [];
  const sync = client({ transport: { save: item => {
    sent.push(item.version);
    return item.version === 1 ? new Promise(resolve => { release = () => resolve(ack(item)); }) : Promise.resolve(ack(item));
  } } });
  await sync.enqueue(record());
  const flushing = sync.flush();
  await sync.enqueue(record(undefined, 2));
  release();
  await flushing;
  assert.deepEqual(sent, [1, 2]);
  assert.equal(sync.pendingCount, 0);
  sync.dispose();
});

test('teacher/demo and unrelated-module records cannot enter student queue', async () => {
  const sync = client();
  await assert.rejects(sync.enqueue({ ...record(), demo: true }), /STUDENT_RECORD_REQUIRED/);
  await assert.rejects(sync.enqueue({ ...record(), role: 'teacher' }), /STUDENT_RECORD_REQUIRED/);
  await assert.rejects(sync.enqueue({ ...record(), profile: { ...record().profile, email: TEACHER_EMAIL } }), /STUDENT_RECORD_REQUIRED/);
  await assert.rejects(sync.enqueue({ ...record(), moduleId: 'VL2' }), /STUDENT_RECORD_REQUIRED/);
  assert.equal(sync.pendingCount, 0);
  sync.dispose();
});

test('versions are immutable and storage failure sends no request', async () => {
  let calls = 0;
  const storage = storageMock();
  const sync = client({ storage, transport: { save: async value => { calls++; return ack(value); } } });
  await sync.enqueue(record());
  await assert.rejects(sync.enqueue({ ...record(), answers: { changed: true } }), /LOCAL_VERSION_CONFLICT/);
  await sync.enqueue(record(undefined, 2));
  await assert.rejects(sync.enqueue(record()), /LOCAL_STALE_VERSION/);
  assert.equal(calls, 0);
  sync.dispose();
  const failing = client({ storage: { getItem: () => null, setItem: () => { throw new Error('quota'); } },
    transport: { save: async value => { calls++; return ack(value); } } });
  await assert.rejects(failing.enqueue(record()), /LOCAL_SAVE_FAILED/);
  assert.equal(calls, 0);
  failing.dispose();
});

test('corrupt local queue is preserved and reported without claiming synchronization', async () => {
  const storage = storageMock();
  storage.setItem(CLOUD_QUEUE_KEY, 'broken-json');
  const sync = client({ storage });
  assert.equal(sync.state.key, 'error');
  await assert.rejects(sync.flush(), /LOCAL_QUEUE_UNREADABLE/);
  assert.equal(storage.getItem(CLOUD_QUEUE_KEY), 'broken-json');
  sync.dispose();
});

test('teacher read follows every page and rejects failed or incomplete collections', async () => {
  const calls = [];
  const sync = client({ transport: { list: async args => {
    calls.push(args);
    return args.cursor ? { ok: true, records: [record('inquiry_student_02')], nextCursor: null,
      complete: true, snapshotCount: 2 } : { ok: true, records: [record()], nextCursor: 'page2',
      complete: false, snapshotCount: 2 };
  } } });
  assert.equal((await sync.list('private-password')).length, 2);
  assert.deepEqual(calls.map(c => c.cursor), ['', 'page2']);
  assert.ok(calls.every(c => c.password === 'private-password'));
  sync.dispose();
  const failing = client({ transport: { list: async args => {
    if (args.cursor) throw new Error('TEACHER_AUTH_FAILED');
    return { ok: true, records: [record()], nextCursor: 'page2', complete: false, snapshotCount: 2 };
  } } });
  await assert.rejects(failing.list('wrong'), /TEACHER_AUTH_FAILED/);
  failing.dispose();
  const incomplete = client({ transport: { list: async () => ({ ok: true, records: [record()],
    nextCursor: null, complete: true, snapshotCount: 2 }) } });
  await assert.rejects(incomplete.list('private'), /CLASS_LIST_INCOMPLETE/);
  incomplete.dispose();
});

test('wrong ack id/version cannot acknowledge another inquiry', async () => {
  for (const alteration of [{ id: 'some_other_inquiry' }, { acceptedVersion: 0 }, { saved: false }, { moduleId: 'VL2' }]) {
    const sync = client({ transport: { save: async value => ({ ...ack(value), ...alteration }) } });
    await sync.enqueue(record());
    await assert.rejects(sync.flush(), /SAVE_ACK_INVALID/);
    assert.equal(sync.pendingCount, 1);
    sync.dispose();
  }
});

test('an empty queue without any backend confirmation never claims a confirmed save', async () => {
  const sync = client({ transport: { save: async value => ack(value) } });
  await sync.flush();
  assert.equal(sync.state.key, 'pending');
  await sync.enqueue(record());
  await sync.flush();
  assert.equal(sync.state.key, 'synced');
  sync.dispose();
});

test('bridge endpoint and descendant-source checks reject untrusted windows', () => {
  assert.equal(validEndpoint(endpoint), true);
  for (const url of ['http://script.google.com/macros/s/id/exec', 'https://evil.example/macros/s/id/exec',
    `${endpoint}?other=1`, 'https://script.google.com/macros/s/id/dev',
    'https://user:password@script.google.com/macros/s/id/exec']) assert.equal(validEndpoint(url), false);
  const frame = { parent: null }; frame.parent = frame;
  assert.equal(frameOwnsSource({ parent: frame }, frame), true);
  const other = { parent: null }; other.parent = other;
  assert.equal(frameOwnsSource(other, frame), false);
});

test('bridge pins origin, window, channel and request ID before accepting replies', async () => {
  const listeners = new Map(), posted = [];
  const frameWindow = { parent: null }; frameWindow.parent = frameWindow;
  const sandbox = { parent: frameWindow, postMessage: (message, origin) => posted.push({ message, origin }) };
  let frame;
  const hostWindow = { location: { origin: 'https://vl4.example.edu' },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name) };
  const document = { body: { appendChild() {} }, createElement: () =>
    (frame = { contentWindow: frameWindow, remove() {} }) };
  const bridge = createCloudBridge(endpoint, { window: hostWindow, document, timeoutMs: 1000 });
  const resultPromise = bridge.save(record());
  const params = new URL(frame.src).searchParams;
  const ready = { type: 'VL4_READY', moduleId: MODULE_ID, channel: params.get('channel'),
    requestId: params.get('requestId') };
  const dispatch = (data, source = sandbox, origin = 'https://trusted-script.googleusercontent.com') =>
    listeners.get('message')({ data, source, origin });
  dispatch(ready, sandbox, 'https://evil.example');
  dispatch(ready, { parent: null });
  assert.equal(posted.length, 0);
  dispatch(ready);
  await setImmediate();
  assert.equal(posted.length, 1);
  const request = posted[0].message;
  assert.equal(posted[0].origin, 'https://trusted-script.googleusercontent.com');
  const response = { type: 'VL4_RESPONSE', moduleId: MODULE_ID, channel: params.get('channel'),
    requestId: request.requestId, ok: true, result: ack(record()) };
  dispatch({ ...response, channel: 'wrong' });
  dispatch({ ...response, requestId: 'wrong' });
  dispatch(response, frameWindow);
  dispatch(response, sandbox, 'https://different-script.googleusercontent.com');
  assert.equal(posted.length, 1);
  dispatch(response);
  assert.deepEqual(await resultPromise, ack(record()));
  bridge.dispose();
});

const source = await readFile(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const singleFileSource = await readFile(new URL('../google-apps-script/VL4-collector-single-file.gs', import.meta.url), 'utf8');
function backendMock(backendSource = source) {
  class Sheet {
    rows = [];
    maxRows = 1000;
    getLastRow() { return this.rows.length; }
    getMaxRows() { return this.maxRows; }
    insertRowsAfter(_, amount) { this.maxRows += amount; }
    setFrozenRows() {}
    deleteRow(index) { this.rows.splice(index - 1, 1); }
    getRange(row, column, height, width) {
      return { setNumberFormat() { return this; },
        getValues: () => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => this.rows[row - 1 + y]?.[column - 1 + x] ?? '')),
        setValues: values => values.forEach((items, y) => {
          this.rows[row - 1 + y] ||= [];
          items.forEach((value, x) => { this.rows[row - 1 + y][column - 1 + x] = value; });
        }) };
    }
  }
  const sheets = new Map();
  const props = new Map([['SPREADSHEET_ID', 'isolated-test-sheet'], ['SETUP_TEACHER_PASSWORD', 'a-test-only-long-password-123'],
    ['ALLOWED_APP_ORIGINS', 'https://vl4.example.edu']]);
  let flushes = 0;
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => props.get(key) || null,
      setProperties: values => Object.entries(values).forEach(([k, v]) => props.set(k, v)),
      setProperty: (k, v) => props.set(k, v), deleteProperty: key => props.delete(key) }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => sheets.get(name), insertSheet: name => {
      const sheet = new Sheet(); sheets.set(name, sheet); return sheet;
    } }), flush: () => { flushes++; } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { getUuid: randomUUID, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (_, text) => Array.from(createHash('sha256').update(text).digest()),
      computeHmacSha256Signature: (text, secret) => Array.from(createHmac('sha256', secret).update(text).digest()),
      base64EncodeWebSafe: value => Buffer.from(typeof value === 'string' ? value : value).toString('base64url'),
      base64DecodeWebSafe: value => Array.from(Buffer.from(value, 'base64url')),
      newBlob: value => ({ getDataAsString: () => Buffer.from(value).toString('utf8') }) }
  });
  vm.runInContext(backendSource, context);
  context.initializeVL4_();
  return { context, sheets, props, get flushes() { return flushes; } };
}

test('isolated Apps Script initializes privately and stores no plaintext teacher password', () => {
  const backend = backendMock();
  assert.equal(backend.props.has('SETUP_TEACHER_PASSWORD'), false);
  assert.ok(/^[a-f0-9]{64}$/.test(backend.props.get('TEACHER_PASSWORD_HASH')));
  assert.ok(backend.sheets.has('VL4_Records'));
  assert.ok(backend.sheets.has('VL4_PayloadChunks'));
  assert.match(source, /function initializeVL4_\(/);
  assert.match(source, /function pruneOrphanChunks_\(/);
  assert.doesNotMatch(source, /SpreadsheetApp\.getUi/);
});

test('both VL4 collectors accept 12-character passwords and reject 11-character resets', () => {
  for (const backendSource of [source, singleFileSource]) {
    const backend = backendMock(backendSource);
    const password = randomBytes(9).toString('base64url');
    assert.equal(password.length, 12);
    const oldHash = backend.props.get('TEACHER_PASSWORD_HASH');
    backend.props.set('SETUP_TEACHER_PASSWORD', password.slice(0, 11));
    assert.throws(() => backend.context.initializeVL4_(), /LONG_SETUP_PASSWORD_REQUIRED/);
    assert.equal(backend.props.get('TEACHER_PASSWORD_HASH'), oldHash);
    backend.props.set('SETUP_TEACHER_PASSWORD', password);
    assert.equal(backend.context.initializeVL4_().ok, true);
    assert.equal(backend.props.has('SETUP_TEACHER_PASSWORD'), false);
    assert.equal(backend.context.listRecords(password, '', 25).records.length, 0);
    assert.throws(() => backend.context.listRecords(password.slice(0, 11), '', 25), /TEACHER_AUTH_FAILED/);
  }
});

test('Apps Script preserves complete images across safe chunks, deduplicates and rejects stale writes', () => {
  const { context, sheets } = backendMock();
  const value = record();
  value.design.image = `data:image/png;base64,${'abcd'.repeat(50000)}`;
  value.answers.freeText = '=IMPORTXML("evil", "//text()")';
  const saved = context.saveRecord(value);
  assert.equal(saved.saved, true);
  assert.ok(sheets.get('VL4_PayloadChunks').rows.length > 5);
  assert.ok(sheets.get('VL4_PayloadChunks').rows.slice(1).every(row => row[2].startsWith('json:') && row[2].length <= 40005));
  assert.equal(context.saveRecord(value).duplicate, true);
  assert.equal(sheets.get('VL4_Records').rows.length, 2);
  const newer = { ...value, version: 2, answers: { changed: 'updated' } };
  context.saveRecord(newer);
  assert.equal(context.saveRecord(value).acceptedVersion, 2);
  const listed = context.listRecords('a-test-only-long-password-123', '', 25);
  assert.deepEqual(JSON.parse(JSON.stringify(listed.records)), [newer]);
  assert.throws(() => context.saveRecord({ ...newer, answers: { conflicting: true } }), /VERSION_CONFLICT/);
});

test('Apps Script authentication protects every page; signed cursors page a stable collection', () => {
  const { context } = backendMock();
  for (let n = 0; n < 28; n++) context.saveRecord(record(`inquiry_student_${String(n).padStart(2, '0')}`));
  assert.throws(() => context.listRecords(TEACHER_EMAIL, '', 25), /TEACHER_AUTH_FAILED/);
  assert.throws(() => context.listRecords('wrong', '', 25), /TEACHER_AUTH_FAILED/);
  const first = context.listRecords('a-test-only-long-password-123', '', 25);
  assert.equal(first.records.length, 25);
  assert.equal(first.snapshotCount, 28);
  context.saveRecord(record('inquiry_arriving_later'));
  assert.throws(() => context.listRecords('wrong', first.nextCursor, 25), /TEACHER_AUTH_FAILED/);
  assert.throws(() => context.listRecords('a-test-only-long-password-123', first.nextCursor + 'tamper', 25), /CURSOR_INVALID/);
  const second = context.listRecords('a-test-only-long-password-123', first.nextCursor, 25);
  assert.equal(second.records.length, 3);
  assert.equal(second.snapshotCount, 28);
  assert.equal(second.complete, true);
  assert.equal(second.nextCursor, null);
});

test('Apps Script chunk boundaries preserve Chinese and emoji without splitting surrogate pairs', () => {
  const { context, sheets } = backendMock();
  const value = record();
  value.answers.freeText = '測試🧪'.repeat(15000);
  context.saveRecord(value);
  const chunks = sheets.get('VL4_PayloadChunks').rows.slice(1).map(row => row[2].slice(5));
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => !/[\uD800-\uDBFF]/.test(chunk.at(-1))));
  assert.deepEqual(JSON.parse(JSON.stringify(context.listRecords('a-test-only-long-password-123', '', 25).records)), [value]);
});

test('Apps Script rejects teacher/demo records and credential fields before writing', () => {
  const { context, sheets } = backendMock();
  assert.throws(() => context.saveRecord({ ...record(), demo: true }), /STUDENT_RECORD_REQUIRED/);
  assert.throws(() => context.saveRecord({ ...record(), profile: { ...record().profile, email: TEACHER_EMAIL } }), /STUDENT_RECORD_REQUIRED/);
  assert.throws(() => context.saveRecord({ ...record(), answers: { teacherPassword: 'must-not-save' } }), /CREDENTIAL_FIELD_FORBIDDEN/);
  assert.equal(sheets.get('VL4_Records').getLastRow(), 1);
});

test('Apps Script detects lost or tampered image chunks instead of returning partial class data', () => {
  const { context, sheets } = backendMock();
  context.saveRecord(record());
  sheets.get('VL4_PayloadChunks').rows[1][2] += 'tampered';
  assert.throws(() => context.listRecords('a-test-only-long-password-123', '', 25), /CHECKSUM_FAILED/);
});
