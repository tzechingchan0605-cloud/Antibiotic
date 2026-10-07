import {language,t,setLanguage,translate} from './i18n.js';
import {createExperimentBench} from './experiment-bench.js';
import {historyFigureMarkup,historyCaptionKey} from './history-figure.js';
import {MODULE_ID,KEYS,SAMPLES,GRID,DEFAULT_POSITIONS,freshRecord,isTeacher,nowISO,clone,toPlatePoint,addCoverage,coverageFraction,placementIssue,generateResult,independentRepeat,validDecimal,validReplicates,confirmMeasurement,allMeasurements,captureOriginal,canonicalRecord} from './model.js';
import {CLOUD_ENDPOINT} from './cloud-config.js';
import {createCloudSync} from './cloud-sync.js';
import {renderReport,openPrintReport,downloadWorkbook,learningPointsHTML,answerDisplay} from './reports.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const span=key=>`<span data-i18n="${key}">${esc(t(key))}</span>`;
const option=(value,key)=>`<option value="${value}" data-i18n="${key}">${esc(t(key))}</option>`;
function field(id,key,{options,type='textarea',optional=false,min,max,placeholder='genericPH',scope='answer'}={}){
  const attrs=`id="${id}" data-field="${id}" data-scope="${scope}" ${optional?'':'required'} ${placeholder===null?'':`data-i18n-placeholder="${placeholder}"`}`;
  const input=options?`<select ${attrs}>${option('','choose')}${options.map(([v,k])=>option(v,k)).join('')}</select>`:type==='textarea'?`<textarea ${attrs} rows="3" maxlength="2000"></textarea>`:`<input ${attrs} type="${type}" ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} ${type==='number'?'step="1"':''}>`;
  return `<label class="field">${span(key)}${input}</label>`;
}
const variables=[['disc','vDisc'],['sample','vSample'],['medium','vMedium'],['zone','vZone'],['strain','vStrain'],['distribution','vDistribution'],['preparation','vPreparation']];
const multi=(name,options)=>`<div class="chip-grid">${options.map(([v,k])=>`<label class="choice"><input type="checkbox" data-multi="${name}" value="${v}">${span(k)}</label>`).join('')}</div>`;
$('#orientationFields').innerHTML=field('observation','observation',{placeholder:'observationPH'});
$('#hypothesisFields').innerHTML=`<label class="hypothesis-sentence">${span('predictionPrefix')} <select id="prediction" data-field="prediction" data-scope="answer" required data-i18n-aria="prediction">${option('','choose')}${[['X','predictionX'],['Y','predictionY'],['Z','predictionZ'],['X_Y','predictionXY'],['X_Z','predictionXZ'],['Y_Z','predictionYZ'],['all','predictionAll'],['none','predictionNone']].map(([v,k])=>option(v,k)).join('')}</select> ${span('predictionSuffix')}</label><label class="hypothesis-sentence">${span('largestPrefix')} <select id="largestPrediction" data-field="largestPrediction" data-scope="answer" required data-i18n-aria="largestPrediction">${option('','choose')}${['X','Y','Z'].map(v=>`<option value="${v}">${v}</option>`).join('')}${option('na','notApplicable')}</select> <span id="largestSuffix">${span('largestSuffix')}</span><span id="largestNASuffix" hidden>${span('largestNASuffix')}</span></label>`+field('reason','hypothesisReason',{placeholder:'reasonPH'});
function refreshLargestPrediction(){const na=$('#largestPrediction').value==='na';$('#largestSuffix').hidden=na;$('#largestNASuffix').hidden=!na;}
$('#largestPrediction').addEventListener('change',refreshLargestPrediction);
$('#reason').rows=2;$('#reason').maxLength=600;
$('#variableFields').innerHTML=[['iv','iv','ivHint'],['dv','dv','dvHint'],['cv','cv','cvHint']].map(([group,title,hint])=>`<section id="${group}" class="variable-group"><h4>${span(title)} <span>（${span(hint)}）</span></h4><div class="variable-options">${variables.map(([value,key])=>`<button type="button" data-group="${group}" data-variable="${value}" aria-pressed="false">${span(key)}</button>`).join('')}</div></section>`).join('');
$('#assumptionFields').innerHTML=multi('assumptions',[['distribution','assumptionDistribution'],['sterile','assumptionSterile'],['sameConditions','assumptionSame'],['death','assumptionDeath']]).replace('class="chip-grid"','class="choice-stack"').replaceAll('class="choice"','class="check-option"');
$('#controlFields').innerHTML=field('controlPlan','controlPlan').replace('<textarea',`<span class="question-hint" data-i18n="controlHint"></span><textarea`);
$('#controlPlan').maxLength=1000;
$('#designFields').innerHTML=field('designDescription','designDescription',{optional:true,placeholder:'designDescriptionPH'});
$('#designDescription').rows=2;$('#designDescription').maxLength=1000;
$('#replicateFields').innerHTML=field('plannedReplicates','plannedReplicates',{options:Array.from({length:20},(_,i)=>[String(i+1),String(i+1)]),placeholder:null})+field('plannedReplicateReason','plannedReplicateReason',{placeholder:null});
$('#analysisFields').innerHTML=['analysisControl','analysisConsistent','analysisVariation','analysisMethod','analysisHypothesis','analysisRepeatPlan','analysisRepeatValue'].map(k=>field(k,k)).join('')+['analysisDeath','analysisClinical'].map(k=>field(k,k,{options:[['cannot','cannot'],['can','can']]})).join('')+field('conclusion','conclusion',{placeholder:'conclusionPH'})+field('knowledgeBacteria','bacteriaQuestion',{options:[['bacteria','bacteria'],['viruses','viruses']]})+field('knowledgeResistance','resistanceQuestion',{options:[['bacteria','resistanceBacteria'],['body','resistanceBody']]})+field('knowledgeLimits','limitsQuestion',{options:[['limited','limited'],['best','bestDrug']]});
$('#reflectionFields').innerHTML=field('reflection','reflectionQuestion');
$('#meanInputs').innerHTML=SAMPLES.map(s=>`<label class="field">${s==='C'?span('blank'):s}<input id="mean-${s}" data-mean="${s}" type="number" min="0" max="40" step="0.1" required placeholder="mm" aria-label="${s} mm"></label>`).join('');
$('#graphInputs').innerHTML=SAMPLES.map(s=>`<label class="field">${s==='C'?span('blank'):s}<input id="bar-${s}" data-bar="${s}" type="number" min="0" max="40" step="0.1" required placeholder="mm" aria-label="${s} mm"></label>`).join('');
$('#extensionFields').innerHTML=field('ext-prediction','extensionPrediction',{scope:'extension'})+field('ext-reason','reason',{scope:'extension'})+field('ext-fairComparison','fairComparison',{scope:'extension'})+`<button id="viewExtension" class="secondary" data-i18n="viewExtension"></button><div id="extensionResults"></div>`+field('ext-analysis','extensionAnalysis',{scope:'extension'});
const equipmentArt=[
 ['equipmentPlate',3,'<path d="M14 40v20c0 11 16 20 36 20s36-9 36-20V40" fill="#e4eee5" stroke="#7faaa0" stroke-width="3"/><path d="M20 44v12c0 8 14 15 30 15s30-7 30-15V44" fill="#ddd0a6"/><ellipse cx="50" cy="40" rx="36" ry="20" fill="#f5f9f3" stroke="#7faaa0" stroke-width="3"/><ellipse cx="50" cy="42" rx="30" ry="15" fill="#eadfbc" stroke="#c0ceb7" stroke-width="1.5"/><path d="M17 56c0 10 15 18 33 18s33-8 33-18M23 43c0 7 12 12 27 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>','equipmentPlateNote'],
 ['equipmentMarker',1,'<g transform="rotate(28 50 50)"><rect x="42" y="13" width="16" height="69" rx="5" fill="#24594e"/><path d="M42 82h16l-8 12z" fill="#15333b"/><rect x="42" y="10" width="16" height="15" rx="3" fill="#a5c4bc"/></g>'],
 ['equipmentDropper',1,'<path d="M40 16q10-12 20 0v19H40z" fill="#27796e"/><path d="M44 35h12v38l-6 15-6-15z" fill="#e0efef" stroke="#7faaa0" stroke-width="2"/><path d="M50 91q-7 8 0 8q7 0 0-8" fill="#6ea89d"/>'],
 ['equipmentBacteria',1,'<path d="M35 22h30v12l8 50H27l8-50z" fill="#e4eee5" stroke="#7faaa0" stroke-width="3"/><path d="M31 59h38l4 25H27z" fill="#adc7ad"/><path d="M32 19h36" stroke="#087b78" stroke-width="7"/>'],
 ['equipmentSpreader',1,'<g transform="rotate(30 50 50)"><image href="assets/lab-spreader-cartoon.png" x="30" y="2" width="40" height="96"/></g>'],
 ['equipmentTweezers',4,'<g transform="rotate(212 50 50)"><image href="assets/lab-forceps-cartoon.png" x="30" y="2" width="40" height="96"/></g>'],
 ['equipmentAlcohol',1,'<path d="M24 16h53l-5 7v60H28V16" fill="#f4f8f3" stroke="#7faaa0" stroke-width="3"/><path d="M30 53h40v28H30Z" fill="#adc7ad"/><path d="M35 24v47M63 32h7M63 45h7M63 65h7" fill="none" stroke="#7faaa0" stroke-width="2"/>'],
 ['equipmentLamp',1,'<path d="M49 8c-13 17-13 25 1 29 12-5 13-15-1-29Z" fill="#e7b36b"/><path d="M46 35h8v14h-8Z" fill="#24594e"/><path d="M33 48h34l12 31c3 9-11 14-29 14S17 88 21 79Z" fill="#e4eee5" stroke="#7faaa0" stroke-width="3"/><path d="M27 72h46l4 12H23Z" fill="#adc7ad"/>'],
 ['equipmentDiscs',3,'<g fill="#fff" stroke="#7faaa0">'+[[28,30,'X'],[70,30,'Y'],[28,72,'Z'],[70,72,'C']].map(([x,y,label])=>`<circle cx="${x}" cy="${y}" r="17"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#15333b" stroke="none" font-size="14">${label}</text>`).join('')+'</g>','equipmentDiscsNote'],
 ['equipmentIncubator',1,'<rect x="16" y="14" width="68" height="74" rx="5" fill="#e5ede8" stroke="#7faaa0" stroke-width="3"/><rect x="24" y="24" width="46" height="52" rx="2" fill="#c9dcd4"/><path d="M29 43h35M29 62h35" stroke="#7faaa0"/><path d="M77 43v19" stroke="#087b78" stroke-width="4"/>'],
 ['equipmentRuler',1,'<rect x="9" y="35" width="82" height="29" rx="3" fill="#f6e8ba" stroke="#c8b582"/>'+Array.from({length:16},(_,i)=>`<path d="M${12+i*5} 35v${i%5===0?14:7}" stroke="#927d4a"/>`).join('')]
];
if($('#equipmentBank'))$('#equipmentBank').innerHTML=equipmentArt.map(([key,count,art,note])=>`<figure class="equipment"><svg viewBox="0 0 100 100" role="img" data-i18n-aria="${key}">${art}</svg><figcaption>${span(key)} ×${count}${note?`<small>${span(note)}</small>`:''}</figcaption></figure>`).join('');
$('#historyFigure').innerHTML=historyFigureMarkup();
// Older cached HTML has these paragraphs without their newer IDs.
const historyCaption=$('#historyCaption')||$('[data-i18n="historyCaption"]')||$('#historyFigure + .caption');
if(historyCaption)historyCaption.dataset.i18n=historyCaptionKey;
const colonyMeaning=$('#colonyMeaning')||$('[data-i18n="colonyRemark"]');
if(colonyMeaning)colonyMeaning.hidden=historyCaptionKey==='historyCaption';
$('#neutralRuler').innerHTML=`<svg viewBox="0 0 300 100" role="img" data-i18n-aria="neutralExample"><circle cx="150" cy="45" r="28" fill="#fffaf0" stroke="#64867a"/><circle cx="150" cy="45" r="12" fill="white" stroke="#aaa"/><text x="150" y="49" text-anchor="middle" font-size="10">Q</text><path d="M122 80h56m-56-6v12m56-12v12" stroke="#087b78"/><text x="150" y="97" text-anchor="middle" font-size="12">14 mm</text></svg>`;
translate();
let state=null,plateIndex=0,tool=null,drawTool='pencil',gesture=null,drawing=false,drawn=false,animation=null,saveTimer=null,generation=0;
let teacherProfile=null,teacherPassword='',cloudRecords=null,selectedRecord=null,graphDraft={},showCoverage=true,zoom=false,ruler={x:60,y:350},lastTime=performance.now(),cloudState={key:'unconfigured'};
const damaged=new Set();
function readRecords(){try{const rows=JSON.parse(localStorage.getItem(KEYS.records)||'[]');if(!Array.isArray(rows))throw Error();return rows;}catch{damaged.add(KEYS.records);$('#localStatus').textContent=t('storageError');return [];}}
function studentRecords(){return readRecords().map(canonicalRecord).filter(Boolean);}
function cloudStatus(status){cloudState=status;const key={unconfigured:'cloudUnconfigured',pending:'cloudPending',syncing:'cloudSyncing',synced:'cloudSynced',error:'cloudError'}[status.key]||'cloudError';for(const id of ['cloudStatus','loginCloudStatus']){$('#'+id).textContent=t(key);$('#'+id).dataset.state=status.key;}$('#retryCloud').hidden=!CLOUD_ENDPOINT;}
const cloud=createCloudSync({endpoint:CLOUD_ENDPOINT,status:cloudStatus});
function toast(key){$('#toast').textContent=t(key);$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500);}
function settleTime(){const n=performance.now();if(state&&!state.demo&&!document.hidden)state.timing[state.phase]+=Math.max(0,n-lastTime)/1000;lastTime=n;}
function save(){clearTimeout(saveTimer);if(!state||state.demo)return;settleTime();try{if(damaged.has(KEYS.records))throw Error();const rows=readRecords();if(damaged.has(KEYS.records))throw Error();state.version++;state.savedAt=nowISO();const copy=clone(state);const i=rows.findIndex(r=>r.id===state.id);if(i<0)rows.push(copy);else rows[i]=copy;localStorage.setItem(KEYS.records,JSON.stringify(rows));localStorage.setItem(KEYS.current,JSON.stringify(copy));$('#localStatus').textContent=t('localSaved');cloud.enqueue(copy).catch(()=>cloudStatus({key:'error'}));}catch{$('#localStatus').textContent=t('storageError');toast('storageError');}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,350);}
function log(type,details={}){if(!state||state.demo)return;state.events.push({type,details:clone(details),phase:state.phase,at:nowISO()});}
function recordAnswer(id,value){if(!state||(state.submittedAt&&id!=='reflection')||(id==='reflection'&&state.reflectionSubmittedAt))return;const old=state.answers[id];state.answers[id]=value;if(state.original&&JSON.stringify(old)!==JSON.stringify(value))log('answer_revision',{field:id,previous:old??'',next:value});if(id==='designDescription'){state.design.saved=false;$('#designStatus').textContent='';}scheduleSave();}
$$('[data-field][data-scope="answer"]').forEach(el=>{el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>recordAnswer(el.dataset.field,el.value));});
$$('[data-field][data-scope="extension"]').forEach(el=>el.addEventListener('input',()=>{if(!state||state.submittedAt)return;state.extension[el.id.slice(4)]=el.value;scheduleSave();}));
$$('[data-multi]').forEach(el=>el.addEventListener('change',()=>recordAnswer(el.dataset.multi,$$(`[data-multi="${el.dataset.multi}"]:checked`).map(c=>c.value))));
$$('[data-variable]').forEach(button=>button.onclick=()=>{
 if(!state||state.submittedAt)return;
 const group=button.dataset.group,value=button.dataset.variable,current=state.answers[group];
 const selected=Array.isArray(current)?current:current?[current]:[];
 const choices=selected.includes(value)?selected.filter(v=>v!==value):[...selected,value];
 recordAnswer(group,choices);button.classList.toggle('selected',choices.includes(value));button.setAttribute('aria-pressed',String(choices.includes(value)));
 log('variable_choice',{group,choices:clone(choices)});
});
function stopActivity(){bench.cancel();bench.reset();generation++;if(animation)cancelAnimationFrame(animation);animation=null;clearTimeout(saveTimer);gesture=null;drawing=false;tool=null;plateIndex=0;ruler={x:60,y:350};graphDraft={};showCoverage=true;zoom=false;drawn=false;$('#setupCanvas').getContext('2d').clearRect(0,0,1000,400);}
function clearForms(){for(const el of $$('main input, main textarea, main select')){if(el.type==='checkbox')el.checked=el.id==='showCoverage';else if(el.type!=='file')el.value=el.id==='rulerSample'?'X':'';el.disabled=false;}$$('main button').forEach(b=>b.disabled=false);$$('[data-variable]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});refreshLargestPrediction();$('#designStatus').textContent='';$('#graphStatus').textContent='';$('#measurementStatus').textContent='';$('#extensionFields').hidden=true;$('#extensionResults').innerHTML='';$('#startExtension').hidden=false;$('#learningSection').hidden=true;$('#submitActions').hidden=false;$('#submitDialog').open&&$('#submitDialog').close();}
function begin(profile,demo=false){save();stopActivity();clearForms();state=freshRecord(profile,demo);lastTime=performance.now();$('#main').hidden=false;$('#studentName').textContent=profile.name;$('#demoBanner').hidden=!demo;$('#teacherBack').hidden=!demo;$('#loginDialog').open&&$('#loginDialog').close();$('#teacherDialog').open&&$('#teacherDialog').close();showPhase(1);save();}
function showLogin(){save();stopActivity();state=null;teacherPassword='';selectedRecord=null;cloudRecords=null;teacherProfile=null;$('#teacherPassword').value='';$('#teacherDialog').open&&$('#teacherDialog').close();$('#main').hidden=true;$('#studentName').textContent='';$('#teacherBack').hidden=true;$('#loginForm').reset();if(!$('#loginDialog').open)$('#loginDialog').showModal();}
function showPhase(number){if(!state||number>state.unlocked)return;if(number!==3)bench.cancel();settleTime();state.phase=number;$$('.phase').forEach(el=>el.hidden=el.id!==`phase-${number}`);$$('[data-phase]').forEach(b=>{const n=Number(b.dataset.phase);b.disabled=n>state.unlocked;b.classList.toggle('active',n===number);b.classList.toggle('done',n<number);if(n===number)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});if(number===3)renderBench();if(number===4){renderSummary();renderGraph();}save();$('#phase-'+number+' h2').focus({preventScroll:true});}
$$('[data-phase]').forEach(b=>b.onclick=()=>showPhase(Number(b.dataset.phase)));
$$('[data-back]').forEach(b=>b.onclick=()=>showPhase(Number(b.dataset.back)));
function completeFields(ids){const bad=ids.find(id=>!String(state?.answers[id]??'').trim());if(bad){toast('required');const target=$('#'+bad);(target?.querySelector('button,input')||target)?.focus();return false;}return true;}
$('#orientationNext').onclick=()=>{if(!completeFields(['observation']))return;state.unlocked=Math.max(2,state.unlocked);log('orientation_confirmed');showPhase(2);};
$('#designNext').onclick=()=>{if(!completeFields(['prediction','largestPrediction','reason','iv','dv','controlPlan','plannedReplicates','plannedReplicateReason']))return;if(!state.answers.cv.length||!state.answers.assumptions.length||!state.design.saved){toast('required');return;}if(!validReplicates(state.answers.plannedReplicates)){toast('required');$('#plannedReplicates').focus();return;}captureOriginal(state);state.plannedReplicates=state.original.plannedReplicates;state.plannedReplicateReason=state.original.plannedReplicateReason;state.unlocked=Math.max(3,state.unlocked);log('original_plan_saved',{plannedReplicates:state.original.plannedReplicates,actualReplicates:3});showPhase(3);};
const canvas=$('#setupCanvas'),ctx=canvas.getContext('2d');
function canvasPoint(e){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height};}
canvas.onpointerdown=e=>{if(!state||state.submittedAt)return;e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);const p=canvasPoint(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.strokeStyle=drawTool==='eraser'?'#fff':'#15333b';ctx.lineWidth=drawTool==='eraser'?22:3;ctx.lineCap='round';ctx.lineJoin='round';};
canvas.onpointermove=e=>{if(!drawing)return;const p=canvasPoint(e);ctx.lineTo(p.x,p.y);ctx.stroke();};
canvas.onpointerup=canvas.onpointercancel=()=>{if(!drawing)return;drawing=false;drawn=true;state.design.saved=false;$('#designStatus').textContent='';log('design_drawing_updated');};
$$('[data-draw]').forEach(b=>b.onclick=()=>{drawTool=b.dataset.draw;$$('[data-draw]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});});
$('#clearDrawing').onclick=()=>{if(state?.submittedAt)return;ctx.clearRect(0,0,1000,400);drawn=false;state.design.image='';state.design.saved=false;log('design_drawing_cleared');scheduleSave();};
$('#setupPhoto').onchange=async e=>{const file=e.target.files[0],id=state?.id,g=generation;if(!file||!state||state.submittedAt)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8e6){toast('imageError');return;}try{const bitmap=await createImageBitmap(file);if(state?.id!==id||g!==generation||state.submittedAt){bitmap.close();return;}ctx.clearRect(0,0,1000,400);const scale=Math.min(canvas.width/bitmap.width,canvas.height/bitmap.height);ctx.drawImage(bitmap,(canvas.width-bitmap.width*scale)/2,(canvas.height-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);bitmap.close();drawn=true;state.design.saved=false;log('design_image_uploaded');}catch{if(state?.id===id&&g===generation)toast('imageError');}};
$('#saveDesign').onclick=()=>{if(!state||state.submittedAt)return;const description=$('#designDescription').value.trim();if(!drawn&&!description){toast('required');return;}state.design={image:drawn?canvas.toDataURL('image/png'):'',description,saved:true};log('design_confirmed');save();$('#designStatus').textContent=t('designSaved');};
$('#loginForm').onsubmit=e=>{e.preventDefault();if(!e.target.reportValidity())return;const profile={name:$('#profileName').value.trim(),className:$('#profileClass').value.trim(),email:$('#profileEmail').value.trim().toLowerCase()};if(!profile.name||!profile.className)return;if(isTeacher(profile)){teacherProfile=profile;$('#loginDialog').close();openTeacher();}else begin(profile);};
$('#accountButton').onclick=showLogin;$('#newInquiry').onclick=showLogin;
function relabel(){translate();cloudStatus(cloudState);if(state){if(state.phase===3){renderBench(false);}if(state.phase===4){renderSummary();renderGraph();}if(state.submittedAt)renderLearning();if(state.extension.results)renderExtension();}if($('#teacherDialog').open){renderTeacherRows();if(selectedRecord)$('#teacherReport').innerHTML=renderReport(selectedRecord,language);}$('#rotateLeft').setAttribute('aria-label',`${t('rotate')} ↶`);$('#rotateRight').setAttribute('aria-label',`${t('rotate')} ↷`);$('#rulerLeft').setAttribute('aria-label',`${t('rulerMove')} ←`);$('#rulerRight').setAttribute('aria-label',`${t('rulerMove')} →`);}
$$('[data-language]').forEach(b=>b.onclick=()=>{setLanguage(language==='zh'?'en':'zh');relabel();});
$('#retryCloud').onclick=()=>cloud.flush().catch(()=>toast('cloudError'));

function currentPlate(){return state.plates[plateIndex];}
const bench=createExperimentBench({getRecord:()=>state,getPlateIndex:()=>plateIndex,setPlateIndex:index=>{plateIndex=index;},save,log,toast,onMeasurements:renderMeasurements});
function renderBench(rebuildReadings=true){bench.render(rebuildReadings);}
function renderMeasurements(){
 const p=currentPlate(),locked=!!state.submittedAt||!p.completed;
 $('#measurementRows').innerHTML=SAMPLES.map(s=>{const r=state.measurements[p.id]?.[s]||{};return `<tr><th>${s==='C'?span('blank'):s}</th><td><select data-visible="${s}" aria-label="${s} ${esc(t('visible'))}" ${locked?'disabled':''}>${option('','choose')}${option('yes','yes')}${option('no','no')}</select></td><td><input data-reading="${s}" aria-label="${s} ${esc(t('diameter'))}" type="number" min="6" max="40" step="0.1" placeholder="mm" value="${esc(r.value||'')}" ${locked?'disabled':''}></td><td><input data-note="${s}" aria-label="${s} ${esc(t('notes'))}" data-i18n-placeholder="notes" value="${esc(r.note||'')}" ${locked?'disabled':''}></td></tr>`;}).join('');
 SAMPLES.forEach(s=>{$(`[data-visible="${s}"]`).value=state.measurements[p.id]?.[s]?.visible||'';});
 $('#confirmReadings').disabled=locked;$('#measurementStatus').textContent=SAMPLES.every(s=>state.measurements[p.id]?.[s]?.confirmedAt)?t('readingSaved'):'';
 for(const el of $$('[data-reading], [data-visible], [data-note]'))el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{if(state.submittedAt)return;const s=el.dataset.reading||el.dataset.visible||el.dataset.note;const group=state.measurements[p.id]??={};const row=group[s]??={};row[el.dataset.reading?'value':el.dataset.visible?'visible':'note']=el.value;row.confirmedAt=null;state.graph.confirmedAt=null;scheduleSave();});
 translate($('#measurementRows'));
}
$('#confirmReadings').onclick=()=>{if(!state||state.submittedAt)return;const p=currentPlate();if(!p.completed)return;for(const s of SAMPLES){if(!validDecimal($(`[data-reading="${s}"]`).value,6,40)||!$(`[data-visible="${s}"]`).value){toast('invalidNumber');$(`[data-reading="${s}"]`).focus();return;}}for(const s of SAMPLES)confirmMeasurement(state,p.id,s,{value:$(`[data-reading="${s}"]`).value,visible:$(`[data-visible="${s}"]`).value,note:$(`[data-note="${s}"]`).value});log('measurements_confirmed',{plateId:p.id});save();renderMeasurements();};
$('#experimentNext').onclick=()=>{if(!allMeasurements(state)){toast('allPlatesRequired');return;}state.unlocked=Math.max(4,state.unlocked);showPhase(4);};
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.isComposing||e.target.tagName!=='INPUT'||!e.target.matches('[data-reading],[data-mean],[data-bar]'))return;e.preventDefault();const el=e.target;if(!validDecimal(el.value,el.matches('[data-reading]')?6:0,40)){toast('invalidNumber');return;}const selector=el.matches('[data-reading]')?'[data-reading]:enabled':el.matches('[data-mean]')?'[data-mean]:enabled':'[data-bar]:enabled',inputs=$$(selector),i=inputs.indexOf(el);(inputs[i+1]||$(el.matches('[data-reading]')?'#confirmReadings':'#confirmGraph')).focus();});
function renderSummary(){
 $('#resultsSummary').innerHTML=`<table><thead><tr><th>${t('sample')}</th>${state.plates.map((p,i)=>`<th>${t('plate')} ${i+1} (mm)</th>`).join('')}</tr></thead><tbody>${SAMPLES.map(s=>`<tr><th>${s==='C'?t('blank'):s}</th>${state.plates.map(p=>`<td>${esc(state.measurements[p.id]?.[s]?.value??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
$$('[data-mean]').forEach(el=>el.oninput=()=>{if(state?.submittedAt)return;state.means[el.dataset.mean]=el.value;state.graph.confirmedAt=null;$('#graphStatus').textContent='';scheduleSave();});
$$('[data-bar]').forEach(el=>el.oninput=()=>{if(state?.submittedAt)return;graphDraft[el.dataset.bar]=el.value;renderGraph();});
function renderGraph(){
 if(!state)return;const vals={...state.graph.values,...graphDraft},ticks=Array.from({length:9},(_,i)=>{const v=i*5,y=350-v*7;return `<path d="M70 ${y}h500" stroke="#e1e9e1"/><text x="58" y="${y+4}" text-anchor="end" font-size="12" fill="#658087">${v}</text>`;}).join('');
 $('#studentGraph').innerHTML=`${ticks}<path d="M70 60V350H570" fill="none" stroke="#759585"/>${SAMPLES.map((s,i)=>{const value=Number(vals[s])||0,x=88+i*125;return `<rect x="${x}" y="${350-value*7}" width="85" height="${value*7}" rx="3" fill="${['#168e86','#d4aa66','#86ab90','#a4b6ab'][i]}"/><text x="${x+42}" y="375" text-anchor="middle" font-size="12">${s==='C'?esc(t('blank')):s}</text>${value?`<text x="${x+42}" y="${340-value*7}" text-anchor="middle" font-size="11">${value.toFixed(1)}</text>`:''}`;}).join('')}<text x="320" y="407" text-anchor="middle" font-size="13">${esc(t('graphX'))}</text><text x="14" y="205" transform="rotate(-90 14 205)" text-anchor="middle" font-size="12">${esc(t('graphY'))}</text>`;
}
function graphPoint(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform($('#studentGraph').getScreenCTM().inverse());if(p.x<70||p.x>570||p.y<60||p.y>350)return null;const s=SAMPLES[Math.min(3,Math.floor((p.x-70)/125))],v=Math.round((350-p.y)/7*10)/10;return{s,v};}
$('#studentGraph').onpointermove=e=>{const p=graphPoint(e);$('#graphHint').textContent=p?`${p.s==='C'?t('blank'):p.s} · ${p.v.toFixed(1)} mm`:'';};
$('#studentGraph').onpointerdown=e=>{if(!state||state.submittedAt)return;const p=graphPoint(e);if(!p)return;graphDraft[p.s]=p.v.toFixed(1);$(`#bar-${p.s}`).value=graphDraft[p.s];renderGraph();};
$('#confirmGraph').onclick=()=>{if(!state||state.submittedAt)return;const values={};for(const s of SAMPLES){const el=$(`#bar-${s}`);if(!validDecimal(el.value,0,40)){toast('invalidNumber');el.focus();return;}values[s]=Number(el.value);}state.graph={values,confirmedAt:nowISO()};graphDraft={};log('chart_confirmed',{values});save();renderGraph();$('#graphStatus').textContent=t('graphSaved');};

$('#startExtension').onclick=()=>{if(!state||state.submittedAt)return;state.extension.started=true;$('#extensionFields').hidden=false;$('#startExtension').hidden=true;log('extension_started');save();};
$('#viewExtension').onclick=()=>{if(!state||state.submittedAt)return;const e=state.extension;if(!['prediction','reason','fairComparison'].every(k=>String(e[k]||'').trim())){toast('required');return;}if(!e.original)e.original={prediction:e.prediction,reason:e.reason,fairComparison:e.fairComparison,capturedAt:nowISO()};if(!e.results)e.results={low:12,medium:18,high:23};log('extension_results_observed');save();renderExtension();};
function renderExtension(){if(!state.extension.results)return;$('#extensionResults').innerHTML=`<div class="result-grid">${Object.entries(state.extension.results).map(([k,v])=>`<article class="question-box"><b>${t(k)}</b><p>${v} mm</p></article>`).join('')}</div><p class="caption">${t('extensionLimit')}</p>`;}
function submissionComplete(){
 if(!allMeasurements(state)){toast('allPlatesRequired');return false;}
 for(const s of SAMPLES)if(!validDecimal(state.means[s],0,40)){toast('invalidNumber');$(`#mean-${s}`).focus();return false;}
 if(!state.graph.confirmedAt){toast('required');$('#confirmGraph').focus();return false;}
 if(!completeFields(['analysisControl','analysisConsistent','analysisVariation','analysisMethod','analysisHypothesis','analysisRepeatPlan','analysisRepeatValue','analysisDeath','analysisClinical','conclusion','knowledgeBacteria','knowledgeResistance','knowledgeLimits']))return false;
 if(state.extension.started&&(!state.extension.results||!String(state.extension.analysis||'').trim())){toast('required');return false;}return true;
}
$('#submitInquiry').onclick=()=>{if(!state||state.submittedAt||!submissionComplete())return;$('#submitDialog').showModal();};
$('#cancelSubmit').onclick=()=>$('#submitDialog').close();
$('#confirmSubmit').onclick=()=>{if(!state||state.submittedAt||!submissionComplete())return;state.submittedAt=nowISO();log('inquiry_submitted');save();$('#submitDialog').close();lockInquiry();renderLearning();};
function lockInquiry(){
 $$('main [data-field],main [data-multi],main [data-variable],main [data-mean],main [data-bar],main [data-draw]').forEach(el=>el.disabled=el.id!=='reflection');
 for(const id of ['clearDrawing','setupPhoto','saveDesign','orientationNext','designNext','incubate','confirmGraph','startExtension','viewExtension'])$('#'+id).disabled=true;
 $('#submitActions').hidden=true;$('#learningSection').hidden=false;
 if(state.phase===3)renderBench();
}
function renderLearning(){
 if(!state?.submittedAt)return;$('#learningSection').hidden=false;$('#learningContent').innerHTML=learningPointsHTML(language);
 const original=state.original?.answers||{};
 $('#originalSummary').innerHTML=`<b>${t('hypothesis')}</b><p>${esc(answerDisplay('prediction',original.prediction,language))}</p><p>${t('largestPrediction')} ${esc(answerDisplay('largestPrediction',original.largestPrediction,language))}</p><p>${esc(original.reason)}</p><b>${t('repeatPlan')}</b><p>${state.original?.plannedReplicates??''} ${t('counts')} · ${esc(state.original?.plannedReplicateReason||'')}</p><b>${t('classroomPlan')}</b><div class="table-wrap">${$('#resultsSummary').innerHTML}</div>`;
 $('#reflection').disabled=!!state.reflectionSubmittedAt;$('#saveReflection').disabled=!!state.reflectionSubmittedAt;
 $('#reflectionStatus').textContent=t(state.reflectionSubmittedAt?'reflectionDone':'reflectionPending');$('#completionStatus').textContent=t(state.reflectionSubmittedAt?'reflectionDone':'reflectionPending');$('#downloadPDF').disabled=!state.reflectionSubmittedAt;
}
$('#saveReflection').onclick=()=>{if(!state?.submittedAt||state.reflectionSubmittedAt)return;if(!String(state.answers.reflection||'').trim()){toast('required');$('#reflection').focus();return;}state.reflectionSubmittedAt=nowISO();log('reflection_submitted');save();renderLearning();};
$('#downloadPDF').onclick=()=>{if(state?.reflectionSubmittedAt)openPrintReport(clone(state),language);};
function openTeacher(){
 if(!teacherProfile)return;
 if(state?.demo){stopActivity();state=null;$('#main').hidden=true;}$('#teacherBack').hidden=true;
 $('#dashboardStatus').textContent=t(CLOUD_ENDPOINT?'teacherIntro':'cloudUnconfigured');renderTeacherRows();if(!$('#teacherDialog').open)$('#teacherDialog').showModal();
}
$('#teacherBack').onclick=openTeacher;$('#closeTeacher').onclick=showLogin;
$('#teacherDemo').onclick=()=>begin(teacherProfile,true);
async function readClass(){
 const g=generation;
 const entered=$('#teacherPassword').value;$('#teacherPassword').value='';if(entered)teacherPassword=entered;
 $('#dashboardStatus').textContent=t('cloudSyncing');
 try{const rows=await cloud.list(teacherPassword);if(g!==generation||!teacherProfile)throw Error('ACCOUNT_CHANGED');cloudRecords=rows;$('#dashboardStatus').textContent=`${t('teacher')} · ${rows.length}`;renderTeacherRows();return rows;}catch{if(g===generation&&teacherProfile){cloudRecords=null;selectedRecord=null;$('#teacherDetail').hidden=true;$('#teacherReport').innerHTML='';$('#dashboardStatus').textContent=t('cloudReadFailed');renderTeacherRows();}throw Error('CLASS_READ_FAILED');}
}
$('#refreshCloud').onclick=()=>readClass().catch(()=>{});
$('#exportExcel').onclick=async()=>{try{const rows=await readClass();await downloadWorkbook(rows);}catch{$('#dashboardStatus').textContent=t('cloudReadFailed');}};
$('#exportLocal').onclick=async()=>{await downloadWorkbook(studentRecords(),{scope:'local'});};
function renderTeacherRows(){
 const rows=cloudRecords??studentRecords();$('#teacherRows').innerHTML=rows.map(r=>`<tr><td>${esc(r.profile.name)}</td><td>${esc(r.profile.className)}</td><td><small>${esc(r.id)}</small></td><td>${t(r.reflectionSubmittedAt?'stateComplete':r.submittedAt?'stateReflection':'stateAwaiting')}</td><td>${esc(r.savedAt||'')}</td><td><button class="secondary" data-view="${esc(r.id)}">${t('view')}</button></td></tr>`).join('')||`<tr><td colspan="6">${t('emptyRecords')}</td></tr>`;
 $$('[data-view]').forEach(b=>b.onclick=()=>{selectedRecord=clone(rows.find(r=>r.id===b.dataset.view));$('#teacherReport').innerHTML=renderReport(selectedRecord,language);$('#teacherDetail').hidden=false;$('#teacherPDF').disabled=!selectedRecord.reflectionSubmittedAt;});
 $('#exportExcel').disabled=!CLOUD_ENDPOINT;$('#refreshCloud').disabled=!CLOUD_ENDPOINT;
}
$('#teacherPDF').onclick=()=>{if(selectedRecord?.reflectionSubmittedAt)openPrintReport(selectedRecord,language);};
$('#importRecords').onchange=async e=>{
 const g=generation,rows=studentRecords();let n=0;
 try{for(const file of e.target.files){const parsed=JSON.parse(await file.text());if(g!==generation||!teacherProfile)return;const data=Array.isArray(parsed)?parsed:parsed.records||[parsed];for(const raw of data){const candidate=canonicalRecord(raw);if(!candidate)continue;const i=rows.findIndex(r=>r.id===candidate.id);if(i<0){rows.push(candidate);n++;}else if((candidate.version||0)>(rows[i].version||0)){rows[i]=candidate;n++;}}}if(damaged.has(KEYS.records))throw Error();localStorage.setItem(KEYS.records,JSON.stringify(rows));cloudRecords=null;renderTeacherRows();$('#dashboardStatus').textContent=`${t('importRecords')} · ${n}`;}catch{$('#dashboardStatus').textContent=t('storageError');}
};
window.addEventListener('beforeunload',e=>{if(!state||state.demo)return;save();e.preventDefault();e.returnValue='';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){const n=performance.now();if(state&&!state.demo)state.timing[state.phase]+=Math.max(0,n-lastTime)/1000;lastTime=n;save();}else lastTime=performance.now();});
setInterval(()=>{if(!state||state.demo){$('#activeTime').textContent='';return;}const total=Object.values(state.timing).reduce((a,b)=>a+b,0)+(document.hidden?0:Math.max(0,performance.now()-lastTime)/1000);$('#activeTime').textContent=`${t('time')} · ${(total/60).toFixed(1)} ${t('minutes')}`;},1000);
// The public page does not persist any teacher credential or demonstration state.
$('#loginDialog').addEventListener('cancel',e=>e.preventDefault());
$('#teacherDialog').addEventListener('cancel',e=>{e.preventDefault();showLogin();});
readRecords();relabel();$('#loginDialog').showModal();
