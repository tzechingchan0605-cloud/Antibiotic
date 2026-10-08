import {SAMPLES, GRID, coverageFraction, toPlatePoint, clone, clearZoneDiameter} from './model.js';
import {t} from './i18n.js';
import {rulerTargets,moveMagneticRuler} from './ruler-model.js';
import {QUADRANTS, REQUIRED_COVERAGE, ensureExperiment, plateStep, canSelectPlate,
  flipPlate, markCross, setQuadrantLabel, loadDropper, releaseSuspension,
  spreadStroke, placementForLabel, placeDisc, sealPlate, autoPreparePlate,
  assistPlateSpread, dipForceps, heatForceps, clipDisc, configureIncubator, canIncubate, incubateAll} from './experiment-model.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelPoints={NW:{x:111,y:86},NE:{x:289,y:86},SW:{x:111,y:314},SE:{x:289,y:314}};
const asset={spreader:'assets/lab-spreader-cartoon.png',tweezers:'assets/lab-forceps-cartoon.png'};
const markerIcon='<svg viewBox="0 0 40 80" aria-hidden="true"><path d="M18 6h12v49l-6 16-6-16Z" fill="#203d42"/><path d="M19 14h10v34H19Z" fill="#6da594"/><path d="m20 62 4 9 4-9Z" fill="#142e34"/></svg>';
const dropperIcon='<svg viewBox="0 0 40 80" aria-hidden="true"><ellipse cx="20" cy="15" rx="10" ry="13" fill="#087b78"/><path d="M17 26h6v41l-3 8-3-8Z" fill="#eaf8fa" stroke="#7898a0"/><path d="M18 52h4v14h-4Z" fill="#9ccbb9"/></svg>';
const alcoholIcon='<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M8 10h45l-4 6v57H11V10" fill="#f4f8f3" stroke="#7faaa0" stroke-width="2.5"/><path d="M13 43h34v28H13Z" fill="#adc7ad"/><path d="M18 18v45M39 25h7M39 38h7M39 57h7" stroke="#7faaa0" stroke-width="2" fill="none"/></svg>';
const lampIcon='<svg viewBox="0 0 60 80" aria-hidden="true"><path class="lamp-flame" d="M29 3c-11 14-11 22 1 25 11-4 11-13-1-25Z" fill="#e7b36b"/><path d="M27 28h6v13h-6Z" fill="#24594e"/><path d="M17 40h26l11 24c2 8-8 12-24 12S4 72 6 64Z" fill="#e4eee5" stroke="#7faaa0" stroke-width="2.5"/><path d="M10 61h40l2 9H8Z" fill="#adc7ad"/></svg>';

