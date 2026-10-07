import {SAMPLES, GRID, PLATE_CENTER, clone, nowISO, toPlatePoint, addCoverage, coverageFraction, generateResult} from './model.js';

/** Plate mutations return the plate; invalid actions throw a short error code.
 * Coordinates passed to release/place/spread are SVG world coordinates. Placement
 * centres are plate-local; spreading follows the fixed vertical axis x=200.
 * ensureExperiment upgrades saved records in place without changing their answers,
 * existing results or seeds. Preparing a plate never creates an observation result.
 */
export const QUADRANTS=['NW','NE','SW','SE'];
export const QUADRANT_CENTRES={NW:{x:130,y:130},NE:{x:270,y:130},SW:{x:130,y:270},SE:{x:270,y:270}};
export const DEFAULT_QUADRANT_LABELS={NW:'X',NE:'Y',SW:'Z',SE:'C'};
export const REQUIRED_COVERAGE=1;
export const SUSPENSION_TOLERANCE=30;
export const DISC_PLACEMENT_TOLERANCE=33;
export const SPREADER_RADIUS=72;

const fail=code=>{throw Error(code);};
const isPoint=point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y);
const labelsComplete=labels=>QUADRANTS.every(q=>SAMPLES.includes(labels[q]))&&new Set(QUADRANTS.map(q=>labels[q])).size===4;
const discComplete=plate=>SAMPLES.every(sample=>isPoint(plate.discPositions[sample]));
const operation=(plate,type,details={})=>plate.operations.push({type,at:nowISO(),...details});
const unlocked=record=>{if(record.submittedAt)fail('locked');};

function ensurePlate(plate){
  if(!plate||typeof plate!=='object')fail('invalid_plate');
  plate.rotation=Number.isFinite(plate.rotation)?plate.rotation:0;
  plate.coverage=Array.isArray(plate.coverage)?plate.coverage:[];
  plate.discPositions=plate.discPositions&&typeof plate.discPositions==='object'?plate.discPositions:{};
  plate.operations=Array.isArray(plate.operations)?plate.operations:[];
  if(!plate.preparation){
    // A pre-workflow saved plate may already contain evidence from the old bench.
    // Its completed endpoint stays viewable; partial inoculation can resume onward.
    const legacyPrepared=!!plate.completed||!!plate.result;
    const legacyInoculated=!!plate.inoculated||legacyPrepared;
    plate.preparation={version:1,orientation:legacyPrepared?'bottom':'top',
      crossMarked:legacyInoculated,
      quadrantLabels:legacyInoculated?clone(DEFAULT_QUADRANT_LABELS):{NW:'',NE:'',SW:'',SE:''},
      dropperLoaded:false,covered:legacyPrepared,inverted:legacyPrepared,ready:legacyPrepared};
    if(legacyPrepared){plate.completed=true;plate.inoculated=true;}
  }
  const preparation=plate.preparation;
  preparation.version=1;
  preparation.orientation=preparation.orientation==='bottom'?'bottom':'top';
  preparation.quadrantLabels??={NW:'',NE:'',SW:'',SE:''};
  preparation.crossMarked=!!preparation.crossMarked;
  preparation.dropperLoaded=!!preparation.dropperLoaded;
  preparation.covered=!!preparation.covered;
  preparation.inverted=!!preparation.inverted;
  preparation.ready=!!preparation.ready;
  preparation.forcepsState=['dirty','alcohol','ready'].includes(preparation.forcepsState)?preparation.forcepsState:'dirty';
  preparation.discInForceps=SAMPLES.includes(preparation.discInForceps)?preparation.discInForceps:null;
  preparation.sterilizationCycles=Number.isSafeInteger(preparation.sterilizationCycles)?preparation.sterilizationCycles:0;
  if(plate.completed||plate.result){
    plate.completed=true;plate.inoculated=true;
    Object.assign(preparation,{orientation:'bottom',covered:true,inverted:true,ready:true,crossMarked:true});
    if(!labelsComplete(preparation.quadrantLabels))preparation.quadrantLabels=clone(DEFAULT_QUADRANT_LABELS);
  }
  return plate;
}

export function ensureExperiment(record){
  if(!record||!Array.isArray(record.plates)||record.plates.length!==3)fail('invalid_experiment');
  record.plates.forEach(ensurePlate);
  record.experiment??={version:1,incubator:{temperature:null,hours:null},incubatedAt:null};
  record.experiment.version=1;
  record.experiment.incubator??={temperature:null,hours:null};
  record.experiment.incubatedAt??=null;
  return record;
}

export function plateStep(plate){
  ensurePlate(plate);
  if(plate.completed)return 9;
  if(plate.preparation.ready)return 6;
  if(!plate.preparation.crossMarked||!labelsComplete(plate.preparation.quadrantLabels))return 1;
  if(!plate.inoculated)return 2;
  if(coverageFraction(plate)<REQUIRED_COVERAGE)return 3;
  if(!discComplete(plate))return 4;
  return 5;
}

