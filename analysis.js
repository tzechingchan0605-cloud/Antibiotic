// Canonical choice values stay unchanged when students switch the interface language.
export const ANALYSIS_VERSION = 2;
export const MC_QUESTIONS = [
  {id:'zoneMeaning',number:1,key:'zoneMeaning',correct:'inhibition',options:[['death','zoneDeath'],['inhibition','zoneInhibition'],['resistance','zoneResistance'],['viruses','zoneViruses']]},
  {id:'zoneDiameterMeaning',number:2,key:'zoneDiameterMeaning',correct:'extent',options:[['count','diameterCount'],['treatment','diameterTreatment'],['extent','diameterExtent'],['dose','diameterDose']]},
  {id:'repeatPurpose',number:4,key:'repeatPurpose',correct:'consistency',options:[['consistency','repeatConsistency'],['guarantee','repeatGuarantee'],['remeasure','repeatRemeasure'],['content','repeatContent']]},
  {id:'repeatVariation',number:5,key:'repeatVariation',correct:'check',options:[['delete','variationDelete'],['maximum','variationMaximum'],['average','variationAverage'],['check','variationCheck']]},
  {id:'controlPurpose',number:6,key:'controlPurpose',correct:'baseline',options:[['same','controlSame'],['treatment','controlTreatment'],['baseline','controlBaseline'],['increase','controlIncrease']]}
];
export const EFFECTIVE_OPTIONS = [['X','predictionX'],['Y','predictionY'],['Z','predictionZ'],['X_Y','predictionXY'],['X_Z','predictionXZ'],['Y_Z','predictionYZ'],['all','effectiveAll'],['none','effectiveNone']];
export const CONCLUSION_FIELDS = ['effectiveSamples','rank1','rank2','rank3','rank4'];
export const ANALYSIS_FIELDS = [...MC_QUESTIONS.map(question=>question.id),...CONCLUSION_FIELDS];
export const currentAnalysis = record => record.analysisVersion === ANALYSIS_VERSION;
export const analysisChecks = record => Object.fromEntries(MC_QUESTIONS.map(question=>[question.id, record.answers?.[question.id] ? record.answers[question.id] === question.correct : null]));
