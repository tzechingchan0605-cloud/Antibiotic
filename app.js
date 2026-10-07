import {language,t,setLanguage,translate} from './i18n.js';
import {historyFigureMarkup,historyCaptionKey} from './history-figure.js';
import {MODULE_ID,KEYS,SAMPLES,GRID,DEFAULT_POSITIONS,freshRecord,isTeacher,nowISO,clone,toPlatePoint,addCoverage,coverageFraction,placementIssue,generateResult,independentRepeat,validDecimal,validReplicates,confirmMeasurement,allMeasurements,captureOriginal,canonicalRecord} from './model.js';
import {CLOUD_ENDPOINT} from './cloud-config.js';
import {createCloudSync} from './cloud-sync.js';
import {renderReport,openPrintReport,downloadWorkbook,learningPointsHTML} from './reports.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const span=key=>`<span data-i18n="${key}">${esc(t(key))}</span>`;
const option=(value,key)=>`<option value="${value}" data-i18n="${key}">${esc(t(key))}</option>`;
function field(id,key,{options,type='textarea',optional=false,min,max,placeholder,scope='answer'}={}){
  const attrs=`id="${id}" data-field="${id}" data-scope="${scope}" ${optional?'':'required'} data-i18n-placeholder="${placeholder||'genericPH'}"`;
  const input=options?`<select ${attrs}>${option('','choose')}${options.map(([v,k])=>option(v,k)).join('')}</select>`:type==='textarea'?`<textarea ${attrs} rows="3" maxlength="2000"></textarea>`:`<input ${attrs} type="${type}" ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''} ${type==='number'?'step="1"':''}>`;
  return `<label class="field">${span(key)}${input}</label>`;
}
const variables=[['sample','vSample'],['zone','vZone'],['strain','vStrain'],['distribution','vDistribution'],['medium','vMedium'],['disc','vDisc'],['preparation','vPreparation'],['observation','vObservation']];
const multi=(name,options)=>`<div class="chip-grid">${options.map(([v,k])=>`<label class="choice"><input type="checkbox" data-multi="${name}" value="${v}">${span(k)}</label>`).join('')}</div>`;
$('#orientationFields').innerHTML=field('observation','observation',{placeholder:'observationPH'});
$('#hypothesisFields').innerHTML=`<label class="hypothesis-sentence">${span('predictionPrefix')} <select id="prediction" data-field="prediction" data-scope="answer" required>${option('','choose')}${[['all','predictionAll'],['some','predictionSome'],['none','predictionNone']].map(([v,k])=>option(v,k)).join('')}</select> ${span('predictionSuffix')}</label>`+field('reason','reason',{placeholder:'reasonPH'});
$('#reason').rows=2;$('#reason').maxLength=600;
$('#variableFields').innerHTML=[['iv','iv','ivHint'],['dv','dv','dvHint'],['cv','cv','cvHint']].map(([group,title,hint])=>`<section id="${group}" class="variable-group"><h4>${span(title)} <span>（${span(hint)}）</span></h4><div class="variable-options">${variables.map(([value,key])=>`<button type="button" data-group="${group}" data-variable="${value}" aria-pressed="false">${span(key)}</button>`).join('')}</div></section>`).join('');
$('#assumptionFields').innerHTML=multi('assumptions',[['distribution','assumptionDistribution'],['sterile','assumptionSterile'],['sameConditions','assumptionSame'],['death','assumptionDeath']]).replace('class="chip-grid"','class="choice-stack"').replaceAll('class="choice"','class="check-option"');
$('#controlFields').innerHTML=field('controlPlan','controlPlan').replace('<textarea',`<span class="question-hint" data-i18n="controlHint"></span><textarea`);
$('#controlPlan').maxLength=1000;
$('#designFields').innerHTML=field('designDescription','designDescription',{optional:true,placeholder:'designDescriptionPH'});
$('#designDescription').rows=2;$('#designDescription').maxLength=1000;
$('#replicateFields').innerHTML=field('repeatChoice','repeatChoice',{options:[['yes','repeatYes'],['no','repeatNo']]})+field('plannedReplicates','plannedReplicates',{type:'number',min:1})+field('plannedReplicateReason','plannedReplicateReason');
$('#analysisFields').innerHTML=['analysisControl','analysisConsistent','analysisVariation','analysisMethod','analysisHypothesis','analysisRepeatPlan','analysisRepeatValue'].map(k=>field(k,k)).join('')+['analysisDeath','analysisClinical'].map(k=>field(k,k,{options:[['cannot','cannot'],['can','can']]})).join('')+field('conclusion','conclusion',{placeholder:'conclusionPH'})+field('knowledgeBacteria','bacteriaQuestion',{options:[['bacteria','bacteria'],['viruses','viruses']]})+field('knowledgeResistance','resistanceQuestion',{options:[['bacteria','resistanceBacteria'],['body','resistanceBody']]})+field('knowledgeLimits','limitsQuestion',{options:[['limited','limited'],['best','bestDrug']]});
$('#reflectionFields').innerHTML=field('reflection','reflectionQuestion');
$('#meanInputs').innerHTML=SAMPLES.map(s=>`<label class="field">${s==='C'?span('blank'):s}<input id="mean-${s}" data-mean="${s}" type="number" min="0" max="40" step="0.1" required placeholder="mm" aria-label="${s} mm"></label>`).join('');
$('#graphInputs').innerHTML=SAMPLES.map(s=>`<label class="field">${s==='C'?span('blank'):s}<input id="bar-${s}" data-bar="${s}" type="number" min="0" max="40" step="0.1" required placeholder="mm" aria-label="${s} mm"></label>`).join('');
$('#extensionFields').innerHTML=field('ext-prediction','extensionPrediction',{scope:'extension'})+field('ext-reason','reason',{scope:'extension'})+field('ext-fairComparison','fairComparison',{scope:'extension'})+`<button id="viewExtension" class="secondary" data-i18n="viewExtension"></button><div id="extensionResults"></div>`+field('ext-analysis','extensionAnalysis',{scope:'extension'});
$('#materials').innerHTML=['Plate','Bacteria','Spreader','Discs','Tweezers','Incubator','Ruler','Flame'].map((k,i)=>`<article class="equipment"><span class="badge">0${i+1}</span><p data-i18n="material${k}"></p></article>`).join('');
const equipmentArt=[
 ['equipmentPlate',3,'<ellipse cx="50" cy="54" rx="36" ry="25" fill="#eadfbc" stroke="#7faaa0" stroke-width="3"/><ellipse cx="50" cy="52" rx="30" ry="19" fill="none" stroke="#fff"/>'],
 ['equipmentBacteria',1,'<path d="M35 22h30v12l8 50H27l8-50z" fill="#e4eee5" stroke="#7faaa0" stroke-width="3"/><path d="M31 59h38l4 25H27z" fill="#adc7ad"/><path d="M32 19h36" stroke="#087b78" stroke-width="7"/>'],
 ['equipmentSpreader',1,'<path d="M22 23h58M50 23v62" stroke="#7faaa0" stroke-width="7" stroke-linecap="round"/>'],
 ['equipmentDiscs',3,'<g fill="#fff" stroke="#7faaa0">'+[[28,30,'X'],[70,30,'Y'],[28,72,'Z'],[70,72,'C']].map(([x,y,label])=>`<circle cx="${x}" cy="${y}" r="17"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#15333b" stroke="none" font-size="14">${label}</text>`).join('')+'</g>'],
 ['equipmentTweezers',1,'<path d="M29 16L47 42 38 85M29 16L62 39 68 85" fill="none" stroke="#7faaa0" stroke-width="6" stroke-linecap="round"/>'],
 ['equipmentRuler',1,'<rect x="9" y="35" width="82" height="29" rx="3" fill="#f6e8ba" stroke="#c8b582"/>'+Array.from({length:16},(_,i)=>`<path d="M${12+i*5} 35v${i%5===0?14:7}" stroke="#927d4a"/>`).join('')]
];
if($('#equipmentBank'))$('#equipmentBank').innerHTML=equipmentArt.map(([key,count,art])=>`<figure class="equipment"><svg viewBox="0 0 100 100" role="img" data-i18n-aria="${key}">${art}</svg><figcaption>${span(key)} ×${count}</figcaption></figure>`).join('');
$('#historyFigure').innerHTML=historyFigureMarkup();
// Older cached HTML has these paragraphs without their newer IDs.
const historyCaption=$('#historyCaption')||$('#historyFigure + .caption');
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
function stopActivity(){generation++;if(animation)cancelAnimationFrame(animation);animation=null;clearTimeout(saveTimer);gesture=null;drawing=false;tool=null;plateIndex=0;ruler={x:60,y:350};graphDraft={};showCoverage=true;zoom=false;drawn=false;$('#setupCanvas').getContext('2d').clearRect(0,0,1000,400);}
function clearForms(){for(const el of $$('main input, main textarea, main select')){if(el.type==='checkbox')el.checked=el.id==='showCoverage';else if(el.type!=='file')el.value=el.id==='rulerSample'?'X':'';el.disabled=false;}$$('main button').forEach(b=>b.disabled=false);$$('[data-variable]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});$('#designStatus').textContent='';$('#graphStatus').textContent='';$('#measurementStatus').textContent='';$('#extensionFields').hidden=true;$('#extensionResults').innerHTML='';$('#startExtension').hidden=false;$('#learningSection').hidden=true;$('#submitActions').hidden=false;$('#submitDialog').open&&$('#submitDialog').close();}
function begin(profile,demo=false){save();stopActivity();clearForms();state=freshRecord(profile,demo);lastTime=performance.now();$('#main').hidden=false;$('#studentName').textContent=profile.name;$('#demoBanner').hidden=!demo;$('#teacherBack').hidden=!demo;$('#loginDialog').open&&$('#loginDialog').close();$('#teacherDialog').open&&$('#teacherDialog').close();showPhase(1);save();}
function showLogin(){save();stopActivity();state=null;teacherPassword='';selectedRecord=null;cloudRecords=null;teacherProfile=null;$('#teacherPassword').value='';$('#teacherDialog').open&&$('#teacherDialog').close();$('#main').hidden=true;$('#studentName').textContent='';$('#teacherBack').hidden=true;$('#loginForm').reset();if(!$('#loginDialog').open)$('#loginDialog').showModal();}
function showPhase(number){if(!state||number>state.unlocked)return;settleTime();state.phase=number;$$('.phase').forEach(el=>el.hidden=el.id!==`phase-${number}`);$$('[data-phase]').forEach(b=>{const n=Number(b.dataset.phase);b.disabled=n>state.unlocked;b.classList.toggle('active',n===number);b.classList.toggle('done',n<number);if(n===number)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});if(number===3)renderBench();if(number===4){renderSummary();renderGraph();}save();$('#phase-'+number+' h2').focus({preventScroll:true});}
$$('[data-phase]').forEach(b=>b.onclick=()=>showPhase(Number(b.dataset.phase)));
$$('[data-back]').forEach(b=>b.onclick=()=>showPhase(Number(b.dataset.back)));
function completeFields(ids){const bad=ids.find(id=>!String(state?.answers[id]??'').trim());if(bad){toast('required');const target=$('#'+bad);(target?.querySelector('button,input')||target)?.focus();return false;}return true;}
$('#orientationNext').onclick=()=>{if(!completeFields(['observation']))return;state.unlocked=Math.max(2,state.unlocked);log('orientation_confirmed');showPhase(2);};
$('#designNext').onclick=()=>{if(!completeFields(['prediction','reason','iv','dv','controlPlan','repeatChoice','plannedReplicates','plannedReplicateReason']))return;if(!state.answers.cv.length||!state.answers.assumptions.length||!state.design.saved){toast('required');return;}if(!validReplicates(state.answers.plannedReplicates)){toast('required');$('#plannedReplicates').focus();return;}captureOriginal(state);state.plannedReplicates=state.original.plannedReplicates;state.plannedReplicateReason=state.original.plannedReplicateReason;state.unlocked=Math.max(3,state.unlocked);log('original_plan_saved',{plannedReplicates:state.original.plannedReplicates,actualReplicates:3});showPhase(3);};
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
$('#centerRuler').insertAdjacentHTML('afterend','<button type="button" id="toggleZoom" class="secondary" data-i18n="zoom"></button>');translate();
$('#toggleZoom').onclick=()=>{if(!state||!currentPlate().completed)return;zoom=!zoom;if(zoom)$('#centerRuler').click();renderPlate();};
$('#rulerSample').onchange=()=>{if(zoom){$('#centerRuler').click();renderPlate();}};
function renderBench(rebuildReadings=true){
 if(!state)return;const p=currentPlate(),locked=!!state.submittedAt;
 $('#plateTabs').innerHTML=state.plates.map((plate,i)=>`<button type="button" class="tab-button ${i===plateIndex?'active':''}" data-plate="${i}" ${i>0&&!state.plates[i-1].completed?'disabled':''}>${t('plate')} ${i+1} ${plate.completed?'✓':''}</button>`).join('');
 $$('[data-plate]').forEach(b=>b.onclick=()=>{plateIndex=Number(b.dataset.plate);gesture=null;tool=null;zoom=false;ruler={x:60,y:350};renderBench();});
 $('#plateName').value=p.label;$('#plateName').disabled=locked||p.completed;
 $('#plateProgress').textContent=`${plateIndex+1} / 3`;
 $('#addBacteria').disabled=locked||p.inoculated||p.completed;
 for(const id of ['selectSpreader','assistSpread','assistDiscs'])$('#'+id).disabled=locked||!p.inoculated||p.completed||!!animation;
 $('#selectSpreader').classList.toggle('selected',tool==='spreader');
 $('#standardRepeat').hidden=plateIndex===0||p.completed;$('#standardRepeat').disabled=locked||!!animation;
 $('#incubate').disabled=locked||p.completed||!!animation;
 $('#discSelectors').innerHTML=SAMPLES.map(s=>`<button type="button" class="choice ${tool===s?'selected':''}" data-disc="${s}" aria-pressed="${tool===s}" ${locked||!p.inoculated||p.completed?'disabled':''}>${s==='C'?t('blank'):s} ${p.discPositions[s]?'✓':''}</button>`).join('');
 $$('[data-disc]').forEach(b=>b.onclick=()=>{tool=b.dataset.disc;renderBench(false);});
 $('#showCoverage').checked=showCoverage;
 $('#coverageStatus').textContent=p.completed?t('endpoint'):`${t(coverageFraction(p)>=.85?'uniform':'uneven')} (${Math.round(coverageFraction(p)*100)}%)`;
 $('#incubationStatus').textContent=p.completed?t('endpoint'):'';
 renderPlate();if(rebuildReadings)renderMeasurements();
}
function renderPlate(){
 if(!state)return;const p=currentPlate(),rot=p.rotation;
 $('#toggleZoom').disabled=!p.completed;$('#toggleZoom').textContent=t(zoom?'zoomOut':'zoom');
 if(zoom&&p.completed){const q=toPlatePoint(p.discPositions[$('#rulerSample').value]||{x:200,y:200},-rot);$('#plateSVG').setAttribute('viewBox',`${q.x-75} ${q.y-75} 150 172.5`);}else $('#plateSVG').setAttribute('viewBox','0 0 400 460');
 const circles=p.completed?SAMPLES.map(s=>{const q=p.discPositions[s];return q?`<circle cx="${q.x}" cy="${q.y}" r="${p.result[s]}" fill="black"/>`:'';}).join(''):'';
 const cover=showCoverage&&!p.completed?p.coverage.map(i=>`<circle cx="${GRID[i].x}" cy="${GRID[i].y}" r="9" fill="#55ad9d" opacity=".15"/>`).join(''):'';
 const discs=SAMPLES.map(s=>{const q=p.discPositions[s];return q?`<g><circle cx="${q.x}" cy="${q.y}" r="6" fill="#fff" stroke="#8c9c91" stroke-width=".8"/><text x="${q.x}" y="${q.y+3}" font-size="9" text-anchor="middle" fill="#15333b">${s}</text></g>`:'';}).join('');
 const ticks=Array.from({length:41},(_,i)=>`<path d="M${i*2} 0v${i%5===0?10:5}" stroke="#345950" stroke-width=".6"/>${i%10===0?`<text x="${i*2}" y="22" text-anchor="middle" font-size="7" fill="#345950">${i}</text>`:''}`).join('');
 $('#plateSVG').innerHTML=`<defs><radialGradient id="plateAgar"><stop stop-color="#fcf5db"/><stop offset="1" stop-color="#e5d8b0"/></radialGradient><pattern id="growthPattern" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#d6c181"/><circle cx="2" cy="3" r="1.1" fill="#b7a86e" opacity=".6"/><circle cx="6" cy="6" r=".8" fill="#e9d69c"/></pattern><clipPath id="plateClip"><circle cx="200" cy="200" r="157"/></clipPath><mask id="growthMask"><rect width="400" height="400" fill="white"/>${circles}</mask></defs><ellipse cx="200" cy="368" rx="139" ry="12" fill="#8a9c86" opacity=".1"/><circle cx="200" cy="200" r="168" fill="#f8faf5" stroke="#bdcec3" stroke-width="3"/><circle cx="200" cy="200" r="160" fill="url(#plateAgar)" stroke="#cbd7ba" stroke-width="3"/><g transform="rotate(${rot} 200 200)" clip-path="url(#plateClip)">${p.completed?`<circle cx="200" cy="200" r="157" fill="url(#growthPattern)" mask="url(#growthMask)"/>`:''}${cover}${discs}</g><circle cx="200" cy="200" r="151" stroke="#fffdf4" stroke-width="1.5" fill="none" opacity=".6"/><path data-rotate="true" d="M324 76 A176 176 0 0 1 370 164" fill="none" stroke="#087b78" stroke-width="12" stroke-linecap="round" tabindex="0" role="button" aria-label="${esc(t('rotate'))}" style="cursor:grab"/><g data-ruler="true" transform="translate(${ruler.x} ${ruler.y})" style="cursor:move"><rect x="-4" y="-2" width="88" height="29" rx="3" fill="#fffdf0" opacity=".9" stroke="#7c9a83"/>${ticks}<text x="94" y="15" font-size="9" fill="#345950">mm</text></g><text x="200" y="431" text-anchor="middle" fill="#658087" font-size="12">${esc(t(p.completed?'endpoint':'coverageNote'))}</text>`;
}
function svgPoint(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform($('#plateSVG').getScreenCTM().inverse());}
function rotatePlate(delta){if(!state||state.submittedAt||currentPlate().completed||animation)return;currentPlate().rotation=(currentPlate().rotation+delta)%360;renderPlate();log('plate_rotated',{plateId:currentPlate().id,rotation:currentPlate().rotation});scheduleSave();}
$('#plateSVG').onpointerdown=e=>{
 if(!state||animation)return;e.preventDefault();const p=currentPlate(),world=svgPoint(e);
 if(e.target.closest('[data-ruler]')){gesture={mode:'ruler',start:world,ruler:{...ruler}};}
 else if(e.target.closest('[data-rotate]')){if(state.submittedAt||p.completed)return;gesture={mode:'rotate',angle:Math.atan2(world.y-200,world.x-200),rotation:p.rotation};}
 else if(!state.submittedAt&&!p.completed&&p.inoculated){
   const point=toPlatePoint(world,p.rotation);
   if(Math.hypot(point.x-200,point.y-200)>157)return;
   if(tool==='spreader'){gesture={mode:'spread'};addCoverage(p,point);renderPlate();}
   else if(SAMPLES.includes(tool)){const issue=placementIssue(p,tool,point);if(issue){toast(issue);return;}p.discPositions[tool]={x:Math.round(point.x),y:Math.round(point.y)};p.operations.push({type:'disc_placed',sample:tool,position:clone(p.discPositions[tool]),at:nowISO()});log('disc_placed',{plateId:p.id,sample:tool,position:p.discPositions[tool]});tool=null;save();renderBench(false);}
 }
 if(gesture)$('#plateSVG').setPointerCapture(e.pointerId);
};
$('#plateSVG').onpointermove=e=>{if(!gesture||!state)return;const world=svgPoint(e),p=currentPlate();if(gesture.mode==='ruler'){ruler={x:Math.max(0,Math.min(310,gesture.ruler.x+world.x-gesture.start.x)),y:Math.max(30,Math.min(360,gesture.ruler.y+world.y-gesture.start.y))};}else if(gesture.mode==='rotate'){p.rotation=gesture.rotation+(Math.atan2(world.y-200,world.x-200)-gesture.angle)*180/Math.PI;}else if(gesture.mode==='spread')addCoverage(p,toPlatePoint(world,p.rotation));renderPlate();};
$('#plateSVG').onpointerup=$('#plateSVG').onpointercancel=()=>{if(!gesture||!state)return;const mode=gesture.mode;gesture=null;if(mode==='ruler'){log('ruler_moved',{plateId:currentPlate().id,position:ruler});scheduleSave();}else{currentPlate().operations.push({type:mode,at:nowISO(),coverage:coverageFraction(currentPlate()),rotation:currentPlate().rotation});log(mode==='rotate'?'plate_rotated':'plate_spread',{plateId:currentPlate().id,coverage:coverageFraction(currentPlate()),rotation:currentPlate().rotation});save();}renderBench(false);};
$('#plateSVG').onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotatePlate(e.key==='ArrowLeft'?-15:15);}};
$('#rotateLeft').onclick=()=>rotatePlate(-15);$('#rotateRight').onclick=()=>rotatePlate(15);
$('#plateName').oninput=e=>{if(!state||state.submittedAt||currentPlate().completed)return;currentPlate().label=e.target.value;scheduleSave();};
$('#showCoverage').onchange=e=>{showCoverage=e.target.checked;renderPlate();};
$('#addBacteria').onclick=()=>{if(!state||state.submittedAt||currentPlate().completed)return;currentPlate().inoculated=true;currentPlate().operations.push({type:'simulated_inoculum_added',at:nowISO()});log('simulated_bacteria_added',{plateId:currentPlate().id});save();renderBench(false);};
$('#selectSpreader').onclick=()=>{tool=tool==='spreader'?null:'spreader';renderBench(false);};
$('#assistSpread').onclick=()=>{const p=currentPlate();if(!p.inoculated||p.completed||state.submittedAt)return;GRID.forEach(point=>addCoverage(p,point));p.operations.push({type:'assisted_uniform_spread',at:nowISO()});log('assisted_spread',{plateId:p.id});save();renderBench(false);};
$('#assistDiscs').onclick=()=>{const p=currentPlate();if(!p.inoculated||p.completed||state.submittedAt)return;p.discPositions=clone(DEFAULT_POSITIONS);p.operations.push({type:'assisted_disc_placement',at:nowISO()});log('assisted_disc_placement',{plateId:p.id});tool=null;save();renderBench(false);};
$('#standardRepeat').onclick=()=>{if(plateIndex===0||state.submittedAt)return;independentRepeat(state.plates[plateIndex-1],currentPlate());log('independent_standardized_preparation',{plateId:currentPlate().id});save();renderBench(false);};
$('#incubate').onclick=()=>{
 const p=currentPlate();if(state.submittedAt||p.completed||animation)return;
 if(!p.label.trim()||!p.inoculated||coverageFraction(p)<.85||!SAMPLES.every(s=>p.discPositions[s])){toast(coverageFraction(p)<.85?'uneven':'required');return;}
 const id=state.id,g=generation,started=performance.now(),duration=matchMedia('(prefers-reduced-motion:reduce)').matches?350:1800;
 tool=null;$('#incubationProgress').hidden=false;$('#incubationStatus').textContent=t('incubating');
 function tick(n){if(state?.id!==id||generation!==g)return;const progress=Math.min(1,(n-started)/duration);$('#incubationProgress .meter').style.width=`${progress*100}%`;if(progress<1){animation=requestAnimationFrame(tick);}else{animation=null;$('#incubationProgress').hidden=true;generateResult(p);p.operations.push({type:'common_observation_endpoint',at:nowISO()});log('plate_result_generated',{plateId:p.id});save();renderBench();}}
 animation=requestAnimationFrame(tick);renderBench(false);$('#incubationStatus').textContent=t('incubating');
};
$('#centerRuler').onclick=()=>{if(!state)return;const p=currentPlate(),q=p.discPositions[$('#rulerSample').value];if(!q)return;const world=toPlatePoint(q,-p.rotation);ruler={x:Math.max(0,world.x-40),y:world.y};renderPlate();};
$('#rulerLeft').onclick=()=>{ruler.x=Math.max(0,ruler.x-2);renderPlate();};$('#rulerRight').onclick=()=>{ruler.x=Math.min(310,ruler.x+2);renderPlate();};
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
 $('#originalSummary').innerHTML=`<b>${t('hypothesis')}</b><p>${t(original.prediction||'choose')}</p><p>${esc(original.reason)}</p><b>${t('repeatPlan')}</b><p>${state.original?.plannedReplicates??''} ${t('counts')} · ${esc(state.original?.plannedReplicateReason||'')}</p><b>${t('classroomPlan')}</b><div class="table-wrap">${$('#resultsSummary').innerHTML}</div>`;
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
