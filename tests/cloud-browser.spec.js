import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import ExcelJS from 'exceljs';
import { CLOUD_ENDPOINT } from '../cloud-config.js';

const MODULE = 'VL_BIO_ANTIBIOTICS';
const ENDPOINT = 'https://script.google.com/macros/s/VL4_ISOLATED_TEST/exec';
const GOOGLE_ORIGIN = 'https://script.google.com';
const APP_ORIGIN = 'http://127.0.0.1:4173';
const CURRENT = 'vl4.antibiotics.current.v1';
const RECORDS = 'vl4.antibiotics.records.v1';
const QUEUE = 'vl4.antibiotics.cloud.queue.v1';
const TEACHER = 'tzechingchan0605@gmail.com';
const READ_FAILURE = '全班讀取失敗；不能以部分本機資料匯出全班，請重試。';

// This fake collector exists only in this test's Node process. Every request to
// Google is fulfilled/aborted locally; test records never reach the live endpoint.
function collector() {
  return { records: new Map(), password: randomBytes(24).toString('base64url'),
    listCalls: [], authFailures: 0, saveAttempts: 0, failSaves: false,
    failLaterPage: false, saveGate: null, blockedExternal: [] };
}

function bridgeHTML(url) {
  const parentOrigin = url.searchParams.get('parentOrigin');
  const channel = url.searchParams.get('channel');
  const handshake = url.searchParams.get('requestId');
  if (parentOrigin !== APP_ORIGIN || !/^[a-f0-9]{48}$/.test(channel || '') ||
      !/^[a-f0-9]{48}$/.test(handshake || '')) throw Error('INVALID_TEST_BRIDGE_PARAMETERS');
  return `<!doctype html><meta charset="utf-8"><title>Isolated VL4 mock bridge</title>
    <script>
      'use strict';
      const parentOrigin=${JSON.stringify(parentOrigin)}, channel=${JSON.stringify(channel)};
      const moduleId=${JSON.stringify(MODULE)}, target=window.top;
      window.addEventListener('message', async event => {
        const data=event.data;
        if(event.origin!==parentOrigin || event.source!==target || !data ||
          data.type!=='VL4_REQUEST' || data.channel!==channel || data.moduleId!==moduleId ||
          !/^[a-f0-9]{48}$/.test(data.requestId||'') || !['save','list'].includes(data.action))return;
        let response;
        try{
          const fetched=await fetch('/vl4-isolated-api',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({action:data.action,payload:data.payload,channel,requestId:data.requestId,
              moduleId,parentOrigin})});
          response=await fetched.json();
        }catch{response={ok:false,code:'ISOLATED_NETWORK_FAILURE'};}
        target.postMessage({type:'VL4_RESPONSE',moduleId,channel,requestId:data.requestId,...response},parentOrigin);
      });
      target.postMessage({type:'VL4_READY',moduleId,channel,requestId:${JSON.stringify(handshake)}},parentOrigin);
    </script>`;
}

