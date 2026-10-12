import test from 'node:test';
import assert from 'node:assert/strict';
import {getPaperSource,paperSources} from '../paperwork/source.js';
import {renderParts,documentHTML} from '../paperwork/render.js';
import {L} from '../i18n.js';
import {MC_QUESTIONS,ANALYSIS_FIELDS} from '../analysis.js';
import {INQUIRY_FIELDS,VARIABLE_OPTIONS,ASSUMPTION_OPTIONS,PREDICTION_OPTIONS} from '../inquiry-content.js';
import {generateResult} from '../model.js';
import {CURRENT_RUBRIC_ROWS} from '../rubric.js';
import {glossEnglish} from '../english-glossary.js';

test('paper uses shared current questions, choices, hints and model data without a student record',()=>{
 const before=paperSources();assert.deepEqual(paperSources(),before);
 for(const language of ['zh','en']){
   const s=getPaperSource(language),parts=renderParts(s);
   assert.deepEqual(s.questions.map(q=>q.id),MC_QUESTIONS.map(q=>q.id));
   assert.deepEqual(s.variables.map(o=>[o.id,o.key]),VARIABLE_OPTIONS);
   assert.deepEqual(s.assumptions.map(o=>[o.id,o.key]),ASSUMPTION_OPTIONS);
   assert.deepEqual(s.prediction.map(o=>[o.id,o.key]),PREDICTION_OPTIONS);
   for(const plate of s.plates){const copy={seed:plate.seed};assert.deepEqual(generateResult(copy),plate.result);}
   const student=parts.A.concat(parts.B,parts.C).join('');
   const fields=new Set([...student.matchAll(/data-(?:field|writing)="([^"]+)"/g)].map(m=>m[1]));
   for(const field of INQUIRY_FIELDS.concat(ANALYSIS_FIELDS,'reflection'))assert(fields.has(field),field);
   for(const field of ['conclusion','analysisControl','analysisClinical','knowledgeBacteria','extensionPrediction'])assert(!fields.has(field),`Deleted question restored: ${field}`);
   for(const key of ['drawingHint','assumptionDefinitionHint','controlHint','controlPurposeHint','designNote','assumptionNote','repeatNote','sourceNote','reflectionQuestion'])assert(student.includes(s.text[key].replaceAll('&','&amp;')),key);
   assert.doesNotMatch(student,/class="check (correct|incorrect)"|能力分數|參考有效樣本|Reference effective samples/);
   assert.equal(s.rubric.length,CURRENT_RUBRIC_ROWS.length);
   assert.deepEqual(s.rubric.map(row=>row[1]),CURRENT_RUBRIC_ROWS.map(row=>row[1]));
   assert(!('profile' in s));assert(!('timing' in s));assert(!('events' in s));
 }
 assert.equal(getPaperSource('zh').text.drawingHint,L.drawingHint[0]);
 assert.equal(getPaperSource('en').text.drawingHint,glossEnglish('You do not need to draw every detail carefully. A simple drawing with clear labels is enough.'));
 assert.equal(getPaperSource('en').text.assumptionDefinitionHint,glossEnglish('An assumption is a condition we have not proved but take as true, to help make the experiment results valid.'));
});

test('paper gives exactly two lines per writing area and identity only on A/C first pages',()=>{
 for(const language of ['zh','en']){
   const source=getPaperSource(language),parts=renderParts(source);
   assert.deepEqual(Object.fromEntries(Object.entries(parts).map(([p,list])=>[p,list.length])),{A:3,B:2,C:2,D:6});
   const html=documentHTML(source,['A','B','C','D'],'http://localhost','test');
   assert.equal((html.match(/class="identity"/g)||[]).length,2);
   for(const writing of html.matchAll(/class="ruled"[^>]*>([\s\S]*?)<\/div><\/div>/g))assert.equal((writing[1].match(/class="writing-line"/g)||[]).length,2);
   assert(parts.A[2].indexOf('class="drawbox"')<parts.A[2].indexOf('data-field="designDescription"'));
   assert.match(parts.A[1],/class="circle-options"/);
   assert.match(parts.A[2],/class="checkbox"/);
   assert.equal((parts.A[2].match(/data-liquid-surface/g)||[]).length,3);
 }
});
