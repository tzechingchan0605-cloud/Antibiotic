import {L} from '../i18n.js';
import {glossEnglish} from '../english-glossary.js';
import {VARIABLE_OPTIONS,ASSUMPTION_OPTIONS,EQUIPMENT_ART} from '../inquiry-content.js';
import {MC_QUESTIONS,EFFECTIVE_OPTIONS} from '../analysis.js';
import {generateResult,DEFAULT_POSITIONS,SAMPLES,DISC_MM,ACTUAL_REPLICATES} from '../model.js';
import {learningDiagram,referenceFor} from '../reports.js';
import {VARIABLE_REFERENCE,ASSUMPTION_REFERENCE,TOLERANCES,conclusionChecks} from '../rubric.js';
import {historyFigureMarkup} from '../history-figure.js';
import {LABELS,CONCEPTS,EXAMPLES,PROCEDURE_CARDS,supported} from './texts.js';
import {ALIGNMENT,WS_RUBRIC} from './alignment.js';
export const PAPER_VERSION=2;
export const PAPER_TASK_VERSION='VL4-WS-concept-first-2';
export const PAPER_SEEDS=Object.freeze([1001,1002,1003]);
export const translated=(key,language)=>{const value=L[key]||[key,key];return language==='en'?glossEnglish(value[1]):value[0];};
export function getPaperSource(language='zh'){
 if(!['zh','en'].includes(language))throw Error('Invalid paper language');
 const t=key=>translated(key,language),choices=options=>options.map(([id,key])=>({id,key,text:t(key)}));
 const plates=PAPER_SEEDS.map((seed,i)=>{const plate={id:`plate-${i+1}`,seed,discPositions:structuredClone(DEFAULT_POSITIONS)};generateResult(plate);return plate;});
 const rawMeasurements=Object.fromEntries(plates.map(plate=>[plate.id,Object.fromEntries(SAMPLES.map(sample=>[sample,{value:String(plate.result[sample])}]))]));
 const conclusionReference=conclusionChecks({plates,measurements:rawMeasurements});
 const labels=Object.fromEntries(Object.entries(LABELS).filter(([,v])=>Array.isArray(v)&&typeof v[0]==='string').map(([key,pair])=>[key,supported(pair,language)]));
 const compactTitles={observation:['初步觀察','Initial observation'],hypothesisEval:['假說評估','Hypothesis evaluation'],hypothesisApply:['另一情境假說','Hypothesis in another context'],controlPrompt:['對照解釋','Control explanation'],repeat:['獨立重複與可行性','Independent repeats and feasibility'],reflectionPrompt:['抗性選擇應用','Resistance-selection application']};
 const fieldNames={variables:t('variables'),assumptions:t('assumptionQuestion'),controlPrompt:labels.controlPrompt,design:labels.designTitle,repeat:labels.repeatCompare,procedure:labels.procedureTitle,measurements:t('measuring'),means:t('mean'),analysis:t('analysis'),...labels};
 const rubric=WS_RUBRIC.map(([id,max,criterion])=>({id,max,title:compactTitles[id]?supported(compactTitles[id],language):fieldNames[id]||id,criterion:supported(criterion,language)}));
 return {module:'VL4',version:PAPER_VERSION,taskVersion:PAPER_TASK_VERSION,language,text:Object.fromEntries(Object.keys(L).sort().map(key=>[key,t(key)])),labels,
 concepts:CONCEPTS.map(pair=>supported(pair,language)),examples:Object.fromEntries(Object.entries(EXAMPLES).map(([key,pair])=>[key,supported(pair,language)])),
 procedureCards:PROCEDURE_CARDS.map(([id,zh,en])=>({id,text:supported([zh,en],language)})),procedureOrder:['R','U','Q','T','S','P'],
 variables:choices(VARIABLE_OPTIONS),assumptions:choices(ASSUMPTION_OPTIONS),effective:choices(EFFECTIVE_OPTIONS),questions:MC_QUESTIONS.map(q=>({...q,text:t(q.key),choices:choices(q.options)})),
 equipment:EQUIPMENT_ART,history:historyFigureMarkup(),diagrams:learningDiagram(language),plates,conclusionReference,samples:SAMPLES,discMM:DISC_MM,replicates:ACTUAL_REPLICATES,
 variableReference:VARIABLE_REFERENCE,assumptionReference:ASSUMPTION_REFERENCE,tolerances:TOLERANCES,example:{sample:'S',diameter:16,disc:DISC_MM,left:12,right:28,readings:[12,16,20],mean:16},
 reference:{observation:referenceFor('observation',{plates},language),control:referenceFor('controlPlan',{plates},language),reflection:referenceFor('reflection',{plates},language)},
 rubric,maximum:WS_RUBRIC.reduce((n,row)=>n+row[1],0),minutes:{minimum:15,maximum:20,target:20,phases:[3,2,4,8,3]},
 alignment:ALIGNMENT.map(row=>({originalKeys:row.keys,original:row.keys.map(key=>t(key)).join(' ／ '),treatment:supported(row.treatment,language),target:row.target,newQuestion:labels[row.target]||t(row.target),goal:supported(row.goal,language),reason:supported(row.reason,language)})),
 teacherSteps:LABELS.steps.map(pair=>supported(pair,language))};
}
export const paperSources=()=>({zh:getPaperSource('zh'),en:getPaperSource('en')});
