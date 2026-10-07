import {MC_QUESTIONS} from '../analysis.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { buildWorkbook, renderReport, openPrintReport, reportFilename, learningDiagram, workbookFilename } from '../reports.js';
import { automaticScores, objectiveChecks, meanCheck, graphCheck, readingCheck, SCORE_COLUMNS, CURRENT_SCORE_COLUMNS } from '../rubric.js';

const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=';
const at='2026-10-07T04:00:00Z';
function fixture(id='student-one') {
  const answers={observation:'黴菌附近没有可見菌落 <script>alert(1)</script>',inference:'My original inference.',comparison:'Compare with no mould.',prediction:'some',largestPrediction:'Z',controlPrediction:'Compare with carrier.',reason:'Latest reason 保留原文',iv:'sample',dv:'zone',cv:['strain','distribution','medium','disc','preparation','observation'],assumptions:['distribution','sterile','sameConditions'],controlPlan:'Matching carrier without antibiotic.',designDescription:'Keep the discs apart.',repeatChoice:'yes',plannedReplicates:'5',plannedReplicateReason:'Latest plan reason.',analysisControl:'Control has no outer zone.',analysisConsistent:'X and Z in all three.',analysisVariation:'X: 18, 19, 17 mm.',analysisMethod:'Check distribution.',analysisHypothesis:'My original prediction needs revision.',analysisRepeatPlan:'Two tests would not reveal all variation.',analysisRepeatValue:'Check the method before adding tests.',analysisDeath:'cannot',analysisClinical:'cannot',conclusion:'The result supports local growth inhibition only.',knowledgeBacteria:'bacteria',knowledgeResistance:'bacteria',knowledgeLimits:'limited',reflection:'反思原文：X compared with carrier, repeated plates vary.'};
  const plates=Array.from({length:3},(_,i)=>({id:`plate-${i+1}`,discPositions:{X:{x:130,y:130},Y:{x:270,y:130},Z:{x:130,y:270},C:{x:270,y:270}},rotation:0,result:{X:[18,19,17][i],Y:0,Z:[27,28,26][i],C:0},completed:true,operations:[{type:'independent_repeat',at}]}));
  const measurements=Object.fromEntries(plates.map(plate=>[plate.id,Object.fromEntries(['X','Y','Z','C'].map(sample=>{
    const last={value:String(plate.result[sample]),visible:['Y','C'].includes(sample)?'no':'yes',note:'最後備註',at};
    const first={...last,value:String(plate.result[sample]+2),note:'首次備註'};
    return [sample,{...last,first,last,revisions:[{previous:first,next:last,at}]}];
  }))]));
  return {schemaVersion:1,moduleId:'VL_BIO_ANTIBIOTICS',id,version:4,demo:false,profile:{name:'陳同學',className:'4A 12',email:'student@example.test'},submittedAt:at,reflectionSubmittedAt:at,answers,original:{answers:{...answers,prediction:'none',largestPrediction:'X',reason:'Original reason 原文',plannedReplicates:'2',plannedReplicateReason:'Original repeat reason.'},plannedReplicates:2,plannedReplicateReason:'Original repeat reason.',capturedAt:at,design:{image:PNG,description:'Original drawing'}},plates,measurements,means:{X:'18.0',Y:'0.0',Z:'27.0',C:'0.0'},graph:{values:{X:18,Y:0,Z:27,C:0},confirmedAt:at},design:{image:PNG,description:'Latest drawing'},extension:{started:true,prediction:'A larger model zone.',reason:'Same sample.',fairComparison:'Keep the strain the same.',results:{low:12,medium:18,high:23},analysis:'This is not a dosing recommendation.'},events:[{type:'measurement_confirmed',at,phase:3,details:{sample:'X',value:18,teacherPassword:'must-not-export',nested:{token:'must-not-export',note:'keep this'}}}],timing:{1:15,2:25,3:90,4:40}};
}
const headerIndex=(sheet,label)=>sheet.getRow(1).values.findIndex(value=>value===label);

test('local export filename cannot be confused with the complete class export',()=>{
  assert.equal(workbookFilename(),'VL4_抗生素研究任務_全班學習紀錄.xlsx');
  assert.equal(workbookFilename({scope:'class'}),'VL4_抗生素研究任務_全班學習紀錄.xlsx');
  assert.equal(workbookFilename({scope:'local'}),'VL4_抗生素研究任務_本機學習紀錄.xlsx');
  assert.throws(()=>workbookFilename({scope:'partial'}),/Unknown workbook export scope/);
});

