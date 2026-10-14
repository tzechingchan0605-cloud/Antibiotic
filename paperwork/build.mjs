import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,extname} from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {paperSources,PAPER_VERSION,PAPER_TASK_VERSION} from './source.js';
import {documentHTML,renderParts} from './render.js';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'paperwork/generated');
const sha=data=>createHash('sha256').update(data).digest('hex');
const inputNames=['package.json','package-lock.json','index.html','app.js','i18n.js','inquiry-content.js','analysis.js','model.js','experiment-model.js','experiment-bench.js','rubric.js','reports.js','english-glossary.js','history-figure.js','styles.css','paperwork/source.js','paperwork/alignment.js','paperwork/render.js','paperwork/texts.js','paperwork/print.css','paperwork/build.mjs','paperwork/client.js','paperwork/fonts/LICENSE.txt',...(await readdir(resolve(root,'assets'))).filter(name=>/\.(png|jpg|svg)$/.test(name)).map(name=>'assets/'+name)].sort();
const inputs=Object.fromEntries(await Promise.all(inputNames.map(async name=>[name,sha(await readFile(resolve(root,name)))])));
const sources=paperSources(),sourceDigest=sha(JSON.stringify(sources)),contentVersion=sha(JSON.stringify({sourceDigest,inputs})).slice(0,12);
async function check(){
 const manifest=JSON.parse(await readFile(resolve(out,'manifest.json'),'utf8'));
 if(manifest.module!=='VL4'||manifest.materialVersion!==PAPER_VERSION||manifest.taskVersion!==PAPER_TASK_VERSION||manifest.sourceDigest!==sourceDigest||JSON.stringify(manifest.inputs)!==JSON.stringify(inputs))throw Error('Paper materials are stale. Run npm run paper:build and commit regenerated PDFs.');
 for(const lang of ['zh','en'])for(const file of Object.values(manifest.languages[lang].files)){
   const bytes=await readFile(resolve(root,file.path));
   if(bytes.length!==file.bytes||sha(bytes)!==file.sha256||bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Changed PDF: '+file.path);
 }
 if(sha(await readFile(resolve(root,manifest.font.path)))!==manifest.font.sha256)throw Error('Changed embedded font source');
 console.log(`PASS: current paper sources and all ten PDF checksums (${contentVersion}).`);
}
if(process.argv.includes('--check')){await check();process.exit(0);}
if(process.argv.includes('--if-needed')){try{await check();process.exit(0);}catch{console.log('Rebuilding paper materials from current VL4 sources.');}}
await mkdir(out,{recursive:true});
const css=await readFile(resolve(root,'paperwork/print.css'));
// Only serve authored static sources. No app boot, accounts, record API or cloud bridge.
const server=http.createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+'/')||/\/(\.git|node_modules)\//.test(path))throw Error();
 const bytes=await readFile(path);res.setHeader('Content-Type',({'.css':'text/css','.js':'text/javascript','.otf':'font/otf','.png':'image/png','.jpg':'image/jpeg'})[extname(path)]||'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,fontPath='paperwork/fonts/NotoSansHK-paper.otf';
const fontText=Object.values(sources).map(source=>documentHTML(source,['A','B','C','D'],base,contentVersion)).join('\n');
await writeFile('/tmp/vl4-paper-font-text.txt',fontText);
const systemFont=process.env.PAPER_CJK_FONT||'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc';
try{execFileSync('pyftsubset',[systemFont,'--font-number=4','--text-file=/tmp/vl4-paper-font-text.txt',`--output-file=${resolve(root,fontPath)}`,'--layout-features=*','--name-IDs=*','--name-languages=*'],{stdio:'pipe'});}catch(error){server.close();throw Error('Install Noto CJK and fonttools, or set PAPER_CJK_FONT. '+error.message);}
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
const manifest={module:'VL4',materialVersion:PAPER_VERSION,taskVersion:PAPER_TASK_VERSION,contentVersion,sourceDigest,inputs,font:{path:fontPath,sha256:sha(await readFile(resolve(root,fontPath)))},sourcePath:'paperwork/generated/source.json',languages:{}};
try{
 const context=await browser.newContext();
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage();await page.goto(base+'/paperwork/print.css');
 for(const lang of ['zh','en']){
   const source=sources[lang],parts=renderParts(source),counts=Object.fromEntries(Object.entries(parts).map(([p,rows])=>[p,rows.length]));
   let start=1;const ranges=Object.fromEntries(Object.entries(counts).map(([p,n])=>{const r=[start,start+n-1];start+=n;return[p,r];}));
   manifest.languages[lang]={files:{},ranges};
   for(const part of ['A','B','C','D','all']){
     const selected=part==='all'?['A','B','C','D']:[part];
     const html=documentHTML(source,selected,base,contentVersion);
     await page.setContent(html,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
     await page.evaluate(async base=>{const {layoutHistoryLabels}=await import(base+'/history-figure.js');layoutHistoryLabels();},base);
     const layout=await page.locator('.sheet').evaluateAll(sheets=>sheets.map(sheet=>{
       const area=sheet.querySelector('.sheet-body'),box=area.getBoundingClientRect();
       const bad=[...area.querySelectorAll('*')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.bottom>box.bottom+1||r.left<box.left-1||r.right>box.right+1);}).map(el=>({tag:el.tagName,text:el.textContent.slice(0,70)}));
       return {part:sheet.dataset.part,page:Number(sheet.dataset.page),identity:sheet.querySelectorAll('.identity').length,writingLines:[...sheet.querySelectorAll('.ruled')].map(el=>el.querySelectorAll('.writing-line').length),fields:[...sheet.querySelectorAll('[data-field]')].map(el=>el.dataset.field),rulers:[...sheet.querySelectorAll('[data-static-ruler]')].map(svg=>({id:svg.dataset.staticRuler,sample:svg.dataset.sample,ticks:svg.querySelectorAll('[data-ruler-tick]').length,scale:Number(svg.dataset.mmScale),zoneDiameter:Number(svg.querySelector('[data-zone-boundary]')?.getAttribute('r')||0)*2/Number(svg.dataset.mmScale),discDiameter:Number(svg.querySelector('[data-disc-boundary]').getAttribute('r'))*2/Number(svg.dataset.mmScale),textClipped:[...svg.querySelectorAll('text')].some(el=>{const r=el.getBoundingClientRect(),b=svg.getBoundingClientRect();return r.left<b.left-1||r.right>b.right+1||r.top<b.top-1||r.bottom>b.bottom+1;})})),overflow:bad};
     }));
     const overflow=layout.filter(row=>row.overflow.length);if(overflow.length)throw Error(`${lang}/${part} print overflow: ${JSON.stringify(overflow)}`);
     for(const row of layout){if(row.writingLines.some(n=>n!==2))throw Error('Writing areas must have two lines');for(const ruler of row.rulers)if(ruler.ticks!==41||ruler.discDiameter!==6||ruler.textClipped)throw Error('Invalid or clipped static ruler '+ruler.id);}
     const filename=`VL4_${part}_${lang}_v${PAPER_VERSION}_${contentVersion}.pdf`,path=`paperwork/generated/${filename}`;
     await page.pdf({path:resolve(root,path),format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
     const bytes=await readFile(resolve(root,path));const actualPages=Number(execFileSync('pdfinfo',[resolve(root,path)],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)?.[1]);
     const expectedPages=layout.length;if(actualPages!==expectedPages)throw Error(`${lang}/${part} unexpected PDF pagination: ${actualPages} vs ${expectedPages}`);
     manifest.languages[lang].files[part]={path,name:`VL4_SelfStudy_${part==='all'?'CompleteTeacherPack':part}_${lang.toUpperCase()}_v${PAPER_VERSION}_${contentVersion}.pdf`,pages:actualPages,bytes:bytes.length,sha256:sha(bytes),layout};
     console.log(`${lang}/${part}: ${actualPages} pages, ${bytes.length} bytes`);
   }
 }
 await writeFile(resolve(out,'source.json'),JSON.stringify(sources,null,2)+'\n');
 await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const currentPaths=new Set(Object.values(manifest.languages).flatMap(language=>Object.values(language.files).map(file=>file.path.split('/').pop())));
 for(const name of await readdir(out))if(/^VL4_(A|B|C|D|all)_(zh|en)_v\d+_[a-f0-9]{12}\.pdf$/.test(name)&&!currentPaths.has(name))await unlink(resolve(out,name));
 const summary=['| 分冊 | 頁數 | 完整套裝頁碼 | 繁中 PDF | 英文 PDF |','| --- | ---: | --- | --- | --- |'];
 for(const part of ['A','B','C','D','all']){
   const file=manifest.languages.zh.files[part],range=manifest.languages.zh.ranges[part];
   summary.push(`| ${part==='all'?'完整教師套裝':part} | ${file.pages} | ${range?range.join('–'):'1–'+file.pages} | [下載](${file.path}) | [Download](${manifest.languages.en.files[part].path}) |`);
 }
 const table=`紙本自學 v${PAPER_VERSION} · ${PAPER_TASK_VERSION} · 內容版本 ${contentVersion}\n\n${summary.join('\n')}`;
 await writeFile(resolve(out,'files.md'),`# VL4 current paper PDFs\n\n${table.replaceAll('(paperwork/generated/','(')}\n`);
 for(const path of ['README.md','paperwork/README.md']){
   const full=resolve(root,path);if(!existsSync(full))continue;
   const text=await readFile(full,'utf8');
   const relativeTable=path.startsWith('paperwork/')?table.replaceAll('(paperwork/generated/','(generated/'):table;
   await writeFile(full,text.replace(/<!-- paper-summary:start -->[\s\S]*?<!-- paper-summary:end -->/,`<!-- paper-summary:start -->\n${relativeTable}\n<!-- paper-summary:end -->`));
 }

 console.log('Generated ten versioned VL4 PDFs.');
}finally{await browser.close();server.close();}