/** Owns only the stage-3 bench; account data and reading fields remain in app.js. */
export function createExperimentBench({getRecord,getPlateIndex,setPlateIndex,save,log,toast,onMeasurements}){
  const $=selector=>document.querySelector(selector);
  let tool=null,carriedDisc=null,gesture=null,zoom=false,showCoverage=true;
  let ruler={x:60,y:350},rulerMagnet=null,frame=null,busy=false,animationKind=null,animationDetail={},epoch=0;
  let idleTimer=null,hintSignature='',activeRecordId=null,hoverPoint=null;
  const svg=()=>$('#plateSVG');
  const record=()=>getRecord();
  const current=()=>record()?.plates[getPlateIndex()];
  const visible=()=>!!record()&&!$('#phase-3')?.hidden;
  const locked=()=>!record()||!!record().submittedAt||busy;
  const readyAll=()=>record().plates.every(p=>p.preparation.ready||p.completed);
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const guide=document.createElement('div');
  guide.id='benchGuide';guide.className='bench-guide';guide.hidden=true;guide.setAttribute('aria-hidden','true');document.body.append(guide);
  svg()?.classList.add('plate-svg');svg()?.setAttribute('tabindex','0');
  const bottleIcon='<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M20 4h20v10H20Z" fill="#5b8882"/><path d="M22 14h16v11l9 9v39H13V34l9-9Z" fill="#ecf8ed" stroke="#7ba590" stroke-width="2"/><path d="M15 48h30v22H15Z" fill="#a4d4b8"/><rect x="17" y="37" width="26" height="21" rx="3" fill="#f9fff8"/><path d="M22 44h16M22 50h16" stroke="#6e9987" stroke-width="2"/></svg>';
  for(const [id,icon] of [['selectMarker',markerIcon],['selectDropper',dropperIcon],['bacteriaBottle',bottleIcon],['selectSpreader',`<img src="${asset.spreader}" alt="">`],['selectTweezers',`<img src="${asset.tweezers}" alt="">`],['alcoholBeaker',alcoholIcon],['alcoholLamp',lampIcon]]){
    const button=$(`#${id}`);if(!button)continue;
    const key=button.dataset.i18n;button.removeAttribute('data-i18n');button.classList.add('bench-tool');
    button.innerHTML=`<span class="bench-tool-icon" aria-hidden="true">${icon}</span><span data-i18n="${escape(key)}">${escape(t(key))}</span>`;
  }

  function bind(id,event,handler){const element=$(`#${id}`);if(element)element.addEventListener(event,handler);}
  function cancel(){
    epoch++;if(frame!==null)cancelAnimationFrame(frame);frame=null;
    clearTimeout(idleTimer);idleTimer=null;hintSignature='';guide.hidden=true;
    $('.bench-hint-target')?.classList.remove('bench-hint-target');
    busy=false;animationKind=null;animationDetail={};gesture=null;tool=null;carriedDisc=null;hoverPoint=null;
    $('#toolCursor')?.setAttribute('hidden','');
    $('#benchAnimation')?.setAttribute('hidden','');
    $('#incubationProgress')?.setAttribute('hidden','');
    svg()?.classList.remove('plate-flipping','plate-sealing');
  }
  function reset(){cancel();activeRecordId=null;zoom=false;showCoverage=true;ruler={x:60,y:350};rulerMagnet=null;}
  function updateCursor(){
    const cursor=$('#toolCursor');if(!cursor)return;
    cursor.hidden=!tool||busy||!visible()||!hoverPoint;
    cursor.dataset.tool=tool||'';
    cursor.dataset.loaded=String(tool==='dropper'?!!current()?.preparation.dropperLoaded:tool==='tweezers'?!!carriedDisc:false);
    if(cursor.hidden)return;
    cursor.innerHTML=tool==='marker'?markerIcon:tool==='dropper'?`${dropperIcon}${current()?.preparation.dropperLoaded?'<span class="cursor-drop">●</span>':''}`:
      `<img src="${asset[tool]}" alt="">${tool==='tweezers'&&carriedDisc?`<span class="cursor-disc">${carriedDisc}</span>`:''}`;
    cursor.style.left=`${hoverPoint.x+12}px`;cursor.style.top=`${hoverPoint.y+12}px`;
  }
  function point(event){const matrix=svg()?.getScreenCTM();return matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()):{x:0,y:0};}
  function screenPoint(world){const matrix=svg()?.getScreenCTM();return matrix?new DOMPoint(world.x,world.y).matrixTransform(matrix):{x:0,y:0};}
  function rememberPointer(event){
    hoverPoint={x:event.clientX,y:event.clientY};
    if(tool==='spreader'&&event.target.closest?.('#plateSVG')&&!gesture?.mode?.includes('rotate')){
      const world=point(event),screen=screenPoint({x:200,y:Math.max(45,Math.min(355,world.y))});hoverPoint={x:screen.x,y:screen.y};
    }
    updateCursor();
  }
  function selectedTool(next){
    if(locked())return;
    // Pointer selection is followed by click on the same button. Only the first
    // changes the selected tool; a repeated click still restarts the idle guide.
    if(tool===next){progress();render(false);return;}
    tool=next;carriedDisc=null;
    const button=$(`#select${next[0].toUpperCase()+next.slice(1)}`);
    if(button){button.classList.remove('tool-selected-animation');void button.offsetWidth;button.classList.add('tool-selected-animation');}
    log('tool_selected',{plateId:current()?.id,tool:next});save();progress();render(false);
  }
  function commit(type,detail={}){log(type,{plateId:current()?.id,...detail});save();progress();}
  function mutate(action,type,detail={}){
    if(locked())return false;
    try{action();commit(type,detail);render(false);return true;}catch(error){toast(error.message);render(false);return false;}
  }
  function animate(kind,action,type,detail={},duration=650){
    if(locked())return;
    const id=record().id,token=++epoch,start=performance.now();
    const milliseconds=reduced()?Math.min(180,duration):duration;
    busy=true;animationKind=kind;animationDetail=detail;gesture=null;guide.hidden=true;clearTimeout(idleTimer);hintSignature='';
    const box=$('#benchAnimation');if(box){box.hidden=false;box.dataset.animation=kind;box.innerHTML=animationMarkup(kind);}
    svg()?.classList.toggle('plate-flipping',kind==='flip');svg()?.classList.toggle('plate-sealing',kind==='seal');
    if(kind==='incubate')$('#incubationProgress').hidden=false;
    render(false);
    function tick(time){
      if(token!==epoch||record()?.id!==id)return;
      const fraction=Math.min(1,(time-start)/milliseconds);
      if(kind==='incubate'){
        $('#incubationProgress .meter').style.width=`${Math.round(fraction*100)}%`;
        $('#incubationStatus').textContent=t('incubating');
      }
      if(fraction<1){frame=requestAnimationFrame(tick);return;}
      frame=null;busy=false;animationKind=null;animationDetail={};
      svg()?.classList.remove('plate-flipping','plate-sealing');if(box)box.hidden=true;
      $('#incubationProgress').hidden=true;
      try{action();tool=type==='dropper_loaded'?'dropper':['disc','alcohol','sterilize'].includes(kind)?'tweezers':null;carriedDisc=current().preparation.discInForceps;commit(type,detail);render(kind==='incubate');}
      catch(error){toast(error.message);render(false);}
    }
    frame=requestAnimationFrame(tick);
  }
  function animationMarkup(kind){
    const key={mark:'animateMark',load:'toolLoadedDropper',drop:'animateDrop',spread:'animateSpread',disc:'animateDisc',alcohol:'animateAlcohol',sterilize:'animateSterilize',seal:'animateSeal',incubate:'animateIncubate',auto:'animateSeal',flip:'plateBottom'}[kind];
    let art='';
    if(kind==='incubate')art='<div class="incubator-animation"><span class="incubator-plate">1</span><span class="incubator-plate">2</span><span class="incubator-plate">3</span><span class="incubator-body">30°C<br>24 h</span></div>';
    if(kind==='auto')art='<div class="auto-preparation-animation"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>';
    if(['alcohol','sterilize'].includes(kind))art=`<svg class="sterilization-animation" viewBox="0 0 240 170" aria-hidden="true">${kind==='alcohol'?'<g transform="translate(90 65)"><path d="M0 0h65l-4 7v73H4V0" fill="#f4f8f3" stroke="#7faaa0" stroke-width="3"/><path d="M7 40h51v37H7Z" fill="#adc7ad"/></g>':'<g transform="translate(90 75)"><path class="lamp-flame" d="M28-28c-15 21-15 30 2 35 15-6 15-19-2-35Z" fill="#e7b36b"/><path d="M27 6h6v16h-6Z" fill="#24594e"/><path d="M12 21h36l11 36c2 9-12 12-29 12S-1 66 1 57Z" fill="#e4eee5" stroke="#7faaa0" stroke-width="3"/></g>'}<g class="${kind==='alcohol'?'forceps-dipping':'forceps-heating'}"><image href="${asset.tweezers}" x="102" y="${kind==='alcohol'?-17:-60}" width="48" height="120" transform="rotate(180 126 ${kind==='alcohol'?43:0})"/></g></svg>`;
    return `${art}<span class="bench-animation-label">${escape(t(key))}</span>`;
  }
  function nextHint(){
    const p=current(),step=plateStep(p),preparation=p.preparation;
    if(step===9)return null;
    if(step===1){
      if(preparation.orientation==='top')return ['procedureHint1Flip','#flipPlate'];
      if(!preparation.crossMarked)return tool==='marker'?['procedureHint1Marker','#plateSVG']:['procedureHint1Marker','#selectMarker'];
      const slot=QUADRANTS.find(q=>!preparation.quadrantLabels[q]);return ['procedureHint1Labels',`[data-quadrant="${slot}"]`];
    }
    if(step===2){
      if(preparation.orientation==='bottom')return ['procedureHint2Flip','#flipPlate'];
      if(tool!=='dropper')return ['procedureHint2Dropper','#selectDropper'];
      return preparation.dropperLoaded?['procedureHint2Release','#plateSVG']:['procedureHint2Bottle','#bacteriaBottle'];
    }
    if(step===3)return ['procedureHint3',tool==='spreader'?'#rotateRight':'#selectSpreader'];
    if(step===4){
      if(tool!=='tweezers')return ['procedureHint4Tweezers','#selectTweezers'];
      if(carriedDisc)return ['procedureHint4Place',`[data-disc-target="${carriedDisc}"]`];
      if(preparation.forcepsState==='dirty')return ['procedureHint4Alcohol','#alcoholBeaker'];
      if(preparation.forcepsState==='alcohol')return ['procedureHint4Lamp','#alcoholLamp'];
      return ['procedureHint4Disc',`[data-tray-disc="${SAMPLES.find(s=>!p.discPositions[s])}"]`];
    }
    if(step===5)return ['procedureHint5','#sealPlate'];
    if(!readyAll()){
      const next=record().plates.findIndex((plate,i)=>canSelectPlate(record(),i)&&!plate.preparation.ready&&!plate.completed);
      return ['procedureHint6',`[data-plate="${next}"]`];
    }
    if(record().experiment.incubator.temperature!==30)return ['procedureHint7Temperature','#setTemperature'];
    if(record().experiment.incubator.hours!==24)return ['procedureHint7Duration','#setDuration'];
    return ['procedureHint7Incubate','#incubate'];
  }
  function progress(){
    clearTimeout(idleTimer);idleTimer=null;hintSignature='';guide.hidden=true;
    $('.bench-hint-target')?.classList.remove('bench-hint-target');
  }
  function positionGuide(target){
    if(!target||target.disabled||!visible()){guide.hidden=true;return;}
    const rect=target.getBoundingClientRect();
    const anchor=target===svg()?screenPoint({x:200,y:200}):{x:rect.left+rect.width/2,y:target.matches('[data-disc-target]')?rect.top+rect.height/2:rect.top};
    guide.innerHTML=`<svg width="30" height="37" viewBox="0 0 30 37"><path d="M15 2V34m-8-10 8 10 8-10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ${anchor.y<0?'transform="rotate(180 15 18.5)"':''}/></svg>`;
    guide.style.left=`${Math.max(12,Math.min(window.innerWidth-42,anchor.x-15))}px`;
    guide.style.top=`${Math.max(5,Math.min(window.innerHeight-43,anchor.y-34))}px`;guide.hidden=false;
  }
  function armHint(){
    const hint=nextHint(),status=$('#procedureHint');if(status)status.textContent=hint?t(hint[0]):t('experimentComplete');
    if(!hint||busy||record().submittedAt||!visible()){progress();return;}
    const signature=`${record().id}:${getPlateIndex()}:${hint[0]}:${hint[1]}`;
    if(signature===hintSignature){if(!guide.hidden)positionGuide($(hint[1]));return;}
    progress();hintSignature=signature;
    idleTimer=setTimeout(()=>{
      idleTimer=null;if(!visible()||record()?.submittedAt||busy||signature!==hintSignature)return;
      const target=$(hint[1]);target?.classList.add('bench-hint-target');positionGuide(target);
    },5000);
  }
  function render(rebuildReadings=true){
    const r=record();if(!r)return;ensureExperiment(r);
    if(r.id!==activeRecordId){reset();activeRecordId=r.id;}
    if(!canSelectPlate(r,getPlateIndex()))setPlateIndex(0);
    const p=current(),step=plateStep(p),disabled=locked(),ready=readyAll();
    carriedDisc=p.preparation.discInForceps;
    if(step!==3&&tool==='spreader'){tool=null;gesture=null;}
    if(step!==4&&tool==='tweezers'){tool=null;carriedDisc=null;}
    $('#plateTabs').innerHTML=r.plates.map((plate,i)=>`<div class="plate-tab-group"><button type="button" class="tab-button ${i===getPlateIndex()?'active':''}" data-plate="${i}" ${!canSelectPlate(r,i)||busy?'disabled':''} ${i===getPlateIndex()?'aria-current="true"':''}>${escape(t('plate'))} ${i+1} ${plate.preparation.ready||plate.completed?'✓':''}</button>${i?`<button type="button" class="auto-prepare secondary" data-auto="${i}" ${disabled||!canSelectPlate(r,i)||plate.preparation.ready||plate.completed?'disabled':''}>${escape(t('autoPrepare'))}</button>`:''}</div>`).join('');
    $('#plateTabs').querySelectorAll('[data-plate]').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.plate);if(busy||!canSelectPlate(r,index))return;
      progress();gesture=null;tool=null;carriedDisc=null;zoom=false;ruler={x:60,y:350};rulerMagnet=null;setPlateIndex(index);render();
    });
    $('#plateTabs').querySelectorAll('[data-auto]').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.auto);if(locked()||!canSelectPlate(r,index))return;
      setPlateIndex(index);animate('auto',()=>autoPreparePlate(record(),index),'independent_standardized_preparation',{plateIndex:index},1000);
    });
    $('#plateName').value=p.label;$('#plateName').disabled=disabled||step>=6;
    $('#plateProgress').textContent=`${getPlateIndex()+1} / 3 · ${step>=6?t(p.completed?'endpoint':'readyPlate'):step+' / 5'}`;
    $('#plateProgress').dataset.step=String(step);
    const setDisabled=(id,value)=>{const el=$(`#${id}`);if(el)el.disabled=disabled||value;};
    setDisabled('flipPlate',!((step===1&&p.preparation.orientation==='top')||(step===2&&p.preparation.orientation==='bottom')));
    setDisabled('selectMarker',step!==1||p.preparation.orientation!=='bottom'||p.preparation.crossMarked);
    setDisabled('markCross',step!==1||p.preparation.orientation!=='bottom'||p.preparation.crossMarked||tool!=='marker');
    setDisabled('selectDropper',step!==2||p.preparation.orientation!=='top');
    setDisabled('bacteriaBottle',step!==2||p.preparation.orientation!=='top'||tool!=='dropper'||p.preparation.dropperLoaded);
    setDisabled('selectSpreader',step!==3);setDisabled('selectTweezers',step!==4);setDisabled('sealPlate',step!==5);
    setDisabled('alcoholBeaker',step!==4||tool!=='tweezers'||!!carriedDisc||p.preparation.forcepsState!=='dirty');
    setDisabled('alcoholLamp',step!==4||tool!=='tweezers'||!!carriedDisc||p.preparation.forcepsState!=='alcohol');
    $('#assistSpread').hidden=getPlateIndex()===0;setDisabled('assistSpread',getPlateIndex()===0||step!==3);
    setDisabled('rotateLeft',![3,4].includes(step));setDisabled('rotateRight',![3,4].includes(step));
    setDisabled('setTemperature',!ready||r.plates.every(plate=>plate.completed));
    setDisabled('setDuration',!ready||r.plates.every(plate=>plate.completed));
    setDisabled('incubate',!canIncubate(r));
    $('#setTemperature').classList.toggle('selected',r.experiment.incubator.temperature===30);
    $('#setTemperature').setAttribute('aria-pressed',String(r.experiment.incubator.temperature===30));
    $('#setDuration').classList.toggle('selected',r.experiment.incubator.hours===24);
    $('#setDuration').setAttribute('aria-pressed',String(r.experiment.incubator.hours===24));
    ['marker','dropper','spreader','tweezers'].forEach(name=>{
      const button=$(`#select${name[0].toUpperCase()+name.slice(1)}`);button?.classList.toggle('selected',tool===name);button?.setAttribute('aria-pressed',String(tool===name));
    });
    $('#discTray').innerHTML=SAMPLES.map(sample=>`<button type="button" class="disc-tray-item ${carriedDisc===sample?'selected':''}" data-tray-disc="${sample}" ${disabled||step!==4||tool!=='tweezers'||p.preparation.forcepsState!=='ready'||carriedDisc||p.discPositions[sample]?'disabled':''}><span class="tray-disc" aria-hidden="true"></span><span>${sample==='C'?escape(t('blank')):sample}</span>${p.discPositions[sample]?'<span aria-hidden="true">✓</span>':''}</button>`).join('');
    $('#discTray').querySelectorAll('[data-tray-disc]').forEach(button=>{
      button.onclick=()=>pickDisc(button.dataset.trayDisc);
      button.onpointerdown=event=>{if(button.disabled||!pickDisc(button.dataset.trayDisc))return;gesture={mode:'disc-drag',sample:button.dataset.trayDisc,start:{x:event.clientX,y:event.clientY}};};
    });
    $('#bacteriaBottle').classList.toggle('bottle-loading',animationKind==='load');
    const active=step<=5?step:step===6?(ready?7:6):0;
    $('#procedureList').innerHTML=Array.from({length:8},(_,i)=>`<li data-procedure-step="${i+1}" class="${i+1===active?'current':''} ${i+1<active&&i<5?'complete':''}" ${i+1===active?'aria-current="step"':''}><span class="procedure-number">${i+1}</span><span>${escape(t(`procedure${i+1}`))}</span></li>`).join('');
    $('#showCoverage').checked=showCoverage;$('#showCoverage').disabled=p.completed;
    const measurements=$('.measurement-tools'),list=$('#procedureList');
    if(r.plates.every(plate=>plate.completed)){if(list.previousElementSibling!==measurements)list.before(measurements);}
    else if(list.nextElementSibling!==measurements)list.after(measurements);
    $('#coverageStatus').textContent=p.completed?t('endpoint'):`${t(coverageFraction(p)>=REQUIRED_COVERAGE?'uniform':'uneven')} (${Math.round(coverageFraction(p)*100)}%)`;
    if(!busy)$('#incubationStatus').textContent=p.completed?t('endpoint'):ready?t('incubationReady'):'';
    $('#rotateInstruction').textContent=t('rotationInstruction');
    $('#rotateInstruction').hidden=![3,4].includes(step)||zoom;
    $('#sterilizationStatus').hidden=step!==4;
    $('#sterilizationStatus').textContent=t(carriedDisc?'forcepsHolding':`forceps${p.preparation.forcepsState[0].toUpperCase()+p.preparation.forcepsState.slice(1)}`);
    $('#toolStatus').textContent=t(tool==='dropper'&&p.preparation.dropperLoaded?'toolLoadedDropper':tool==='tweezers'&&carriedDisc?'toolLoadedDisc':tool?`tool${tool[0].toUpperCase()+tool.slice(1)}`:'toolEmpty')+(carriedDisc?` · ${carriedDisc}`:'');
    renderPlate();renderQuadrants();armHint();updateCursor();
    if(rebuildReadings)onMeasurements?.();
  }
  function renderQuadrants(){
    const container=$('#quadrantLabels'),p=current();if(!container)return;
    const editing=plateStep(p)===1&&p.preparation.orientation==='bottom'&&p.preparation.crossMarked;
    container.hidden=!editing;
    if(!editing){container.innerHTML='';return;}
    container.innerHTML=QUADRANTS.map(slot=>`<label class="quadrant-select" data-quadrant-box="${slot}"><span class="sr-only">${escape(t('labelQuadrant'))} ${slot}</span><select data-quadrant="${slot}" ${locked()?'disabled':''}><option value="">—</option>${SAMPLES.map(sample=>`<option value="${sample}" ${p.preparation.quadrantLabels[slot]===sample?'selected':''} ${QUADRANTS.some(other=>other!==slot&&p.preparation.quadrantLabels[other]===sample)?'disabled':''}>${sample}</option>`).join('')}</select></label>`).join('');
    container.querySelectorAll('[data-quadrant]').forEach(select=>select.onchange=()=>mutate(()=>setQuadrantLabel(p,select.dataset.quadrant,select.value),'quadrant_labelled',{quadrant:select.dataset.quadrant,sample:select.value}));
    positionQuadrants();
  }
  function positionQuadrants(){
    const container=$('#quadrantLabels');if(!container||container.hidden||!current())return;
    const parent=container.getBoundingClientRect();
    container.querySelectorAll('[data-quadrant-box]').forEach(label=>{
      const location=screenPoint(toPlatePoint(labelPoints[label.dataset.quadrantBox],-current().rotation));
      label.style.left=`${location.x-parent.left}px`;label.style.top=`${location.y-parent.top}px`;
    });
  }
  function renderPlate(){
    const p=current();if(!p)return;const step=plateStep(p),rot=p.rotation;
    svg().dataset.step=String(step);svg().dataset.orientation=p.preparation.orientation;svg().dataset.rotation=String(rot);
    $('#toggleZoom').disabled=!p.completed||busy;$('#toggleZoom').textContent=t(zoom?'zoomOut':'zoom');
    if(zoom&&p.completed){const q=toPlatePoint(p.discPositions[$('#rulerSample').value]||{x:200,y:200},-rot);svg().setAttribute('viewBox',`${q.x-75} ${q.y-75} 150 172.5`);}
    else svg().setAttribute('viewBox','0 0 400 460');
    const circles=p.completed?SAMPLES.map(sample=>{const q=p.discPositions[sample];return q?`<circle cx="${q.x}" cy="${q.y}" r="${clearZoneDiameter(p,sample)}" fill="black"/>`:'';}).join(''):'';
    const coverage=showCoverage&&!p.completed?(coverageFraction(p)>=REQUIRED_COVERAGE?'<circle class="uniform-coverage" cx="200" cy="200" r="157" fill="#55ad9d" opacity=".15"/>':p.coverage.map(i=>GRID[i]?`<circle cx="${GRID[i].x}" cy="${GRID[i].y}" r="10" fill="#55ad9d" opacity=".15"/>`:'').join('')):'';
    const cross=p.preparation.crossMarked||animationKind==='mark'?`<g class="${animationKind==='mark'?'cross-drawing':''}" stroke="#203d42" stroke-width="2.5" stroke-linecap="round"><path class="cross-horizontal" d="M45 200H355"/><path class="cross-vertical" d="M200 45V355"/></g>`:'';
    const labels=p.preparation.crossMarked?QUADRANTS.map(slot=>{const pos=labelPoints[slot],label=p.preparation.quadrantLabels[slot];return label?`<text x="${pos.x}" y="${pos.y+5}" font-size="18" font-weight="700" text-anchor="middle">${label}</text>`:'';}).join(''):'';
    const targets=step===4?SAMPLES.map(sample=>{const q=placementForLabel(p,sample);return p.discPositions[sample]?'':`<circle data-disc-target="${sample}" cx="${q.x}" cy="${q.y}" r="16" fill="none" stroke="${carriedDisc===sample?'#087b78':'#78958b'}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".7"/>`;}).join(''):'';
    const discs=SAMPLES.map(sample=>{const q=p.discPositions[sample];return q?`<g><circle cx="${q.x}" cy="${q.y}" r="6" fill="#fff" stroke="#8c9c91" stroke-width=".8"/><text x="${q.x}" y="${q.y+3}" font-size="9" text-anchor="middle" fill="#15333b">${sample}</text></g>`:'';}).join('');
    const ticks=Array.from({length:41},(_,i)=>`<path d="M${i*2} 0v${i%5===0?10:5}" stroke="#345950" stroke-width=".6"/>${i%10===0?`<text x="${i*2}" y="22" text-anchor="middle" font-size="7">${i}</text>`:''}`).join('');
    const rulerMarkup=p.completed?`<g data-ruler="true" data-snapped="${rulerMagnet?.sample||''}" transform="translate(${ruler.x} ${ruler.y})" style="cursor:move"><rect x="-4" y="-2" width="88" height="29" rx="3" fill="#fffdf0" opacity=".9" stroke="${rulerMagnet?'#087b78':'#7c9a83'}" stroke-width="${rulerMagnet?1.5:1}"/>${ticks}<text x="94" y="15" font-size="9">mm</text></g>`:'';
    const guidance=step===2&&p.preparation.orientation==='top'?'<circle cx="200" cy="200" r="20" fill="#fff" fill-opacity=".25" stroke="#087b78" stroke-dasharray="4 4"/>':step===3&&tool==='spreader'?'<path d="M200 47V353" stroke="#087b78" stroke-dasharray="5 6" stroke-width="1.5" opacity=".6"/>':'';
    const droplet=animationKind==='drop'?'<circle class="suspension-droplet" cx="200" cy="200" r="12" fill="#78b79a"/>':p.inoculated&&!p.coverage.length&&!p.completed?'<ellipse cx="200" cy="200" rx="15" ry="10" fill="#78b79a" opacity=".5"/>':'';
    const marker=animationKind==='mark'?'<g class="animated-marker"><path d="m0-22 10 0 0 24-5 9-5-9Z" fill="#254e53"/><path d="M0-16h10v17H0Z" fill="#a4c8b1"/></g>':'';
    const placing=animationKind==='disc'&&animationDetail.world?`<g transform="translate(${animationDetail.world.x} ${animationDetail.world.y})"><g class="animated-forceps"><image href="${asset.tweezers}" x="-15" y="0" width="30" height="90" transform="rotate(215)"/><circle cx="0" cy="0" r="6" fill="white" stroke="#8c9c91"/><text x="0" y="3" text-anchor="middle" font-size="9">${animationDetail.sample}</text></g></g>`:'';
    const assisted=animationKind==='spread'?`<image class="animated-spreader" href="${asset.spreader}" x="179" y="110" width="42" height="126"/>`:'';
    svg().innerHTML=`<defs><radialGradient id="plateAgar"><stop stop-color="#fcf5db"/><stop offset="1" stop-color="#e5d8b0"/></radialGradient><pattern id="growthPattern" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#d6c181"/><circle cx="2" cy="3" r="1.1" fill="#b7a86e" opacity=".6"/><circle cx="6" cy="6" r=".8" fill="#e9d69c"/></pattern><clipPath id="plateClip"><circle cx="200" cy="200" r="157"/></clipPath><mask id="growthMask"><rect width="400" height="400" fill="white"/>${circles}</mask></defs><ellipse cx="200" cy="368" rx="139" ry="12" fill="#8a9c86" opacity=".1"/><circle cx="200" cy="200" r="168" fill="#f8faf5" stroke="#bdcec3" stroke-width="3"/><circle cx="200" cy="200" r="160" fill="url(#plateAgar)" stroke="#cbd7ba" stroke-width="3"/><g transform="rotate(${rot} 200 200)" clip-path="url(#plateClip)">${p.completed?'<circle cx="200" cy="200" r="157" fill="url(#growthPattern)" mask="url(#growthMask)"/>':''}${cross}${coverage}${targets}${discs}${labels}</g>${droplet}${guidance}${marker}${placing}${assisted}<circle cx="200" cy="200" r="151" stroke="#fffdf4" stroke-width="1.5" fill="none" opacity=".6"/>${p.preparation.covered?'<circle class="plate-lid" cx="200" cy="200" r="166" fill="#fff" fill-opacity=".11" stroke="#b2c4be" stroke-width="4"/>':''}<path data-rotate="true" d="M324 76 A176 176 0 0 1 370 164" fill="none" stroke="${[3,4].includes(step)?'#087b78':'#b7c9bf'}" stroke-width="12" stroke-linecap="round" tabindex="${[3,4].includes(step)?'0':'-1'}" role="button" aria-label="${escape(t('rotate'))}" aria-describedby="rotateInstruction" aria-disabled="${![3,4].includes(step)||locked()}" style="cursor:${[3,4].includes(step)?'grab':'default'}"/>${rulerMarkup}<text x="200" y="408" text-anchor="middle" font-size="12">${escape(t(p.preparation.orientation==='bottom'?'plateBottom':'plateTop'))}</text><text x="200" y="433" text-anchor="middle" fill="#658087" font-size="11">${escape(t(p.completed?'endpoint':p.preparation.ready?'readyPlate':step===3?'verticalSpreadHint':'plateLabelAria'))}</text>`;
    for(const id of ['centerRuler','rulerLeft','rulerRight','rulerSample'])if($(`#${id}`))$(`#${id}`).disabled=!p.completed;
    positionQuadrants();if(!guide.hidden)positionGuide($(nextHint()?.[1]));
  }
  function rotate(delta){
    if(locked()||![3,4].includes(plateStep(current())))return;
    current().rotation=(current().rotation+delta)%360;
    commit('plate_rotated',{rotation:current().rotation});render(false);
  }
  function pickDisc(sample){
    if(locked()||tool!=='tweezers'||plateStep(current())!==4||current().discPositions[sample])return false;
    if(carriedDisc===sample){progress();return false;}
    try{clipDisc(current(),sample);carriedDisc=sample;commit('sterile_forceps_disc_selected',{sample});render(false);return true;}
    catch(error){toast(error.message);render(false);return false;}
  }
  function placeCarried(world){
    if(!carriedDisc||locked())return;
    const sample=carriedDisc;
    try{
      // Validate immediately; the snap is recorded only after the short placement animation.
      const local=toPlatePoint(world,current().rotation),centre=placementForLabel(current(),sample);
      if(Math.hypot(local.x-centre.x,local.y-centre.y)>33){toast('matching_quadrant_required');return;}
      const cursor=$('#toolCursor');cursor?.classList.add('disc-placement-animation');
      animate('disc',()=>placeDisc(current(),sample,world),'disc_placed',{sample,sterileTweezers:true,world},420);
      cursor?.classList.remove('disc-placement-animation');
    }catch(error){toast(error.message);}
  }
  bind('flipPlate','click',()=>animate('flip',()=>flipPlate(current()),'plate_flipped',{},520));
  bind('selectMarker','click',()=>selectedTool('marker'));
  bind('markCross','click',()=>animate('mark',()=>markCross(current()),'bottom_cross_marked',{},700));
  bind('selectDropper','click',()=>selectedTool('dropper'));
  bind('bacteriaBottle','click',()=>{
    if(tool!=='dropper'||locked())return;
    animate('load',()=>loadDropper(current()),'dropper_loaded',{},400);
  });
  bind('selectSpreader','click',()=>selectedTool('spreader'));
  bind('selectTweezers','click',()=>selectedTool('tweezers'));
  bind('alcoholBeaker','click',()=>{if(tool==='tweezers')animate('alcohol',()=>dipForceps(current()),'forceps_dipped_in_alcohol',{},700);});
  bind('alcoholLamp','click',()=>{if(tool==='tweezers')animate('sterilize',()=>heatForceps(current()),'forceps_sterilized',{},800);});
  bind('selectTweezers','pointerdown',event=>{
    if(locked()||plateStep(current())!==4)return;
    selectedTool('tweezers');gesture={mode:'pick-forceps',start:{x:event.clientX,y:event.clientY}};
  });
  bind('assistSpread','click',()=>animate('spread',()=>assistPlateSpread(record(),getPlateIndex()),'assisted_spread',{},650));
  bind('sealPlate','click',()=>animate('seal',()=>sealPlate(current()),'plate_covered_and_inverted',{},850));
  bind('setTemperature','click',()=>mutate(()=>configureIncubator(record(),{temperature:30}),'incubator_temperature_set',{temperature:30}));
  bind('setDuration','click',()=>mutate(()=>configureIncubator(record(),{hours:24}),'incubator_duration_set',{hours:24}));
  bind('incubate','click',()=>{if(canIncubate(record()))animate('incubate',()=>incubateAll(record()),'all_plates_incubated',{temperature:30,hours:24},1800);});
  bind('rotateLeft','click',()=>rotate(-15));bind('rotateRight','click',()=>rotate(15));
  bind('plateName','input',event=>{if(locked()||plateStep(current())>=6)return;current().label=event.target.value;save();});
  bind('showCoverage','change',event=>{showCoverage=event.target.checked;renderPlate();});
  bind('toggleZoom','click',()=>{if(!current()?.completed)return;zoom=!zoom;if(zoom)centerRuler();renderPlate();});
  bind('rulerSample','change',()=>{if(zoom)centerRuler();renderPlate();});
  function centerRuler(){
    const target=rulerTargets(current()).find(target=>target.sample===$('#rulerSample').value);
    if(target){ruler={x:target.x,y:target.y};rulerMagnet={...target};}
    else{const p=current(),pos=p?.discPositions[$('#rulerSample').value];if(!pos)return;const centre=toPlatePoint(pos,-p.rotation);ruler={x:centre.x-40,y:centre.y};rulerMagnet=null;}
    renderPlate();
  }
  bind('centerRuler','click',centerRuler);
  bind('rulerLeft','click',()=>{ruler.x=Math.max(0,ruler.x-2);renderPlate();});
  bind('rulerRight','click',()=>{ruler.x=Math.min(310,ruler.x+2);renderPlate();});
  bind('plateSVG','pointerdown',event=>{
    if(!record()||busy)return;event.preventDefault();const p=current(),world=point(event);rememberPointer(event);
    if(event.target.closest('[data-ruler]')&&p.completed){gesture={mode:'ruler',start:world,ruler:{...ruler},ignored:null};}
    else if(event.target.closest('[data-rotate]')&&!locked()&&[3,4].includes(plateStep(p))){gesture={mode:'rotate',angle:Math.atan2(world.y-200,world.x-200),rotation:p.rotation};}
    else if(!locked()&&Math.hypot(world.x-200,world.y-200)<157){
      const step=plateStep(p);
      if(step===1&&tool==='marker'&&p.preparation.orientation==='bottom'&&!p.preparation.crossMarked)animate('mark',()=>markCross(current()),'bottom_cross_marked',{},700);
      else if(step===2&&tool==='dropper'&&p.preparation.dropperLoaded){
        if(Math.hypot(world.x-200,world.y-200)>30){toast('centre_required');return;}
        animate('drop',()=>releaseSuspension(current(),world),'diluted_bacteria_added',{},650);
      }else if(step===3&&tool==='spreader'){
        const y=Math.max(45,Math.min(355,world.y));gesture={mode:'spread',lastY:y};
        try{spreadStroke(p,{x:200,y},{x:200,y});renderPlate();}catch(error){toast(error.message);gesture=null;}
      }else if(step===4&&tool==='tweezers'&&carriedDisc)placeCarried(world);
    }
    if(gesture)svg().setPointerCapture(event.pointerId);
  });
  bind('plateSVG','pointermove',event=>{
    rememberPointer(event);if(!gesture||!record()||busy)return;
    const world=point(event),p=current();
    if(gesture.mode==='ruler'){
      const candidate={x:Math.max(0,Math.min(310,gesture.ruler.x+world.x-gesture.start.x)),y:Math.max(30,Math.min(360,gesture.ruler.y+world.y-gesture.start.y))};
      const moved=moveMagneticRuler(p,candidate,rulerMagnet,gesture.ignored);
      ruler=moved.ruler;rulerMagnet=moved.magnet;gesture.ignored=moved.ignored;
    }
    else if(gesture.mode==='rotate')p.rotation=gesture.rotation+(Math.atan2(world.y-200,world.x-200)-gesture.angle)*180/Math.PI;
    else if(gesture.mode==='spread'){
      if(plateStep(p)!==3)return;
      const y=Math.max(45,Math.min(355,world.y));
      try{spreadStroke(p,{x:200,y:gesture.lastY},{x:200,y});gesture.lastY=y;}catch(error){toast(error.message);gesture=null;}
    }
    renderPlate();
  });
  function endGesture(){
    if(!gesture||!record()||!['rotate','spread','ruler'].includes(gesture.mode))return;const mode=gesture.mode;gesture=null;
    if(mode==='rotate')commit('plate_rotated',{rotation:current().rotation});
    else if(mode==='spread')commit('plate_spread',{coverage:coverageFraction(current()),rotation:current().rotation});
    else if(mode==='ruler'){log('ruler_moved',{plateId:current().id,position:clone(ruler),snappedSample:rulerMagnet?.sample||null});save();}
    render(false);
  }
  bind('plateSVG','pointerup',endGesture);bind('plateSVG','pointercancel',endGesture);
  bind('plateSVG','keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();rotate(event.key==='ArrowLeft'?-15:15);}});
  document.addEventListener('pointermove',event=>{if(!visible()){$('#toolCursor')?.setAttribute('hidden','');return;}if(event.target.closest?.('#phase-3'))rememberPointer(event);else $('#toolCursor')?.setAttribute('hidden','');});
  document.addEventListener('pointerup',event=>{
    if(!gesture||!visible()||!['pick-forceps','disc-drag'].includes(gesture.mode))return;
    const last=gesture;gesture=null;
    if(last.mode==='pick-forceps'){
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-tray-disc]');if(target&&!target.disabled)pickDisc(target.dataset.trayDisc);
    }else if(Math.hypot(event.clientX-last.start.x,event.clientY-last.start.y)>8&&document.elementFromPoint(event.clientX,event.clientY)?.closest('#plateSVG'))placeCarried(point(event));
  });
  document.addEventListener('pointercancel',()=>{if(gesture?.mode==='disc-drag'||gesture?.mode==='pick-forceps')gesture=null;});
  window.addEventListener('resize',()=>{if(visible()){positionQuadrants();if(!guide.hidden)positionGuide($(nextHint()?.[1]));}});
  window.addEventListener('scroll',()=>{if(!guide.hidden)positionGuide($(nextHint()?.[1]));},{passive:true});
  return {render,reset,cancel};
}