test('student reports are fully bilingual, preserve original/latest evidence and do not display scores',()=>{
  const record=fixture(),before=structuredClone(record);
  const zh=renderReport(record),en=renderReport(record,'en');
  assert.match(zh,/你的原始研究計劃/);assert.match(en,/Your original research plan/);
  assert.doesNotMatch(zh,/學習重溫備註/);assert.doesNotMatch(en,/Learning review notes/);
  assert.match(zh,/實驗原理：抗生素樣本的擴散與清晰區的形成/);assert.match(en,/antibiotic diffusion and clear-zone formation/);
  assert.match(zh,/① 紙碟承載抗生素/);assert.match(zh,/② 抗生素向瓊脂擴散/);assert.match(zh,/③ 抗生素抑制細菌生長/);
  assert.match(zh,/離紙碟越遠，濃度通常越低/);assert.match(en,/concentration generally decreases with distance/);
  assert.match(zh,/過度或不當使用抗生素/);assert.match(en,/antibiotic overuse or misuse/);
  assert.match(zh,/C（對照）/);assert.match(en,/C \(control\)/);
  assert.match(zh,/原始假說|原始研究/);assert.match(en,/Independent variable/);
  assert.match(en,/Dependent variable/);assert.match(en,/Controlled variables/);
  for(const html of [zh,en]){
    for(const text of ['Original reason 原文','Latest reason 保留原文','Original repeat reason.','plate-1','plate-2','plate-3','首次備註','最後備註','反思原文'])assert.ok(html.includes(text),text);
    assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);
    assert.doesNotMatch(html,/My original inference\.|Compare with no mould\./);
    assert.match(html,/data:image\/png;base64/);assert.match(html,/<svg/);
    assert.doesNotMatch(html,/教師評分|整體總分|SPS 總分|0–32|overall score|SPS score/i);
  }
  assert.match(zh,/class="check correct"/);assert.match(en,/Matches reference/);
  assert.doesNotMatch(en,/你的原始研究計劃|清晰區總直徑包括紙碟|學生瓊脂板位置及實驗設計圖/);
  assert.match(learningDiagram('en'),/Nucleic acid synthesis/);assert.doesNotMatch(learningDiagram('en'),/細胞壁|抗生素作用位置/);
  assert.deepEqual(record,before,'rendering never mutates record, images, answers, event history or timing');
});

test('reference answers and objective marks are withheld until inquiry submission',()=>{
  const record=fixture();record.submittedAt=null;record.reflectionSubmittedAt=null;
  const html=renderReport(record,'en');
  assert.doesNotMatch(html,/class="check (correct|incorrect)"/);
  assert.doesNotMatch(html,/Reference:|Learning points after submission|Learning review notes|In this model, X and Z/);
  record.submittedAt=at;record.answers.iv='zone';
  assert.match(renderReport(record,'en'),/class="check incorrect"/);
});

test('print/PDF unlock depends on reflection submission and language-specific filename preserves identity',async()=>{
  const record=fixture();record.reflectionSubmittedAt=null;
  await assert.rejects(openPrintReport(record,'en'),/submit your reflection/);
  assert.equal(reportFilename(record),'VL4_抗生素研究任務_4A 12_陳同學');
  assert.equal(reportFilename(record,'en'),'VL4_Antibiotic_Investigation_4A 12_陳同學');
  record.reflectionSubmittedAt=at;let printed=0,written='';
  const oldWindow=globalThis.window;
  globalThis.window={open:()=>({document:{write:html=>written=html,close(){},images:[],fonts:{ready:Promise.resolve()}},focus(){},print(){printed++;}})};
  try {await openPrintReport(record,'en');}finally{globalThis.window=oldWindow;}
  assert.equal(printed,1);assert.match(written,/<!doctype html>/);assert.match(written,/@media print/);assert.match(written,/<html lang="en">/);assert.match(written,/VL4_Antibiotic_Investigation_4A 12_陳同學/);
});

