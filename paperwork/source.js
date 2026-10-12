import {L} from '../i18n.js';
import {glossEnglish} from '../english-glossary.js';
import {VARIABLE_OPTIONS,ASSUMPTION_OPTIONS,PREDICTION_OPTIONS,REPEAT_OPTIONS,EQUIPMENT_ART,INQUIRY_FIELDS} from '../inquiry-content.js';
import {MC_QUESTIONS,EFFECTIVE_OPTIONS,ANALYSIS_FIELDS} from '../analysis.js';
import {generateResult,DEFAULT_POSITIONS,SAMPLES,DISC_MM,ACTUAL_REPLICATES} from '../model.js';
import {learningPointsHTML,referenceFor} from '../reports.js';
import {VARIABLE_REFERENCE,ASSUMPTION_REFERENCE,CURRENT_RUBRIC_ROWS,TOLERANCES,conclusionChecks} from '../rubric.js';
import {historyFigureMarkup} from '../history-figure.js';
import {LABELS,RUBRIC_EN} from './texts.js';
export const PAPER_VERSION=1;
export const PAPER_SEEDS=Object.freeze([1001,1002,1003]);
export const translated=(key,language)=>{const value=L[key]||[key,key];return language==='en'?glossEnglish(value[1]):value[0];};
export function getPaperSource(language='zh'){
 if(!['zh','en'].includes(language))throw Error('Invalid paper language');
 const t=key=>translated(key,language),choices=options=>options.map(([id,key])=>({id,key,text:t(key)}));
 const plates=PAPER_SEEDS.map((seed,i)=>{const plate={id:`plate-${i+1}`,seed,discPositions:structuredClone(DEFAULT_POSITIONS)};generateResult(plate);return plate;});
 const rawMeasurements=Object.fromEntries(plates.map(plate=>[plate.id,Object.fromEntries(SAMPLES.map(sample=>[sample,{value:String(plate.result[sample])}]))]));
 const conclusionReference=conclusionChecks({plates,measurements:rawMeasurements});
 const openFields=['observation','prediction','largestPrediction','reason','controlPlan','designDescription','plannedReplicates','plannedReplicateReason','reflection'];
 const reference=Object.fromEntries(openFields.map(field=>[field,referenceFor(field,{plates},language)]));
 if(RUBRIC_EN.length!==CURRENT_RUBRIC_ROWS.length-7)throw Error('Update shared English rubric translations');
 const rubric=language==='zh'?CURRENT_RUBRIC_ROWS.map(row=>row.slice(0,6)):CURRENT_RUBRIC_ROWS.map((row,i)=>{
   if(i<10){const [name,method,full,partial,zero]=RUBRIC_EN[i];return [name,row[1],method,full,partial,zero].map(v=>typeof v==='string'?glossEnglish(v):v);}
   if(i<15){const q=MC_QUESTIONS[i-10],letter=String.fromCharCode(65+q.options.findIndex(([id])=>id===q.correct));return [`Analysis ${q.number}: ${t(q.key)}`,row[1],'Shared check',`Correct option: ${letter}.`,'No partial credit.','Incorrect or missing response: 0.'];}
   if(i===15)return ['Selected conclusion',row[1],'Shared check','X and Z: 0.5. Rank effective samples by the student’s own means: 0.5. Unused ranks are Not applicable.','0.5 if either component is correct.','Either order is accepted for equal means; do not penalise measurement error again.'];
   return ['Current total / pending marks',row[1],'Formula','Total 23. All six manual fields must be scored and reflection submitted before a total is reported.','Blank manual marks mean pending; 0 means marked zero.','Do not compare directly with the legacy 32-mark rubric. Draft calibration is required.'];
 });
 return {module:'VL4',version:PAPER_VERSION,language,text:Object.fromEntries(Object.keys(L).sort().map(key=>[key,t(key)])),labels:LABELS,
 inquiryFields:INQUIRY_FIELDS,analysisFields:ANALYSIS_FIELDS,variables:choices(VARIABLE_OPTIONS),assumptions:choices(ASSUMPTION_OPTIONS),prediction:choices(PREDICTION_OPTIONS),repeats:choices(REPEAT_OPTIONS),effective:choices(EFFECTIVE_OPTIONS),
 questions:MC_QUESTIONS.map(q=>({...q,text:t(q.key),choices:choices(q.options)})),equipment:EQUIPMENT_ART,history:historyFigureMarkup(),learning:learningPointsHTML(language),
 plates,conclusionReference,samples:SAMPLES,discMM:DISC_MM,replicates:ACTUAL_REPLICATES,reference,variableReference:VARIABLE_REFERENCE,assumptionReference:ASSUMPTION_REFERENCE,rubric,tolerances:TOLERANCES};
}
export const paperSources=()=>({zh:getPaperSource('zh'),en:getPaperSource('en')});
