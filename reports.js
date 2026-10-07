import ExcelJS from 'exceljs';
import {clearZoneDiameter} from './model.js';
import { L } from './i18n.js';
import { SAMPLE_IDS, TOLERANCES, VARIABLE_REFERENCE, controlVariableReference, ASSUMPTION_REFERENCE, SCORE_COLUMNS, RUBRIC_ROWS, actualReplicates, finiteNumber, objectiveChecks, readingCheck, studentMean, meanCheck, graphCheck, automaticScores } from './rubric.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const tr = (language, zh, en) => language === 'en' ? en : zh;
const dateText = (value, language = 'zh') => {
  if (!value) return tr(language, '未提交', 'Not submitted');
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(language === 'en' ? 'en-GB' : 'zh-HK', { timeZone: 'Asia/Hong_Kong', hour12: false }) : String(value);
};
const imagePattern = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const sampleName = (sample, language) => sample === 'C' ? tr(language, 'C（對照）', 'C (control)') : sample;
const notAnswered = language => tr(language, '未回答', 'Not answered');

export const ANSWER_FIELDS = [
  ['observation', ...L.observation, 'observing'],
  ['prediction', '你預測哪些樣本會出現紙碟外的可見清晰區？', 'Which samples do you predict will have a visible zone outside the disc?', 'designing'],
  ['largestPrediction', ...L.largestPrediction, 'designing'],
  ['reason', ...L.hypothesisReason, 'designing'],
  ['iv', '獨立變量：本次改變甚麼？', 'Independent variable: what do we change?', 'classifying'],
  ['dv', '因變量：本次觀察及量度甚麼？', 'Dependent variable: what do we observe and measure?', 'classifying'],
  ['cv', '控制變量：哪些條件保持相同？', 'Controlled variables: what stays the same?', 'classifying'],
  ['assumptions', '探究假設', 'Assumptions for a fair investigation', 'designing'],
  ['controlPlan', ...L.controlPlan, 'designing'],
  ['designDescription', '瓊脂板位置及實驗設計文字', 'Plate positions and experiment setup', 'conducting'],
  ['plannedReplicates', ...L.plannedReplicates, 'designing'],
  ['plannedReplicateReason', ...L.plannedReplicateReason, 'designing'],
  ['analysisControl', 'C（對照）的生長情況如何？它提供甚麼比較基礎？', 'What growth is visible around C (control)? What comparison does it provide?', 'inferring'],
  ['analysisConsistent', '哪些樣本在三次測試均出現可見清晰區？', 'Which samples show a visible zone in all three tests?', 'inferring'],
  ['analysisVariation', '同一樣本的三次結果是否一致？請引用數據。', 'Are the three results for each sample consistent? Use your data.', 'inferring'],
  ['analysisMethod', '如果差異較大，需要檢查哪些操作或條件？', 'If the results vary greatly, which methods or conditions should you check?', 'conducting'],
  ['analysisHypothesis', '結果如何支持或不支持你的假說？', 'How do the results support or challenge your hypothesis?', 'inferring'],
  ['analysisRepeatPlan', '原始重複安排與本次三次測試相比，有何需要修訂？', 'How would you revise your original repeat plan after these three tests?', 'inferring'],
  ['analysisRepeatValue', '重複怎樣幫助判斷一致性？不穩定時先檢查方法還是再測試？', 'How do repeats help you judge consistency? If results remain unstable, should you check the method or do more tests?', 'inferring'],
  ['analysisDeath', '沒有可見生長，能否證明細菌全部死亡？', 'Does no visible growth prove that all the bacteria are dead?', 'inferring'],
  ['analysisClinical', '最大清晰區是否一定代表臨床治療最佳？', 'Does the largest zone necessarily indicate the best clinical treatment?', 'inferring'],
  ['conclusion', '你的結論：條件、獨立次數、證據與推論界線', 'Your conclusion: conditions, independent tests, evidence and limits', 'communicating'],
  ['knowledgeBacteria', '抗生素主要針對甚麼？', 'What do antibiotics act against?', 'knowledge'],
  ['knowledgeResistance', '抗藥性描述誰對藥物的反應？', 'Whose response to a drug does resistance describe?', 'knowledge'],
  ['knowledgeLimits', '清晰區及重複測試能支持甚麼？', 'What can zones and repeated tests support?', 'knowledge'],
  ['reflection', ...L.reflectionQuestion, 'knowledge']
];

