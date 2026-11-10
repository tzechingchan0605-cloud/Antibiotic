import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {freshRecord} from '../model.js';
import {buildWorkbook} from '../reports.js';
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=';
const RECORDS='vl4.antibiotics.records.v1',CURRENT='vl4.antibiotics.current.v1';
const manifest=JSON.parse(await readFile(new URL('../paperwork/generated/manifest.json',import.meta.url),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function bytes(download){return readFile(await download.path());}
async function excelContent(page){const records=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),RECORDS);const workbook=await buildWorkbook(records);const zip=await JSZip.loadAsync(await workbook.xlsx.writeBuffer());return Object.fromEntries(await Promise.all(Object.keys(zip.files).filter(name=>!zip.files[name].dir).sort().map(async name=>[name,hash(await zip.file(name).async('uint8array'))])));}
async function snapshot(page){return page.evaluate(()=>({storage:Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])),answers:[...document.querySelectorAll('main input,main textarea,main select')].map(el=>[el.id,el.value,el.checked,el.disabled]),drawing:document.querySelector('#setupCanvas').toDataURL(),mainHidden:document.querySelector('#main').hidden,demoHidden:document.querySelector('#demoBanner').hidden,report:document.querySelector('#teacherReport').innerHTML,clock:document.querySelector('#activeTime').textContent}));}
async function teacher(page){await page.locator('#profileName').fill('Teacher');await page.locator('#profileClass').fill('Teacher');await page.locator('#profileEmail').fill('tzechingchan0605@gmail.com');await page.locator('#loginForm button[type=submit]').click();await expect(page.locator('#teacherDialog')).toBeVisible();}
test.beforeEach(async({context})=>context.route('https://script.google.com/**',route=>route.abort('blockedbyclient')));

test('teacher downloads all ten real PDFs and previews without altering records, drawings, events, timing or actual Excel',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const r=freshRecord({name:'Sample Student',className:'X1',email:'sample@school.edu.hk'});r.createdAt=r.savedAt='2026-10-12T01:00:00Z';r.answers.observation='Original observation';r.answers.reason='Keep original';r.timing={1:23,2:41,3:17,4:9};r.events=[{type:'original_plan_saved',phase:2,at:r.savedAt,details:{plannedReplicates:2}}];r.design={saved:true,image:PNG,description:'Original setup'};r.original={capturedAt:r.savedAt,answers:structuredClone(r.answers),design:structuredClone(r.design),plannedReplicates:2,plannedReplicateReason:'Independent repeats'};
 await page.addInitScript(({r,RECORDS,CURRENT})=>{if(location.origin!=='http://127.0.0.1:4173')return;localStorage.setItem(RECORDS,JSON.stringify([r]));localStorage.setItem(CURRENT,JSON.stringify(r));},{r,RECORDS,CURRENT});
 await page.goto('/');await teacher(page);await page.locator('[data-view]').click();await page.evaluate(()=>{const ctx=document.querySelector('#setupCanvas').getContext('2d');ctx.fillStyle='#15333b';ctx.fillRect(40,30,90,20);});
 const before=await snapshot(page);const firstExcel=await excelContent(page);await expect(page.locator('#exportLocal,#importRecords')).toHaveCount(0);await expect(page.locator('#exportExcel')).toBeVisible();
 await page.locator('#openPaperwork').click();await expect(page.locator('[data-paper-download=studentPDF]')).toBeEnabled();await expect(page.locator('#paperContentVersion')).toContainText('v12');await expect(page.locator('#paperStatus')).toContainText('15–20');
 for(const lang of ['zh','en']){
   await page.locator('#paperLanguage').selectOption(lang);
   await expect(page.locator('html')).toHaveAttribute('lang',lang==='en'?'en':'zh-Hant-HK');
   const languageBefore=await snapshot(page);
   for(const part of ['studentPDF','studentWord','answersPDF','answersWord','D']){
     const file=manifest.languages[lang].files[part];const promise=page.waitForEvent('download');await page.locator(`[data-paper-download=${part}]`).click();const dl=await promise;
     expect(dl.suggestedFilename()).toBe(file.name);const buffer=await bytes(dl);expect(buffer.subarray(0,part.endsWith('Word')?2:5).toString()).toBe(part.endsWith('Word')?'PK':'%PDF-');expect(hash(buffer)).toBe(file.sha256);
     expect(await snapshot(page)).toEqual(languageBefore);
   }
   for(const part of ['studentPDF','answersPDF','D']){await page.locator(`[data-paper-preview=${part}]`).click();await expect(page.locator('#paperPreview')).toBeVisible();expect(await page.locator('#paperPreview').getAttribute('src')).toMatch(/^blob:/);}

 }
 await page.locator('#paperLanguage').selectOption('zh');
 expect(await excelContent(page)).toEqual(firstExcel);
 expect(await snapshot(page)).toEqual(before);expect(errors).toEqual([]);
});

