import {MC_QUESTIONS,EFFECTIVE_OPTIONS,CONCLUSION_FIELDS,currentAnalysis} from './analysis.js';
import ExcelJS from 'exceljs';
import {clearZoneDiameter} from './model.js';
import { L } from './i18n.js';
import {glossEnglish,fitEnglishDiagramLabels} from './english-glossary.js';
import { SAMPLE_IDS, TOLERANCES, VARIABLE_REFERENCE, controlVariableReference, ASSUMPTION_REFERENCE, SCORE_COLUMNS, RUBRIC_ROWS, CURRENT_SCORE_COLUMNS, CURRENT_RUBRIC_ROWS, actualReplicates, finiteNumber, objectiveChecks, readingCheck, studentMean, meanCheck, graphCheck, conclusionChecks, automaticScores } from './rubric.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const tr = (language, zh, en) => language === 'en' ? glossEnglish(en) : zh;
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

export const CURRENT_ANSWER_FIELDS = [
  ...ANSWER_FIELDS.filter(([field])=>!field.startsWith('analysis')&&!field.startsWith('knowledge')&&field!=='conclusion'&&field!=='reflection'),
  ...MC_QUESTIONS.map(question=>[question.id,...L[question.key],'inferring']),
  ...CONCLUSION_FIELDS.map(field=>[field,...L[field],'communicating']),
  ANSWER_FIELDS.find(([field])=>field==='reflection')
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
for(const question of MC_QUESTIONS)fieldChoiceKeys[question.id]=Object.fromEntries(question.options);
fieldChoiceKeys.effectiveSamples=Object.fromEntries(EFFECTIVE_OPTIONS);
for(const field of CONCLUSION_FIELDS.slice(1))fieldChoiceKeys[field]={na:'notApplicable',C:'blank'};
export function answerDisplay(field, value, language = 'zh') {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return notAnswered(language);
  if (Array.isArray(value)) return value.map(item => answerDisplay(field, item, language)).join(tr(language, '；', '; '));
  const label = L[fieldChoiceKeys[field]?.[value]] || (choiceFields.has(field) && CHOICES[value]);
  return label ? (field==='prediction'&&['X','Y','Z','X_Y','X_Z','Y_Z'].includes(value)&&language!=='en'?label[0].replace(/的$/, ''):tr(language,label[0],label[1])) : String(value);
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
    reflection: ['引用所選樣本的讀數支持抑制生長的判斷；解釋原有抗性差異如何影響存活及繁殖，抗性特徵如何遺傳，並使具抗性的細菌比例增加、抗生素效果減弱。這是延伸情境，並非本次實驗已證明抗性形成。', 'Use readings for your chosen sample to support growth inhibition. Explain how pre-existing resistance affects survival and reproduction, how resistance traits are inherited, and how the resistant proportion increases as antibiotic effectiveness declines. This is a hypothetical extension, not evidence that resistance arose in this experiment.']
  };
  const question=MC_QUESTIONS.find(question=>question.id===field);
  if(question)return answerDisplay(field,question.correct,language)+(field==='repeatPurpose'?tr(language,' A：由於系統或偶然誤差，重複實驗的數值通常會有微小落差，這才需要計算平均值與標準差。B：重複實驗是為了提升準確度，而非刻意消耗時間或湊字數。C：正確答案。D：重複實驗是為了檢驗現狀，而非人為在常規實驗中加速生物突變。',' A: Systematic or random errors can cause variation between repeats, so means and standard deviations are calculated. B: Repetition aims to improve accuracy, not consume time or pad reports. C: Correct answer. D: Repetition checks existing outcomes; it does not accelerate mutations in routine experiments.'):'');
  if(CONCLUSION_FIELDS.includes(field))return tr(language,'根據自己的觀察及平均值判斷；只比較本次模擬條件，不能由圈大小決定最佳患者治療。','Use your observations and means; compare only these simulated conditions, not the best treatment for a patient.');
  if (field === 'iv') return answerDisplay(field, VARIABLE_REFERENCE.iv, language);
  if (field === 'dv') return answerDisplay(field, VARIABLE_REFERENCE.dv, language);
  if (field === 'cv') return answerDisplay(field, controlVariableReference(record), language);
  if (field === 'assumptions') return answerDisplay(field, ASSUMPTION_REFERENCE, language);
  return refs[field] ? tr(language,...refs[field]) : '';
}
const markHTML = (check, language) => check === null || check === undefined ? '' : `<span class="check ${check ? 'correct' : 'incorrect'}" aria-label="${tr(language, check ? '符合參考' : '不符合參考', check ? 'Matches reference' : 'Does not match reference')}">${check ? '✓' : '✕'}</span>`;
function reportAnswer(record, field, value, language, withReference = true) {
  const definition = [...ANSWER_FIELDS,...CURRENT_ANSWER_FIELDS].find(item => item[0] === field);
  const shown = answerDisplay(field, value, language);
  const submitted = !!record.submittedAt;
  const checks = objectiveChecks({ ...record, answers: { ...record.answers, [field]: value } });
  const reference = submitted && withReference ? referenceFor(field, record, language) : '';
  return `<div class="answer"><h3>${esc(definition?tr(language,definition[1],definition[2]):field)}</h3><p class="student-answer">${esc(shown)} ${submitted && withReference ? markHTML(checks[field], language) : ''}</p>${reference ? `<p class="reference"><strong>${tr(language, '參考說明：', 'Reference: ')}</strong>${esc(reference)}</p>` : ''}</div>`;
}