const CHOICES = {
  sample: ['紙碟所含樣本', 'The sample carried by each disc'], zone: ['有無可見清晰區及清晰區總直徑', 'Visible zone presence and total zone diameter'],
  strain: ['同一種模擬細菌', 'The same simulated bacterial strain'], distribution: ['可比較的初始細菌分布', 'Comparable initial bacterial distribution'],
  medium: ['相同培養基條件', 'The same agar conditions'], disc: ['相同紙碟大小', 'The same disc size'], preparation: ['各樣本預設製備條件', 'Preset sample preparation conditions'], observation: ['相同模擬培養及觀察條件', 'The same simulated incubation and observation conditions'],
  sterile: ['器材不會帶入額外污染', 'Equipment does not add contamination'], sameConditions: ['各瓊脂板採用相同模擬條件', 'The plates use the same simulated conditions'], death: ['没有可見生長必定代表全部死亡', 'No visible growth must mean all bacteria are dead'],
  all: ['全部樣本', 'All samples'], some: ['部分樣本', 'Some samples'], none: ['都不會', 'No samples'], yes: ['會', 'Yes'], no: ['不會', 'No'],
  cannot: ['不能', 'Cannot'], can: ['能', 'Can'], bacteria: ['細菌', 'Bacteria'], viruses: ['病毒', 'Viruses'], body: ['人的身體', 'The human body'],
  limited: ['局部可見生長受到抑制，重複可檢查一致性；仍有推論限制', 'Local visible growth is inhibited; repeats check consistency, with limits on inference'], guaranteed: ['最大清晰區及三次測試保證最佳治療', 'The largest zone and three repeats guarantee the best treatment']
};
const choiceFields = new Set(['prediction','largestPrediction', 'iv', 'dv', 'cv', 'assumptions',  'analysisDeath', 'analysisClinical', 'knowledgeBacteria', 'knowledgeResistance', 'knowledgeLimits']);
const variableKeys = {sample:'vSample',zone:'vZone',strain:'vStrain',distribution:'vDistribution',medium:'vMedium',disc:'vDisc',preparation:'vPreparation',observation:'vObservation'};
const fieldChoiceKeys = {
  prediction:{X:'predictionX',Y:'predictionY',Z:'predictionZ',X_Y:'predictionXY',X_Z:'predictionXZ',Y_Z:'predictionYZ',all:'all',some:'some',none:'none'},largestPrediction:{na:'notApplicable'},iv:variableKeys,dv:variableKeys,cv:variableKeys,
  assumptions:{distribution:'assumptionDistribution',sterile:'assumptionSterile',sameConditions:'assumptionSame',death:'assumptionDeath'},
  analysisDeath:{can:'can',cannot:'cannot'},analysisClinical:{can:'can',cannot:'cannot'},
  knowledgeBacteria:{bacteria:'bacteria',viruses:'viruses'},knowledgeResistance:{bacteria:'resistanceBacteria',body:'resistanceBody'},knowledgeLimits:{limited:'limited',best:'bestDrug'}
};
export function answerDisplay(field, value, language = 'zh') {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return notAnswered(language);
  if (Array.isArray(value)) return value.map(item => answerDisplay(field, item, language)).join(tr(language, '；', '; '));
  const label = L[fieldChoiceKeys[field]?.[value]] || (choiceFields.has(field) && CHOICES[value]);
  return label ? (field==='prediction'&&['X','Y','Z','X_Y','X_Z','Y_Z'].includes(value)&&language!=='en'?label[0].replace(/的$/, ''):label[language === 'en' ? 1 : 0]) : String(value);
}
function referenceFor(field, record, language) {
  const refs = {
    observation: ['青黴菌（真菌）附近有清晰區，即沒有可見細菌生長的區域；這是觀察，原因仍需比較。', 'A clear zone with no visible bacterial growth is present near Penicillium (a fungus). This is an observation; its cause needs testing.'],
    prediction: ['合理可測試的實驗前預測可以與結果不同；預測可以與結果不同；合理的推測不需猜中。', 'A reasonable testable prediction may differ from the results. A reasoned prediction does not have to match the outcome.'],
    largestPrediction: ['根據擴散及細菌生長提出合理預測；若預測沒有清晰區，可選不適用。預測大小不需猜中結果。', 'Give a reasoned prediction based on diffusion and bacterial growth. Choose not applicable if you predict no clear zones. The prediction need not match the result.'],
    reason: ['說明與細菌生長及可觀察現象相關的理由。', 'Explain a reason related to bacterial growth and observable evidence.'],
    controlPlan: ['用相同載體但不含抗生素的紙碟，排除載體／紙碟影響；其餘條件保持相同。只有所有載體都是水時才稱水對照。', 'Use a matching carrier-only disc without antibiotic to check carrier/disc effects, with other conditions the same. Call it a water control only if every carrier is water.'],
    designDescription: ['清楚標示樣本與對照，留足間距及邊緣距離，避免清晰區互相干擾；可用圖像或文字表達。', 'Label each sample and control and allow enough space between discs and from the edge to avoid overlapping zones. A drawing or written setup is acceptable.'],
    plannedReplicates: ['次數包括第一次。選三次不是標準答案；次數多不保證可靠。', 'Include the first test. Three is not a required correct answer; more repeats do not guarantee reliability.'],
    plannedReplicateReason: ['考慮一致性、變異、公平比較及課堂可行性。', 'Consider consistency, variation, fair comparisons and practical feasibility.'],
    analysisControl: ['本模型的 C（對照）沒有紙碟外清晰區；清晰區的總直徑記為 0 mm。它提供不含抗生素的比較基礎。', 'The model C (control) has no visible zone outside the disc. Its clear-zone diameter is recorded as 0 mm. It provides an antibiotic-free comparison.'],
    analysisConsistent: ['依三片瓊脂板實際資料判斷。本模型 X、Z 各次有外圍清晰區，Y 及 C（對照）沒有。', 'Use all three plate records. In this model, X and Z have visible zones in each test; Y and C (control) do not.'],
    analysisVariation: ['引用自己的三次讀數，分開結果趨勢與瓊脂板間變異。', 'Quote your three readings and distinguish a consistent pattern from variation between plates.'],
    analysisMethod: ['可檢查初始分布、污染、紙碟位置、製備及共同觀察條件；結果不穩定時先查方法，再考慮額外測試。', 'Check initial distribution, contamination, disc positions, preparation and shared observation conditions. Investigate unstable methods before considering more tests.'],
    analysisHypothesis: ['以自己的樣本／對照及重複結果評估原始假說。未獲支持仍可作有證據的修訂。', 'Evaluate your original hypothesis using your sample–control and repeated results. An unsupported hypothesis can still lead to an evidence-based revision.'],
    analysisRepeatPlan: ['對照自己原始安排，說明保留或修訂的理由。', 'Compare your original plan and explain why you would keep or revise it.'],
    analysisRepeatValue: ['獨立重複可評估一致性及變異；三次是課堂安排，不是可靠性保證。', 'Independent repeats help assess consistency and variation. Three tests are a classroom arrangement, not a guarantee of reliability.'],
    analysisDeath: ['不能。沒有可見生長不能區分殺菌與抑菌，也不能證明全部細菌死亡。', 'Cannot. No visible growth cannot distinguish killing from growth inhibition or prove that all bacteria are dead.'],
    analysisClinical: ['不能。擴散特性、紙碟含量、特定種類的細菌及測試條件會影響結果；不能從最大清晰區選最佳患者治療。', 'Cannot. Diffusion, disc content, the strain and test conditions affect the result. The largest zone cannot identify the best treatment for a patient.'],
    conclusion: ['在本模擬條件下以數據比較樣本與對照；可支持局部可見生長受抑制，不能確定全部死亡、作用機制或最佳治療，也不能推廣至所有 MRSA。', 'Compare samples with the control under these simulated conditions. Evidence may support local inhibition of visible growth, but not complete killing, a mechanism, the best treatment or a generalisation to all MRSA.'],
    knowledgeBacteria: ['抗生素針對細菌，不能治療病毒引起的傷風或流感。', 'Antibiotics act against bacteria; they do not treat viral colds or influenza.'],
    knowledgeResistance: ['抗藥性描述細菌對藥物的反應；不是人的身體習慣抗生素。', 'Resistance describes the bacterial response to a drug, not a human body becoming used to antibiotics.'],
    knowledgeLimits: ['清晰區支持局部可見生長受抑制；重複檢查一致性，不保證可靠或最佳治療。', 'A visible zone supports local inhibition of visible growth. Repeats check consistency; they do not guarantee reliability or the best treatment.'],
    reflection: ['引用至少一項樣本／對照比較和獨立重複結果，連結原始假說及重複安排，以學習重點完善解釋及界定仍未知的事項。', 'Use at least one sample–control comparison and independent repeated results. Link these to your original hypothesis and repeat plan, using learning points to improve your explanation and identify uncertainties.']
  };
  if (field === 'iv') return answerDisplay(field, VARIABLE_REFERENCE.iv, language);
  if (field === 'dv') return answerDisplay(field, VARIABLE_REFERENCE.dv, language);
  if (field === 'cv') return answerDisplay(field, controlVariableReference(record), language);
  if (field === 'assumptions') return answerDisplay(field, ASSUMPTION_REFERENCE, language);
  return refs[field]?.[language === 'en' ? 1 : 0] || '';
}
const markHTML = (check, language) => check === null || check === undefined ? '' : `<span class="check ${check ? 'correct' : 'incorrect'}" aria-label="${tr(language, check ? '符合參考' : '不符合參考', check ? 'Matches reference' : 'Does not match reference')}">${check ? '✓' : '✕'}</span>`;
function reportAnswer(record, field, value, language, withReference = true) {
  const definition = ANSWER_FIELDS.find(item => item[0] === field);
  const shown = answerDisplay(field, value, language);
  const submitted = !!record.submittedAt;
  const checks = objectiveChecks({ ...record, answers: { ...record.answers, [field]: value } });
  const reference = submitted && withReference ? referenceFor(field, record, language) : '';
  return `<div class="answer"><h3>${esc(definition?.[language === 'en' ? 2 : 1] || field)}</h3><p class="student-answer">${esc(shown)} ${submitted && withReference ? markHTML(checks[field], language) : ''}</p>${reference ? `<p class="reference"><strong>${tr(language, '參考說明：', 'Reference: ')}</strong>${esc(reference)}</p>` : ''}</div>`;
}

