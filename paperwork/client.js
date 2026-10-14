import {paperSources} from './source.js';
import {label} from './texts.js';
import {glossEnglish} from '../english-glossary.js';
const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
const words={open:['下載紙本自學工作紙 PDF','Download paper self-study worksheets PDF'],close:['關閉材料面板','Close materials panel'],language:['材料語言','Material language'],preview:['預覽','Preview'],download:['下載 PDF','Download PDF'],loading:['正在核對紙本版本……','Checking paper material version…'],ready:['A 從開始閱讀；完成 B 後才派 C 核對修正。兩組均 15–20 分鐘；D 只供教師。','Read A from the start. Give C only after B for checking/correction. Both groups use 15–20 minutes; D is teacher-only.'],failed:['材料未能載入或已過期，請重新載入網站；若仍失敗，請重新產生紙本材料。','Materials could not be loaded or are outdated. Reload the site; if this persists, rebuild the paper materials.'],downloaded:['PDF 已下載。','PDF downloaded.'],previewed:['預覽已開啟；手機未能顯示時可直接下載 PDF。','Preview is open. If it is not displayed on mobile, download the PDF directly.'],error:['PDF 下載失敗或校驗不符，請重試；學生紀錄不受影響。','PDF download failed or its checksum does not match. Retry; student records are unaffected.']};
export function createPaperworkPanel({host,isAuthorised,getLanguage}){
 let manifest=null,request=0,previewURL=null,statusKey='ready';
 const text=key=>{const pair=words[key];return getLanguage()==='en'?glossEnglish(pair[1]):pair[0];};
 const button=document.createElement('button');button.id='openPaperwork';button.type='button';button.className='secondary';button.textContent=text('open');host.querySelector('.record-actions').append(button);
 const panel=document.createElement('section');panel.id='paperPanel';panel.className='paper-panel';panel.hidden=true;
 panel.innerHTML=`<div class="paper-heading"><h3 id="paperTitle"></h3><button type="button" id="closePaperwork" class="secondary"></button></div><label class="field"><span id="paperLanguageLabel"></span><select id="paperLanguage"><option value="zh">繁體中文</option><option value="en">English</option></select></label><p id="paperContentVersion" class="caption"></p><div class="paper-files">${['A','B','C','D','all'].map(part=>`<article class="paper-file"><h4 id="paperName${part}"></h4><p id="paperPages${part}" class="caption"></p><div class="record-actions"><button type="button" class="secondary" data-paper-preview="${part}"></button><button type="button" class="primary" data-paper-download="${part}"></button></div></article>`).join('')}</div><p id="paperStatus" class="caption" role="status"></p><iframe id="paperPreview" title="PDF preview" hidden></iframe>`;
 host.querySelector('.record-actions').after(panel);const $=id=>panel.querySelector('#'+id);
 const setStatus=key=>{statusKey=key;$('paperStatus').textContent=text(key);};
 const clearPreview=()=>{if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;$('paperPreview').removeAttribute('src');$('paperPreview').hidden=true;};
 function refresh(){
   button.textContent=text('open');$('paperTitle').textContent=text('open');$('closePaperwork').textContent=text('close');$('paperLanguageLabel').textContent=text('language');
   const lang=$('paperLanguage').value;
   panel.querySelectorAll('[data-paper-preview]').forEach(el=>el.textContent=text('preview'));
   panel.querySelectorAll('[data-paper-download]').forEach(el=>el.textContent=text('download'));
   for(const part of ['A','B','C','D','all']){
     $('paperName'+part).textContent=`${part==='all'?'':part+'：'}${label(part,lang)}`;
     const file=manifest?.languages[lang].files[part],range=manifest?.languages[lang].ranges[part];
     $('paperPages'+part).textContent=file?`${file.pages} ${getLanguage()==='en'?'pages':'頁'}${range?` · ${getLanguage()==='en'?'pack pages':'套裝第'} ${range[0]}–${range[1]}`:''}`:'';
   }
   $('paperContentVersion').textContent=manifest?`VL4 · v${manifest.materialVersion} · ${manifest.contentVersion}`:'';
   panel.querySelectorAll('[data-paper-download],[data-paper-preview]').forEach(el=>el.disabled=!manifest);
   setStatus(statusKey);
 }
 function close(){request++;manifest=null;panel.hidden=true;clearPreview();}
 async function open(){
   if(!isAuthorised())return false;const token=++request;manifest=null;clearPreview();panel.hidden=false;$('paperLanguage').value=getLanguage();setStatus('loading');refresh();
   try{
     const response=await fetch('paperwork/generated/manifest.json',{cache:'no-store'});if(!response.ok)throw Error('manifest');const data=await response.json();
     const sources=paperSources();if(!/^[a-f0-9]{12}$/.test(data.contentVersion)||data.module!=='VL4'||data.materialVersion!==sources.zh.version||data.taskVersion!==sources.zh.taskVersion||data.sourceDigest!==await sha(new TextEncoder().encode(JSON.stringify(sources))))throw Error('stale');
     for(const lang of ['zh','en'])for(const part of ['A','B','C','D','all']){
       const file=data.languages?.[lang]?.files?.[part];
       if(!file||!new RegExp(`^paperwork/generated/VL4_${part}_${lang}_v${data.materialVersion}_${data.contentVersion}\\.pdf$`).test(file.path)||!Number.isInteger(file.pages)||file.pages<1||!Number.isInteger(file.bytes)||!/^[a-f0-9]{64}$/.test(file.sha256)||!/^[\w.-]+\.pdf$/.test(file.name))throw Error('invalid');
     }
     if(token!==request||!isAuthorised())return false;manifest=data;setStatus('ready');refresh();return true;
   }catch{if(token===request&&isAuthorised()){setStatus('failed');refresh();}return false;}
 }
 async function fileBlob(part){
   if(!isAuthorised()||!manifest||!['A','B','C','D','all'].includes(part))return null;
   const token=request,file=manifest.languages[$('paperLanguage').value].files[part];
   const response=await fetch(file.path,{cache:'no-cache'});if(!response.ok)throw Error('file');const bytes=await response.arrayBuffer();
   if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'||bytes.byteLength!==file.bytes||await sha(bytes)!==file.sha256)throw Error('checksum');
   if(token!==request||!isAuthorised())return null;return {blob:new Blob([bytes],{type:'application/pdf'}),name:file.name};
 }
 async function download(part){try{const file=await fileBlob(part);if(!file)return false;const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setStatus('downloaded');return true;}catch{if(isAuthorised())setStatus('error');return false;}}
 async function preview(part){try{const file=await fileBlob(part);if(!file)return false;clearPreview();previewURL=URL.createObjectURL(file.blob);$('paperPreview').src=previewURL;$('paperPreview').hidden=false;setStatus('previewed');return true;}catch{if(isAuthorised())setStatus('error');return false;}}
 button.addEventListener('click',open);$('closePaperwork').onclick=close;
 $('paperLanguage').onchange=()=>{if(!isAuthorised())return;request++;clearPreview();setStatus('ready');refresh();};
 panel.querySelectorAll('[data-paper-download]').forEach(el=>el.onclick=()=>download(el.dataset.paperDownload));
 panel.querySelectorAll('[data-paper-preview]').forEach(el=>el.onclick=()=>preview(el.dataset.paperPreview));
 refresh();return {close,refresh};
}
