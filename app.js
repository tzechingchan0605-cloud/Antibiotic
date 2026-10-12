import {createPaperworkPanel} from './paperwork/client.js';
import {VARIABLE_OPTIONS,ASSUMPTION_OPTIONS,PREDICTION_OPTIONS,REPEAT_OPTIONS,EQUIPMENT_ART} from './inquiry-content.js';
import {MC_QUESTIONS,EFFECTIVE_OPTIONS,ANALYSIS_FIELDS} from './analysis.js';
import {language,t,setLanguage,translate} from './i18n.js';
import {createExperimentBench} from './experiment-bench.js';
import {historyFigureMarkup,historyCaptionKey,layoutHistoryLabels} from './history-figure.js';
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
const variables=VARIABLE_OPTIONS;
const multi=(name,options)=>`<div class="chip-grid">${options.map(([v,k])=>`<label class="choice"><input type="checkbox" data-multi="${name}" value="${v}">${span(k)}</label>`).join('')}</div>`;
$('#orientationFields').innerHTML=field('observation','observation',{placeholder:'observationPH'});
$('#hypothesisFields').innerHTML=`<label class="hypothesis-sentence">${span('predictionPrefix')} <select id="prediction" data-field="prediction" data-scope="answer" required data-i18n-aria="prediction">${option('','choose')}${PREDICTION_OPTIONS.map(([v,k])=>option(v,k)).join('')}</select> ${span('predictionSuffix')}</label><label class="hypothesis-sentence">${span('largestPrefix')} <select id="largestPrediction" data-field="largestPrediction" data-scope="answer" required data-i18n-aria="largestPrediction">${option('','choose')}${['X','Y','Z'].map(v=>`<option value="${v}">${v}</option>`).join('')}${option('na','notApplicable')}</select> <span id="largestSuffix">${span('largestSuffix')}</span><span id="largestNASuffix" hidden>${span('largestNASuffix')}</span></label>`+field('reason','hypothesisReason',{placeholder:'reasonPH'});
function refreshLargestPrediction(){const na=$('#largestPrediction').value==='na';$('#largestSuffix').hidden=na;$('#largestNASuffix').hidden=!na;}
$('#largestPrediction').addEventListener('change',refreshLargestPrediction);
$('#reason').rows=2;$('#reason').maxLength=600;
$('#variableFields').innerHTML=[['iv','iv','ivHint'],['dv','dv','dvHint'],['cv','cv','cvHint']].map(([group,title,hint])=>`<section id="${group}" class="variable-group"><h4>${span(title)} <span>（${span(hint)}）</span></h4><div class="variable-options">${variables.map(([value,key])=>`<button type="button" data-group="${group}" data-variable="${value}" aria-pressed="false">${span(key)}</button>`).join('')}</div></section>`).join('');
$('#assumptionFields').innerHTML=multi('assumptions',ASSUMPTION_OPTIONS).replace('class="chip-grid"','class="choice-stack"').replaceAll('class="choice"','class="check-option"');
$('#controlFields').innerHTML=field('controlPlan','controlPlan').replace('<textarea',`<span class="question-hint control-purpose-hint" data-i18n="controlPurposeHint"></span><span class="question-hint" data-i18n="controlHint"></span><textarea`);
$('#controlPlan').maxLength=1000;
$('#designFields').innerHTML=field('designDescription','designDescription',{optional:true,placeholder:'designDescriptionPH'});
$('#designDescription').rows=2;$('#designDescription').maxLength=1000;
$('#replicateFields').innerHTML=field('plannedReplicates','plannedReplicates',{options:REPEAT_OPTIONS,placeholder:null})+field('plannedReplicateReason','plannedReplicateReason',{placeholder:null});
const mcQuestion=question=>`<fieldset class="analysis-question" id="${question.id}"><legend><span class="question-number">${question.number}</span> ${span(question.key)}</legend><div class="mc-options">${question.options.map(([value,key],i)=>`<label class="mc-option"><input type="radio" name="${question.id}" data-field="${question.id}" data-scope="answer" value="${value}" required><span class="mc-letter">${String.fromCharCode(65+i)}</span>${span(key)}</label>`).join('')}</div></fieldset>`;
const rankSelect=(id,index)=>`<select id="${id}" data-field="${id}" data-scope="answer" required data-i18n-aria="${id}">${option('','choose')}${SAMPLES.map(sample=>sample==='C'?option(sample,'blank'):`<option value="${sample}">${sample}</option>`).join('')}${index>1?option('na','notApplicable'):''}</select>`;
const conclusionMarkup=`<fieldset class="analysis-question conclusion-question"><legend><span class="question-number">3</span> ${span('resultConclusion')}</legend><div class="conclusion-sentence">${span('conclusionContext')}<select id="effectiveSamples" data-field="effectiveSamples" data-scope="answer" required data-i18n-aria="effectiveSamples">${option('','choose')}${EFFECTIVE_OPTIONS.map(([value,key])=>option(value,key)).join('')}</select>${span('conclusionEffective')}</div><p>${span('conclusionRanking')}</p><div class="conclusion-ranking">${[0,1,2,3].map((index)=>`${index?'<span aria-hidden="true">＞</span>':''}${rankSelect('rank'+(index+1),index)}`).join('')}</div><p class="question-hint">${span('conclusionSelectHint')}</p></fieldset>`;
$('#analysisFields').innerHTML=MC_QUESTIONS.slice(0,2).map(mcQuestion).join('')+conclusionMarkup+MC_QUESTIONS.slice(2).map(mcQuestion).join('');
$('#reflectionFields').innerHTML=field('reflection','reflectionQuestion');
$('#meanInputs').innerHTML=SAMPLES.map(s=>`<label class="field">${span(`meanLabel${s}`)}<input id="mean-${s}" data-mean="${s}" type="number" min="0" max="40" step="0.1" required placeholder="mm" data-i18n-aria="meanLabel${s}"></label>`).join('');
if($('#equipmentBank'))$('#equipmentBank').innerHTML=EQUIPMENT_ART.map(([key,count,art,note])=>`<figure class="equipment"><svg viewBox="0 0 100 100" role="img" data-i18n-aria="${key}">${art}</svg><figcaption>${span(key)} ×${count}${note?`<small>${span(note)}</small>`:''}</figcaption></figure>`).join('');
$('#historyFigure').innerHTML=historyFigureMarkup();
// Older cached HTML has these paragraphs without their newer IDs.
const historyCaption=$('#historyCaption')||$('[data-i18n="historyCaption"]')||$('#historyFigure + .caption');
if(historyCaption)historyCaption.dataset.i18n=historyCaptionKey;
const colonyMeaning=$('#colonyMeaning')||$('[data-i18n="colonyRemark"]');
if(colonyMeaning)colonyMeaning.hidden=historyCaptionKey==='historyCaption';
translate();
let state=null,plateIndex=0,tool=null,drawTool='pencil',gesture=null,drawing=false,drawn=false,animation=null,saveTimer=null,generation=0;
let teacherProfile=null,teacherPassword='',cloudRecords=null,selectedRecord=null,showCoverage=true,zoom=false,ruler={x:60,y:350},lastTime=performance.now(),cloudState={key:'unconfigured'};
const paperwork=createPaperworkPanel({host:$('#teacherDialog'),isAuthorised:()=>isTeacher(teacherProfile)&&$('#teacherDialog').open,getLanguage:()=>language});
const damaged=new Set();
function readRecords(){try{const rows=JSON.parse(localStorage.getItem(KEYS.records)||'[]');if(!Array.isArray(rows))throw Error();return rows;}catch{damaged.add(KEYS.records);$('#localStatus').textContent=t('storageError');return [];}}
function studentRecords(){return readRecords().map(canonicalRecord).filter(Boolean);}
function cloudStatus(status){cloudState=status;const key={unconfigured:'cloudUnconfigured',pending:'cloudPending',syncing:'cloudSyncing',synced:'cloudSynced',error:'cloudError'}[status.key]||'cloudError';for(const id of ['cloudStatus','loginCloudStatus']){$('#'+id).textContent=t(key);$('#'+id).dataset.state=status.key;}$('#retryCloud').hidden=!CLOUD_ENDPOINT;}
const cloud=createCloudSync({endpoint:CLOUD_ENDPOINT,status:cloudStatus});
function toast(key){$('#toast').dataset.i18n=key;$('#toast').textContent=t(key);$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,4500);}
function guide(key,target){
 toast(key);if(typeof target==='string')target=$(target);if(!target)return;
 const focus=target.matches('input,textarea,select,button')?target:target.querySelector('input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled)');
 focus?.focus({preventScroll:true});
 (focus?.closest('fieldset,.field,.variable-group')||target).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
}
function answerTarget(id){return id==='assumptions'?$('#assumptionFields'):$('#'+id);}
function settleTime(){const n=performance.now();if(state&&!state.demo&&!document.hidden)state.timing[state.phase]+=Math.max(0,n-lastTime)/1000;lastTime=n;}
function save(){clearTimeout(saveTimer);if(!state||state.demo)return;settleTime();try{if(damaged.has(KEYS.records))throw Error();const rows=readRecords();if(damaged.has(KEYS.records))throw Error();state.version++;state.savedAt=nowISO();const copy=clone(state);const i=rows.findIndex(r=>r.id===state.id);if(i<0)rows.push(copy);else rows[i]=copy;localStorage.setItem(KEYS.records,JSON.stringify(rows));localStorage.setItem(KEYS.current,JSON.stringify(copy));$('#localStatus').textContent=t('localSaved');cloud.enqueue(copy).catch(()=>cloudStatus({key:'error'}));}catch{$('#localStatus').textContent=t('storageError');toast('storageError');}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,350);}
function log(type,details={}){if(!state||state.demo)return;state.events.push({type,details:clone(details),phase:state.phase,at:nowISO()});}
function recordAnswer(id,value){if(!state||(state.submittedAt&&id!=='reflection')||(id==='reflection'&&state.reflectionSubmittedAt))return;const old=state.answers[id];state.answers[id]=value;if(state.original&&JSON.stringify(old)!==JSON.stringify(value))log('answer_revision',{field:id,previous:old??'',next:value});if(id==='designDescription'){state.design.saved=false;$('#designStatus').textContent='';}scheduleSave();}
$$('[data-field][data-scope="answer"]').forEach(el=>{el.addEventListener(el.tagName==='SELECT'||el.type==='radio'?'change':'input',()=>recordAnswer(el.dataset.field,el.value));});
$$('[data-multi]').forEach(el=>el.addEventListener('change',()=>recordAnswer(el.dataset.multi,$$(`[data-multi="${el.dataset.multi}"]:checked`).map(c=>c.value))));
$$('[data-variable]').forEach(button=>button.onclick=()=>{
 if(!state||state.submittedAt)return;
 const group=button.dataset.group,value=button.dataset.variable,current=state.answers[group];
 const selected=Array.isArray(current)?current:current?[current]:[];
 const choices=selected.includes(value)?selected.filter(v=>v!==value):[...selected,value];
 recordAnswer(group,choices);button.classList.toggle('selected',choices.includes(value));button.setAttribute('aria-pressed',String(choices.includes(value)));
 log('variable_choice',{group,choices:clone(choices)});
});
function stopActivity(){bench.cancel();bench.reset();generation++;if(animation)cancelAnimationFrame(animation);animation=null;clearTimeout(saveTimer);gesture=null;drawing=false;tool=null;plateIndex=0;ruler={x:60,y:350};showCoverage=true;zoom=false;drawn=false;$('#setupCanvas').getContext('2d').clearRect(0,0,1000,400);}
function clearForms(){for(const el of $$('main input, main textarea, main select')){if(el.type==='checkbox'||el.type==='radio')el.checked=el.id==='showCoverage';else if(el.type!=='file')el.value=el.id==='rulerSample'?'X':'';el.disabled=false;}$$('main button').forEach(b=>b.disabled=false);$$('[data-variable]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});refreshLargestPrediction();$('#designStatus').textContent='';$('#measurementStatus').textContent='';$('#learningSection').hidden=true;$('#submitActions').hidden=false;$('#submitDialog').open&&$('#submitDialog').close();}
function begin(profile,demo=false){save();stopActivity();clearForms();state=freshRecord(profile,demo);lastTime=performance.now();$('#main').hidden=false;$('#studentName').textContent=profile.name;$('#demoBanner').hidden=!demo;$('#teacherBack').hidden=!demo;$('#loginDialog').open&&$('#loginDialog').close();$('#teacherDialog').open&&$('#teacherDialog').close();showPhase(1);layoutHistoryLabels();save();}
function showLogin(){paperwork.close();save();stopActivity();state=null;teacherPassword='';selectedRecord=null;cloudRecords=null;teacherProfile=null;$('#teacherPassword').value='';$('#teacherDialog').open&&$('#teacherDialog').close();$('#main').hidden=true;$('#studentName').textContent='';$('#teacherBack').hidden=true;$('#loginForm').reset();if(!$('#loginDialog').open)$('#loginDialog').showModal();}
function showPhase(number){if(!state||number>state.unlocked)return;if(number!==3)bench.cancel();settleTime();state.phase=number;$$('.phase').forEach(el=>el.hidden=el.id!==`phase-${number}`);$$('[data-phase]').forEach(b=>{const n=Number(b.dataset.phase);b.disabled=n>state.unlocked;b.classList.toggle('active',n===number);b.classList.toggle('done',n<number);if(n===number)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});if(number===3)renderBench();if(number===4){renderSummary();}save();$('#phase-'+number+' h2').focus({preventScroll:true});}
$$('[data-phase]').forEach(b=>b.onclick=()=>showPhase(Number(b.dataset.phase)));
$$('[data-back]').forEach(b=>b.onclick=()=>showPhase(Number(b.dataset.back)));
function completeFields(ids){
 const bad=ids.filter(id=>!String(state?.answers[id]??'').trim()).sort((a,b)=>answerTarget(a)?.compareDocumentPosition(answerTarget(b))&Node.DOCUMENT_POSITION_FOLLOWING?-1:1)[0];
 if(bad){guide('required',answerTarget(bad));return false;}return true;
}
$('#orientationNext').onclick=()=>{if(!completeFields(['observation']))return;state.unlocked=Math.max(2,state.unlocked);log('orientation_confirmed');showPhase(2);};
$('#designNext').onclick=()=>{
 if(!completeFields(['prediction','largestPrediction','reason','iv','dv','cv','assumptions','controlPlan']))return;
 if(!state.design.saved){guide(drawn||$('#designDescription').value.trim()?'designSaveRequired':'designRequired',drawn||$('#designDescription').value.trim()?'#saveDesign':'#designDescription');return;}
 if(!completeFields(['plannedReplicates','plannedReplicateReason']))return;
 if(!validReplicates(state.answers.plannedReplicates)){guide('required','#plannedReplicates');return;}
 captureOriginal(state);state.plannedReplicates=state.original.plannedReplicates;state.plannedReplicateReason=state.original.plannedReplicateReason;state.unlocked=Math.max(3,state.unlocked);log('original_plan_saved',{plannedReplicates:state.original.plannedReplicates,actualReplicates:3});showPhase(3);
};
const canvas=$('#setupCanvas'),ctx=canvas.getContext('2d');
function canvasPoint(e){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height};}
canvas.onpointerdown=e=>{if(!state||state.submittedAt)return;e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);const p=canvasPoint(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.strokeStyle=drawTool==='eraser'?'#fff':'#15333b';ctx.lineWidth=drawTool==='eraser'?22:3;ctx.lineCap='round';ctx.lineJoin='round';};
canvas.onpointermove=e=>{if(!drawing)return;const p=canvasPoint(e);ctx.lineTo(p.x,p.y);ctx.stroke();};
canvas.onpointerup=canvas.onpointercancel=()=>{if(!drawing)return;drawing=false;drawn=true;state.design.saved=false;$('#designStatus').textContent='';log('design_drawing_updated');};
$$('[data-draw]').forEach(b=>b.onclick=()=>{drawTool=b.dataset.draw;$$('[data-draw]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});});
$('#clearDrawing').onclick=()=>{if(state?.submittedAt)return;ctx.clearRect(0,0,1000,400);drawn=false;state.design.image='';state.design.saved=false;log('design_drawing_cleared');scheduleSave();};
$('#setupPhoto').onchange=async e=>{const file=e.target.files[0],id=state?.id,g=generation;if(!file||!state||state.submittedAt)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8e6){toast('imageError');return;}try{const bitmap=await createImageBitmap(file);if(state?.id!==id||g!==generation||state.submittedAt){bitmap.close();return;}ctx.clearRect(0,0,1000,400);const scale=Math.min(canvas.width/bitmap.width,canvas.height/bitmap.height);ctx.drawImage(bitmap,(canvas.width-bitmap.width*scale)/2,(canvas.height-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);bitmap.close();drawn=true;state.design.saved=false;log('design_image_uploaded');}catch{if(state?.id===id&&g===generation)toast('imageError');}};
$('#saveDesign').onclick=()=>{if(!state||state.submittedAt)return;const description=$('#designDescription').value.trim();if(!drawn&&!description){guide('designRequired','#designDescription');return;}state.design={image:drawn?canvas.toDataURL('image/png'):'',description,saved:true};log('design_confirmed');save();$('#designStatus').textContent=t('designSaved');};
$('#loginForm').onsubmit=e=>{e.preventDefault();if(!e.target.reportValidity())return;const profile={name:$('#profileName').value.trim(),className:$('#profileClass').value.trim(),email:$('#profileEmail').value.trim().toLowerCase()};if(!profile.name||!profile.className)return;if(isTeacher(profile)){teacherProfile=profile;$('#loginDialog').close();openTeacher();}else begin(profile);};
$('#accountButton').onclick=showLogin;$('#newInquiry').onclick=showLogin;
function relabel(){paperwork.refresh();translate();cloudStatus(cloudState);if(state){if(state.phase===3){renderBench(false);}if(state.phase===4){renderSummary();}if(state.submittedAt)renderLearning();}if($('#teacherDialog').open){renderTeacherRows();if(selectedRecord)$('#teacherReport').innerHTML=renderReport(selectedRecord,language);}$('#rotateLeft').setAttribute('aria-label',`${t('rotate')} ↶`);$('#rotateRight').setAttribute('aria-label',`${t('rotate')} ↷`);$('#rulerLeft').setAttribute('aria-label',`${t('rulerMove')} ←`);$('#rulerRight').setAttribute('aria-label',`${t('rulerMove')} →`);}
$$('[data-language]').forEach(b=>b.onclick=()=>{setLanguage(language==='zh'?'en':'zh');relabel();});
$('#retryCloud').onclick=()=>cloud.flush().catch(()=>toast('cloudError'));

function currentPlate(){return state.plates[plateIndex];}
const bench=createExperimentBench({getRecord:()=>state,getPlateIndex:()=>plateIndex,setPlateIndex:index=>{plateIndex=index;},save,log,toast,onMeasurements:renderMeasurements});
function renderBench(rebuildReadings=true){bench.render(rebuildReadings);}
function renderMeasurements(){
 const p=currentPlate(),locked=!!state.submittedAt||!p.completed;
 $('#measurementRows').innerHTML=SAMPLES.map(s=>{const r=state.measurements[p.id]?.[s]||{};return `<tr><th>${s==='C'?span('blank'):s}</th><td><select data-visible="${s}" aria-label="${s} ${esc(t('visible'))}" ${locked?'disabled':''}>${option('','choose')}${option('yes','yes')}${option('no','no')}</select></td><td><input data-reading="${s}" aria-label="${s} ${esc(t('diameter'))}" type="number" min="0" max="40" step="0.1" placeholder="mm" value="${esc(r.value??'')}" ${locked?'disabled':''}></td></tr>`;}).join('');
 SAMPLES.forEach(s=>{$(`[data-visible="${s}"]`).value=state.measurements[p.id]?.[s]?.visible||'';});
 $('#confirmReadings').disabled=locked;$('#measurementStatus').textContent=SAMPLES.every(s=>state.measurements[p.id]?.[s]?.confirmedAt)?t('readingSaved'):'';
 for(const el of $$('[data-reading], [data-visible]'))el.addEventListener(el.tagName==='SELECT'||el.type==='radio'?'change':'input',()=>{if(state.submittedAt)return;const s=el.dataset.reading||el.dataset.visible;const group=state.measurements[p.id]??={};const row=group[s]??={};row[el.dataset.reading?'value':'visible']=el.value;if(el.dataset.visible&&el.value==='no'){row.value='0';$(`[data-reading="${s}"]`).value='0';}row.confirmedAt=null;state.graph.confirmedAt=null;scheduleSave();});
 translate($('#measurementRows'));
}
$('#confirmReadings').onclick=()=>{if(!state||state.submittedAt)return;const p=currentPlate();if(!p.completed)return;for(const s of SAMPLES){if(!$(`[data-visible="${s}"]`).value){guide('visibleRequired',`[data-visible="${s}"]`);return;}if(!validDecimal($(`[data-reading="${s}"]`).value,0,40)){guide('invalidNumber',`[data-reading="${s}"]`);return;}}for(const s of SAMPLES)confirmMeasurement(state,p.id,s,{value:$(`[data-reading="${s}"]`).value,visible:$(`[data-visible="${s}"]`).value,note:state.measurements[p.id]?.[s]?.note||''});log('measurements_confirmed',{plateId:p.id});save();renderMeasurements();if(state.plates.some(other=>other.id!==p.id&&!SAMPLES.every(s=>state.measurements[other.id]?.[s]?.confirmedAt)))$('#plateTabs').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
$('#experimentNext').onclick=()=>{if(!measurementsComplete())return;state.unlocked=Math.max(4,state.unlocked);showPhase(4);};
document.addEventListener('keydown',e=>{
 if(e.key!=='Enter'||e.isComposing||e.target.tagName!=='INPUT'||!e.target.matches('[data-reading],[data-mean]'))return;
 e.preventDefault();const el=e.target,isMean=el.matches('[data-mean]');
 if(!isMean&&!$(`[data-visible="${el.dataset.reading}"]`).value){guide('visibleRequired',`[data-visible="${el.dataset.reading}"]`);return;}
 const valid=isMean?/^\d+(\.\d+)?$/.test(el.value.trim())&&Number(el.value)<=40:validDecimal(el.value,0,40);
 if(!valid){guide('invalidNumber',el);return;}
 if(isMean){
  if(!state||state.submittedAt)return;
  const formatted=(Math.round((Number(el.value)+Number.EPSILON)*10)/10).toFixed(1);
  el.value=formatted;
  if(state.means[el.dataset.mean]!==formatted){state.means[el.dataset.mean]=formatted;state.graph.confirmedAt=null;scheduleSave();}
 }
 const selector=el.matches('[data-reading]')?'[data-reading]:enabled':'[data-mean]:enabled',inputs=$$(selector),i=inputs.indexOf(el);
 (inputs[i+1]||$(el.matches('[data-reading]')?'#confirmReadings':'#zoneMeaning input')).focus();
});

function renderSummary(){
 $('#resultsSummary').innerHTML=`<table><thead><tr><th scope="col">${t('plate')}</th>${SAMPLES.map(s=>`<th scope="col">${s==='C'?t('blank'):s} (mm)</th>`).join('')}</tr></thead><tbody>${state.plates.map((p,i)=>`<tr><th scope="row">${t('plate')} ${i+1}</th>${SAMPLES.map(s=>`<td>${esc(state.measurements[p.id]?.[s]?.value??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
$$('[data-mean]').forEach(el=>el.oninput=()=>{if(state?.submittedAt)return;state.means[el.dataset.mean]=el.value;state.graph.confirmedAt=null;scheduleSave();});
function measurementsComplete(){
 if(allMeasurements(state))return true;
 const index=state.plates.findIndex(p=>!p.completed||SAMPLES.some(s=>!state.measurements[p.id]?.[s]?.confirmedAt));
 plateIndex=index;showPhase(3);renderBench();const p=currentPlate();
 if(!p.completed){guide('allPlatesRequired','#procedureList');return false;}
 for(const sample of SAMPLES){const reading=state.measurements[p.id]?.[sample];
  if(!reading?.visible){guide('visibleRequired',`[data-visible="${sample}"]`);return false;}
  if(!validDecimal(reading.value,0,40)){guide('invalidNumber',`[data-reading="${sample}"]`);return false;}
 }
 guide('readingsConfirmRequired','#confirmReadings');return false;
}
function submissionComplete(){
 if(!measurementsComplete())return false;
 for(const s of SAMPLES)if(!validDecimal(state.means[s],0,40)){guide('invalidNumber',`#mean-${s}`);return false;}
 if(!completeFields(ANALYSIS_FIELDS))return false;
 return true;
}
$('#submitInquiry').onclick=()=>{if(!state||state.submittedAt||!submissionComplete())return;$('#submitDialog').showModal();};
$('#cancelSubmit').onclick=()=>$('#submitDialog').close();
$('#confirmSubmit').onclick=()=>{if(!state||state.submittedAt||!submissionComplete())return;state.submittedAt=nowISO();log('inquiry_submitted');save();$('#submitDialog').close();lockInquiry();renderLearning();};
function lockInquiry(){
 $$('main [data-field],main [data-multi],main [data-variable],main [data-mean],main [data-draw]').forEach(el=>el.disabled=el.id!=='reflection');
 for(const id of ['clearDrawing','setupPhoto','saveDesign','orientationNext','designNext','incubate'])$('#'+id).disabled=true;
 $('#submitActions').hidden=true;$('#learningSection').hidden=false;
 if(state.phase===3)renderBench();
}
function renderLearning(){
 if(!state?.submittedAt)return;$('#learningSection').hidden=false;$('#learningContent').innerHTML=learningPointsHTML(language);
 $('#originalSummary').innerHTML=`<b>${t('experimentResults')}</b><div class="table-wrap">${$('#resultsSummary').innerHTML}</div>`;
 $('#reflection').disabled=!!state.reflectionSubmittedAt;$('#saveReflection').disabled=!!state.reflectionSubmittedAt;
 $('#reflectionStatus').textContent=t(state.reflectionSubmittedAt?'reflectionDone':'reflectionPending');$('#completionStatus').textContent=t(state.reflectionSubmittedAt?'reflectionDone':'reflectionPending');$('#downloadPDF').disabled=!state.reflectionSubmittedAt;
}
$('#saveReflection').onclick=()=>{if(!state?.submittedAt||state.reflectionSubmittedAt)return;if(!String(state.answers.reflection||'').trim()){guide('reflectionRequired','#reflection');return;}state.reflectionSubmittedAt=nowISO();log('reflection_submitted');save();renderLearning();};
$('#downloadPDF').onclick=()=>{if(state?.reflectionSubmittedAt)openPrintReport(clone(state),language);};
function openTeacher(){
 if(!teacherProfile)return;
 if(state?.demo){stopActivity();state=null;$('#main').hidden=true;}$('#teacherBack').hidden=true;paperwork.refresh();
 $('#dashboardStatus').textContent=t(CLOUD_ENDPOINT?'teacherIntro':'cloudUnconfigured');renderTeacherRows();if(!$('#teacherDialog').open)$('#teacherDialog').showModal();
}
$('#teacherBack').onclick=openTeacher;$('#closeTeacher').onclick=showLogin;
$('#teacherDemo').onclick=()=>{paperwork.close();begin(teacherProfile,true);};
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
