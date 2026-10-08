import {SAMPLES,toPlatePoint,clearZoneDiameter} from './model.js';

// SVG units: two units per millimetre. Attraction holds the ruler at a
// horizontal diameter's height while leaving horizontal placement manual.
export const RULER_CAPTURE=12;
export const RULER_RELEASE=24;
export function rulerTargets(plate){
  if(!plate?.completed||!plate.result)return [];
  return SAMPLES.filter(sample=>plate.discPositions[sample]&&clearZoneDiameter(plate,sample)>0).map(sample=>{
    const centre=toPlatePoint(plate.discPositions[sample],-plate.rotation);
    return {sample,x:centre.x-clearZoneDiameter(plate,sample),y:centre.y,centreX:centre.x};
  });
}
export function moveMagneticRuler(plate,candidate,magnet=null,ignored=null){
  if(magnet){
    // Vertical hysteresis holds a useful height through small hand movements.
    // Horizontal movement is always free, including while attracted.
    if(Math.abs(candidate.y-magnet.y)<=RULER_RELEASE){
      return {ruler:{x:candidate.x,y:magnet.y},magnet,ignored:null};
    }
    ignored=magnet.sample;magnet=null;
  }
  const targets=rulerTargets(plate);
  // The learner only needs to bring the ruler across the diameter; its zero
  // need not already be aligned with the edge before the magnet can help.
  const within=target=>candidate.x<=target.centreX+RULER_CAPTURE&&candidate.x+80>=target.centreX-RULER_CAPTURE&&Math.abs(candidate.y-target.y)<=RULER_CAPTURE;
  if(ignored&&!targets.some(target=>target.sample===ignored&&within(target)))ignored=null;
  const target=targets.filter(target=>target.sample!==ignored&&within(target))
    .sort((a,b)=>Math.hypot(candidate.x+40-a.centreX,candidate.y-a.y)-Math.hypot(candidate.x+40-b.centreX,candidate.y-b.y))[0];
  if(target)return {ruler:{x:candidate.x,y:target.y},magnet:{...target},ignored:null};
  return {ruler:candidate,magnet:null,ignored};
}
