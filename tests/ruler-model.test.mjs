import test from 'node:test';
import assert from 'node:assert/strict';
import {toPlatePoint} from '../model.js';
import {rulerTargets,moveMagneticRuler} from '../ruler-model.js';

const plate={completed:true,rotation:37,discPositions:{X:{x:130,y:130},Z:{x:270,y:270}},result:{X:18,Z:27}};
test('ruler attraction follows rotated zones, allows vertical adjustment, and releases for another zone',()=>{
  const targets=rulerTargets(plate),x=targets.find(t=>t.sample==='X'),z=targets.find(t=>t.sample==='Z');
  const centre=toPlatePoint(plate.discPositions.X,-plate.rotation);
  assert.equal(x.x,centre.x-18);assert.equal(x.y,centre.y);
  let moved=moveMagneticRuler(plate,{x:x.x+9,y:x.y+8});
  assert.deepEqual(moved.ruler,{x:x.x,y:x.y});assert.equal(moved.magnet.sample,'X');
  moved=moveMagneticRuler(plate,{x:x.x+14,y:x.y+7},moved.magnet);
  assert.deepEqual(moved.ruler,{x:x.x,y:x.y+7});
  moved=moveMagneticRuler(plate,{x:x.x+40,y:x.y+7},moved.magnet);
  assert.equal(moved.magnet,null);assert.equal(moved.ruler.x,x.x+40);
  moved=moveMagneticRuler(plate,{x:z.x+4,y:z.y-6},moved.magnet,moved.ignored);
  assert.equal(moved.magnet.sample,'Z');assert.deepEqual(moved.ruler,{x:z.x,y:z.y});
  assert.deepEqual(plate.result,{X:18,Z:27});
});
test('ruler remains free away from diameters and for plates without results',()=>{
  const candidate={x:60,y:350};
  assert.deepEqual(moveMagneticRuler(plate,candidate).ruler,candidate);
  assert.equal(moveMagneticRuler(plate,candidate).magnet,null);
  assert.equal(moveMagneticRuler({...plate,completed:false},rulerTargets(plate)[0]).magnet,null);
});
test('a ruler dragged across the diameter snaps without requiring its zero to already match the edge',()=>{
  const target=rulerTargets(plate)[0];
  const moved=moveMagneticRuler(plate,{x:target.centreX-60,y:target.y+5});
  assert.equal(moved.magnet.sample,target.sample);
  assert.deepEqual(moved.ruler,{x:target.x,y:target.y});
});
