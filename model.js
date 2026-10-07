export const MODULE_ID='VL_BIO_ANTIBIOTICS';
export const TEACHER_EMAIL='tzechingchan0605@gmail.com';
export const KEYS={records:'vl4.antibiotics.records.v1',current:'vl4.antibiotics.current.v1'};
export const SAMPLES=['X','Y','Z','C'];
export const DISC_MM=6;
export const ACTUAL_REPLICATES=3;
export const PLATE_CENTER=200;
export const PLATE_RADIUS=160;
export const DEFAULT_POSITIONS={X:{x:130,y:130},Y:{x:270,y:130},Z:{x:130,y:270},C:{x:270,y:270}};
export const GRID=[];
for(let y=56;y<=344;y+=12) for(let x=56;x<=344;x+=12) if(Math.hypot(x-200,y-200)<146)GRID.push({x,y});
export const nowISO=()=>new Date().toISOString();
export const clone=value=>structuredClone(value);
export const isTeacher=profile=>profile?.email?.toLowerCase().trim()===TEACHER_EMAIL;
export function freshRecord(profile,demo=false){
  return {schemaVersion:1,moduleId:MODULE_ID,id:crypto.randomUUID(),version:0,profile:clone(profile),demo,
    createdAt:nowISO(),savedAt:nowISO(),phase:1,unlocked:1,submittedAt:null,reflectionSubmittedAt:null,
    answers:{iv:[],dv:[],cv:[],assumptions:[]},original:null,actualReplicates:3,
    experiment:{version:1,incubator:{temperature:null,hours:null},incubatedAt:null},
    plates:Array.from({length:3},(_,i)=>({id:`plate-${i+1}`,label:`P${i+1}`,seed:crypto.getRandomValues(new Uint32Array(1))[0],
      preparation:{version:1,orientation:'top',crossMarked:false,quadrantLabels:{NW:'',NE:'',SW:'',SE:''},dropperLoaded:false,covered:false,inverted:false,ready:false,forcepsState:'dirty',discInForceps:null,sterilizationCycles:0},
      rotation:0,coverage:[],discPositions:{},inoculated:false,result:null,completed:false,operations:[]})),
    measurements:{},means:{},graph:{values:{},confirmedAt:null},design:{image:'',description:'',saved:false},
    extension:{started:false},events:[],timing:{1:0,2:0,3:0,4:0}};
}
export function toPlatePoint(point,rotation){
  const a=-rotation*Math.PI/180,x=point.x-200,y=point.y-200;
  return {x:200+x*Math.cos(a)-y*Math.sin(a),y:200+x*Math.sin(a)+y*Math.cos(a)};
}
export function addCoverage(plate,point,radius=25){
  const covered=new Set(plate.coverage);
  GRID.forEach((p,i)=>{if(Math.hypot(p.x-point.x,p.y-point.y)<=radius)covered.add(i);});
  plate.coverage=[...covered].sort((a,b)=>a-b);
  return coverageFraction(plate);
}
export const coverageFraction=plate=>plate.coverage.length/GRID.length;
export function placementIssue(plate,sample,position){
  if(Math.hypot(position.x-200,position.y-200)>115)return 'edge';
  if(Object.entries(plate.discPositions).some(([k,p])=>k!==sample&&Math.hypot(p.x-position.x,p.y-position.y)<100))return 'close';
  return null;
}
export function generateResult(plate){
  if(plate.result)return plate.result;
  let s=plate.seed>>>0;
  const next=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
  plate.result={X:Math.round((17.7+next()*1.6)*10)/10,Y:6,Z:Math.round((26.0+next()*2.0)*10)/10,C:6};
  plate.completed=true;
  return plate.result;
}
export function independentRepeat(previous,plate){
  if(!previous.completed)throw Error('previous plate incomplete');
  plate.inoculated=true;plate.coverage=clone(previous.coverage);plate.rotation=previous.rotation;
  plate.discPositions=clone(previous.discPositions);
  plate.operations.push({type:'standardized_new_plate',at:nowISO(),sourcePlateId:previous.id});
  return plate;
}
export function validDecimal(value,min=0,max=40,precision=1){
  if(value===null||value===undefined||String(value).trim()==='')return false;
  if(!/^\d+(\.\d+)?$/.test(String(value).trim()))return false;
  const n=Number(value),factor=10**precision;
  return Number.isFinite(n)&&n>=min&&n<=max&&Math.abs(n*factor-Math.round(n*factor))<1e-7;
}
export const validReplicates=value=>/^\d+$/.test(String(value))&&Number.isSafeInteger(Number(value))&&Number(value)>0;
export function confirmMeasurement(record,plateId,sample,reading){
  if(record.submittedAt)throw Error('locked');
  if(!['yes','no'].includes(reading.visible)||!validDecimal(reading.value,6,40))throw Error('invalid measurement');
  const group=record.measurements[plateId]??={};
  const old=group[sample]??{};
  const confirmed={value:String(reading.value),visible:reading.visible,note:reading.note||'',at:nowISO()};
  const revisions=clone(old.revisions||[]);
  if(old.first&&JSON.stringify([old.last?.value,old.last?.visible,old.last?.note])!==JSON.stringify([confirmed.value,confirmed.visible,confirmed.note]))revisions.push({previous:clone(old.last),next:clone(confirmed)});
  group[sample]={...reading,first:old.first||clone(confirmed),last:clone(confirmed),revisions,confirmedAt:confirmed.at};
}
export const allMeasurements=record=>record.plates.every(p=>p.completed&&SAMPLES.every(s=>record.measurements[p.id]?.[s]?.confirmedAt));
export function captureOriginal(record){
  if(!record.original)record.original={answers:clone(record.answers),plannedReplicates:Number(record.answers.plannedReplicates),plannedReplicateReason:record.answers.plannedReplicateReason,capturedAt:nowISO(),design:clone(record.design)};
}
export const ownMean=(record,sample)=>record.plates.reduce((sum,p)=>sum+Number(record.measurements[p.id]?.[sample]?.value),0)/3;
export function canonicalRecord(value){
  if(!value||value.moduleId!==MODULE_ID||value.demo||value.role==='teacher'||isTeacher(value.profile)||
    typeof value.id!=='string'||!/^[A-Za-z0-9_-]{8,120}$/.test(value.id)||
    !value.profile||typeof value.profile.name!=='string'||typeof value.profile.email!=='string'||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.profile.email)||
    !Array.isArray(value.plates)||!value.plates.every(p=>p&&typeof p.id==='string')||
    (value.schemaVersion!==undefined&&value.schemaVersion!==1)||
    (value.version!==undefined&&(!Number.isSafeInteger(value.version)||value.version<0)))return null;
  const copy=clone(value);
  if(typeof copy.profile.className!=='string'){
    if(typeof copy.profile.classInfo!=='string')return null;
    copy.profile.className=copy.profile.classInfo;
  }
  copy.schemaVersion??=1;copy.version??=1;copy.demo??=false;
  return copy;
}