test('numeric checks use declared tolerances, own data, and no zone means zero in checks and exports',()=>{
  const record=fixture();assert.equal(automaticScores(record).readings,2);
  const plate=record.plates[0];
  assert.equal(readingCheck(record,plate,'Y',{value:'6',visible:'no'}),false);
  assert.equal(readingCheck(record,plate,'Y',{value:'0',visible:'no'}),true);
  assert.equal(readingCheck(record,plate,'Y',{value:'6',visible:'yes'}),false);
  assert.equal(readingCheck(record,plate,'Y',{value:'1',visible:'no'}),false);
  const legacy=structuredClone(plate);legacy.result.Y=6;
  assert.equal(readingCheck(record,legacy,'Y',{value:'0',visible:'no'}),true);
  assert.equal(legacy.result.Y,6,'legacy saved results are not rewritten');
  assert.equal(readingCheck(record,plate,'X',{value:'19',visible:'yes'}),true);
  assert.equal(readingCheck(record,plate,'X',{value:'19.1',visible:'yes'}),false);
  // A systematic reading error is penalised only in reading accuracy, not again in arithmetic or graph.
  for(const item of record.plates)record.measurements[item.id].X.value=String(Number(record.measurements[item.id].X.value)+3);
  record.means.X='21.0';record.graph.values.X=21;
  assert.equal(meanCheck(record,'X'),true);assert.equal(graphCheck(record,'X'),true);
  record.means.X='21.1';assert.equal(meanCheck(record,'X'),true);
  record.means.X='21.2';assert.equal(meanCheck(record,'X'),false);
  record.graph.values.X=21.7;assert.equal(graphCheck(record,'X'),true);
  record.graph.values.X=21.8;assert.equal(graphCheck(record,'X'),false);
});

test('hypothesis outcome, requested repeat count and operation speed/count never alter automatic ability scores',()=>{
  const record=fixture(),baseline=automaticScores(record);
  record.answers.prediction='none';record.answers.plannedReplicates='99';record.timing={1:999999,2:0,3:0,4:0};
  record.events.push(...Array.from({length:100},()=>({type:'pointermove',at,details:{speed:200}})));
  record.plates.forEach(plate=>plate.operations=[]);
  assert.deepEqual(automaticScores(record),baseline);
  assert.equal(SCORE_COLUMNS.filter(column=>column.manual).length,12);
  assert.equal(objectiveChecks(record).iv,true);
});

test('VL2-style variable choices grade exact sets and retain legacy scalar compatibility',()=>{
  const record=fixture(),before=automaticScores(record);
  record.answers.iv=['sample'];record.answers.dv=['zone'];
  assert.equal(objectiveChecks(record).iv,true);assert.equal(objectiveChecks(record).dv,true);
  assert.deepEqual(automaticScores(record),before);
  assert.match(renderReport(record,'en'),/Sample in the disc/);
  record.answers.iv.push('zone');assert.equal(objectiveChecks(record).iv,false);
  record.answers.dv=[];assert.equal(objectiveChecks(record).dv,null);
  record.answers.iv='sample';record.answers.dv='zone';
  assert.deepEqual(automaticScores(record),before);
});

test('five visible controls receive full/partial marks while six-control legacy records retain their scores',()=>{
  const record=fixture();assert.equal(automaticScores(record).cv,2);assert.equal(objectiveChecks(record).cv,true);
  record.answers.cv=['disc','medium','strain','distribution','preparation'];
  assert.equal(automaticScores(record).cv,2);assert.equal(objectiveChecks(record).cv,true);
  record.answers.cv=['disc'];assert.equal(automaticScores(record).cv,0.4);assert.equal(objectiveChecks(record).cv,false);
  record.answers.cv=['disc','sample'];assert.equal(automaticScores(record).cv,0);
  record.answers.cv=['disc','disc'];assert.equal(automaticScores(record).cv,0);
});