export function learningDiagram(language = 'zh') {
  const t = (zh, en) => tr(language, zh, en);
  return `<div class="science-diagram"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 285" role="img" aria-label="${t('紙碟擴散及細菌結構與抗生素作用位置的簡化示意', 'Simplified disc diffusion and bacterial structures targeted by antibiotics')}">
    <defs><marker id="vl4-science-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#087b78"/></marker></defs>
    <rect x="4" y="4" width="444" height="276" rx="16" fill="#f2faf7" stroke="#bddfd8"/><rect x="463" y="4" width="453" height="276" rx="16" fill="#f4f7fc" stroke="#c8d7ea"/>
    <text x="24" y="32" font-size="16" font-weight="bold" fill="#15333b">${t('A. 樣本擴散與可見清晰區', 'A. Diffusion and the visible zone')}</text>
    <circle cx="120" cy="150" r="93" fill="#ddd9ae" stroke="#6e897b"/><circle cx="120" cy="150" r="54" fill="#f8faec" stroke="#b4bda3" stroke-dasharray="4 4"/>
    <g fill="#79815c">${[[65,94],[178,107],[51,166],[174,203],[96,221],[180,165],[109,77],[80,194]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g><circle cx="120" cy="150" r="12" fill="#fff" stroke="#5e7475"/>
    <g fill="none" stroke="#087b78" stroke-width="2" marker-end="url(#vl4-science-arrow)"><path d="M134 150H162"/><path d="M106 150H79"/><path d="M120 135V111"/><path d="M120 165V189"/></g>
    <g font-size="14" fill="#15333b"><text x="237" y="84">${t('① 紙碟承載樣本', '① Disc carries the sample')}</text><path d="M233 90L132 144" fill="none" stroke="#698a87"/>
    <text x="237" y="134">${t('② 向瓊脂擴散', '② Diffusion through agar')}</text><path d="M233 140L164 150" fill="none" stroke="#698a87"/>
    <text x="237" y="189">${t('③ 少或無可見生長', '③ Little or no visible growth')}</text><path d="M233 195L151 178" fill="none" stroke="#698a87"/>
    <text x="24" y="263" font-size="12">${t('示意圖，非按比例；不能證明細菌全部死亡。', 'Schematic, not to scale; it does not prove complete killing.')}</text></g>
    <text x="483" y="32" font-size="16" font-weight="bold" fill="#15333b">${t('B. 細菌結構與可能作用位置', 'B. Structures and possible action sites')}</text>
    <rect x="493" y="100" width="220" height="104" rx="52" fill="#d5e5f8" stroke="#597fb1" stroke-width="8"/><rect x="504" y="111" width="198" height="82" rx="40" fill="#f4f0d4" stroke="#8e9f82" stroke-width="4"/>
    <path d="M550 151C560 124 599 179 618 143S653 169 669 143" fill="none" stroke="#a6699c" stroke-width="4"/>
    <g fill="#cb995b"><circle cx="535" cy="142" r="4"/><circle cx="556" cy="171" r="4"/><circle cx="638" cy="176" r="4"/><circle cx="659" cy="124" r="4"/></g>
    <g fill="#15333b" font-size="14"><text x="735" y="82">${t('① 細胞壁形成', '① Cell wall formation')}</text><path d="M729 86L702 109" stroke="#597fb1" fill="none"/>
    <text x="735" y="127">${t('② 細胞膜', '② Cell membrane')}</text><path d="M729 132L698 136" stroke="#8e9f82" fill="none"/>
    <text x="735" y="176">${t('③ 蛋白質合成', '③ Protein synthesis')}</text><path d="M729 180L642 176" stroke="#cb995b" fill="none"/>
    <text x="735" y="223">${t('④ 核酸合成', '④ Nucleic acid synthesis')}</text><path d="M729 227H610V181L609 157" stroke="#a6699c" fill="none"/>
    <text x="483" y="263" font-size="12">${t('這些機制並非本次紙碟結果直接證明。', 'These mechanisms are not proved by this disc experiment.')}</text></g>
  </svg></div>`;
}
export function learningPointsHTML(language = 'zh') {
  const points = [
    ['不同抗生素可能影響細胞壁、細胞膜、蛋白質或核酸合成；這是補充知識，不是本次圈大小直接證明的機制。', 'Different antibiotics may affect the cell wall, cell membrane, protein synthesis or nucleic acid synthesis. These are additional concepts, not mechanisms proved by zone size here.'],
    ['抗藥性描述細菌對藥物的反應，不是人的身體習慣抗生素。', 'Resistance describes the bacterial response to a drug, not the human body becoming used to antibiotics.'],
    ['抗生素可令原有抗藥細菌較易存活及繁殖；細菌不會有目的地決定適應。', 'Antibiotics can favour the survival and reproduction of existing resistant bacteria. Bacteria do not deliberately choose to adapt.'],
    ['圈大小支持局部可見生長受抑制，不能證明全部死亡、特定作用機制或最佳患者治療。擴散特性及紙碟含量亦會影響圈大小。', 'A zone supports local inhibition of visible growth. It does not prove complete killing, a specific mechanism or the best treatment. Diffusion and disc content also affect its size.'],
    ['没有紙碟外清晰區只表示本條件下未見抑菌作用；未知樣本不使用共同圈大小界線判定臨床敏感或抗藥，也不能由一株菌推廣至所有 MRSA。', 'No outer zone means no inhibition was observed under these conditions. No common zone-size cutoff is used to classify the unknown samples clinically, and one strain cannot represent all MRSA.'],
    ['新瓊脂板的獨立重複可檢查一致性及變異。重新量度同一清晰區不是獨立重複；三次是課堂安排，不保證可靠。', 'Independent repeats on new plates check consistency and variation. Remeasuring one zone is not an independent repeat. Three tests are a classroom arrangement, not a guarantee of reliability.']
  ];
  const review = [L.fact1, L.fact2, L.fact3, L.fact4];
  const langIndex = language === 'en' ? 1 : 0;
  return `<aside class="note learning-review"><h3>${esc(L.learningReview[langIndex])}</h3><ul class="learning-list">${review.map(point=>`<li>${esc(point[langIndex])}</li>`).join('')}</ul></aside>${learningDiagram(language)}<ul class="learning-list">${points.map(point => `<li>${esc(point[langIndex])}</li>`).join('')}</ul>`;
}

