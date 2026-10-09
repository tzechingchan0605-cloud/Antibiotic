import test from 'node:test';
import assert from 'node:assert/strict';
import {glossEnglish} from '../english-glossary.js';
import {learningPointsHTML,learningDiagram,answerDisplay} from '../reports.js';

test('English glosses prefer full biological phrases and remain stable on repeated rendering',()=>{
 const raw='Methicillin-resistant Staphylococcus aureus (MRSA). Antibiotic resistance and resistance traits. Susceptible bacteria reproduce in agar plates.';
 const supported=glossEnglish(raw);
 assert.match(supported,/Methicillin-resistant Staphylococcus aureus \(MRSA\)（耐甲氧西林金黃葡萄球菌）/);
 assert.match(supported,/Antibiotic resistance（抗生素抗性／抗藥性） and resistance traits（抗藥性特徵）/);
 assert.match(supported,/Susceptible（對抗生素敏感的） bacteria reproduce（繁殖） in agar plates（瓊脂板）/);
 assert.equal(glossEnglish(supported),supported);
 assert.equal(glossEnglish('Staphylococcus aureus'),'Staphylococcus aureus（金黃葡萄球菌）');
 assert.equal(glossEnglish('VL4_Antibiotic_Investigation.png'),'VL4_Antibiotic_Investigation.png');
});

test('all excluded easy terms remain untranslated',()=>{
 const excluded='Survival; Capsule; Cell wall; Cell membrane; Protein synthesis; Nucleic acid synthesis; Diffuse / diffusion; Concentration; Hypothesis; Assumptions; Independent variable; Dependent variable; Controlled variables; Control group; Evidence; Cite; Mean; Variation; Random error; Assess; Effectiveness; Proportion; Invert; inverted; inverting; Nutrients; nutrient; Diameter; diameters; Contamination; Forceps';
 assert.equal(glossEnglish(excluded),excluded);
});

test('learning points and authored answer choices receive glosses while learner prose remains original',()=>{
 const en=learningPointsHTML('en'),zh=learningPointsHTML('zh');
 assert.match(en,/susceptibility（對抗生素的敏感性）/);
 assert.match(en,/selection pressure（選擇壓力）/);
 assert.match(en,/reproduction（繁殖）/);
 assert.match(en,/<strong class="learning-emphasis">clear zone（清晰區）<\/strong>/);
 assert.doesNotMatch(en,/concentration（|survival（|proportion（/i);
 assert.doesNotMatch(zh,/Antibiotics|susceptibility/);
 const prose='Antibiotic resistance affects reproduction. My original answer.';
 assert.equal(answerDisplay('reflection',prose,'en'),prose);
 assert.match(answerDisplay('repeatPurpose','consistency','en'),/reproducibility（可重複性）/);
 assert.match(learningDiagram('en'),/textLength="\d+" lengthAdjust="spacingAndGlyphs"/);
});
