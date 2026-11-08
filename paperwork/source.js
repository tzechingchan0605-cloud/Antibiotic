import {L} from '../i18n.js';
import {glossEnglish} from '../english-glossary.js';
import {VARIABLE_OPTIONS,ASSUMPTION_OPTIONS} from '../inquiry-content.js';
import {MC_QUESTIONS,EFFECTIVE_OPTIONS} from '../analysis.js';
import {generateResult,DEFAULT_POSITIONS,SAMPLES,DISC_MM,ACTUAL_REPLICATES} from '../model.js';
import {referenceFor} from '../reports.js';
import {VARIABLE_REFERENCE,ASSUMPTION_REFERENCE,TOLERANCES,V3_RUBRIC_ROWS,REFLECTION_CRITERIA} from '../rubric.js';
export const PAPER_VERSION=3,PAPER_TASK_VERSION='VL4-WS4-evidence-3',PAPER_SEEDS=Object.freeze([1001,1002,1003]);
export const translated=(key,lang)=>lang==='en'?glossEnglish(L[key]?.[1]??key):L[key]?.[0]??key;
export function getPaperSource(language='zh'){
 if(!['zh','en'].includes(language))throw Error('Invalid language');
 const t=key=>translated(key,language),en=language==='en',opts=rows=>rows.map(([id,key])=>({id,text:t(key)}));
 const plates=PAPER_SEEDS.map((seed,i)=>{const p={id:`plate-${i+1}`,seed,discPositions:structuredClone(DEFAULT_POSITIONS)};generateResult(p);return p;});
 const concepts=[
 ['抗生素可抑制生長或殺死某些細菌，主要用於[細菌感染]，不能治療病毒感染。MRSA 是耐甲氧西林金黃葡萄球菌，不代表對所有抗生素皆有抗性。','Antibiotics may inhibit growth or kill some bacteria. They treat [bacterial infections], not viral infections. MRSA means methicillin-resistant Staphylococcus aureus; this does not imply resistance to all antibiotics.'],
 ['抗生素由紙碟[向外擴散]，濃度通常隨距離下降；足以[抑制細菌生長]的範圍形成[清晰區]。沒有可見生長不代表所有細菌已死亡。','Antibiotic [diffuses outward] from a disc; concentration generally falls with distance. A [clear zone] forms where it can [inhibit bacterial growth]. No visible growth does not prove all bacteria have died.'],
 ['量度通過圓心的[總直徑]，包括 6 mm 紙碟；無紙碟外清晰區時選「沒有」並記 0 mm。三塊獨立平板分別量度，平均值＝三次讀數之和÷3。','Measure the [total diameter] through the centre, including the 6 mm disc. With no external zone, select No and record 0 mm. Measure three independent plates; mean = sum of three readings ÷ 3.'],
 ['群體原有[抗性差異]；抗性者較容易[存活、繁殖]並[遺傳抗性特徵]。比例可能上升，藥物效果可能下降；不是細菌主動產生所需抗性或患者本人變得抗藥。','The population has [pre-existing resistance differences]. Resistant bacteria are more likely to [survive and reproduce] and [pass on resistance traits]. Their proportion may rise and effectiveness may fall; bacteria do not purposefully develop needed resistance, and the patient does not become resistant.']
 ].map(pair=>pair[en?1:0]);
 const mapping=[['1.1','iv,dv,cv',t('variables'),'4'],['1.2','assumptions',t('assumptionQuestion'),'1'],['1.3','controlPlan',t('controlPlan'),'1'],['1.4','plannedReplicates,plannedReplicateReason',t('plannedReplicates')+' '+t('plannedReplicateReason'),'1'],['2.1','measurements',t('visible')+' / '+t('diameter'),'2'],['2.2','means',t('mean'),'1'],...MC_QUESTIONS.map(q=>['2.'+(q.number+2),q.id,t(q.key),'1']),['2.5','effectiveSamples,rank1–4',t('resultConclusion'),'1'],['3','reflection',t('reflectionQuestion'),'8']];
 return {module:'VL4',version:PAPER_VERSION,taskVersion:PAPER_TASK_VERSION,language,text:Object.fromEntries(Object.keys(L).sort().map(k=>[k,t(k)])),title:en?'WS4: Antibiotics and bacterial growth':'工作紙四：抗生素與細菌生長',concepts,variables:opts(VARIABLE_OPTIONS),assumptions:opts(ASSUMPTION_OPTIONS),effective:opts(EFFECTIVE_OPTIONS),questions:MC_QUESTIONS.map(q=>({...q,text:t(q.key),choices:opts(q.options)})),plates,samples:SAMPLES,discMM:DISC_MM,replicates:ACTUAL_REPLICATES,tolerances:TOLERANCES,variableReference:VARIABLE_REFERENCE,assumptionReference:ASSUMPTION_REFERENCE,
 reflection:t('reflectionQuestion').replaceAll('學習重點','課題需知').replaceAll('learning points','topic notes'),reference:{control:referenceFor('controlPlan',{plates},language),reflection:referenceFor('reflection',{plates},language)},rubric:V3_RUBRIC_ROWS,reflectionCriteria:REFLECTION_CRITERIA,mapping,wsMaximum:24,vlMaximum:29};
}
export const paperSources=()=>({zh:getPaperSource('zh'),en:getPaperSource('en')});
