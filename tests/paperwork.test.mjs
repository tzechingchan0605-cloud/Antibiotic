import test from 'node:test';
import assert from 'node:assert/strict';
import {getPaperSource,paperSources,PAPER_SEEDS} from '../paperwork/source.js';
import {renderParts,documentHTML,measurementSVG} from '../paperwork/render.js';
import {L} from '../i18n.js';
import {MC_QUESTIONS} from '../analysis.js';
import {VARIABLE_OPTIONS,ASSUMPTION_OPTIONS} from '../inquiry-content.js';
import {generateResult} from '../model.js';
import {WS_RUBRIC} from '../paperwork/alignment.js';

test('concept-first paper retains fixed model data and shared science goals without changing a student record',()=>{
 const before=paperSources();assert.deepEqual(paperSources(),before);
 assert.deepEqual(PAPER_SEEDS,[1001,1002,1003]);
 for(const language of ['zh','en']){
  const s=getPaperSource(language),pages=renderParts(s);
  assert.equal(s.version,2);assert.equal(s.taskVersion,'VL4-WS-concept-first-2');
  assert.deepEqual(s.minutes,{minimum:15,maximum:20,target:20,phases:[3,2,4,8,3]});
  assert.equal(s.maximum,38);assert.equal(WS_RUBRIC.reduce((n,row)=>n+row[1],0),38);
  assert.deepEqual(s.questions.map(q=>q.id),MC_QUESTIONS.map(q=>q.id));
  assert.deepEqual(s.variables.map(o=>[o.id,o.key]),VARIABLE_OPTIONS);
  assert.deepEqual(s.assumptions.map(o=>[o.id,o.key]),ASSUMPTION_OPTIONS);
  for(const plate of s.plates){const copy={seed:plate.seed};assert.deepEqual(generateResult(copy),plate.result);}
  const a=pages.A.join(''),b=pages.B.join(''),c=pages.C.join('');
  for(const concept of s.concepts)assert(a.includes(concept.replaceAll('&','&amp;')));
  assert.doesNotMatch(a,/data-static-ruler="plate-|data-static-plate/);
  const visibleA=a.replace(/<[^>]*>/g,''),visibleB=b.replace(/<[^>]*>/g,'');
  assert(!visibleA.includes('18.7'));assert(!visibleA.includes('26.1'));assert(!visibleA.includes('26.3'));assert(!visibleB.includes('18.7'));assert(!visibleB.includes('26.5'));
  assert.match(a,/data-static-ruler="worked-S"/);
  assert.equal((b.match(/data-static-ruler="plate-/g)||[]).length,12);
  for(const field of ['observation','hypothesisEval','hypothesisApply','iv','dv','cv','assumptions','controlPrompt','spacing','designFault','repeatCompare','repeatFeasible','procedureOrder','procedureError','reflectionPrompt'])assert.match(b,new RegExp(`data-(?:field|writing)="${field}"`));
  for(const field of ['prediction','largestPrediction','plannedReplicates','designDescription'])assert(!b.includes(`data-field="${field}"`));
  assert(c.includes('18.7'));assert(c.includes('26.3'));assert(c.includes(s.labels.checkingGate.replaceAll('&','&amp;')));
  assert(!('profile' in s));assert(!('timing' in s));assert(!('events' in s));
  assert(s.alignment.length===23);
  for(const key of ['observation','prediction','largestPrediction','hypothesisReason','iv','dv','cv','assumptionQuestion','controlPlan','design','plannedReplicates','plannedReplicateReason','phase3','visible','mean','zoneMeaning','zoneDiameterMeaning','resultConclusion','repeatPurpose','repeatVariation','controlPurpose','reflectionQuestion'])assert(s.alignment.some(row=>row.originalKeys.includes(key)),key);
  const original=L.conclusionRanking[language==='en'?1:0];assert.notEqual(s.labels.ranking,original);
 }
});

test('each independent ruler is geometrically calibrated and does not print its answer',()=>{
 for(const plate of getPaperSource().plates)for(const sample of ['X','Y','Z','C']){
  const diameter=plate.result[sample],svg=measurementSVG({sample,diameter,id:plate.id+'-'+sample});
  assert.equal((svg.match(/data-ruler-tick=/g)||[]).length,41);
  assert.match(svg,/data-mm-scale="9"/);
  assert.match(svg,/data-disc-boundary[^>]*r="27"/);
  if(diameter>0){const radius=Number(svg.match(/data-zone-boundary[^>]*r="([^"]+)"/)[1]);assert(Math.abs(2*radius/9-diameter)<1e-10);}else assert(!svg.includes('data-zone-boundary'));
  const visible=svg.replace(/<[^>]*>/g,'');assert(!visible.includes(diameter.toFixed(1)));
 }
});

test('two-line writing, neutral titles, staged checking and identity placement remain explicit',()=>{
 for(const language of ['zh','en']){
  const s=getPaperSource(language),pages=renderParts(s);assert.deepEqual(Object.fromEntries(Object.entries(pages).map(([p,rows])=>[p,rows.length])),{A:2,B:7,C:2,D:8});
  const html=documentHTML(s,['A','B','C','D'],'http://localhost','test');assert.equal((html.match(/class="identity"/g)||[]).length,2);
  for(const writing of html.matchAll(/class="ruled"[^>]*>([\s\S]*?)<\/div><\/div>/g))assert.equal((writing[1].match(/class="writing-line"/g)||[]).length,2);
  assert.equal((pages.B[1].match(/data-static-plate/g)||[]).length,1);
  assert(!pages.B.join('').includes('原始預測'));assert(!pages.A.join('').includes('paper control-group worksheet'));
  assert(pages.D.join('').includes(s.labels.notEquivalent.replaceAll('&','&amp;')));
 }
});