test('mobile material language follows the VL, and student mode has no material entrance',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');await teacher(page);await page.locator('#openPaperwork').click();await expect(page.locator('[data-paper-download=studentPDF]')).toBeEnabled();
 await page.locator('#paperLanguage').selectOption('en');await expect(page.locator('#exportLocal,#importRecords')).toHaveCount(0);await expect(page.locator('#paperNamestudentPDF')).toContainText('Complete student');await expect(page.locator('html')).toHaveAttribute('lang','en');
 expect(await page.locator('#paperPanel').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 const dl=page.waitForEvent('download');await page.locator('[data-paper-download=studentPDF]').click();expect((await dl).suggestedFilename()).toBe(manifest.languages.en.files.studentPDF.name);
 await page.locator('#closeTeacher').click();await page.locator('#profileName').fill('Student');await page.locator('#profileClass').fill('X1');await page.locator('#profileEmail').fill('student@school.edu.hk');await page.locator('#loginForm button[type=submit]').click();await expect(page.locator('#main')).toBeVisible();
 await expect(page.locator('#openPaperwork')).not.toBeVisible();await expect(page.locator('#paperPanel')).not.toBeVisible();
 const studentBefore=await snapshot(page);await page.evaluate(()=>document.querySelector('#openPaperwork').click());await expect(page.locator('#paperPanel')).not.toBeVisible();expect(await snapshot(page)).toEqual(studentBefore);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vl4.antibiotics.records.v1')).length)).toBe(1);
});

test('outdated manifest and corrupt PDFs are rejected without record changes',async({page})=>{
 await page.goto('/');await teacher(page);const before=await snapshot(page);
 await page.route('**/paperwork/generated/manifest.json',route=>route.fulfill({json:{...manifest,sourceDigest:'0'.repeat(64)}}));
 await page.locator('#openPaperwork').click();await expect(page.locator('#paperStatus')).toContainText('過期');await expect(page.locator('[data-paper-download=studentPDF]')).toBeDisabled();expect(await snapshot(page)).toEqual(before);
 await page.unroute('**/paperwork/generated/manifest.json');await page.locator('#openPaperwork').click();await expect(page.locator('[data-paper-download=studentPDF]')).toBeEnabled();
 await page.route('**/paperwork/generated/*.pdf',route=>route.fulfill({contentType:'application/pdf',body:'%PDF-corrupt'}));
 let downloaded=false;page.on('download',()=>downloaded=true);await page.locator('[data-paper-download=studentPDF]').click();await expect(page.locator('#paperStatus')).toContainText('校驗不符');expect(downloaded).toBe(false);expect(await snapshot(page)).toEqual(before);
});

test('language switches discard an in-flight old preview and missing English never falls back',async({page})=>{
 await page.goto('/');await teacher(page);await page.locator('#openPaperwork').click();await expect(page.locator('[data-paper-download=studentPDF]')).toBeEnabled();
 await page.locator('#paperLanguage').selectOption('en');let release;const held=new Promise(r=>release=r);let requested=false;
 await page.route('**/'+manifest.languages.en.files.studentPDF.path,async route=>{requested=true;await held;await route.fulfill({contentType:'application/pdf',body:await readFile(new URL('../'+manifest.languages.en.files.studentPDF.path,import.meta.url))});});
 await page.locator('[data-paper-preview=studentPDF]').click();await expect.poll(()=>requested).toBe(true);await page.locator('#paperLanguage').selectOption('zh');await expect(page.locator('#paperPreview')).not.toBeVisible();await page.locator('[data-paper-preview=D]').click();await expect(page.locator('#paperPreview')).toBeVisible();const src=await page.locator('#paperPreview').getAttribute('src');release();await page.waitForTimeout(100);expect(await page.locator('#paperPreview').getAttribute('src')).toBe(src);
 await page.unroute('**/'+manifest.languages.en.files.studentPDF.path);await page.route('**/'+manifest.languages.en.files.studentPDF.path,route=>route.fulfill({status:404,body:'missing'}));await page.locator('#paperLanguage').selectOption('en');let downloaded=false;page.on('download',()=>downloaded=true);await page.locator('[data-paper-download=studentPDF]').click();await expect(page.locator('#paperStatus')).toContainText('failed');expect(downloaded).toBe(false);
});

test('teacher demonstration keeps materials closed and creates no student records',async({page})=>{
 await page.goto('/');await teacher(page);const before=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));await page.locator('#teacherDemo').click();await expect(page.locator('#main')).toBeVisible();await expect(page.locator('#paperPanel')).not.toBeVisible();await page.evaluate(()=>document.querySelector('#openPaperwork').click());await expect(page.locator('#paperPanel')).not.toBeVisible();expect(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))).toEqual(before);
});
