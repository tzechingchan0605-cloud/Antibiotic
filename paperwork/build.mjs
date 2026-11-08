import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PAPER_FINGERPRINT} from './fingerprint.js';
import {paperSources,PAPER_VERSION,PAPER_TASK_VERSION} from './source.js';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'paperwork/generated');
const sha=b=>createHash('sha256').update(b).digest('hex');
const names=['package.json','package-lock.json','index.html','app.js','i18n.js','analysis.js','model.js','rubric.js','reports.js','inquiry-content.js','english-glossary.js','paperwork/source.js','paperwork/client.js','paperwork/build.mjs','paperwork/worksheet.py','paperwork/requirements.txt','scripts/serve.mjs','scripts/build.mjs','paperwork/fingerprint.js'];
const inputs=Object.fromEntries(await Promise.all(names.map(async n=>[n,sha(await readFile(resolve(root,n)))])));
const sources=paperSources(),sourceDigest=sha(JSON.stringify(sources)),contentVersion=sha(JSON.stringify({inputs,sourceDigest})).slice(0,12);
async function check(){const m=JSON.parse(await readFile(resolve(out,'manifest.json')));if(m.fingerprint!==PAPER_FINGERPRINT||m.taskVersion!==PAPER_TASK_VERSION||m.sourceDigest!==sourceDigest||JSON.stringify(m.inputs)!==JSON.stringify(inputs))throw Error('Stale materials');for(const l of ['zh','en']){if(Object.keys(m.languages[l].files).length!==5)throw Error('Expected five files');for(const f of Object.values(m.languages[l].files)){const b=await readFile(resolve(root,f.path));if(b.length!==f.bytes||sha(b)!==f.sha256)throw Error('Invalid '+f.path);}}console.log('PASS: current sources and ten material checksums '+contentVersion);}
if(process.argv.includes('--check')){await check();process.exit(0);}
if(process.argv.includes('--if-needed')){try{await check();process.exit(0);}catch{}}
await mkdir(out,{recursive:true});await writeFile(resolve(out,'source.json'),JSON.stringify(sources,null,2)+'\n');
execFileSync(process.env.PAPER_PYTHON||'python',['paperwork/worksheet.py'],{cwd:root,stdio:'inherit'});
const work=resolve(root,'artifacts/ws4-build'),m={fingerprint:PAPER_FINGERPRINT,module:'VL4',materialVersion:PAPER_VERSION,taskVersion:PAPER_TASK_VERSION,contentVersion,sourceDigest,inputs,languages:{}};
const kinds=[['studentPDF','student','pdf'],['studentWord','student','docx'],['answersPDF','answers','pdf'],['answersWord','answers','docx'],['D','D','pdf']];
for(const lang of ['zh','en']){m.languages[lang]={files:{}};for(const [key,type,ext] of kinds){const bytes=await readFile(resolve(work,`WS4_${type}_${lang}.${ext}`));const filename=`VL4_${key}_${lang}_v3_${contentVersion}.${ext}`,path='paperwork/generated/'+filename;await writeFile(resolve(root,path),bytes);const pages=ext==='pdf'?Number(execFileSync('pdfinfo',[resolve(root,path)],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)[1]):4;if(type!=='D'&&pages!==4)throw Error('Expected four pages '+filename+': '+pages);m.languages[lang].files[key]={path,name:filename,pages,bytes:bytes.length,sha256:sha(bytes),mime:ext==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};}}
await writeFile(resolve(out,'manifest.json'),JSON.stringify(m,null,2)+'\n');
const keep=new Set(['manifest.json','source.json',...Object.values(m.languages).flatMap(l=>Object.values(l.files).map(f=>f.path.split('/').pop()))]);
for(const n of await readdir(out))if(!keep.has(n))await unlink(resolve(out,n));
const titles={studentPDF:'完整學生 PDF',studentWord:'完整學生 Word',answersPDF:'完整連答案 PDF',answersWord:'完整連答案 Word',D:'D 教師指引、配對及評分'};
const table=['| 教材 | 頁數 | 繁中 | English |','| --- | ---: | --- | --- |',...kinds.map(([key])=>`| ${titles[key]} | ${m.languages.zh.files[key].pages} | [下載](${m.languages.zh.files[key].path}) | [Download](${m.languages.en.files[key].path}) |`)].join('\n');
for(const name of ['README.md','paperwork/README.md']){const p=resolve(root,name);let text=await readFile(p,'utf8');const t=name.startsWith('paperwork/')?table.replaceAll('(paperwork/generated/','(generated/'):table;text=text.replace(/<!-- paper-summary:start -->[\s\S]*?<!-- paper-summary:end -->/,`<!-- paper-summary:start -->\nWS4 v3 · ${contentVersion}\n\n${t}\n<!-- paper-summary:end -->`);await writeFile(p,text);}
console.log('Generated ten WS4 v3 files: four-page editable Word and PDF, plus D.');