export function learningDiagram(language = 'zh') {
 const t=(zh,en)=>tr(language,zh,en);
 const markup = `<div class="science-diagram">
 <figure class="learning-figure"><figcaption>${t('A. 實驗原理：抗生素樣本的擴散與清晰區的形成','A. Experimental principle: antibiotic diffusion and clear-zone formation')}</figcaption>
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 285" role="img" aria-label="${t('紙碟承載抗生素，抗生素向瓊脂擴散並抑制細菌生長，形成清晰區。','The disc carries antibiotic, which diffuses through agar and inhibits bacterial growth, forming a clear zone.')}">
 <defs><marker id="vl4-science-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#087b78"/></marker></defs>
 <circle cx="115" cy="142" r="91" fill="#ddd9ae" stroke="#6e897b"/><circle cx="115" cy="142" r="54" fill="#f8faec" stroke="#b4bda3" stroke-dasharray="4 4"/>
 <g fill="#79815c">${[[60,86],[173,99],[46,158],[169,195],[91,213],[175,157],[104,69],[75,186]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g><circle cx="115" cy="142" r="12" fill="#fff" stroke="#5e7475"/>
 <g fill="none" stroke="#087b78" stroke-width="2" marker-end="url(#vl4-science-arrow)"><path d="M129 142H157"/><path d="M101 142H74"/><path d="M115 127V103"/><path d="M115 157V181"/></g>
 <g font-size="16" fill="#15333b"><text x="225" y="65">${t('① 紙碟承載抗生素','1. Disc carries antibiotic')}</text><path d="M221 72L128 136" fill="none" stroke="#698a87"/>
 <text x="225" y="126">${t('② 抗生素向瓊脂擴散','2. Antibiotic diffuses')}</text>${language==='en'?'<text x="246" y="146">through agar</text>':''}<path d="M221 151L159 142" fill="none" stroke="#698a87"/>
 <text x="225" y="204">${t('③ 抗生素抑制細菌生長','3. Antibiotic inhibits')}</text><text x="246" y="227">${t('並形成清晰區','bacterial growth, forming')}</text>${language==='en'?'<text x="246" y="250">a clear zone</text>':''}<path d="M221 213L152 174" fill="none" stroke="#698a87"/></g></svg>
 <p class="caption">${t('示意圖，非按比例；不能證明細菌全部死亡。','Schematic, not to scale; it does not prove complete killing.')}</p></figure>
 <figure class="learning-figure"><figcaption>${t('B. 細菌結構與可能作用位置','B. Structures and possible action sites')}</figcaption>
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 285" role="img" aria-label="${t('細菌結構與抗生素可能作用位置','Bacterial structures and possible antibiotic action sites')}">
 <rect x="21" y="91" width="238" height="122" rx="61" fill="#eef3fa" stroke="#b8cbdc" stroke-width="2"/>
 <rect x="30" y="100" width="220" height="104" rx="52" fill="#d5e5f8" stroke="#597fb1" stroke-width="8"/><rect x="41" y="111" width="198" height="82" rx="40" fill="#f4f0d4" stroke="#8e9f82" stroke-width="4"/>
 <path d="M87 151C97 124 136 179 155 143S190 169 206 143" fill="none" stroke="#a6699c" stroke-width="4"/>
 <g fill="#cb995b"><circle cx="72" cy="142" r="4"/><circle cx="93" cy="171" r="4"/><circle cx="175" cy="176" r="4"/><circle cx="196" cy="124" r="4"/></g>
 <g fill="#15333b" font-size="16"><text x="272" y="70">${t('① 抑制細胞壁形成','1. Inhibit cell wall')}${language==='en'?'<tspan x="290" dy="18">formation</tspan>':''}</text><path d="M266 76L232 112" stroke="#597fb1" fill="none"/>
 <text x="272" y="115">${t('② 破壞細胞膜','2. Disrupt cell membrane')}</text><path d="M266 121L235 136" stroke="#8e9f82" fill="none"/>
 <text x="272" y="164">${t('③ 抑制蛋白質合成','3. Inhibit protein')}${language==='en'?'<tspan x="290" dy="18">synthesis</tspan>':''}</text><path d="M266 170L179 176" stroke="#cb995b" fill="none"/>
 <text x="272" y="211">${t('④ 抑制核酸合成','4. Inhibit nucleic acid')}${language==='en'?'<tspan x="290" dy="18">synthesis</tspan>':''}</text><path d="M266 217H155V143" stroke="#a6699c" fill="none"/></g></svg>
 <p class="caption">${t('外側淡色層示意莢膜（並非所有細菌都有）；藍色層為細胞壁，內側綠色層為細胞膜，紫色曲線為 DNA。這些機制並非本次紙碟結果直接證明。','The pale outer layer represents a capsule (not present in all bacteria); blue is the cell wall, green is the cell membrane, and the purple strand is DNA. These mechanisms are not proved by this disc experiment.')}</p></figure></div>`;
 return language==='en'?fitEnglishDiagramLabels(markup):markup;
}
export function learningPointsHTML(language = 'zh') {
  const sections = [
  {
    "title": [
      "抗生素的用途",
      "Uses of antibiotics"
    ],
    "points": [
      [
        "抗生素主要用於[細菌感染]，不能治療病毒引起的傷風或流感。",
        "Antibiotics mainly treat [bacterial infections]; they cannot treat viral colds or influenza."
      ]
    ]
  },
  {
    "title": [
      "清晰區如何形成",
      "How clear zones form"
    ],
    "points": [
      [
        "抗生素由紙碟[向外擴散]，離紙碟越遠，濃度通常越低。只有濃度仍足以抑制這種細菌生長的範圍才會形成[清晰區]。如果細菌對抗生素愈敏感（能被較低濃度抗生素抑制生長），能形成的清晰區便愈大。",
        "Antibiotic [diffuses outward] from the disc, and its concentration generally decreases with distance. A [clear zone] forms only where the concentration remains sufficient to inhibit this bacterium. Greater susceptibility (growth inhibited at a lower antibiotic concentration) allows a larger clear zone to form."
      ],
      [
        "清晰區表示該位置沒有可見細菌生長，證明該抗生素樣本能[抑制細菌生長]；不能證明區內所有細菌已死亡。",
        "A clear zone indicates no visible bacterial growth at that location, demonstrating that the antibiotic sample can [inhibit bacterial growth]; it does not prove that all bacteria in the zone have died."
      ]
    ]
  },
  {
    "title": [
      "抗生素抗性與選擇作用",
      "Antibiotic resistance and selection"
    ],
    "points": [
      [
        "為甚麼情境中的原有抗生素會失效？抗生素使不具抗生素抗性的細菌較難存活，[具抗生素抗性的則較容易存活、繁殖並遺傳抗藥性特徵]。當後者比例增加並佔據整個群落，原有抗生素便會失效。",
        "Why does the original antibiotic in the scenario lose effectiveness? Antibiotics make survival harder for susceptible bacteria, while [resistant bacteria are more likely to survive, reproduce and pass on resistance traits]. As resistant bacteria increase in proportion and occupy the whole population, the original antibiotic becomes ineffective."
      ],
      [
        "[過度或不當使用抗生素]會增加不必要的選擇壓力，[促進抗藥細菌生存與繁殖]，使感染可能更難治療。",
        "[Antibiotic overuse or misuse] adds unnecessary selection pressure, [promoting the survival and reproduction of resistant bacteria] and potentially making infections harder to treat."
      ]
    ]
  }
];
  const index=language==='en'?1:0;
  const supported=value=>language==='en'?glossEnglish(value):value;
  const highlight=value=>esc(supported(value)).replace(/\[([^\]]+)\]/g,'<strong class="learning-emphasis">$1</strong>');
  return `${learningDiagram(language)}${sections.map(section=>`<section class="learning-topic"><h3>${esc(supported(section.title[index]))}</h3><ul class="learning-list">${section.points.map(point=>`<li>${highlight(point[index])}</li>`).join('')}</ul></section>`).join('')}`;
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

