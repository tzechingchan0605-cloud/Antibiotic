import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {freshRecord} from '../model.js';
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=';
const RECORDS='vl4.antibiotics.records.v1',CURRENT='vl4.antibiotics.current.v1';
const manifest=JSON.parse(await readFile(new URL('../paperwork/generated/manifest.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function bytes(download){return readFile(await download.path());}
async function excelContent(download){const zip=await JSZip.loadAsync(await bytes(download));return Object.fromEntries(await Promise.all(Object.keys(zip.files).filter(name=>!zip.files[name].dir).sort().map(async name=>[name,hash(await zip.file(name).async('uint8array'))])));}
async function snapshot(page){return page.evaluate(()=>({storage:Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])),answers:[...document.querySelectorAll('main input,main textarea,main select')].map(el=>[el.id,el.value,el.checked,el.disabled]),drawing:document.querySelector('#setupCanvas').toDataURL(),mainHidden:document.querySelector('#main').hidden,demoHidden:document.querySelector('#demoBanner').hidden,report:document.querySelector('#teacherReport').innerHTML,clock:document.querySelector('#activeTime').textContent}));}
async function teacher(page){await page.locator('#profileName').fill('Teacher');await page.locator('#profileClass').fill('Teacher');await page.locator('#profileEmail').fill('tzechingchan0605@gmail.com');await page.locator('#loginForm button[type=submit]').click();await expect(page.locator('#teacherDialog')).toBeVisible();}
test.beforeEach(async({context})=>context.route('https://script.google.com/**',route=>route.abort('blockedbyclient')));

test('teacher downloads all ten real PDFs and previews without altering records, drawings, events, timing or actual Excel',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const r=freshRecord({name:'Sample Student',className:'X1',email:'sample@school.edu.hk'});r.createdAt=r.savedAt='2026-10-12T01:00:00Z';r.answers.observation='Original observation';r.answers.reason='Keep original';r.timing={1:23,2:41,3:17,4:9};r.events=[{type:'original_plan_saved',phase:2,at:r.savedAt,details:{plannedReplicates:2}}];r.design={saved:true,image:PNG,description:'Original setup'};r.original={capturedAt:r.savedAt,answers:structuredClone(r.answers),design:structuredClone(r.design),plannedReplicates:2,plannedReplicateReason:'Independent repeats'};
 await page.addInitScript(({r,RECORDS,CURRENT})=>{localStorage.setItem(RECORDS,JSON.stringify([r]));localStorage.setItem(CURRENT,JSON.stringify(r));},{r,RECORDS,CURRENT});
 await page.goto('/');await teacher(page);await page.locator('[data-view]').click();await page.evaluate(()=>{const ctx=document.querySelector('#setupCanvas').getContext('2d');ctx.fillStyle='#15333b';ctx.fillRect(40,30,90,20);});
 const before=await snapshot(page);const firstExcelPromise=page.waitForEvent('download');await page.locator('#exportLocal').click();const firstExcel=await excelContent(await firstExcelPromise);
 await page.locator('#openPaperwork').click();await expect(page.locator('[data-paper-download=A]')).toBeEnabled();await expect(page.locator('#paperContentVersion')).toContainText('v2');await expect(page.locator('#paperStatus')).toContainText('15–20');
 for(const lang of ['zh','en']){
   await page.locator('#paperLanguage').selectOption(lang);
   await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant-HK');
   for(const part of ['A','B','C','D','all']){
     const file=manifest.languages[lang].files[part];const promise=page.waitForEvent('download');await page.locator(`[data-paper-download=${part}]`).click();const dl=await promise;
     expect(dl.suggestedFilename()).toBe(file.name);const buffer=await bytes(dl);expect(buffer.subarray(0,5).toString()).toBe('%PDF-');expect(hash(buffer)).toBe(file.sha256);
     expect(await snapshot(page)).toEqual(before);
   }
 }
 for(const part of ['A','B','C','D','all']){await page.locator(`[data-paper-preview=${part}]`).click();await expect(page.locator('#paperPreview')).toBeVisible();expect(await page.locator('#paperPreview').getAttribute('src')).toMatch(/^blob:/);}
 const lastExcelPromise=page.waitForEvent('download');await page.locator('#exportLocal').click();expect(await excelContent(await lastExcelPromise)).toEqual(firstExcel);
 expect(await snapshot(page)).toEqual(before);expect(errors).toEqual([]);
});

test('mobile material language is independent, and student mode has no material entrance',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');await teacher(page);await page.locator('#openPaperwork').click();await expect(page.locator('[data-paper-download=A]')).toBeEnabled();
 await page.locator('#paperLanguage').selectOption('en');await expect(page.locator('#paperNameA')).toContainText('Concepts');await expect(page.locator('html')).toHaveAttribute('lang','zh-Hant-HK');
 expect(await page.locator('#paperPanel').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 const dl=page.waitForEvent('download');await page.locator('[data-paper-download=B]').click();expect((await dl).suggestedFilename()).toBe(manifest.languages.en.files.B.name);
 await page.locator('#closeTeacher').click();await page.locator('#profileName').fill('Student');await page.locator('#profileClass').fill('X1');await page.locator('#profileEmail').fill('student@school.edu.hk');await page.locator('#loginForm button[type=submit]').click();await expect(page.locator('#main')).toBeVisible();
 await expect(page.locator('#openPaperwork')).not.toBeVisible();await expect(page.locator('#paperPanel')).not.toBeVisible();
 const studentBefore=await snapshot(page);await page.evaluate(()=>document.querySelector('#openPaperwork').click());await expect(page.locator('#paperPanel')).not.toBeVisible();expect(await snapshot(page)).toEqual(studentBefore);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vl4.antibiotics.records.v1')).length)).toBe(1);
});

test('outdated manifest and corrupt PDFs are rejected without record changes',async({page})=>{
 await page.goto('/');await teacher(page);const before=await snapshot(page);
 await page.route('**/paperwork/generated/manifest.json',route=>route.fulfill({json:{...manifest,sourceDigest:'0'.repeat(64)}}));
 await page.locator('#openPaperwork').click();await expect(page.locator('#paperStatus')).toContainText('過期');await expect(page.locator('[data-paper-download=A]')).toBeDisabled();expect(await snapshot(page)).toEqual(before);
 await page.unroute('**/paperwork/generated/manifest.json');await page.locator('#openPaperwork').click();await expect(page.locator('[data-paper-download=A]')).toBeEnabled();
 await page.route('**/paperwork/generated/*.pdf',route=>route.fulfill({contentType:'application/pdf',body:'%PDF-corrupt'}));
 let downloaded=false;page.on('download',()=>downloaded=true);await page.locator('[data-paper-download=A]').click();await expect(page.locator('#paperStatus')).toContainText('校驗不符');expect(downloaded).toBe(false);expect(await snapshot(page)).toEqual(before);
});
