import test from 'node:test';
import assert from 'node:assert/strict';
import {freshRecord,SAMPLES,GRID,captureOriginal,coverageFraction,generateResult,toPlatePoint} from '../model.js';
import {
  QUADRANTS,DEFAULT_QUADRANT_LABELS,ensureExperiment,plateStep,canSelectPlate,
  flipPlate,markCross,setQuadrantLabel,loadDropper,releaseSuspension,spreadStroke,
  placementForLabel,dipForceps,heatForceps,clipDisc,placeDisc,sealPlate,autoPreparePlate,assistPlateSpread,
  configureIncubator,canIncubate,incubateAll
} from '../experiment-model.js';

const fresh=()=>freshRecord({name:'Student',className:'4A 1',email:'student@example.test'});
const startSpreading=(plate,labels=DEFAULT_QUADRANT_LABELS)=>{
  flipPlate(plate);markCross(plate);
  for(const quadrant of QUADRANTS)setQuadrantLabel(plate,quadrant,labels[quadrant]);
  flipPlate(plate);loadDropper(plate);releaseSuspension(plate,{x:200,y:200});
};
const spreadManually=plate=>{
  for(const rotation of [0,30,60,90,120,150]){
    if(plateStep(plate)!==3)break;
    plate.rotation=rotation;
    spreadStroke(plate,{x:200,y:50},{x:200,y:350});
  }
  assert.equal(plateStep(plate),4);
};
const putDiscs=plate=>{
  for(const sample of SAMPLES){
    dipForceps(plate);heatForceps(plate);clipDisc(plate,sample);
    const local=placementForLabel(plate,sample);
    placeDisc(plate,sample,toPlatePoint(local,-plate.rotation));
  }
};
const prepareManual=plate=>{startSpreading(plate);spreadManually(plate);putDiscs(plate);sealPlate(plate);};

test('staged preparation requires bottom markings before a loaded dropper deposits at the centre',()=>{
  const record=fresh(),plate=record.plates[0];
  ensureExperiment(record);
  assert.equal(plateStep(plate),1);
  assert.throws(()=>markCross(plate),/wrong_step/);
  assert.throws(()=>loadDropper(plate),/wrong_step/);
  assert.throws(()=>sealPlate(plate),/wrong_step/);
  flipPlate(plate);assert.equal(plate.preparation.orientation,'bottom');
  assert.throws(()=>flipPlate(plate),/wrong_step/);
  assert.throws(()=>setQuadrantLabel(plate,'NW','X'),/wrong_step/);
  markCross(plate);setQuadrantLabel(plate,'NW','X');
  assert.throws(()=>setQuadrantLabel(plate,'NE','X'),/duplicate_label/);
  assert.throws(()=>setQuadrantLabel(plate,'NE','Q'),/invalid_label/);
  for(const quadrant of ['NE','SW','SE'])setQuadrantLabel(plate,quadrant,DEFAULT_QUADRANT_LABELS[quadrant]);
  assert.equal(plateStep(plate),2);
  assert.throws(()=>loadDropper(plate),/wrong_step/);
  flipPlate(plate);assert.equal(plate.preparation.orientation,'top');
  assert.throws(()=>releaseSuspension(plate,{x:200,y:200}),/wrong_step/);
  loadDropper(plate);
  assert.throws(()=>releaseSuspension(plate,{x:280,y:200}),/centre_required/);
  assert.equal(plate.inoculated,false);
  releaseSuspension(plate,{x:208,y:198});
  assert.equal(plate.preparation.dropperLoaded,false);
  assert.equal(plateStep(plate),3);
  assert.equal(plate.result,null);
});

test('repeat plates unlock after covering, before any observation results exist',()=>{
  const record=fresh(),[first,second,third]=record.plates;
  assert.equal(canSelectPlate(record,0),true);
  assert.equal(canSelectPlate(record,1),false);
  assert.equal(canSelectPlate(record,2),false);
  assert.throws(()=>autoPreparePlate(record,0),/manual_first_plate/);
  assert.throws(()=>autoPreparePlate(record,1),/previous_plate_not_ready/);
  startSpreading(first);spreadManually(first);putDiscs(first);
  assert.equal(plateStep(first),5);
  assert.equal(canSelectPlate(record,1),false);
  sealPlate(first);
  assert.equal(plateStep(first),6);
  assert.equal(first.completed,false);
  assert.equal(first.result,null);
  assert.equal(canSelectPlate(record,1),true);
  assert.equal(canSelectPlate(record,2),false);
  autoPreparePlate(record,1);
  assert.equal(canSelectPlate(record,2),true);
  assert.equal(second.result,null);assert.equal(second.completed,false);
  autoPreparePlate(record,2);
  assert.equal(third.result,null);
  for(const value of [-1,3,1.2,'1',null])assert.equal(canSelectPlate(record,value),false);
});

