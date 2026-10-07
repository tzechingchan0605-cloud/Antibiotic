// Draft criteria for teaching/research review; not a validated psychometric instrument.
export const TOLERANCES = Object.freeze({ reading: 1, mean: 0.1, graph: 0.5 });
export const SAMPLE_IDS = Object.freeze(['X', 'Y', 'Z', 'C']);
export const VARIABLE_REFERENCE = Object.freeze({ iv: 'sample', dv: 'zone', cv: ['strain', 'distribution', 'medium', 'disc', 'preparation', 'observation'] });
export const ASSUMPTION_REFERENCE = Object.freeze(['distribution', 'sterile', 'sameConditions']);
const numeric = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
export const finiteNumber = value => numeric(value) ? Number(value) : null;
export const roundScore = value => Math.round(value * 100) / 100;
export const sameChoices = (actual, expected) => Array.isArray(actual) && actual.length === expected.length && new Set(actual).size === expected.length && expected.every(item => actual.includes(item));
export function actualReplicates(record) { return (record.plates || []).filter(plate => plate.result && plate.completed).length; }
export function studentMean(record, sample) {
  const plates = record.plates || [];
  if (!plates.length) return null;
  const values = plates.map(plate => finiteNumber(record.measurements?.[plate.id]?.[sample]?.value));
  return values.every(value => value !== null) ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
export function readingCheck(record, plate, sample, reading) {
  const value = finiteNumber(reading?.value), reference = finiteNumber(plate.result?.[sample]);
  if (value === null || reference === null || !['yes', 'no'].includes(reading?.visible)) return null;
  return Math.abs(value - reference) <= TOLERANCES.reading + 1e-9 && reading.visible === (reference > 6 ? 'yes' : 'no');
}
export function meanCheck(record, sample) {
  const value = finiteNumber(record.means?.[sample]), expected = studentMean(record, sample);
  return value === null || expected === null ? null : Math.abs(value - expected) <= TOLERANCES.mean + 1e-9;
}
export function graphCheck(record, sample) {
  const value = finiteNumber(record.graph?.values?.[sample]), expected = finiteNumber(record.means?.[sample]);
  return value === null || expected === null || !record.graph?.confirmedAt ? null : Math.abs(value - expected) <= TOLERANCES.graph + 1e-9;
}
export function objectiveChecks(record) {
  const a = record.answers || {};
  const variableCheck=(value,expected)=>Array.isArray(value)?(value.length?sameChoices(value,[expected]):null):(value?value===expected:null);
  return { iv: variableCheck(a.iv,'sample'), dv: variableCheck(a.dv,'zone'),
    cv: a.cv?.length ? sameChoices(a.cv, VARIABLE_REFERENCE.cv) : null,
    assumptions: a.assumptions?.length ? sameChoices(a.assumptions, ASSUMPTION_REFERENCE) : null,
    analysisDeath: a.analysisDeath ? a.analysisDeath === 'cannot' : null,
    analysisClinical: a.analysisClinical ? a.analysisClinical === 'cannot' : null,
    knowledgeBacteria: a.knowledgeBacteria ? a.knowledgeBacteria === 'bacteria' : null,
    knowledgeResistance: a.knowledgeResistance ? a.knowledgeResistance === 'bacteria' : null,
    knowledgeLimits: a.knowledgeLimits ? a.knowledgeLimits === 'limited' : null };
}

export const SCORE_COLUMNS = [
  { id: 'observation', label: '觀察｜初步觀察（教師）', group: 'observing', max: 2, manual: true },
  { id: 'readings', label: '觀察｜直徑及有無紙碟外清晰區（自動）', group: 'observing', max: 2 },
  { id: 'observing', label: 'SPS 觀察', group: 'observing', max: 4, formula: ['observation', 'readings'] },
  { id: 'iv', label: '分類｜獨立變量（自動）', group: 'classifying', max: 1 },
  { id: 'dv', label: '分類｜因變量（自動）', group: 'classifying', max: 1 },
  { id: 'cv', label: '分類｜控制變量（自動）', group: 'classifying', max: 2 },
  { id: 'classifying', label: 'SPS 分類', group: 'classifying', max: 4, formula: ['iv', 'dv', 'cv'] },
  { id: 'hypothesis', label: '設計｜可測試假說及理由（教師）', group: 'designing', max: 1, manual: true },
  { id: 'repeat', label: '設計｜原始重複安排理由（教師）', group: 'designing', max: 1, manual: true },
  { id: 'control', label: '設計｜對照理由（教師）', group: 'designing', max: 1, manual: true },
  { id: 'assumptions', label: '設計｜探究假設（自動）', group: 'designing', max: 1 },
  { id: 'designing', label: 'SPS 設計探究', group: 'designing', max: 4, formula: ['hypothesis', 'repeat', 'control', 'assumptions'] },
  { id: 'designQuality', label: '實作｜平板設計品質（教師）', group: 'conducting', max: 2, manual: true },
  { id: 'methodEvaluation', label: '實作｜檢查及改善方法（教師）', group: 'conducting', max: 2, manual: true },
  { id: 'conducting', label: 'SPS 進行實驗', group: 'conducting', max: 4, formula: ['designQuality', 'methodEvaluation'] },
  { id: 'means', label: '推論｜依自己的讀數計算平均值（自動）', group: 'inferring', max: 1 },
  { id: 'deathLimit', label: '推論｜不能證明全部死亡（自動）', group: 'inferring', max: 0.5 },
  { id: 'clinicalLimit', label: '推論｜不能判定最佳治療（自動）', group: 'inferring', max: 0.5 },
  { id: 'evidenceAnalysis', label: '推論｜以對照及重複結果論證（教師）', group: 'inferring', max: 2, manual: true },
  { id: 'inferring', label: 'SPS 推論', group: 'inferring', max: 4, formula: ['means', 'deathLimit', 'clinicalLimit', 'evidenceAnalysis'] },
  { id: 'graph', label: '溝通｜棒高與自己的平均值（自動）', group: 'communicating', max: 2 },
  { id: 'writtenExpression', label: '溝通｜書面表達（教師）', group: 'communicating', max: 2, manual: true },
  { id: 'communicating', label: 'SPS 溝通', group: 'communicating', max: 4, formula: ['graph', 'writtenExpression'] },
  { id: 'sps', label: 'SPS 總分（24）', group: 'score', max: 24, formula: ['observing', 'classifying', 'designing', 'conducting', 'inferring', 'communicating'] },
  { id: 'knowledgeBacteria', label: '新知識｜抗生素與細菌感染（教師）', group: 'knowledge', max: 2, manual: true },
  { id: 'knowledgeResistance', label: '新知識｜細菌抗藥性（教師）', group: 'knowledge', max: 2, manual: true },
  { id: 'knowledgeLimits', label: '新知識｜清晰區及重複的限制（教師）', group: 'knowledge', max: 2, manual: true },
  { id: 'knowledgeRevision', label: '新知識｜以證據修訂原始解釋（教師）', group: 'knowledge', max: 2, manual: true },
  { id: 'knowledge', label: '新知識總分（8）', group: 'knowledge', max: 8, formula: ['knowledgeBacteria', 'knowledgeResistance', 'knowledgeLimits', 'knowledgeRevision'] },
  { id: 'overall', label: '整體總分（32）', group: 'score', max: 32, formula: ['sps', 'knowledge'] },
  { id: 'marking', label: '評分狀態', group: 'score' }
];

export function automaticScores(record) {
  const checks = objectiveChecks(record), a = record.answers || {};
  const plates = record.plates || [];
  // Fixed twelve reading tasks; this measures numeric/observational accuracy, never task completion.
  const accurate = plates.flatMap(plate => SAMPLE_IDS.map(sample => readingCheck(record, plate, sample, record.measurements?.[plate.id]?.[sample]))).filter(check => check === true).length;
  const cv = Array.isArray(a.cv) ? a.cv : [];
  const validCV = cv.every(value => VARIABLE_REFERENCE.cv.includes(value)) && new Set(cv).size === cv.length;
  return { readings: roundScore(Math.min(12, accurate) / 12 * 2), iv: checks.iv ? 1 : 0, dv: checks.dv ? 1 : 0,
    cv: validCV ? roundScore(VARIABLE_REFERENCE.cv.filter(value => cv.includes(value)).length / VARIABLE_REFERENCE.cv.length * 2) : 0,
    assumptions: checks.assumptions ? 1 : 0,
    means: SAMPLE_IDS.filter(sample => meanCheck(record, sample) === true).length / 4,
    deathLimit: checks.analysisDeath ? 0.5 : 0, clinicalLimit: checks.analysisClinical ? 0.5 : 0,
    graph: SAMPLE_IDS.filter(sample => graphCheck(record, sample) === true).length / 2 };
}

export const RUBRIC_ROWS = [
  ['觀察｜初步觀察', 2, '教師', '指出青黴菌（真菌）附近的可見細菌生長較少，並分開觀察與推測。', '1：描述相關現象但位置或觀察／推測區分不完整。', '0：未提供可評答案、無關或把機制當作直接觀察。', 'observing'],
  ['觀察｜直徑及紙碟外清晰區', 2, '自動', '12 個最後讀數均符合模型直徑 ±1 mm，並正確分辨紙碟外有／無可見清晰區。', '2 × 符合兩項條件的讀數數目 ÷ 12，保留兩位小數。', '0：沒有符合兩項條件的讀數。紙碟 6 mm 本身不算外圍清晰區。', 'observing'],
  ['分類｜獨立變量／因變量／控制變量', 4, '自動', '紙碟所含樣本（1）；是否有清晰區及總直徑（1）；六項控制：同一種細菌、初始分布、培養基、紙碟大小、預設製備、共同培養及觀察條件（2）。', '六項控制變量每項 2/6；全選正確得 2；整欄保留兩位小數。', '選入自／因變量等不適當控制項，控制變量欄 0；未答或分類錯誤 0。', 'classifying'],
  ['設計｜可測試假說及理由', 1, '教師', '1：實驗前提出可用樣本與載體對照比較的預測，並給出相關理由。', '0.5：可測試預測，但理由較薄弱或不清楚。', '0：無可測試預測或無實驗前證據；合理但不被結果支持的假說不因此扣分。', 'designing'],
  ['設計｜原始重複安排理由', 1, '教師', '1：說明獨立重複可檢查一致性／變異，次數安排有可行性理由。', '0.5：提及可靠性但缺少獨立比較或安排理由。', '0：只有次數或無可評理由。不以選 3 次、次數越多給分。', 'designing'],
  ['設計｜對照理由', 1, '教師', '1：相同載體但不含抗生素的紙碟，解釋排除載體／紙碟影響及相同條件。', '0.5：有恰當空白對照，但理由或共同條件不完整。', '0：缺乏適當對照，或無可評理由。', 'designing'],
  ['設計｜探究假設', 1, '自動', '只選初始分布可比較、無額外污染、相同模擬條件。', '全組正確才得 1；本項無部分分。', '錯選、漏選或未答；不能假設透明區所有細菌必定死亡。', 'designing'],
  ['實作｜平板設計品質', 2, '教師', '清楚標示 X、Y、Z、對照；留足間距及邊緣距離；能參照圖／文字公平比較。', '1：基本可行但缺少一項主要安排。', '0：無法公平比較／無可評設計；可用文字取代繪圖。', 'conducting'],
  ['實作｜檢查及改善方法', 2, '教師', '依自己的結果及操作紀錄，合理檢查分布、污染、紙碟位置或共同條件，說明先查方法或再測試。', '1：提出相關檢查，但未連結結果或改善理由。', '0：無可評方法評估。不評滑鼠精度、拖動／點擊數、速度、用時或完成率。', 'conducting'],
  ['推論｜平均值', 1, '自動', '四組平均值均為自己的三個最後讀數之和 ÷3；輸入保留 1 位小數，容差 ±0.1 mm。', '每組正確得 0.25。依學生自己的讀數，避免重複扣量度錯誤。', '0：沒有正確平均值／無有效自身讀數。', 'inferring'],
  ['推論｜死亡及臨床限制', 1, '自動', '沒有可見生長不能證明全部死亡（0.5）；最大圈不能判定最佳臨床治療（0.5）。', '每個正確選項 0.5。', '錯誤或未答 0；未知樣本不以共用界線判定敏感／抗藥。', 'inferring'],
  ['推論｜對照及重複證據', 2, '教師', '以樣本／對照、三片獨立平板數據解釋假說支持程度及變異，並提出有界線的結論。', '1：有相關數據或判斷，但對照、重複或推論界線不完整。', '0：無數據支持／核心推論錯誤。原始假說未獲支持仍可得滿分。', 'inferring'],
  ['溝通｜棒形圖', 2, '自動', 'X、Y、Z、空白對照四棒與自己的已輸入平均值相符（±0.5 mm）；類別不連線。', '每組正確得 0.5；必須確認圖表。', '0：無符合棒高；不再以模型讀數扣平均值／量度錯誤。', 'communicating'],
  ['溝通｜書面表達', 2, '教師', '用清晰的樣本名稱、數據、單位及比較語句傳達設計、分析及結論。', '1：可理解，但缺少必要標示或表述含糊。', '0：沒有可評表達或無法理解；與概念正確性分開評。', 'communicating'],
  ['新知識｜抗生素與細菌', 2, '教師', '正確說明抗生素抑制／殺死細菌，對病毒感染無效，作用機制是補充知識而非本實驗直接證明。', '1：正確提及細菌／病毒區別或作用，但不完整。', '0：核心概念錯誤或無可評內容。', 'knowledge'],
  ['新知識｜細菌抗藥性', 2, '教師', '抗藥性是細菌對藥物的反應；原有抗藥細菌較易存活及繁殖；不說人的身體習慣藥物／細菌有目的適應。', '1：基本描述正確，選擇／繁殖連結不完整。', '0：核心概念錯誤或無可評內容。', 'knowledge'],
  ['新知識｜清晰區與重複限制', 2, '教師', '說明局部可見生長受抑制，不證明全部死亡或最佳治療；重複檢查一致性，不保證可靠，擴散／紙碟含量亦影響。', '1：至少正確說明一項推論限制或重複價值，但不完整。', '0：無可評內容／把 3 次當成可靠保證。', 'knowledge'],
  ['新知識｜修訂原始解釋', 2, '教師', '比較原始假說及重複計劃，引用樣本／對照和獨立重複數據，以學習重點修訂／完善，交代仍不能確定甚麼。', '1：有修訂或判斷，但缺少數據／概念連結。', '0：只抄知識，未對照原有想法，或無可評反思。', 'knowledge'],
  ['總分及待評狀態', 32, '公式', '六項 SPS 各 4＝24，四項新知識各 2＝8；12 個必要人工評分格填完且反思已提交，才顯示整體總分。', '人工格空白＝待評，填 0＝已評零分；分數只保存於教師保存的 Excel。', '不把操作次數、速度、時間或完成率直接換算能力。此 rubric 待試教及跨 VL 校準。', 'score']
];