function reportConclusion(record,language){
 const a=record.answers||{},i=language==='en'?1:0,checks=conclusionChecks(record),submitted=!!record.submittedAt;
 const mark=check=>submitted?markHTML(check,language):'';
 const reference=submitted?`<p class="reference">${tr(language,'參考有效樣本：','Reference effective samples: ')}${esc(checks.effective.join('、'))}。${tr(language,'按你的讀數計算的排序：','Ranking calculated from your readings: ')}${checks.reference?esc([...checks.reference,...Array(4-checks.reference.length).fill(L.notApplicable[i])].join(' ＞ ')):tr(language,'資料不足','Insufficient data')}。${tr(language,'平均值相同時接受任一先後次序。','Either order is accepted for equal means.')}</p>`:'';
 return `<div class="answer"><h3>3. ${esc(tr(language,...L.resultConclusion))}</h3><p class="student-answer">${esc(tr(language,...L.conclusionContext))}${esc(answerDisplay('effectiveSamples',a.effectiveSamples,language))}${esc(tr(language,...L.conclusionEffective))} ${mark(checks.samples)}</p><p>${esc(tr(language,...L.conclusionRanking))}</p><p class="student-answer">${CONCLUSION_FIELDS.slice(1).map(field=>esc(answerDisplay(field,a[field],language))).join(' ＞ ')} ${mark(checks.order)}</p>${reference}</div>`;
}
export function renderReport(record, language = 'zh') {
  language = language === 'en' ? 'en' : 'zh';
  const a = record.answers || {}, original = record.original || {}, first = { ...original.answers, plannedReplicates: original.plannedReplicates ?? original.answers?.plannedReplicates, plannedReplicateReason: original.plannedReplicateReason ?? original.answers?.plannedReplicateReason };
  const t = (zh, en) => tr(language, zh, en);
  const submitted = !!record.submittedAt, current=currentAnalysis(record);
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
  const meansTable = `<table><thead><tr>${[t('樣本','Sample'),t('學生平均值（mm）','Student mean (mm)'),t('依自己的讀數計算','Calculated from own readings'),...(current?[]:[t('確認棒高（mm）','Confirmed bar height (mm)')])].map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${SAMPLE_IDS.map(sample=>`<tr><td>${esc(sampleName(sample, language))}</td><td>${esc(a.means?.[sample] ?? record.means?.[sample] ?? '—')} ${submitted ? markHTML(meanCheck(record,sample),language) : ''}</td><td>${submitted && studentMean(record,sample) !== null ? studentMean(record,sample).toFixed(1) : '—'}</td>${current?'':`<td>${esc(record.graph?.values?.[sample] ?? '—')} ${submitted ? markHTML(graphCheck(record,sample),language) : ''}</td>`}</tr>`).join('')}</tbody></table><p class="reference">${current?t('平均值按自己的最後讀數檢核（±0.1 mm）。','Means are checked against your own latest readings (±0.1 mm).'):t('平均值按自己的最後讀數檢核（±0.1 mm）；圖表按自己的已輸入平均值檢核（±0.5 mm），避免同一量度錯誤重複扣核。', 'Means are checked against your own latest readings (±0.1 mm). Bars are checked against your entered means (±0.5 mm), avoiding repeated penalties for one reading error.')}</p>`;
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
  ${section(current?t('04 總直徑的平均值計算','04 Mean total diameter calculation'):t('04 你的平均值及圖表','04 Your means and chart'),meansTable + (current?'':reportGraph(record,language) + `<p>${t('圖表確認時間','Chart confirmed')}：${esc(dateText(record.graph?.confirmedAt,language))}</p>`))}
  ${section(t('04 分析及結論','04 Analysis and conclusion'),current?MC_QUESTIONS.slice(0,2).map(question=>reportAnswer(record,question.id,a[question.id],language)).join('')+reportConclusion(record,language)+MC_QUESTIONS.slice(2).map(question=>reportAnswer(record,question.id,a[question.id],language)).join(''):fields(['analysisControl','analysisConsistent','analysisVariation','analysisMethod','analysisHypothesis','analysisRepeatPlan','analysisRepeatValue','analysisDeath','analysisClinical','conclusion']))}
  ${current?'':section(t('可選延伸：同一樣本的紙碟含量','Optional extension: disc content of one sample'),extensionHTML)}
  ${submitted ? section(t('遞交後的學習重點','Learning points after submission'),learningPointsHTML(language)+(current?'':fields(['knowledgeBacteria','knowledgeResistance','knowledgeLimits']))) : ''}
  ${section(t('學習反思','Learning reflection'),reportAnswer(record,'reflection',a.reflection,language))}
  <footer class="report-footer">${t('✓／✕ 只用於有明確參考的項目；開放題附參考說明，由教師閱讀。學生原文不因語言切換而改寫。','✓/✕ apply only to items with an explicit reference. Open responses have reference notes for teacher review. Student text is preserved when the language changes.')}<br>${t('紀錄識別碼','Record ID')}：${esc(record.id)}</footer></article>`;
}

export const REPORT_CSS = `*{box-sizing:border-box}body{margin:0;color:#15333b;font-family:Arial,"Noto Sans TC",sans-serif;font-size:12px;line-height:1.65;background:#f5f9f7}.vl4-report{max-width:1000px;margin:24px auto;padding:28px;background:white}.report-cover{border-left:7px solid #087b78;padding:16px 22px;background:#edf7f3}.report-cover h1{font-size:24px;line-height:1.35;margin:8px 0}.report-brand{letter-spacing:.08em;color:#087b78}.report-meta{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:15px 0}.simulation-note,.reference{color:#536d74;font-size:11px}.simulation-note{border:1px solid #dce9e7;padding:10px;border-radius:8px}.report-section{margin:20px 0}.report-section h2{font-size:17px;color:#087b78;border-bottom:2px solid #dce9e7;padding-bottom:6px;break-after:avoid}.report-card{border:1px solid #dce9e7;border-radius:12px;padding:16px;background:#fcfefc}.answer{padding:8px 0;border-bottom:1px solid #ecf2ef;break-inside:avoid}.answer h3,h3{font-size:12px;margin:0 0 4px;font-weight:700}.student-answer{white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0}.reference{margin:5px 0}.check{font-weight:bold;margin-left:5px}.correct{color:#167645}.incorrect{color:#ae3434}table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed}th,td{padding:7px;border:1px solid #dce9e7;vertical-align:top;overflow-wrap:anywhere}th{background:#edf7f3}td small{display:block;white-space:pre-wrap}thead{display:table-header-group}tr{break-inside:avoid}.design-image{display:block;max-height:330px;max-width:100%;object-fit:contain;margin:16px auto}.science-diagram svg,.report-graph{display:block;width:100%;height:auto}.science-diagram{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}.learning-figure{margin:0;padding:12px;border:1px solid #bddfd8;border-radius:12px;background:#f2faf7;break-inside:avoid}.learning-figure figcaption{font-size:14px;font-weight:700;line-height:1.5}.learning-figure .caption{font-size:10px;color:#536d74}@media screen and (max-width:600px){.science-diagram{grid-template-columns:1fr}}.plate-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.plate-figure{margin:0;break-inside:avoid}.plate-figure svg{width:100%;height:auto}.plate-figure figcaption{font-size:10px}.learning-topic h3{font-size:16px;margin:18px 0 8px;color:#15333b;break-after:avoid}.learning-emphasis{color:#b42318;font-weight:700}.learning-list{padding-left:20px}.learning-list li{margin:8px 0;break-inside:avoid}.report-footer{font-size:10px;color:#658087;border-top:1px solid #dce9e7;padding-top:10px}@page{size:A4;margin:13mm}@media print{body{background:white}.vl4-report{margin:0;padding:0;max-width:none}.report-card{border-radius:8px}.report-cover{break-inside:avoid}.report-cover h1{font-size:22px}.report-section{margin:14px 0}.plate-grid{gap:8px}.report-meta{font-size:10px}a{color:inherit}}`;
export function reportFilename(record) {
  return `VL4_${record.profile?.className || record.profile?.classInfo || ''}_${record.profile?.name || ''}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');
}
export async function openPrintReport(record, language = 'zh') {
  if (!record.reflectionSubmittedAt) throw new Error(tr(language,'請先儲存並提交學習反思，才可列印／儲存 PDF。','Save and submit your reflection before printing or saving a PDF.'));
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) throw new Error(tr(language,'請允許此網站開啟列印視窗。','Allow this site to open the print window.'));
  reportWindow.document.write(`<!doctype html><html lang="${language === 'en'?'en':'zh-Hant-HK'}"><head><meta charset="UTF-8"><title>${esc(reportFilename(record))}</title><style>${REPORT_CSS}</style></head><body>${renderReport(record,language)}</body></html>`);
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
  const hasLegacy=records.some(record=>!currentAnalysis(record)),hasCurrent=records.some(currentAnalysis);
  const exportFields=hasLegacy?(hasCurrent?[...ANSWER_FIELDS,...CURRENT_ANSWER_FIELDS.filter(([id])=>!ANSWER_FIELDS.some(([field])=>field===id))]:ANSWER_FIELDS):CURRENT_ANSWER_FIELDS;
  const legacyExtension=hasLegacy?['延伸預測','延伸理由','延伸公平比較','延伸結果','延伸分析']:[];
  const originalFields = ANSWER_FIELDS.filter(([field])=>!field.startsWith('analysis') && !field.startsWith('knowledge') && field !== 'reflection' && field !== 'conclusion');
  const headings = ['紀錄識別碼','姓名','班別及學號','電郵','狀態','版本','探究遞交（香港）','反思提交（香港）','原始快照時間（香港）',...originalFields.map(([,label])=>'原始｜'+label),...exportFields.map(([,label])=>'最新｜'+label),'plannedReplicates｜原始建議','plannedReplicateReason｜原始理由','actualReplicates｜獨立瓊脂板數','設計文字',...legacyExtension,'有效用時總秒數',...['一','二','三','四'].map(stage=>'階段'+stage+'有效秒數')];
  const answerGroups = [...Array(9).fill('identity'),...originalFields.map(field=>field[3]),...exportFields.map(field=>field[3]),...Array(3).fill('designing'),'conducting',...Array(legacyExtension.length).fill('inferring'),...Array(5).fill('identity')];
  const answers = createSheet(workbook,'學生探究答案',headings,answerGroups);
  const dataHeadings=['紀錄識別碼','姓名','瓊脂板識別碼','樣本','首次有無紙碟外清晰區','首次總直徑（mm）','首次備註','首次確認（香港）','最後有無紙碟外清晰區','最後總直徑（mm）','最後備註','最後確認（香港）','模型參考總直徑（mm）','直徑／紙碟外清晰區檢核','修訂紀錄','學生平均值（mm）','依學生最後讀數計算平均值','平均值檢核',...(hasLegacy?['確認棒高（mm）','圖表檢核','圖表確認（香港）']:[])];
  const dataGroups=dataHeadings.map((_,index)=>index<4?'identity':index<15?'observing':index<18?'inferring':'communicating');
  const data=createSheet(workbook,hasLegacy?'量度計算與圖表':'量度與計算',dataHeadings,dataGroups);
  const makeScores=(columns,name)=>({columns,sheet:createSheet(workbook,name,['紀錄識別碼','姓名','班別及學號','完成狀態',...columns.map(column=>column.label+(column.max!==undefined?`（0–${column.max}）`:''))],[...Array(4).fill('identity'),...columns.map(column=>column.group)]),index:Object.fromEntries(columns.map((column,index)=>[column.id,index+5]))});
  const legacyScores=hasLegacy?makeScores(SCORE_COLUMNS,'教師評分'):null;
  const currentScores=hasCurrent||!hasLegacy?makeScores(CURRENT_SCORE_COLUMNS,hasLegacy?'教師評分（新版）':'教師評分'):null;
  const rubric=createSheet(workbook,'評分準則',['類別／題目','最高分','評分方式','滿分準則','部分得分準則','零分準則']);
  for(const row of [...(hasLegacy?RUBRIC_ROWS:[]),...(hasCurrent||!hasLegacy?CURRENT_RUBRIC_ROWS:[])]){addDataRow(rubric,row.slice(0,6),Array(6).fill(row[6]));}
  rubric.columns.forEach((column,index)=>{column.width=index===1?10:index===2?12:60;});
  const events=createSheet(workbook,'操作事件紀錄',['紀錄識別碼','姓名','來源','事件類型','時間（香港）','階段','事件詳情（JSON）']);events.getColumn(7).width=80;
  const designs=createSheet(workbook,'裝置設計圖',['紀錄識別碼','姓名','班別及學號','電郵','快照類別','設計文字','學生設計圖']);designs.getColumn(5).width=22;designs.getColumn(6).width=55;designs.getColumn(7).width=70;
  for (const record of records) {
    const a=record.answers || {}, original=record.original || {}, initial={...original.answers,plannedReplicates:original.plannedReplicates??original.answers?.plannedReplicates,plannedReplicateReason:original.plannedReplicateReason??original.answers?.plannedReplicateReason};
    const status=record.reflectionSubmittedAt?'已完成':record.submittedAt?'待提交反思':'進行中', profile=record.profile || {}, extension=record.extension || {};
    const objectText=value=>typeof value==='object'&&value!==null?JSON.stringify(value):value??'';
    const values=[record.id,profile.name,profile.className||profile.classInfo,profile.email,status,record.version,dateText(record.submittedAt),dateText(record.reflectionSubmittedAt),dateText(original.capturedAt),...originalFields.map(([field])=>answerDisplay(field,initial[field])),...exportFields.map(([field])=>answerDisplay(field,a[field])),initial.plannedReplicates??'',initial.plannedReplicateReason??'',actualReplicates(record),record.design?.description||a.designDescription||'',...(hasLegacy?['prediction','reason','fairComparison','results','analysis'].map(field=>extension.started?objectText(extension[field]):''):[]),Math.round(Object.values(record.timing||{}).reduce((sum,time)=>sum+(Number(time)||0),0)),...[1,2,3,4].map(phase=>Math.round(record.timing?.[phase]||0))];
    const checks=objectiveChecks(record), answerChecks={};
    exportFields.forEach(([field],index)=>{if(field in checks)answerChecks[9+originalFields.length+index]=checks[field];});
    addDataRow(answers,values,answerGroups,answerChecks);
    for (const plate of record.plates || []) for (const sample of SAMPLE_IDS) {
      const reading=record.measurements?.[plate.id]?.[sample]||{}, first=reading.first||{}, last=reading.last||reading;
      const check=readingCheck(record,plate,sample,reading),mean=studentMean(record,sample),meanCorrect=meanCheck(record,sample),graphCorrect=graphCheck(record,sample);
      const label=check=>check===null?'未答／資料不足':check?'符合':'不符合';
      const presence=value=>value==='yes'?'有':value==='no'?'無':'未答';
      addDataRow(data,[record.id,profile.name,plate.id,sampleName(sample,'zh'),presence(first.visible),finiteNumber(first.value)??'',first.note||'',first.at?dateText(first.at):'',presence(last.visible),finiteNumber(last.value)??'',last.note||'',last.at?dateText(last.at):'',clearZoneDiameter(plate,sample)??'',label(check),JSON.stringify(reading.revisions||[]),finiteNumber(record.means?.[sample])??'',mean===null?'':Math.round(mean*10000)/10000,label(meanCorrect),...(hasLegacy?[finiteNumber(record.graph?.values?.[sample])??'',label(graphCorrect),record.graph?.confirmedAt?dateText(record.graph.confirmedAt):'']:[])],dataGroups,{5:readingCheck(record,plate,sample,first),9:check,13:check,15:meanCorrect,17:meanCorrect,18:graphCorrect,19:graphCorrect});
      for (const revision of reading.revisions||[]) addDataRow(events,[record.id,profile.name,`${plate.id}/${sample}`,'reading_revision',dateText(revision.at||revision.next?.at),3,JSON.stringify(safeEventDetails(revision))]);
    }
    const auto=automaticScores(record),{columns,sheet:scores,index:scoreIndex}=currentAnalysis(record)?currentScores:legacyScores;
    const scoreRow=addDataRow(scores,[record.id,profile.name,profile.className||profile.classInfo,status,...columns.map(column=>column.manual?null:auto[column.id]??'')],[...Array(4).fill('identity'),...columns.map(column=>column.group)]);
    const cell=id=>scoreRow.getCell(scoreIndex[id]), ref=id=>cell(id).address;
    const manual=columns.filter(column=>column.manual).map(column=>ref(column.id));
    for(const column of columns){
      const current=cell(column.id);
      if(column.manual){current.value=null;current.dataValidation={type:'decimal',operator:'between',allowBlank:true,formulae:[0,column.max],showInputMessage:true,promptTitle:'教師人工評分',prompt:`空白＝待評；有效範圍 0–${column.max}。`,showErrorMessage:true,errorStyle:'stop',errorTitle:'分數超出範圍',error:`請輸入 0–${column.max} 的數值，或保持空白。`};}
      if(column.formula){
        const dependencies=column.formula.map(ref);
        let formula=`IF(COUNT(${dependencies.join(',')})=${dependencies.length},ROUND(SUM(${dependencies.join(',')}),2),"待評")`;
        if(column.id==='overall') formula=`IF(AND(COUNT(${manual.join(',')})=${manual.length},COUNT(${dependencies.join(',')})=${dependencies.length},D${scoreRow.number}="已完成"),ROUND(SUM(${dependencies.join(',')}),2),"待評／未完成")`;
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