export function canSelectPlate(record,index){
  ensureExperiment(record);
  return Number.isInteger(index)&&index>=0&&index<3&&
    (index===0||record.plates[index-1].preparation.ready||record.plates[index-1].completed);
}

export function flipPlate(plate){
  const step=plateStep(plate),preparation=plate.preparation;
  if(step===1&&preparation.orientation==='top')preparation.orientation='bottom';
  else if(step===2&&preparation.orientation==='bottom')preparation.orientation='top';
  else fail('wrong_step');
  preparation.covered=false;preparation.inverted=false;
  operation(plate,'plate_flipped',{orientation:preparation.orientation});
  return plate;
}

export function markCross(plate){
  if(plateStep(plate)!==1||plate.preparation.orientation!=='bottom'||plate.preparation.crossMarked)fail('wrong_step');
  plate.preparation.crossMarked=true;
  operation(plate,'bottom_cross_marked');
  return plate;
}

export function setQuadrantLabel(plate,quadrant,value){
  if(plateStep(plate)!==1||plate.preparation.orientation!=='bottom'||!plate.preparation.crossMarked)fail('wrong_step');
  if(!QUADRANTS.includes(quadrant)||!SAMPLES.includes(value))fail('invalid_label');
  const labels=plate.preparation.quadrantLabels;
  if(QUADRANTS.some(q=>q!==quadrant&&labels[q]===value))fail('duplicate_label');
  labels[quadrant]=value;
  operation(plate,'quadrant_labelled',{quadrant,sample:value});
  return plate;
}

export function loadDropper(plate){
  if(plateStep(plate)!==2||plate.preparation.orientation!=='top'||plate.preparation.covered)fail('wrong_step');
  plate.preparation.dropperLoaded=true;
  operation(plate,'dropper_loaded');
  return plate;
}

export function releaseSuspension(plate,worldPoint){
  if(plateStep(plate)!==2||plate.preparation.orientation!=='top'||!plate.preparation.dropperLoaded)fail('wrong_step');
  if(!isPoint(worldPoint)||Math.hypot(worldPoint.x-PLATE_CENTER,worldPoint.y-PLATE_CENTER)>SUSPENSION_TOLERANCE)fail('centre_required');
  plate.inoculated=true;plate.preparation.dropperLoaded=false;
  operation(plate,'diluted_bacteria_added',{position:{x:PLATE_CENTER,y:PLATE_CENTER}});
  return plate;
}

export function spreadStroke(plate,startWorld,endWorld){
  if(plateStep(plate)!==3||plate.preparation.orientation!=='top'||plate.preparation.covered)fail('wrong_step');
  if(!isPoint(startWorld)||!isPoint(endWorld))fail('invalid_point');
  const distance=Math.abs(endWorld.y-startWorld.y),segments=Math.max(1,Math.ceil(distance/6));
  for(let i=0;i<=segments;i++){
    const world={x:PLATE_CENTER,y:startWorld.y+(endWorld.y-startWorld.y)*i/segments};
    addCoverage(plate,toPlatePoint(world,plate.rotation),SPREADER_RADIUS);
  }
  operation(plate,'vertical_spread_stroke',{start:{x:PLATE_CENTER,y:startWorld.y},end:{x:PLATE_CENTER,y:endWorld.y},rotation:plate.rotation,coverage:coverageFraction(plate)});
  return coverageFraction(plate);
}

export function placementForLabel(plate,sample){
  ensurePlate(plate);
  if(!SAMPLES.includes(sample))fail('invalid_sample');
  const quadrant=QUADRANTS.find(q=>plate.preparation.quadrantLabels[q]===sample);
  if(!quadrant)fail('unlabelled_sample');
  return clone(QUADRANT_CENTRES[quadrant]);
}

export function dipForceps(plate){
  if(plateStep(plate)!==4||plate.preparation.discInForceps||plate.preparation.forcepsState!=='dirty')fail('wrong_step');
  plate.preparation.forcepsState='alcohol';
  operation(plate,'forceps_dipped_in_alcohol');
  return plate;
}

export function heatForceps(plate){
  if(plateStep(plate)!==4||plate.preparation.discInForceps)fail('wrong_step');
  if(plate.preparation.forcepsState!=='alcohol')fail('alcohol_required');
  plate.preparation.forcepsState='ready';plate.preparation.sterilizationCycles++;
  operation(plate,'forceps_sterilized',{cycle:plate.preparation.sterilizationCycles});
  return plate;
}