test('actual XLSX has six Chinese sheets, twelve readings, images, snapshots, event details, formulas and blank manual scores',async()=>{
  const record=fixture(),demo={...fixture('demo-id'),demo:true},teacher={...fixture('teacher-id'),profile:{...record.profile,email:'tzechingchan0605@gmail.com'}},foreign={...fixture('vl2-id'),moduleId:'VL_BIO_TRANSPIRATION'};
  const workbook=await buildWorkbook([record,demo,teacher,foreign]);
  const buffer=await workbook.xlsx.writeBuffer();
  assert.equal(Buffer.from(buffer).subarray(0,2).toString(),'PK','real OOXML ZIP, not renamed CSV/HTML');
  const zip=await JSZip.loadAsync(buffer);
  const names=Object.keys(zip.files);
  assert.equal(names.filter(name=>/^xl\/worksheets\/sheet\d+\.xml$/.test(name)).length,6);
  assert.equal(names.filter(name=>/^xl\/media\/image\d+\.png$/.test(name)).length,2,'original and latest drawing are embedded');
  assert.ok(names.some(name=>/^xl\/drawings\/drawing\d+\.xml$/.test(name)));
  const loaded=new ExcelJS.Workbook();await loaded.xlsx.load(buffer);
  assert.deepEqual(loaded.worksheets.map(sheet=>sheet.name),['學生探究答案','量度計算與圖表','教師評分','評分準則','操作事件紀錄','裝置設計圖']);
  const answers=loaded.getWorksheet('學生探究答案'),data=loaded.getWorksheet('量度計算與圖表'),scores=loaded.getWorksheet('教師評分'),designs=loaded.getWorksheet('裝置設計圖');
  assert.equal(answers.rowCount,2);assert.equal(data.rowCount,13);assert.equal(designs.rowCount,3);assert.equal(designs.getImages().length,2);
  assert.equal(answers.getCell(2,headerIndex(answers,'plannedReplicates｜原始建議')).value,2);
  assert.equal(answers.getCell(2,headerIndex(answers,'plannedReplicateReason｜原始理由')).value,'Original repeat reason.');
  assert.equal(answers.getCell(2,headerIndex(answers,'actualReplicates｜獨立瓊脂板數')).value,3);
  assert.equal(answers.getCell(2,headerIndex(answers,'原始｜你預測哪些樣本會出現紙碟外的可見清晰區？')).value,'都不會');
  assert.equal(answers.getCell(2,headerIndex(answers,'最新｜你預測哪些樣本會出現紙碟外的可見清晰區？')).value,'部分');
  assert.equal(answers.getCell(2,headerIndex(answers,'原始｜你預測哪種樣本的紙碟周圍清晰區最大？')).value,'X');
  assert.equal(answers.getCell(2,headerIndex(answers,'最新｜你預測哪種樣本的紙碟周圍清晰區最大？')).value,'Z');
  assert.equal(data.getCell('F2').value,20);assert.equal(data.getCell('J2').value,18);
  assert.equal(data.getCell('M2').value,18);assert.equal(data.getCell('P2').value,18);
  for(const row of [3,5]){assert.equal(data.getCell(`J${row}`).value,0);assert.equal(data.getCell(`M${row}`).value,0);assert.equal(data.getCell(`N${row}`).value,'符合');}
  assert.doesNotMatch(renderReport(record,'zh'),/不能記 0|紙碟直徑 6 mm/);
  const manual=SCORE_COLUMNS.filter(column=>column.manual);
  for(const column of manual){const index=headerIndex(scores,column.label+`（0–${column.max}）`),cell=scores.getCell(2,index);assert.equal(cell.value,null,column.id);assert.equal(cell.dataValidation.type,'decimal');assert.deepEqual(cell.dataValidation.formulae,[0,column.max]);assert.equal(cell.dataValidation.allowBlank,true);}
  const total=scores.getCell(2,headerIndex(scores,'整體總分（32）（0–32）'));
  assert.match(total.formula,/COUNT\(/);assert.match(total.formula,/=12/);assert.match(total.formula,/D2="已完成"/);assert.equal(total.result,'待評／未完成');
  const scoresXML=await zip.file('xl/worksheets/sheet3.xml').async('string');
  assert.match(scoresXML,/<dataValidations/);assert.match(scoresXML,/<conditionalFormatting/);assert.match(scoresXML,/state="frozen"/);assert.match(scoresXML,/<autoFilter/);
  const allXML=(await Promise.all(names.filter(name=>/\.xml$/.test(name)).map(name=>zip.file(name).async('string')))).join('\n');
  assert.doesNotMatch(allXML,/demo-id|teacher-id|vl2-id|must-not-export/);assert.match(allXML,/keep this/);
  assert.equal(loaded.getWorksheet('操作事件紀錄').rowCount,17,'twelve reading revisions, one inquiry event, three plate operations plus header');
});

test('same record exported from either UI language has identical worksheet data, formulas and embedded images',async()=>{
  const record=fixture();
  const [zh,en]=await Promise.all([buildWorkbook([record],'zh'),buildWorkbook([record],'en')]);
  const [zhZip,enZip]=await Promise.all([zh.xlsx.writeBuffer().then(JSZip.loadAsync),en.xlsx.writeBuffer().then(JSZip.loadAsync)]);
  for(const name of Object.keys(zhZip.files).filter(name=>/^xl\/(worksheets|drawings|media|sharedStrings|styles)/.test(name)&&!zhZip.files[name].dir)){
    assert.deepEqual(await zhZip.file(name).async('uint8array'),await enZip.file(name).async('uint8array'),name);
  }
});

function currentFixture(id='new-student') {
  const record=fixture(id);record.analysisVersion=2;
  record.answers={...record.answers,...Object.fromEntries(MC_QUESTIONS.map(question=>[question.id,question.correct])),effectiveSamples:'X_Z',rank1:'Z',rank2:'X',rank3:'na',rank4:'na'};
  // Keep old fields as migration evidence; they must not be rendered or scored on the new version.
  return record;
}
test('revised reports and XLSX retain evidence, include five MCs/conclusion, and exclude removed tasks',async()=>{
 const record=currentFixture(),before=structuredClone(record);
 for(const lang of ['zh','en']){
  const report=renderReport(record,lang);
  assert.doesNotMatch(report,/report-graph|bar chart|棒形圖|Optional extension|可選延伸|Learning review notes|學習重溫備註|Control has no outer zone/);
  assert.match(report,/Z ＞ X ＞/);assert.match(report,/MRSA/);
  assert.match(report,lang==='en'?/Not applicable/:/不適用/);
  assert.match(report,lang==='en'?/selection pressure/:/選擇壓力/);
  assert.match(report,lang==='en'?/patient factors/:/患者情況/);
 }
 const auto=automaticScores(record);
 assert.equal(auto.graph,undefined);assert.equal(auto.deathLimit,undefined);
 for(const question of MC_QUESTIONS)assert.equal(auto[question.id],1);
 record.answers.zoneMeaning='death';assert.equal(automaticScores(record).zoneMeaning,0);
 const workbook=await buildWorkbook([record]);
 const data=workbook.getWorksheet('量度與計算'),scores=workbook.getWorksheet('教師評分'),answers=workbook.getWorksheet('學生探究答案');
 assert.equal(data.columnCount,18);assert.equal(data.rowCount,13);
 assert.doesNotMatch(JSON.stringify(answers.getRow(1).values),/延伸|最大清晰區是否|生長情況如何/);
 const mcCell=scores.getCell(2,headerIndex(scores,'分析｜第 1 題（自動）（0–1）'));assert.equal(mcCell.value,0);
 const overall=scores.getCell(2,headerIndex(scores,'新版整體總分（23）（0–23）'));
 assert.match(overall.formula,/=7/);assert.match(overall.formula,/D2="已完成"/);
 assert.equal(CURRENT_SCORE_COLUMNS.filter(column=>column.manual).length,7);
 assert.equal(CURRENT_SCORE_COLUMNS.filter(column=>column.max!==undefined&&!column.formula).reduce((sum,column)=>sum+column.max,0),23);
 const conclusion=scores.getCell(2,headerIndex(scores,'結論｜樣本選擇及排序（教師）（0–1）'));assert.equal(conclusion.value,null);
 assert.equal(answers.getCell(2,headerIndex(answers,'最新｜排序第 3 項')).value,'不適用');
 const zip=await JSZip.loadAsync(await workbook.xlsx.writeBuffer());
 assert.ok(zip.file('xl/worksheets/sheet3.xml'));
 record.answers.zoneMeaning='inhibition';assert.deepEqual(record,before);
});
test('mixed assessment versions keep separate score sheets without dropping old answers or changing records',async()=>{
 const old=fixture('old-student'),current=currentFixture(),before=structuredClone([old,current]);
 const workbook=await buildWorkbook([old,current]);
 assert.equal(workbook.getWorksheet('教師評分').getCell('A2').value,'old-student');
 assert.equal(workbook.getWorksheet('教師評分（新版）').getCell('A2').value,'new-student');
 const answers=workbook.getWorksheet('學生探究答案');
 assert.equal(answers.rowCount,3);
 assert.equal(answers.getCell(2,headerIndex(answers,'最新｜C（對照）的生長情況如何？它提供甚麼比較基礎？')).value,'Control has no outer zone.');
 assert.equal(answers.getCell(3,headerIndex(answers,'最新｜排序第 1 項')).value,'Z');
 assert.deepEqual([old,current],before);
});
