import { MODULE_ID } from './cloud-config.js';

const REQUEST_TIMEOUT = 45000;

function identifier() {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
}

function googleOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && !url.port && (
      url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com' ||
      /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname)
    );
  } catch { return false; }
}

// HtmlService has an inner sandbox frame. Verify that its WindowProxy belongs
// to our iframe, then pin that exact window and origin for every later reply.
export function frameOwnsSource(source, frameWindow) {
  if (!source || !frameWindow) return false;
  try {
    for (let depth = 0, current = source; depth < 5; depth++) {
      if (current === frameWindow) return true;
      if (!current.parent || current.parent === current) return false;
      current = current.parent;
    }
  } catch { return false; }
  return false;
}

export function validEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' &&
      !url.username && !url.password && !url.port &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search && !url.hash;
  } catch { return false; }
}

export function createCloudBridge(endpoint, options = {}) {
  if (!validEndpoint(endpoint)) throw new Error('INVALID_VL4_ENDPOINT');
  const hostWindow = options.window || globalThis.window;
  const doc = options.document || globalThis.document;
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT;
  if (!hostWindow || !doc || !/^https?:\/\//.test(hostWindow.location.origin)) {
    throw new Error('HTTP_HOST_REQUIRED');
  }
  const channel = identifier();
  const handshakeId = identifier();
  const pending = new Map();
  let frame, frameSource, frameOrigin, connection, readyResolve, readyReject, readyTimer;
  let disposed = false;

  function failPending(code) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error(code));
    }
    pending.clear();
  }

  function onMessage(event) {
    const message = event.data;
    if (disposed || !message || typeof message !== 'object' ||
      message.moduleId !== MODULE_ID || message.channel !== channel ||
      !googleOrigin(event.origin)) return;
    if (message.type === 'VL4_READY') {
      if (message.requestId !== handshakeId || frameSource ||
        !frameOwnsSource(event.source, frame?.contentWindow)) return;
      frameSource = event.source;
      frameOrigin = event.origin;
      clearTimeout(readyTimer);
      readyResolve();
      return;
    }
    if (message.type !== 'VL4_RESPONSE' || event.source !== frameSource ||
      event.origin !== frameOrigin || typeof message.requestId !== 'string') return;
    const entry = pending.get(message.requestId);
    if (!entry) return;
    pending.delete(message.requestId);
    clearTimeout(entry.timer);
    if (message.ok === true) entry.resolve(message.result);
    else entry.reject(new Error(message.code || 'CLOUD_REQUEST_FAILED'));
  }

  function connect() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
      hostWindow.addEventListener('message', onMessage);
      frame = doc.createElement('iframe');
      frame.hidden = true;
      frame.title = 'VL4 cloud transport';
      frame.referrerPolicy = 'no-referrer';
      const url = new URL(endpoint);
      url.searchParams.set('parentOrigin', hostWindow.location.origin);
      url.searchParams.set('channel', channel);
      url.searchParams.set('requestId', handshakeId);
      frame.src = url.href;
      (doc.body || doc.documentElement).appendChild(frame);
      readyTimer = setTimeout(() => reject(new Error('CLOUD_BRIDGE_TIMEOUT')), timeoutMs);
    }).catch(error => {
      clearTimeout(readyTimer);
      frame?.remove();
      hostWindow.removeEventListener('message', onMessage);
      frame = frameSource = frameOrigin = connection = undefined;
      throw error;
    });
    return connection;
  }

  async function request(action, payload) {
    if (disposed) throw new Error('CLOUD_BRIDGE_DISPOSED');
    await connect();
    if (disposed) throw new Error('CLOUD_BRIDGE_DISPOSED');
    const requestId = identifier();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('CLOUD_REQUEST_TIMEOUT'));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timer });
      try {
        frameSource.postMessage({ type: 'VL4_REQUEST', moduleId: MODULE_ID,
          channel, requestId, action, payload }, frameOrigin);
      } catch {
        pending.delete(requestId);
        clearTimeout(timer);
        reject(new Error('CLOUD_SEND_FAILED'));
      }
    });
  }

  return {
    save: record => request('save', { record }),
    list: ({ password, cursor, limit }) => request('list', { password, cursor, limit }),
    dispose() {
      disposed = true;
      clearTimeout(readyTimer);
      readyReject?.(new Error('CLOUD_BRIDGE_DISPOSED'));
      failPending('CLOUD_BRIDGE_DISPOSED');
      hostWindow.removeEventListener('message', onMessage);
      frame?.remove();
    }
  };
}