async function installIsolatedRoutes(context, service, bundle) {
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === APP_ORIGIN) {
      if (/^\/app\.bundle(?:\.[a-f0-9]{12})?\.js$/.test(url.pathname)) {
        await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: bundle });
      } else await route.continue();
      return;
    }
    if (url.origin !== GOOGLE_ORIGIN) {
      service.blockedExternal.push(url.origin);
      await route.abort('blockedbyclient');
      return;
    }
    if (url.pathname === new URL(ENDPOINT).pathname) {
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: bridgeHTML(url) });
      return;
    }
    if (url.pathname !== '/vl4-isolated-api' || request.method() !== 'POST') {
      service.blockedExternal.push(request.url());
      await route.abort('blockedbyclient');
      return;
    }
    const data = request.postDataJSON();
    if (data.parentOrigin !== APP_ORIGIN || data.moduleId !== MODULE ||
        !/^[a-f0-9]{48}$/.test(data.channel || '') || !/^[a-f0-9]{48}$/.test(data.requestId || '')) {
      throw Error('INVALID_TEST_API_ENVELOPE');
    }
    let response;
    if (data.action === 'save') {
      service.saveAttempts++;
      if (service.saveGate) await service.saveGate;
      if (service.failSaves) { await route.abort('internetdisconnected'); return; }
      const record = data.payload.record;
      if (record.moduleId !== MODULE || record.demo !== false || record.role === 'teacher' ||
          record.profile?.email?.toLowerCase() === TEACHER) {
        response = { ok: false, code: 'STUDENT_RECORD_REQUIRED' };
      } else {
        const stored = service.records.get(record.id);
        if (!stored || record.version > stored.version) service.records.set(record.id, structuredClone(record));
        response = { ok: true, result: { ok: true, saved: true, moduleId: MODULE,
          id: record.id, acceptedVersion: service.records.get(record.id).version } };
      }
    } else if (data.action === 'list') {
      const { password, cursor = '' } = data.payload;
      // Never capture passwords in the test's call history or output.
      service.listCalls.push({ cursor, authenticated: password === service.password });
      if (password !== service.password) {
        service.authFailures++;
        response = { ok: false, code: 'TEACHER_AUTH_FAILED' };
      } else if (cursor && service.failLaterPage) {
        response = { ok: false, code: 'ISOLATED_LATER_PAGE_FAILURE' };
      } else {
        const snapshot = cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString()) :
          { offset: 0, ids: [...service.records.keys()] };
        const ids = snapshot.ids.slice(snapshot.offset, snapshot.offset + 2);
        const offset = snapshot.offset + ids.length;
        const nextCursor = offset < snapshot.ids.length ?
          Buffer.from(JSON.stringify({ offset, ids: snapshot.ids })).toString('base64url') : null;
        response = { ok: true, result: { ok: true, records: ids.map(id => service.records.get(id)),
          snapshotCount: snapshot.ids.length, nextCursor, complete: !nextCursor } };
      }
    } else throw Error('INVALID_TEST_API_ACTION');
    await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(response) });
  });
}

async function login(page, profile) {
  await expect(page.locator('#loginDialog')).toBeVisible();
  await page.locator('#profileName').fill(profile.name);
  await page.locator('#profileClass').fill(profile.className);
  await page.locator('#profileEmail').fill(profile.email);
  await page.locator('#loginForm button[type="submit"]').click();
}

const current = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), CURRENT);
const queued = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), QUEUE);

async function assertSynced(page, service, id, answer) {
  await expect.poll(() => service.records.get(id)?.answers?.observation).toBe(answer);
  await expect(page.locator('#cloudStatus')).toHaveAttribute('data-state', 'synced');
  expect(await queued(page)).toEqual([]);
}