test('spreading follows one vertical world axis and needs rotation to reach uniform coverage',()=>{
  const plate=fresh().plates[0],same=fresh().plates[0];
  startSpreading(plate);startSpreading(same);
  spreadStroke(plate,{x:60,y:50},{x:340,y:350});
  spreadStroke(same,{x:200,y:50},{x:200,y:350});
  assert.deepEqual(plate.coverage,same.coverage,'pointer x motion cannot change the vertical spreading axis');
  const initial=[...plate.coverage];
  spreadStroke(plate,{x:340,y:350},{x:60,y:50});
  assert.deepEqual(plate.coverage,initial);
  assert.ok(coverageFraction(plate)<.85);
  plate.rotation=90;
  spreadStroke(plate,{x:200,y:50},{x:200,y:350});
  assert.ok(plate.coverage.length>initial.length,'rotation puts the same vertical motion on fresh agar cells');
  for(const rotation of [30,60,120,150]){
    if(plateStep(plate)!==3)break;
    plate.rotation=rotation;spreadStroke(plate,{x:200,y:50},{x:200,y:350});
  }
  assert.equal(coverageFraction(plate),1);
  assert.equal(plateStep(plate),4);
  assert.throws(()=>spreadStroke(plate,{x:200,y:50},{x:200,y:350}),/wrong_step/);
});

test('manual first plate cannot use assisted spreading while independent repeats can',()=>{
  const record=fresh(),[first,second]=record.plates;
  startSpreading(first);
  assert.throws(()=>assistPlateSpread(record,0),/manual_first_plate/);
  assert.throws(()=>assistPlateSpread(record,1),/previous_plate_not_ready/);
  spreadManually(first);putDiscs(first);sealPlate(first);
  assert.throws(()=>assistPlateSpread(record,1),/wrong_step/);
  startSpreading(second);assistPlateSpread(record,1);
  assert.equal(second.coverage.length,GRID.length);
  assert.equal(plateStep(second),4);
  assert.equal(second.result,null);
});

test('discs match student labels at rotated quadrant centres and covering needs all four',()=>{
  const plate=fresh().plates[0];
  const labels={NW:'C',NE:'Z',SW:'Y',SE:'X'};
  startSpreading(plate,labels);
  assert.throws(()=>placeDisc(plate,'X',{x:270,y:270}),/wrong_step/);
  spreadManually(plate);
  plate.rotation=37;
  assert.deepEqual(placementForLabel(plate,'X'),{x:270,y:270});
  dipForceps(plate);heatForceps(plate);clipDisc(plate,'X');
  assert.throws(()=>placeDisc(plate,'X',toPlatePoint({x:130,y:130},-plate.rotation)),/matching_quadrant_required/);
  assert.equal(plate.discPositions.X,undefined);
  const xWorld=toPlatePoint(placementForLabel(plate,'X'),-plate.rotation);
  placeDisc(plate,'X',{x:xWorld.x+5,y:xWorld.y-5});
  assert.deepEqual(plate.discPositions.X,{x:270,y:270});
  assert.throws(()=>placeDisc(plate,'X',xWorld),/disc_already_placed/);
  assert.throws(()=>sealPlate(plate),/wrong_step/);
  for(const sample of ['Y','Z','C']){dipForceps(plate);heatForceps(plate);clipDisc(plate,sample);placeDisc(plate,sample,toPlatePoint(placementForLabel(plate,sample),-plate.rotation));}
  sealPlate(plate);
  assert.equal(plate.preparation.covered,true);
  assert.equal(plate.preparation.inverted,true);
  assert.equal(plate.preparation.orientation,'bottom');
  assert.equal(plateStep(plate),6);
  assert.throws(()=>flipPlate(plate),/wrong_step/);
  assert.equal(plate.result,null);
});

test('automatic repeats preserve seeds, original designs and independent result storage',()=>{
  const record=fresh();
  record.answers={reason:'Original reasoning',plannedReplicates:'5',plannedReplicateReason:'Reliability'};
  record.design={image:'original drawing',description:'Original design',saved:true};
  captureOriginal(record);const original=structuredClone(record.original);
  const seeds=record.plates.map(p=>p.seed);
  prepareManual(record.plates[0]);autoPreparePlate(record,1);autoPreparePlate(record,2);
  assert.deepEqual(record.original,original);
  assert.deepEqual(record.plates.map(p=>p.seed),seeds);
  assert.equal(record.plates.every(p=>p.result===null&&!p.completed),true);
  record.plates[1].discPositions.X.x+=1;
  assert.equal(record.plates[0].discPositions.X.x,130);
  record.plates[1].preparation.quadrantLabels.NW='Y';
  assert.equal(record.plates[0].preparation.quadrantLabels.NW,'X');
  assert.throws(()=>autoPreparePlate(record,1),/already_prepared/);
});