function reportGraph(record, language) {
  const max = 40, height = 160, base = 210;
  const bars = SAMPLE_IDS.map((sample, index) => {
    const value = finiteNumber(record.graph?.values?.[sample]), x = 108 + index * 118;
    const safe = value === null ? 0 : Math.max(0, Math.min(max, value));
    return `<rect x="${x}" y="${base - safe / max * height}" width="60" height="${safe / max * height}" fill="${sample === 'C' ? '#8f9fa5' : '#3a9690'}"/><text x="${x + 30}" y="${base - safe / max * height - 9}" text-anchor="middle" font-size="13">${value === null ? '—' : esc(value)}</text><text x="${x + 30}" y="235" text-anchor="middle" font-size="12">${esc(sampleName(sample, language))}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="report-graph" viewBox="0 0 630 275" role="img" aria-label="${tr(language, '學生確認的平均清晰區總直徑棒形圖', 'Student-confirmed bar chart of mean total zone diameter')}"><text x="26" y="20" font-size="13">${tr(language, '平均清晰區總直徑（mm）', 'Mean total zone diameter (mm)')}</text>${[0,10,20,30,40].map(value=>`<line x1="65" y1="${base-value/max*height}" x2="594" y2="${base-value/max*height}" stroke="#dce9e7"/><text x="54" y="${base-value/max*height+4}" text-anchor="end" font-size="12">${value}</text>`).join('')}<path d="M65 45V210H595" fill="none" stroke="#45656c"/>${bars}<text x="330" y="264" text-anchor="middle" font-size="13">${tr(language, '紙碟所含樣本', 'Sample carried by the disc')}</text></svg>`;
}
function reportPlate(plate, language) {
  const positions = { X: { x: 126, y: 126 }, Y: { x: 274, y: 126 }, Z: { x: 126, y: 274 }, C: { x: 274, y: 274 }, ...plate.discPositions };
  return `<figure class="plate-figure"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${esc(tr(language, `瓊脂板 ${plate.id} 的固定模擬觀察`, `Fixed simulated observation for plate ${plate.id}`))}"><circle cx="200" cy="200" r="160" fill="#d8d5a6" stroke="#839976" stroke-width="4"/>${SAMPLE_IDS.map(sample => { const pos = positions[sample], diameter = clearZoneDiameter(plate,sample) ?? 0; return `<circle cx="${Number(pos.x)}" cy="${Number(pos.y)}" r="${diameter}" fill="#f8faed"/><circle cx="${Number(pos.x)}" cy="${Number(pos.y)}" r="6" fill="#fff" stroke="#52726d"/><text x="${Number(pos.x)}" y="${Number(pos.y)+4}" text-anchor="middle" font-size="10">${sample}</text>`; }).join('')}</svg><figcaption>${esc(plate.id)} · ${tr(language, '固定教學模擬觀察，非臨床校準圖', 'Fixed teaching-model observation; not clinically calibrated')}</figcaption></figure>`;
}

export function renderReport(record, language = 'zh') {
  language = language === 'en' ? 'en' : 'zh';
  const a = record.answers || {}, original = record.original || {}, first = { ...original.answers, plannedReplicates: original.plannedReplicates ?? original.answers?.plannedReplicates, plannedReplicateReason: original.plannedReplicateReason ?? original.answers?.plannedReplicateReason };
  const t = (zh, en) => tr(language, zh, en);
  const submitted = !!record.submittedAt;
  const section = (title, content) => `<section class="report-section"><h2>${esc(title)}</h2><div class="report-card">${content}</div></section>`;
  const fields = keys => keys.map(field => reportAnswer(record, field, a[field], language)).join('');
  const originalFields = ['observation','prediction','largestPrediction','reason','iv','dv','cv','assumptions','controlPlan','designDescription','plannedReplicates','plannedReplicateReason'];
  const rows = (record.plates || []).flatMap(plate => SAMPLE_IDS.map(sample => {
    const reading = record.measurements?.[plate.id]?.[sample] || {}, start = reading.first || {}, last = reading.last || reading;
    const check = readingCheck(record, plate, sample, reading);
    const presence = value => value === 'yes' ? t('有', 'Yes') : value === 'no' ? t('無', 'No') : '—';
    const numeric = value => finiteNumber(value) === null ? '—' : esc(value);
    return `<tr><td>${esc(plate.id)}</td><td>${esc(sampleName(sample, language))}</td><td>${presence(start.visible)} / ${numeric(start.value)}<small>${esc(start.note || '')}</small></td><td>${presence(last.visible)} / ${numeric(last.value)}<small>${esc(last.note || '')}</small></td><td>${presence(reading.visible)} / ${numeric(reading.value)} ${submitted ? markHTML(check, language) : ''}<small>${esc(reading.note || '')}</small></td><td>${submitted ? esc(clearZoneDiameter(plate,sample) ?? '—') : '—'}</td><td>${(reading.revisions || []).length}</td></tr>`;
  })).join('');
  const readingsTable = `<p>${t('清晰區的總直徑以 mm 記錄；沒有可見清晰區時記為 0。', 'Record total clear-zone diameter in mm; record 0 when no clear zone is visible.')}</p><div class="table-wrap"><table><thead><tr>${[t('瓊脂板','Plate'),t('樣本','Sample'),t('首次：圈／mm','First: zone/mm'),t('最後快照：圈／mm','Latest snapshot: zone/mm'),t('目前讀數：圈／mm','Current: zone/mm'),t('參考 mm','Reference mm'),t('修訂次數','Revisions')].map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="reference">${t('量度檢核容差 ±1 mm；首次及最後讀數保留，不會自動改寫。', 'Reading tolerance: ±1 mm. First and latest readings are retained and never automatically replaced.')}</p>`;
  const meansTable = `<table><thead><tr>${[t('樣本','Sample'),t('學生平均值（mm）','Student mean (mm)'),t('依自己的讀數計算','Calculated from own readings'),t('確認棒高（mm）','Confirmed bar height (mm)')].map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${SAMPLE_IDS.map(sample=>`<tr><td>${esc(sampleName(sample, language))}</td><td>${esc(a.means?.[sample] ?? record.means?.[sample] ?? '—')} ${submitted ? markHTML(meanCheck(record,sample),language) : ''}</td><td>${submitted && studentMean(record,sample) !== null ? studentMean(record,sample).toFixed(1) : '—'}</td><td>${esc(record.graph?.values?.[sample] ?? '—')} ${submitted ? markHTML(graphCheck(record,sample),language) : ''}</td></tr>`).join('')}</tbody></table><p class="reference">${t('平均值按自己的最後讀數檢核（±0.1 mm）；圖表按自己的已輸入平均值檢核（±0.5 mm），避免同一量度錯誤重複扣核。', 'Means are checked against your own latest readings (±0.1 mm). Bars are checked against your entered means (±0.5 mm), avoiding repeated penalties for one reading error.')}</p>`;
  const designImage = imagePattern.test(record.design?.image || '') ? `<img class="design-image" src="${esc(record.design.image)}" alt="${t('學生瓊脂板位置及實驗設計圖','Student drawing of disc positions and experiment setup')}">` : '';
  const originalDesignImage = imagePattern.test(original.design?.image || '') ? `<img class="design-image" src="${esc(original.design.image)}" alt="${t('首次確認的學生實驗設計圖','First-confirmed student experiment setup drawing')}">` : '';
  const extension = record.extension || {};
  const extensionLabels = { prediction: ['預測','Prediction'], reason:['理由','Reason'],fairComparison:['公平比較','Fair comparison'],results:['實際模擬結果','Simulated results'],analysis:['分析及界線','Analysis and limits'] };
  const extensionHTML = extension.started ? Object.entries(extensionLabels).map(([field,label])=>`<h3>${label[language === 'en'?1:0]}</h3><p class="student-answer">${esc(typeof extension[field] === 'object' ? JSON.stringify(extension[field]) : extension[field] || notAnswered(language))}</p>`).join('') + `<p class="reference">${t('只比較同一樣本預設低／中／高紙碟含量的模型圈大小；不能轉成患者用藥劑量建議。','This compares model zones for preset low/medium/high disc contents of one sample. It cannot provide patient dosing advice.')}</p>` : `<p>${t('未開始；選做延伸不影響主探究遞交。','Not started. This optional extension does not affect submission of the main inquiry.')}</p>`;
  const totalSeconds = Math.round(Object.values(record.timing || {}).reduce((sum,value)=>sum+(Number(value)||0),0));
  return `<article class="vl4-report" lang="${language === 'en' ? 'en' : 'zh-Hant-HK'}"><header class="report-cover"><div class="report-brand">IBL · VL4 · ${t('生物','Biology')}</div><h1>${t('抗生素研究任務：哪些樣本能抑制細菌生長？','Antibiotic investigation: which samples inhibit bacterial growth?')}</h1><p>${t('個人學習紀錄','Personal learning record')}${record.demo ? ` · ${t('教師示範','Teacher demonstration')}` : ''}</p></header>
  <div class="report-meta"><span>${t('姓名','Name')}：${esc(record.profile?.name || '—')}</span><span>${t('班別及學號','Class and number')}：${esc(record.profile?.className || record.profile?.classInfo || '—')}</span><span>${t('電郵','Email')}：${esc(record.profile?.email || '—')}</span><span>${t('探究遞交','Inquiry submitted')}：${esc(dateText(record.submittedAt,language))}</span><span>${t('反思提交','Reflection submitted')}：${esc(dateText(record.reflectionSubmittedAt,language))}</span><span>${t('有效操作時間','Active time')}：${Math.floor(totalSeconds/60)} ${t('分','min')} ${totalSeconds%60} ${t('秒','s')}</span></div>
  <p class="simulation-note">${t('所有圖像與結果均為虛擬教學模擬，不能用作患者治療或臨床敏感性判定。歷史觀察是葡萄球菌，不是 MRSA；MRSA 首次正式報告於 1961 年。','All images and results are virtual teaching simulations. They cannot determine patient treatment or clinical susceptibility. Fleming’s historical plates contained staphylococci, not MRSA; MRSA was first formally reported in 1961.')}</p>
  ${section(t('01 了解情境：你的初步觀察','01 Context: your initial observations'),fields(['observation']))}
  ${section(t('02 你的原始研究計劃（首次確認快照）','02 Your original research plan (first confirmed snapshot)'),`<p>${t('保存時間','Captured')}：${esc(dateText(original.capturedAt,language))}</p>${originalFields.map(field=>reportAnswer(record,field,first[field],language,false)).join('')}${originalDesignImage}<p>${t('實際課堂安排：3 片分別準備的瓊脂板，每片含 X、Y、Z 及 C（對照）。學生原始建議與課堂安排分開保留；3 次不保證可靠。','Classroom arrangement: three separately prepared plates, each with X, Y, Z and a C (control). The original proposal is retained separately; three tests do not guarantee reliability.')}</p>`)}
  ${section(t('02 最新設計、假說及對照','02 Latest setup, hypothesis and control'),fields(['prediction','largestPrediction','reason','iv','dv','cv','assumptions','controlPlan','designDescription','plannedReplicates','plannedReplicateReason']) + designImage + (record.design?.description ? `<p class="student-answer">${esc(record.design.description)}</p>` : ''))}
  ${section(t('03 三片獨立瓊脂板的觀察及量度','03 Observations and readings from independent plates'),`<p>${t('已產生結果的獨立瓊脂板數','Independent plates with generated results')}：${actualReplicates(record)}</p><div class="plate-grid">${(record.plates || []).filter(plate=>plate.result).map(plate=>reportPlate(plate,language)).join('')}</div>${readingsTable}`)}
  ${section(t('04 你的平均值及圖表','04 Your means and chart'),meansTable + reportGraph(record,language) + `<p>${t('圖表確認時間','Chart confirmed')}：${esc(dateText(record.graph?.confirmedAt,language))}</p>`)}
  ${section(t('04 分析及結論','04 Analysis and conclusion'),fields(['analysisControl','analysisConsistent','analysisVariation','analysisMethod','analysisHypothesis','analysisRepeatPlan','analysisRepeatValue','analysisDeath','analysisClinical','conclusion']))}
  ${section(t('可選延伸：同一樣本的紙碟含量','Optional extension: disc content of one sample'),extensionHTML)}
  ${submitted ? section(t('遞交後的學習重點','Learning points after submission'),learningPointsHTML(language)+fields(['knowledgeBacteria','knowledgeResistance','knowledgeLimits'])) : ''}
  ${section(t('學習反思','Learning reflection'),reportAnswer(record,'reflection',a.reflection,language))}
  <footer class="report-footer">${t('✓／✕ 只用於有明確參考的項目；開放題附參考說明，由教師閱讀。學生原文不因語言切換而改寫。','✓/✕ apply only to items with an explicit reference. Open responses have reference notes for teacher review. Student text is preserved when the language changes.')}<br>${t('紀錄識別碼','Record ID')}：${esc(record.id)}</footer></article>`;
}

export const REPORT_CSS = `*{box-sizing:border-box}body{margin:0;color:#15333b;font-family:Arial,"Noto Sans TC",sans-serif;font-size:12px;line-height:1.65;background:#f5f9f7}.vl4-report{max-width:1000px;margin:24px auto;padding:28px;background:white}.report-cover{border-left:7px solid #087b78;padding:16px 22px;background:#edf7f3}.report-cover h1{font-size:24px;line-height:1.35;margin:8px 0}.report-brand{letter-spacing:.08em;color:#087b78}.report-meta{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:15px 0}.simulation-note,.reference{color:#536d74;font-size:11px}.simulation-note{border:1px solid #dce9e7;padding:10px;border-radius:8px}.report-section{margin:20px 0}.report-section h2{font-size:17px;color:#087b78;border-bottom:2px solid #dce9e7;padding-bottom:6px;break-after:avoid}.report-card{border:1px solid #dce9e7;border-radius:12px;padding:16px;background:#fcfefc}.answer{padding:8px 0;border-bottom:1px solid #ecf2ef;break-inside:avoid}.answer h3,h3{font-size:12px;margin:0 0 4px;font-weight:700}.student-answer{white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0}.reference{margin:5px 0}.check{font-weight:bold;margin-left:5px}.correct{color:#167645}.incorrect{color:#ae3434}table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed}th,td{padding:7px;border:1px solid #dce9e7;vertical-align:top;overflow-wrap:anywhere}th{background:#edf7f3}td small{display:block;white-space:pre-wrap}thead{display:table-header-group}tr{break-inside:avoid}.design-image{display:block;max-height:330px;max-width:100%;object-fit:contain;margin:16px auto}.science-diagram svg,.report-graph{display:block;width:100%;height:auto}.science-diagram{break-inside:avoid;margin:10px 0}.plate-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.plate-figure{margin:0;break-inside:avoid}.plate-figure svg{width:100%;height:auto}.plate-figure figcaption{font-size:10px}.learning-list{padding-left:20px}.learning-list li{margin:8px 0;break-inside:avoid}.report-footer{font-size:10px;color:#658087;border-top:1px solid #dce9e7;padding-top:10px}@page{size:A4;margin:13mm}@media print{body{background:white}.vl4-report{margin:0;padding:0;max-width:none}.report-card{border-radius:8px}.report-cover{break-inside:avoid}.report-cover h1{font-size:22px}.report-section{margin:14px 0}.plate-grid{gap:8px}.report-meta{font-size:10px}a{color:inherit}}`;
export function reportFilename(record, language = 'zh') {
  return `${tr(language,'VL4_抗生素研究任務','VL4_Antibiotic_Investigation')}_${record.profile?.className || record.profile?.classInfo || ''}_${record.profile?.name || ''}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');
}
export async function openPrintReport(record, language = 'zh') {
  if (!record.reflectionSubmittedAt) throw new Error(tr(language,'請先儲存並提交學習反思，才可列印／儲存 PDF。','Save and submit your reflection before printing or saving a PDF.'));
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) throw new Error(tr(language,'請允許此網站開啟列印視窗。','Allow this site to open the print window.'));
  reportWindow.document.write(`<!doctype html><html lang="${language === 'en'?'en':'zh-Hant-HK'}"><head><meta charset="UTF-8"><title>${esc(reportFilename(record,language))}</title><style>${REPORT_CSS}</style></head><body>${renderReport(record,language)}</body></html>`);
  reportWindow.document.close();
  await Promise.all([...reportWindow.document.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve=>{ image.onload = resolve; image.onerror = resolve; })));
  if (reportWindow.document.fonts?.ready) await reportWindow.document.fonts.ready;
  reportWindow.focus();
  reportWindow.print();
  return reportWindow;
}

const GROUP_COLORS = { identity:'EEF2F4', observing:'E9F5E9', classifying:'EAF3FD', designing:'FCF0E5', conducting:'F3ECFA', inferring:'FFF8DD', communicating:'E5F6F4', knowledge:'F9E8F0', score:'E1E9EE', reference:'F2F3F4' };
const FONT_COLORS = { good:'167645', bad:'AD3434', partial:'B97314', neutral:'536D74' };
function styleCell(cell, group = 'identity', check = null) {
  cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF'+(GROUP_COLORS[group] || GROUP_COLORS.identity) } };
  cell.font = { name:'Arial', size:10, color:{argb:'FF'+(check === true ? FONT_COLORS.good : check === false ? FONT_COLORS.bad : FONT_COLORS.neutral)} };
  cell.alignment = { vertical:'top', wrapText:true };
  cell.border = { bottom:{style:'hair',color:{argb:'FFDCE9E7'}} };
}
function createSheet(workbook, name, headings, groups = []) {
  const sheet = workbook.addWorksheet(name,{views:[{state:'frozen',xSplit:2,ySplit:1}]});
  sheet.addRow(headings);
  sheet.getRow(1).height = 42;
  sheet.getRow(1).eachCell((cell,index)=>{styleCell(cell,groups[index-1] || 'identity');cell.font = {...cell.font,bold:true};});
  sheet.columns.forEach((column,index)=>{column.width=index < 4 ? 22 : 30;});
  return sheet;
}
function finishSheet(sheet) { sheet.autoFilter = {from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:sheet.columnCount}}; }
function addDataRow(sheet, values, groups = [], checks = {}) {
  const row = sheet.addRow(values.map(value=>value ?? ''));
  row.eachCell({includeEmpty:true},(cell,index)=>styleCell(cell,groups[index-1] || 'identity',checks[index-1] ?? null));
  return row;
}
function addScoreColor(sheet, cell, max) {
  sheet.addConditionalFormatting({ref:cell.address,rules:[
    {type:'expression',formulae:[`AND(ISNUMBER(${cell.address}),${cell.address}=${max})`],style:{font:{color:{argb:'FF'+FONT_COLORS.good}}}},
    {type:'expression',formulae:[`AND(ISNUMBER(${cell.address}),${cell.address}=0)`],style:{font:{color:{argb:'FF'+FONT_COLORS.bad}}}},
    {type:'expression',formulae:[`AND(ISNUMBER(${cell.address}),${cell.address}>0,${cell.address}<${max})`],style:{font:{color:{argb:'FF'+FONT_COLORS.partial}}}}
  ]});
}
function safeEventDetails(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(safeEventDetails);
  return Object.fromEntries(Object.entries(value).filter(([key])=>!/password|secret|token|authorization/i.test(key)).map(([key,item])=>[key,safeEventDetails(item)]));
}
async function workbookImage(data) {
  if (!imagePattern.test(data || '')) return null;
  const match = data.match(/^data:image\/(png|jpe?g|webp);base64,/);
  if (match[1] !== 'webp') return {base64:data,extension:match[1] === 'png'?'png':'jpeg'};
  if (typeof document === 'undefined') return null;
  const image = new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=data;});
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  canvas.getContext('2d').drawImage(image,0,0);
  return {base64:canvas.toDataURL('image/png'),extension:'png'};
}

export async function buildWorkbook(inputRecords) {
  const records = inputRecords.filter(record => !record.demo && record.moduleId === 'VL_BIO_ANTIBIOTICS' && record.profile?.email?.trim().toLowerCase() !== 'tzechingchan0605@gmail.com');
  const workbook = new ExcelJS.Workbook();
  workbook.creator='VL4';workbook.subject='抗生素虛擬探究全班紀錄';workbook.created=new Date('2026-01-01T00:00:00Z');workbook.modified=new Date('2026-01-01T00:00:00Z');
  workbook.calcProperties.fullCalcOnLoad=true;
  const originalFields = ANSWER_FIELDS.filter(([field])=>!field.startsWith('analysis') && !field.startsWith('knowledge') && field !== 'reflection' && field !== 'conclusion');
  const headings = ['紀錄識別碼','姓名','班別及學號','電郵','狀態','版本','探究遞交（香港）','反思提交（香港）','原始快照時間（香港）',...originalFields.map(([,label])=>'原始｜'+label),...ANSWER_FIELDS.map(([,label])=>'最新｜'+label),'plannedReplicates｜原始建議','plannedReplicateReason｜原始理由','actualReplicates｜獨立瓊脂板數','設計文字','延伸預測','延伸理由','延伸公平比較','延伸結果','延伸分析','有效用時總秒數',...['一','二','三','四'].map(stage=>'階段'+stage+'有效秒數')];
  const answerGroups = [...Array(9).fill('identity'),...originalFields.map(field=>field[3]),...ANSWER_FIELDS.map(field=>field[3]),...Array(3).fill('designing'),'conducting',...Array(5).fill('inferring'),...Array(5).fill('identity')];
  const answers = createSheet(workbook,'學生探究答案',headings,answerGroups);
  const dataHeadings=['紀錄識別碼','姓名','瓊脂板識別碼','樣本','首次有無紙碟外清晰區','首次總直徑（mm）','首次備註','首次確認（香港）','最後有無紙碟外清晰區','最後總直徑（mm）','最後備註','最後確認（香港）','模型參考總直徑（mm）','直徑／紙碟外清晰區檢核','修訂紀錄','學生平均值（mm）','依學生最後讀數計算平均值','平均值檢核','確認棒高（mm）','圖表檢核','圖表確認（香港）'];
  const dataGroups=dataHeadings.map((_,index)=>index<4?'identity':index<15?'observing':index<18?'inferring':'communicating');
  const data=createSheet(workbook,'量度計算與圖表',dataHeadings,dataGroups);
  const scoreHeadings=['紀錄識別碼','姓名','班別及學號','完成狀態',...SCORE_COLUMNS.map(column=>column.label+(column.max!==undefined?`（0–${column.max}）`:''))];
  const scoreGroups=[...Array(4).fill('identity'),...SCORE_COLUMNS.map(column=>column.group)];
  const scores=createSheet(workbook,'教師評分',scoreHeadings,scoreGroups);
  const rubric=createSheet(workbook,'評分準則',['類別／題目','最高分','評分方式','滿分準則','部分得分準則','零分準則']);
  for(const row of RUBRIC_ROWS){addDataRow(rubric,row.slice(0,6),Array(6).fill(row[6]));}
  rubric.columns.forEach((column,index)=>{column.width=index===1?10:index===2?12:60;});
  const events=createSheet(workbook,'操作事件紀錄',['紀錄識別碼','姓名','來源','事件類型','時間（香港）','階段','事件詳情（JSON）']);events.getColumn(7).width=80;
  const designs=createSheet(workbook,'裝置設計圖',['紀錄識別碼','姓名','班別及學號','電郵','快照類別','設計文字','學生設計圖']);designs.getColumn(5).width=22;designs.getColumn(6).width=55;designs.getColumn(7).width=70;
  const scoreIndex=Object.fromEntries(SCORE_COLUMNS.map((column,index)=>[column.id,index+5]));
  for (const record of records) {
    const a=record.answers || {}, original=record.original || {}, initial={...original.answers,plannedReplicates:original.plannedReplicates??original.answers?.plannedReplicates,plannedReplicateReason:original.plannedReplicateReason??original.answers?.plannedReplicateReason};
    const status=record.reflectionSubmittedAt?'已完成':record.submittedAt?'待提交反思':'進行中', profile=record.profile || {}, extension=record.extension || {};
    const objectText=value=>typeof value==='object'&&value!==null?JSON.stringify(value):value??'';
    const values=[record.id,profile.name,profile.className||profile.classInfo,profile.email,status,record.version,dateText(record.submittedAt),dateText(record.reflectionSubmittedAt),dateText(original.capturedAt),...originalFields.map(([field])=>answerDisplay(field,initial[field])),...ANSWER_FIELDS.map(([field])=>answerDisplay(field,a[field])),initial.plannedReplicates??'',initial.plannedReplicateReason??'',actualReplicates(record),record.design?.description||a.designDescription||'',...['prediction','reason','fairComparison','results','analysis'].map(field=>extension.started?objectText(extension[field]):''),Math.round(Object.values(record.timing||{}).reduce((sum,time)=>sum+(Number(time)||0),0)),...[1,2,3,4].map(phase=>Math.round(record.timing?.[phase]||0))];
    const checks=objectiveChecks(record), answerChecks={};
    ANSWER_FIELDS.forEach(([field],index)=>{if(field in checks)answerChecks[9+originalFields.length+index]=checks[field];});
    addDataRow(answers,values,answerGroups,answerChecks);
    for (const plate of record.plates || []) for (const sample of SAMPLE_IDS) {
      const reading=record.measurements?.[plate.id]?.[sample]||{}, first=reading.first||{}, last=reading.last||reading;
      const check=readingCheck(record,plate,sample,reading),mean=studentMean(record,sample),meanCorrect=meanCheck(record,sample),graphCorrect=graphCheck(record,sample);
      const label=check=>check===null?'未答／資料不足':check?'符合':'不符合';
      const presence=value=>value==='yes'?'有':value==='no'?'無':'未答';
      addDataRow(data,[record.id,profile.name,plate.id,sampleName(sample,'zh'),presence(first.visible),finiteNumber(first.value)??'',first.note||'',first.at?dateText(first.at):'',presence(last.visible),finiteNumber(last.value)??'',last.note||'',last.at?dateText(last.at):'',clearZoneDiameter(plate,sample)??'',label(check),JSON.stringify(reading.revisions||[]),finiteNumber(record.means?.[sample])??'',mean===null?'':Math.round(mean*10000)/10000,label(meanCorrect),finiteNumber(record.graph?.values?.[sample])??'',label(graphCorrect),record.graph?.confirmedAt?dateText(record.graph.confirmedAt):''],dataGroups,{5:readingCheck(record,plate,sample,first),9:check,13:check,15:meanCorrect,17:meanCorrect,18:graphCorrect,19:graphCorrect});
      for (const revision of reading.revisions||[]) addDataRow(events,[record.id,profile.name,`${plate.id}/${sample}`,'reading_revision',dateText(revision.at||revision.next?.at),3,JSON.stringify(safeEventDetails(revision))]);
    }
    const auto=automaticScores(record);
    const scoreRow=addDataRow(scores,[record.id,profile.name,profile.className||profile.classInfo,status,...SCORE_COLUMNS.map(column=>column.manual?null:auto[column.id]??'')],scoreGroups);
    const cell=id=>scoreRow.getCell(scoreIndex[id]), ref=id=>cell(id).address;
    const manual=SCORE_COLUMNS.filter(column=>column.manual).map(column=>ref(column.id));
    for(const column of SCORE_COLUMNS){
      const current=cell(column.id);
      if(column.manual){current.value=null;current.dataValidation={type:'decimal',operator:'between',allowBlank:true,formulae:[0,column.max],showInputMessage:true,promptTitle:'教師人工評分',prompt:`空白＝待評；有效範圍 0–${column.max}。`,showErrorMessage:true,errorStyle:'stop',errorTitle:'分數超出範圍',error:`請輸入 0–${column.max} 的數值，或保持空白。`};}
      if(column.formula){
        const dependencies=column.formula.map(ref);
        let formula=`IF(COUNT(${dependencies.join(',')})=${dependencies.length},ROUND(SUM(${dependencies.join(',')}),2),"待評")`;
        if(column.id==='overall') formula=`IF(AND(COUNT(${manual.join(',')})=${manual.length},COUNT(${dependencies.join(',')})=2,D${scoreRow.number}="已完成"),ROUND(SUM(${dependencies.join(',')}),2),"待評／未完成")`;
        current.value={formula,result:column.id==='classifying'?auto.iv+auto.dv+auto.cv:column.id==='overall'?'待評／未完成':'待評'};
      }
      if(column.id==='marking') current.value={formula:`IF(AND(COUNT(${manual.join(',')})=${manual.length},D${scoreRow.number}="已完成"),"評分完成","待教師評分／學生未完成")`,result:'待教師評分／學生未完成'};
      if(column.max!==undefined)addScoreColor(scores,current,column.max);
    }
    for(const event of record.events||[])addDataRow(events,[record.id,profile.name,'探究',event.type,dateText(event.at),event.phase??'',JSON.stringify(safeEventDetails(event.details??event))]);
    for(const plate of record.plates||[])for(const event of plate.operations||[])addDataRow(events,[record.id,profile.name,plate.id,event.type||'plate_operation',event.at?dateText(event.at):'',3,JSON.stringify(safeEventDetails(event))]);
    const snapshots = [...(original.design ? [{kind:'原始設計',design:original.design,description:initial.designDescription}] : []),{kind:'最後設計',design:record.design||{},description:a.designDescription}];
    for(const snapshot of snapshots){
      const image=await workbookImage(snapshot.design.image);
      const imageRow=addDataRow(designs,[record.id,profile.name,profile.className||profile.classInfo,profile.email,snapshot.kind,snapshot.design.description||snapshot.description||'',image?'嵌入圖片':snapshot.design.image?'圖片格式需轉換；原圖仍保留於完整探究紀錄':'文字設計']);
      if(image){imageRow.height=175;const imageId=workbook.addImage(image);designs.addImage(imageId,{tl:{col:6.05,row:imageRow.number-1+0.05},ext:{width:450,height:220},editAs:'oneCell'});}
    }
  }
  for(const sheet of workbook.worksheets)finishSheet(sheet);
  return workbook;
}
export function workbookFilename({scope='class'}={}) {
  if (!['class','local'].includes(scope)) throw new Error('Unknown workbook export scope');
  return `VL4_抗生素研究任務_${scope === 'local' ? '本機學習紀錄' : '全班學習紀錄'}.xlsx`;
}
export async function downloadWorkbook(records, options={}) {
  const filename=workbookFilename(options);
  const workbook=await buildWorkbook(records);
  const buffer=await workbook.xlsx.writeBuffer();
  const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const link=document.createElement('a'),url=URL.createObjectURL(blob);
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return workbook;
}