test('isolated Google-origin bridge collects independent desktop/mobile inquiries and authenticates every class export page', async ({ browser }) => {
  test.setTimeout(60000);
  const source = await readFile(new URL('../app.bundle.js', import.meta.url), 'utf8');
  const marker = `var CLOUD_ENDPOINT = ${JSON.stringify(CLOUD_ENDPOINT)};`;
  expect(source.split(marker)).toHaveLength(2);
  const bundle = source.replace(marker, `var CLOUD_ENDPOINT = ${JSON.stringify(ENDPOINT)};`);
  const config = await readFile(new URL('../cloud-config.js', import.meta.url), 'utf8');
  expect(config).toContain(`export const CLOUD_ENDPOINT = '${CLOUD_ENDPOINT}';`);
  const service = collector(), contexts = [], errors = [];
  let releaseFirstSave;
  service.saveGate = new Promise(resolve => { releaseFirstSave = resolve; });
  try {
    const desktopContext = await browser.newContext({ baseURL: APP_ORIGIN });
    const mobileContext = await browser.newContext({ baseURL: APP_ORIGIN,
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const teacherContext = await browser.newContext({ baseURL: APP_ORIGIN, acceptDownloads: true });
    contexts.push(desktopContext, mobileContext, teacherContext);
    for (const context of contexts) await installIsolatedRoutes(context, service, bundle);
    const desktop = await desktopContext.newPage(), mobile = await mobileContext.newPage(), teacher = await teacherContext.newPage();
    for (const page of [desktop, mobile, teacher]) page.on('pageerror', error => errors.push(error.message));

    await desktop.goto('/');
    const desktopProfile = { name: '桌面學生', className: 'S4X1-01', email: 'desktop@isolated.example' };
    await login(desktop, desktopProfile);
    await expect(desktop.locator('#cloudStatus')).toHaveAttribute('data-state', 'syncing');
    expect(service.records.size).toBe(0); // READY and iframe load did not acknowledge a save.
    releaseFirstSave();
    service.saveGate = null;
    await expect(desktop.locator('#cloudStatus')).toHaveAttribute('data-state', 'synced');
    const firstId = (await current(desktop)).id;
    const firstAnswer = '桌面探究：黴菌附近少或沒有可見細菌生長。';
    await desktop.locator('#observation').fill(firstAnswer);
    await desktop.locator('#orientationNext').click();
    await expect(desktop.locator('#phase-2')).toBeVisible();
    const imageBase64 = await desktop.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 40;
      const context = canvas.getContext('2d'); context.fillStyle = '#087b78'; context.fillRect(0, 0, 80, 40);
      context.fillStyle = '#fff'; context.fillRect(10, 10, 20, 20);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await desktop.locator('#setupPhoto').setInputFiles({ name: 'isolated-student-design.png', mimeType: 'image/png',
      buffer: Buffer.from(imageBase64, 'base64') });
    await expect.poll(() => desktop.evaluate(() => document.getElementById('setupCanvas').getContext('2d')
      .getImageData(500, 200, 1, 1).data[3])).toBe(255);
    await desktop.locator('#designDescription').fill('四個象限放置樣本及載體對照，保持距離。');
    await desktop.locator('#saveDesign').click();
    await assertSynced(desktop, service, firstId, firstAnswer);
    const firstImage = (await current(desktop)).design.image;
    expect(firstImage).toMatch(/^data:image\/png;base64,/);
    expect(service.records.get(firstId).design.image).toBe(firstImage);

    await mobile.goto('/');
    await login(mobile, { name: '手機學生', className: 'S4X2-02', email: 'mobile@isolated.example' });
    const mobileId = (await current(mobile)).id;
    const mobileAnswer = '手機探究：需要用對照判斷紙碟附近的可見生長。';
    await mobile.locator('#observation').fill(mobileAnswer);
    await assertSynced(mobile, service, mobileId, mobileAnswer);
    expect(await mobile.evaluate(key => JSON.parse(localStorage.getItem(key)).map(record => record.id), RECORDS)).toEqual([mobileId]);

    service.failSaves = true;
    const revisedMobile = mobileAnswer + ' 新的獨立平板有助比較一致性。';
    await mobile.locator('#observation').fill(revisedMobile);
    await expect(mobile.locator('#cloudStatus')).toHaveAttribute('data-state', 'error');
    expect(service.records.get(mobileId).answers.observation).toBe(mobileAnswer);
    expect((await queued(mobile))[0].answers.observation).toBe(revisedMobile);
    await expect(mobile.locator('#cloudStatus')).toContainText('本機備份仍保留');
    service.failSaves = false;
    await mobile.locator('#retryCloud').click();
    await assertSynced(mobile, service, mobileId, revisedMobile);

    await desktop.locator('#accountButton').click();
    await login(desktop, desktopProfile);
    const secondId = (await current(desktop)).id;
    expect(secondId).not.toBe(firstId);
    await expect(desktop.locator('#observation')).toHaveValue('');
    const secondAnswer = '同一電郵的第二次探究，保留自己的獨立紀錄。';
    await desktop.locator('#observation').fill(secondAnswer);
    await assertSynced(desktop, service, secondId, secondAnswer);
    expect(service.records.size).toBe(3);
    expect([...service.records.values()].filter(record => record.profile.email === desktopProfile.email)).toHaveLength(2);

    await teacher.goto('/');
    expect(await teacher.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), RECORDS)).toEqual([]);
    const downloads = [];
    teacher.on('download', download => downloads.push(download));
    await login(teacher, { name: '教師', className: 'S4', email: TEACHER });
    await expect(teacher.locator('#teacherDialog')).toBeVisible();
    expect(service.listCalls).toHaveLength(0);
    await expect(teacher.locator('#teacherRows')).not.toContainText('桌面學生');
    await teacher.locator('#refreshCloud').click();
    await expect(teacher.locator('#dashboardStatus')).toHaveText(READ_FAILURE);
    expect(service.listCalls).toHaveLength(0); // Teacher email alone cannot even invoke a class read.

    await teacher.locator('#teacherPassword').fill('wrong-isolated-password');
    await teacher.locator('#refreshCloud').click();
    await expect.poll(() => service.authFailures).toBe(1);
    await expect(teacher.locator('#dashboardStatus')).toHaveText(READ_FAILURE);
    await teacher.locator('#exportExcel').click();
    await expect.poll(() => service.authFailures).toBe(2);
    await expect(teacher.locator('#dashboardStatus')).toHaveText(READ_FAILURE);
    expect(downloads).toHaveLength(0);

    await teacher.locator('#teacherPassword').fill(service.password);
    const beforeRead = service.listCalls.length;
    await teacher.locator('#refreshCloud').click();
    await expect(teacher.locator('#teacherRows [data-view]')).toHaveCount(3);
    expect(service.listCalls.slice(beforeRead)).toHaveLength(2);
    expect(service.listCalls.slice(beforeRead).every(call => call.authenticated)).toBe(true);
    expect(service.listCalls.at(-1).cursor).not.toBe('');
    await expect(teacher.locator('#teacherPassword')).toHaveValue('');
    await teacher.locator(`[data-view="${firstId}"]`).click();
    await expect(teacher.locator('#teacherReport')).toContainText(firstAnswer);
    await expect(teacher.locator('#teacherReport img')).toHaveAttribute('src', firstImage);

    const beforeExport = service.listCalls.length;
    const downloading = teacher.waitForEvent('download');
    await teacher.locator('#exportExcel').click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/全班學習紀錄\.xlsx$/);
    expect(service.listCalls.slice(beforeExport)).toHaveLength(2); // Export freshly rereads all pages.
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(await download.path());
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual([
      '學生探究答案', '量度與計算', '教師評分', '評分準則', '操作事件紀錄', '裝置設計圖']);
    const answers = workbook.getWorksheet('學生探究答案');
    expect(answers.rowCount).toBe(4);
    expect(answers.getColumn(1).values.slice(2)).toEqual([firstId, mobileId, secondId]);
    const workbookText = JSON.stringify(answers.getSheetValues());
    expect(workbookText).toContain(firstAnswer);
    expect(workbookText).toContain(revisedMobile);
    expect(workbookText).toContain(secondAnswer);
    expect(workbook.getWorksheet('裝置設計圖').getImages()).toHaveLength(1);
    expect(JSON.stringify(workbook.model)).not.toContain(service.password);

    service.failLaterPage = true;
    const beforeFailedExport = service.listCalls.length;
    await teacher.locator('#exportExcel').click();
    await expect.poll(() => service.listCalls.length).toBe(beforeFailedExport + 2);
    await expect(teacher.locator('#dashboardStatus')).toHaveText(READ_FAILURE);
    await expect(teacher.locator('#teacherRows [data-view]')).toHaveCount(0);
    await expect(teacher.locator('#teacherDetail')).toBeHidden();
    expect(downloads).toHaveLength(1); // The earlier successful workbook only; no partial-class download.
    service.failLaterPage = false;

    const savesBeforeDemo = service.saveAttempts;
    await teacher.locator('#teacherDemo').click();
    await expect(teacher.locator('#demoBanner')).toBeVisible();
    await teacher.locator('#observation').fill('教師示範不應加入學生資料。');
    await teacher.locator('#teacherBack').click();
    await expect(teacher.locator('#teacherDialog')).toBeVisible();
    expect(service.saveAttempts).toBe(savesBeforeDemo);
    expect(service.records.size).toBe(3);
    expect(await teacher.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), RECORDS)).toEqual([]);
    expect(await teacher.evaluate(password => Object.values(localStorage).some(value => value.includes(password)), service.password)).toBe(false);
    expect(service.blockedExternal).toEqual([]);
    expect(errors).toEqual([]);
    expect(await readFile(new URL('../cloud-config.js', import.meta.url), 'utf8')).toBe(config);
  } finally {
    releaseFirstSave?.();
    await Promise.all(contexts.map(context => context.close()));
  }
});