test('all three covered inverted plates and both incubator settings are required together',()=>{
  const record=fresh();
  assert.equal(canIncubate(record),false);
  assert.throws(()=>incubateAll(record),/incubator_not_ready/);
  assert.throws(()=>configureIncubator(record,{temperature:37}),/invalid_temperature/);
  assert.throws(()=>configureIncubator(record,{hours:48}),/invalid_hours/);
  configureIncubator(record,{temperature:30});
  prepareManual(record.plates[0]);autoPreparePlate(record,1);
  assert.equal(canIncubate(record),false);
  configureIncubator(record,{hours:24});
  assert.equal(canIncubate(record),false);
  autoPreparePlate(record,2);
  assert.equal(canIncubate(record),true);
  record.plates[2].preparation.inverted=false;
  assert.equal(canIncubate(record),false);
  record.plates[2].preparation.inverted=true;
  const results=structuredClone(incubateAll(record));
  assert.equal(record.plates.every(p=>plateStep(p)===9),true);
  assert.equal(typeof record.experiment.incubatedAt,'string');
  assert.equal(canIncubate(record),false);
  assert.throws(()=>incubateAll(record),/incubator_not_ready/);
  const restored=JSON.parse(JSON.stringify(record));ensureExperiment(restored);
  restored.plates.forEach((plate,index)=>{
    plate.seed+=1;plate.rotation=180;
    assert.deepEqual(generateResult(plate),results[index]);
  });
});

test('legacy completed results survive migration and allow remaining independent repeats to finish',()=>{
  const record=fresh(),first=record.plates[0];
  delete record.experiment;
  for(const plate of record.plates)delete plate.preparation;
  first.inoculated=true;first.coverage=[1,2];
  first.discPositions={X:{x:130,y:130},Y:{x:270,y:130},Z:{x:130,y:270},C:{x:270,y:270}};
  const oldResult=structuredClone(generateResult(first)),oldSeed=first.seed;
  ensureExperiment(record);
  assert.equal(plateStep(first),9);
  assert.equal(canSelectPlate(record,1),true);
  autoPreparePlate(record,1);autoPreparePlate(record,2);
  configureIncubator(record,{temperature:30,hours:24});
  incubateAll(record);
  assert.deepEqual(first.result,oldResult);assert.equal(first.seed,oldSeed);
  assert.equal(first.operations.at(-1).type,'retained_legacy_endpoint');
  assert.equal(record.plates[1].operations.at(-1).type,'common_incubation_endpoint');
  const saved=JSON.stringify(record);
  ensureExperiment(record);assert.equal(JSON.stringify(record),saved,'migration is idempotent');
});

test('submitted records reject automatic preparation, spreading assistance and incubator mutations',()=>{
  const record=fresh();prepareManual(record.plates[0]);
  record.submittedAt='2026-10-07T00:00:00.000Z';
  assert.throws(()=>autoPreparePlate(record,1),/locked/);
  assert.throws(()=>assistPlateSpread(record,1),/locked/);
  assert.throws(()=>configureIncubator(record,{temperature:30}),/locked/);
  assert.throws(()=>incubateAll(record),/locked/);
  assert.equal(canIncubate(record),false);
});


test('every coverage cell is required and each disc needs a fresh alcohol and lamp cycle',()=>{
  const plate=fresh().plates[0];startSpreading(plate);
  plate.coverage=GRID.slice(0,-1).map((_,i)=>i);
  assert.ok(coverageFraction(plate)>.85);assert.equal(plateStep(plate),3);
  assert.throws(()=>dipForceps(plate),/wrong_step/);
  plate.coverage=GRID.map((_,i)=>i);assert.equal(plateStep(plate),4);
  assert.throws(()=>clipDisc(plate,'X'),/forceps_not_sterile/);
  assert.throws(()=>heatForceps(plate),/alcohol_required/);
  for(const sample of SAMPLES){
    assert.throws(()=>clipDisc(plate,sample),/forceps_not_sterile/);
    dipForceps(plate);assert.throws(()=>clipDisc(plate,sample),/forceps_not_sterile/);
    heatForceps(plate);clipDisc(plate,sample);
    assert.throws(()=>dipForceps(plate),/wrong_step/);
    assert.throws(()=>placeDisc(plate,sample,{x:200,y:200}),/matching_quadrant_required/);
    assert.equal(plate.preparation.discInForceps,sample);
    placeDisc(plate,sample,placementForLabel(plate,sample));
    assert.equal(plate.preparation.forcepsState,'dirty');
  }
  assert.equal(plate.preparation.sterilizationCycles,4);
});