export function clipDisc(plate,sample){
  if(plateStep(plate)!==4||plate.preparation.discInForceps)fail('wrong_step');
  if(!SAMPLES.includes(sample))fail('invalid_sample');
  if(plate.discPositions[sample])fail('disc_already_placed');
  if(plate.preparation.forcepsState!=='ready')fail('forceps_not_sterile');
  plate.preparation.discInForceps=sample;plate.preparation.forcepsState='dirty';
  operation(plate,'disc_clipped',{sample,cycle:plate.preparation.sterilizationCycles});
  return plate;
}

export function placeDisc(plate,sample,worldPoint){
  if(plateStep(plate)!==4||plate.preparation.orientation!=='top'||plate.preparation.covered)fail('wrong_step');
  if(!isPoint(worldPoint))fail('invalid_point');
  const position=placementForLabel(plate,sample),local=toPlatePoint(worldPoint,plate.rotation);
  if(plate.discPositions[sample])fail('disc_already_placed');
  if(plate.preparation.discInForceps!==sample)fail('disc_not_held');
  if(Math.hypot(local.x-position.x,local.y-position.y)>DISC_PLACEMENT_TOLERANCE)fail('matching_quadrant_required');
  // Snap to the quadrant centre: disc comparisons share the same spatial layout.
  plate.discPositions[sample]=position;
  plate.preparation.discInForceps=null;
  operation(plate,'disc_placed',{sample,position:clone(position),sterileTweezers:true,cycle:plate.preparation.sterilizationCycles});
  return plate;
}

export function sealPlate(plate){
  if(plateStep(plate)!==5)fail('wrong_step');
  Object.assign(plate.preparation,{covered:true,inverted:true,orientation:'bottom',ready:true});
  operation(plate,'plate_covered_and_inverted');
  return plate;
}

export function autoPreparePlate(record,index){
  ensureExperiment(record);unlocked(record);
  if(index!==1&&index!==2)fail('manual_first_plate');
  if(!canSelectPlate(record,index))fail('previous_plate_not_ready');
  const plate=record.plates[index];
  if(plateStep(plate)>=6)fail('already_prepared');
  // Each repeat uses its own plate and seed; no endpoint is copied or generated.
  const previous=record.plates[index-1];
  Object.assign(plate.preparation,{crossMarked:true,quadrantLabels:clone(previous.preparation.quadrantLabels),
    dropperLoaded:false,covered:false,inverted:false,orientation:'top',ready:false,forcepsState:'dirty',discInForceps:null});
  plate.inoculated=true;plate.coverage=GRID.map((_,i)=>i);
  plate.discPositions={};
  for(const sample of SAMPLES){
    dipForceps(plate);heatForceps(plate);clipDisc(plate,sample);
    placeDisc(plate,sample,toPlatePoint(placementForLabel(plate,sample),-plate.rotation));
  }
  sealPlate(plate);
  operation(plate,'standardized_new_plate',{sourcePlateId:previous.id,steps:[1,2,3,4,5]});
  return plate;
}

export function assistPlateSpread(record,index){
  ensureExperiment(record);unlocked(record);
  if(index!==1&&index!==2)fail('manual_first_plate');
  if(!canSelectPlate(record,index))fail('previous_plate_not_ready');
  const plate=record.plates[index];
  if(plateStep(plate)!==3)fail('wrong_step');
  plate.coverage=GRID.map((_,i)=>i);
  operation(plate,'assisted_uniform_spread');
  return plate;
}

export function configureIncubator(record,{temperature,hours}={}){
  ensureExperiment(record);unlocked(record);
  if(record.experiment.incubatedAt||record.plates.every(p=>p.completed))fail('already_incubated');
  if(temperature!==undefined&&temperature!==30)fail('invalid_temperature');
  if(hours!==undefined&&hours!==24)fail('invalid_hours');
  if(temperature!==undefined)record.experiment.incubator.temperature=temperature;
  if(hours!==undefined)record.experiment.incubator.hours=hours;
  return record;
}

export function canIncubate(record){
  ensureExperiment(record);
  const {temperature,hours}=record.experiment.incubator;
  return !record.submittedAt&&!record.experiment.incubatedAt&&temperature===30&&hours===24&&
    record.plates.some(p=>!p.completed)&&record.plates.every(p=>p.preparation.ready&&p.preparation.covered&&p.preparation.inverted);
}

export function incubateAll(record){
  ensureExperiment(record);unlocked(record);
  if(!canIncubate(record))fail('incubator_not_ready');
  const at=nowISO(),results=record.plates.map(plate=>{
    const alreadyCompleted=plate.completed,result=generateResult(plate);
    operation(plate,alreadyCompleted?'retained_legacy_endpoint':'common_incubation_endpoint',alreadyCompleted?{at}:{temperature:30,hours:24,at});
    return result;
  });
  record.experiment.incubatedAt=at;
  return results;
}
