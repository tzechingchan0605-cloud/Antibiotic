import { CLOUD_ENDPOINT, MODULE_ID, CLOUD_QUEUE_KEY, CLOUD_BACKUP_KEY, CLOUD_CONFIRMATION_KEY, TEACHER_EMAIL } from './cloud-config.js';
import { createCloudBridge } from './cloud-bridge.js';

export function isStudentRecord(record) {
  return Boolean(record && record.schemaVersion === 1 && record.moduleId === MODULE_ID &&
    typeof record.id === 'string' && /^[A-Za-z0-9_-]{8,120}$/.test(record.id) &&
    Number.isSafeInteger(record.version) && record.version >= 1 && record.demo === false &&
    record.role !== 'teacher' && record.profile && typeof record.profile.email === 'string' &&
    record.profile.email.trim().toLowerCase() !== TEACHER_EMAIL);
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function createCloudSync({ endpoint = CLOUD_ENDPOINT, storage = globalThis.localStorage,
  status = () => {}, transport, autoFlush = true, retryBaseMs = 1500 } = {}) {
  const enabled = Boolean(endpoint?.trim());
  let bridge = transport, active, retryTimer, failures = 0, disposed = false, currentStatus;
  let queueError = false;

  function readQueue() {
    try {
      const queue = JSON.parse(storage.getItem(CLOUD_QUEUE_KEY) || '[]');
      if (!Array.isArray(queue) || queue.some(record => !isStudentRecord(record))) throw new Error();
      if (new Set(queue.map(record => record.id)).size !== queue.length) throw new Error();
      queueError = false;
      return queue;
    } catch {
      queueError = true;
      throw new Error('LOCAL_QUEUE_UNREADABLE');
    }
  }

  function count() {
    try { return readQueue().length; } catch { return 0; }
  }

  function previouslyConfirmed() {
    try {
      const backups = JSON.parse(storage.getItem(CLOUD_BACKUP_KEY) || '[]');
      const confirmations = JSON.parse(storage.getItem(CLOUD_CONFIRMATION_KEY) || '{}');
      return Array.isArray(backups) && backups.length > 0 && backups.every(record =>
        confirmations[record.id]?.endpoint === endpoint &&
        confirmations[record.id]?.version >= record.version);
    } catch { return false; }
  }

  function report(key, error) {
    currentStatus = { key, pendingCount: count(), ...(error ? { error } : {}) };
    try { status(currentStatus); } catch { /* Rendering cannot change save semantics. */ }
  }

  function persist(key, data) {
    try { storage.setItem(key, JSON.stringify(data)); }
    catch { throw new Error('LOCAL_SAVE_FAILED'); }
  }

  function getTransport() {
    if (!bridge) bridge = createCloudBridge(endpoint);
    return bridge;
  }

  function scheduleRetry() {
    if (disposed || !enabled || retryTimer) return;
    const delay = Math.min(60000, retryBaseMs * 2 ** Math.min(failures - 1, 6));
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      flush().catch(() => {});
    }, delay);
    retryTimer.unref?.();
  }

  async function enqueue(record) {
    if (disposed) throw new Error('CLOUD_SYNC_DISPOSED');
    if (!isStudentRecord(record)) throw new Error('STUDENT_RECORD_REQUIRED');
    const snapshot = clone(record);
    let queue, backups;
    try {
      queue = readQueue();
      backups = JSON.parse(storage.getItem(CLOUD_BACKUP_KEY) || '[]');
      if (!Array.isArray(backups)) throw new Error('LOCAL_BACKUP_UNREADABLE');
      const existing = backups.find(item => item.id === snapshot.id);
      if (existing && existing.version > snapshot.version) throw new Error('LOCAL_STALE_VERSION');
      if (existing && existing.version === snapshot.version &&
        JSON.stringify(existing) !== JSON.stringify(snapshot)) throw new Error('LOCAL_VERSION_CONFLICT');
      const backupIndex = backups.findIndex(item => item.id === snapshot.id);
      if (backupIndex < 0) backups.push(snapshot); else backups[backupIndex] = snapshot;
      // The full local backup must exist before any network operation is allowed.
      persist(CLOUD_BACKUP_KEY, backups);
      const queueIndex = queue.findIndex(item => item.id === snapshot.id);
      if (queueIndex < 0) queue.push(snapshot);
      else if (queue[queueIndex].version <= snapshot.version) queue[queueIndex] = snapshot;
      persist(CLOUD_QUEUE_KEY, queue);
    } catch (error) {
      report('error', error.message);
      throw error;
    }
    report(enabled ? 'pending' : 'unconfigured');
    if (autoFlush && enabled) queueMicrotask(() => flush().catch(() => {}));
    return { local: true, queued: true, version: snapshot.version };
  }

  async function runFlush() {
    if (!enabled) {
      report('unconfigured');
      return { enabled: false, pendingCount: count(), confirmedCount: 0 };
    }
    let confirmedCount = 0;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    try {
      for (let queue = readQueue(); queue.length && !disposed; queue = readQueue()) {
        const record = queue[0];
        report('syncing');
        const ack = await getTransport().save(clone(record));
        if (!ack || ack.ok !== true || ack.saved !== true || ack.moduleId !== MODULE_ID ||
          ack.id !== record.id || !Number.isSafeInteger(ack.acceptedVersion) ||
          ack.acceptedVersion < record.version) throw new Error('SAVE_ACK_INVALID');
        let confirmations;
        try {
          const savedConfirmations = JSON.parse(storage.getItem(CLOUD_CONFIRMATION_KEY) || '{}');
          if (!savedConfirmations || Array.isArray(savedConfirmations) || typeof savedConfirmations !== 'object') throw new Error();
          confirmations = Object.assign(Object.create(null), savedConfirmations);
        }
        catch { throw new Error('LOCAL_CONFIRMATIONS_UNREADABLE'); }
        confirmations[record.id] = { endpoint, version: ack.acceptedVersion };
        persist(CLOUD_CONFIRMATION_KEY, confirmations);
        // A newer edit may have arrived while this request was in flight.
        const latest = readQueue().filter(item => item.id !== record.id ||
          item.version > ack.acceptedVersion);
        persist(CLOUD_QUEUE_KEY, latest);
        confirmedCount++;
      }
      failures = 0;
      report(count() ? 'pending' : previouslyConfirmed() ? 'synced' : 'pending');
      return { enabled: true, pendingCount: count(), confirmedCount };
    } catch (error) {
      failures++;
      report('error', error.message || 'CLOUD_REQUEST_FAILED');
      if (!queueError) scheduleRetry();
      throw error;
    }
  }

  function flush() {
    if (disposed) return Promise.reject(new Error('CLOUD_SYNC_DISPOSED'));
    if (active) return active;
    active = runFlush().finally(() => { active = undefined; });
    return active;
  }

  async function list(password) {
    if (disposed) throw new Error('CLOUD_SYNC_DISPOSED');
    if (!enabled) throw new Error('CLOUD_UNCONFIGURED');
    if (typeof password !== 'string' || !password) throw new Error('TEACHER_PASSWORD_REQUIRED');
    const records = [], seenIds = new Set(), seenCursors = new Set();
    let cursor = '', snapshotCount;
    do {
      const result = await getTransport().list({ password, cursor, limit: 25 });
      if (!result || result.ok !== true || !Array.isArray(result.records) ||
        typeof result.complete !== 'boolean' ||
        !(typeof result.nextCursor === 'string' || result.nextCursor === null) ||
        result.complete !== !result.nextCursor || !Number.isSafeInteger(result.snapshotCount)) {
        throw new Error('CLASS_LIST_INVALID');
      }
      if (snapshotCount === undefined) snapshotCount = result.snapshotCount;
      if (snapshotCount !== result.snapshotCount) throw new Error('CLASS_LIST_CHANGED');
      for (const record of result.records) {
        if (!isStudentRecord(record) || seenIds.has(record.id)) throw new Error('CLASS_RECORD_INVALID');
        seenIds.add(record.id);
        records.push(clone(record));
      }
      cursor = result.nextCursor || '';
      if (cursor && (seenCursors.has(cursor) || result.records.length === 0)) {
        throw new Error('CLASS_PAGING_INVALID');
      }
      if (cursor) seenCursors.add(cursor);
    } while (cursor);
    if (records.length !== snapshotCount) throw new Error('CLASS_LIST_INCOMPLETE');
    // No partial array is returned if authentication or any later page fails.
    return records;
  }

  const onOnline = () => { if (enabled) flush().catch(() => {}); };
  const onStorage = event => {
    if (event.key === CLOUD_QUEUE_KEY) {
      report(enabled ? (count() || !previouslyConfirmed() ? 'pending' : 'synced') : 'unconfigured');
      if (enabled && autoFlush && count()) flush().catch(() => {});
    }
  };
  globalThis.window?.addEventListener('online', onOnline);
  globalThis.window?.addEventListener('storage', onStorage);
  count();
  report(queueError ? 'error' : enabled ? (count() || !previouslyConfirmed() ? 'pending' : 'synced') : 'unconfigured',
    queueError ? 'LOCAL_QUEUE_UNREADABLE' : undefined);
  if (enabled && autoFlush && count()) queueMicrotask(() => flush().catch(() => {}));

  return {
    enabled, enqueue, flush, list,
    get pendingCount() { return count(); },
    get state() { return currentStatus; },
    dispose() {
      disposed = true;
      clearTimeout(retryTimer);
      globalThis.window?.removeEventListener('online', onOnline);
      globalThis.window?.removeEventListener('storage', onStorage);
      bridge?.dispose?.();
    }
  };
}
