import test from 'node:test';import assert from 'node:assert/strict';import {freshRecord} from '../model.js';import {scoreColumnsFor,validManualScore,conclusionChecks,CURRENT_SCORE_COLUMNS,SCORE_COLUMNS} from '../rubric.js';import {buildWorkbook,renderReport} from '../reports.js';
test('R3 totals29 with six integer manual fields; historical23/32 remain explicit',async()=>{const r={...freshRecord({email:'test@school.edu.hk'}),rubricVersion:3},v2={...r,rubricVersion:undefined},v1={...r,analysisVersion:undefined};assert.equal(scoreColumnsFor(r).find(c=>c.id==='overall').max,29);assert.equal(scoreColumnsFor(v2),CURRENT_SCORE_COLUMNS);assert.equal(scoreColumnsFor(v1),SCORE_COLUMNS);const manual=scoreColumnsFor(r).filter(c=>c.manual);assert.equal(manual.length,6);for(const c of manual){assert(validManualScore(0,c,r));assert(validManualScore(c.max,c,r));for(const v of [-1,c.max+1,.5,'1','text',null,NaN])assert.equal(validManualScore(v,c,r),false);}const before=JSON.stringify([r,v2,v1]);const w=await buildWorkbook([r,v2,v1]);assert.equal(JSON.stringify([r,v2,v1]),before);for(const name of ['教師評分','教師評分（新版）','教師評分（R3）'])assert(w.getWorksheet(name));const sheet=w.getWorksheet('教師評分（R3）');for(const c of manual){const col=scoreColumnsFor(r).indexOf(c)+5;assert.equal(sheet.getCell(2,col).dataValidation.type,'whole');}const total=sheet.getCell(2,scoreColumnsFor(r).findIndex(c=>c.id==='overall')+5);assert.match(total.formula,/IFERROR\(AND\(ISNUMBER/);assert.match(total.formula,/MOD\(.+,1\)=0/);});

test('empty exports use the current R4 headers and rubric',async()=>{const w=await buildWorkbook([]);const h=w.getWorksheet('教師評分').getRow(1).values.join(' ');assert.match(h,/R4 整體總分（29）/);});

test('multiple effective-sample choices and historical combined choices are graded equivalently',()=>{const r=freshRecord({});r.plates[0].result={X:18,Y:0,Z:27,C:0};for(const [value,expected] of [[['X','Z'],true],['X_Z',true],[['X','X','Z'],false],[['X','Z','C'],false],[['C'],false],[['none'],false],[['none','X'],false],[[],null]]){r.answers.effectiveSamples=value;assert.equal(conclusionChecks(r).samples,expected);}});

test('R4 removes citation scoring and preserves R3 questions and criteria in mixed exports',async()=>{
 const r=freshRecord({name:'New',email:'test@school.edu.hk'}),old={...structuredClone(r),id:'old-evidence',rubricVersion:3,taskVersion:'VL4-multiselect-5'};
 assert.equal(r.rubricVersion,4);r.submittedAt=r.reflectionSubmittedAt='2026-11-10T12:00:00Z';old.submittedAt=old.reflectionSubmittedAt=r.submittedAt;
 r.answers.reflection='X can inhibit growth. Resistant bacteria survive and reproduce.';
 const before=JSON.stringify([r,old]);const zh=renderReport(r),en=renderReport(r,'en');
 assert.doesNotMatch(zh,/，引用數據支持你的判斷/);assert.doesNotMatch(en,/, and cite data to support your judgement/);assert.match(renderReport(old),/，引用數據支持你的判斷/);
 const w=await buildWorkbook([r,old]);assert.equal(JSON.stringify([r,old]),before);
 const newer=w.getWorksheet('教師評分（R4）'),earlier=w.getWorksheet('教師評分');assert(newer&&earlier);
 assert.match(newer.getRow(1).values.join(' '),/樣本判斷/);assert.match(earlier.getRow(1).values.join(' '),/樣本證據/);
 const text=w.getWorksheet('評分準則').getSheetValues().flat(2).join(' ');assert.match(text,/不要求引用讀數或數據/);assert.match(text,/引用合理讀數支持判斷/);
 for(const column of scoreColumnsFor(r).filter(c=>c.manual)){const cell=newer.getCell(2,scoreColumnsFor(r).indexOf(column)+5);assert.equal(cell.dataValidation.type,'whole');for(const value of [-1,column.max+1,.5,'1',null])assert.equal(validManualScore(value,column,r),false);}
});
