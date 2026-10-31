import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canWalk,freePosition,moveWithCollision,obstaclesFor} from '../src/warehouse/layout.ts';
import type {WarehouseLayout} from '../src/warehouse/layout.ts';
const data=JSON.parse(fs.readFileSync('public/warehouse/layout.json','utf8')) as WarehouseLayout;
const obstacles=obstaclesFor(data);
test('DWG footprints retain centimetre scale and source element identities',()=>{
  assert.equal(data.units,'cm');assert.equal(data.scaleToMetres,.01);
  assert.equal(data.racks.length,168);assert.equal(data.pallets.length,66);assert.equal(data.pods.length,5);
  for(const rack of data.racks){assert.ok(Math.abs(rack.w-.6)<.002);assert.ok(rack.d===1.8||rack.d===1.2);}
  for(const label of ['RECEIVING AREA','BILLING COUNTER','RICE BINS','TOILET','EXIT'])assert.ok(data.annotations.some(a=>a.text===label));
});
test('each zone resolves to a free standing location inside the actual perimeter',()=>{
  for(const zone of data.zones){const point=freePosition(zone.point,data,obstacles);assert.ok(canWalk(...point,data,obstacles),zone.id);assert.ok(Math.hypot(point[0]-zone.point[0],point[1]-zone.point[1])<4);}
});
test('walking cannot pass through rack footprints or tunnel outside the perimeter',()=>{
  const b=data.racks[0];assert.equal(canWalk(b.x+b.w/2,b.z+b.d/2,data,obstacles),false);
  const start=freePosition([25.6,49],data,obstacles);
  const stop=moveWithCollision(start,[100,0],data,obstacles);assert.ok(canWalk(...stop,data,obstacles));assert.ok(stop[0]<32);
  const moved=moveWithCollision(start,[0,-.25],data,obstacles);assert.ok(moved[1]<start[1]);assert.ok(canWalk(...moved,data,obstacles));
});
test('all five original billing counters retain distinct source positions and collision bounds',()=>{
  assert.equal(data.billingCounters.length,5);
  assert.equal(data.billingCounters.filter(c=>c.sourceType==='INSERT').length,4);
  assert.equal(data.billingCounters.filter(c=>c.sourceType==='EXPLODED_LINES').length,1);
  assert.deepEqual(data.billingCounters.map(c=>c.number),[1,2,3,4,5]);
  assert.equal(new Set(data.billingCounters.map(c=>c.x.toFixed(3)+','+c.z.toFixed(3))).size,5);
  for(const counter of data.billingCounters){
    assert.ok(counter.x>26.6&&counter.x<26.8);assert.ok(counter.w>1.79&&counter.w<1.82);
    assert.ok(counter.sourceHandles.length>0);
    assert.equal(canWalk(counter.x+counter.w/2,counter.z+counter.d/2,data,obstacles),false);
  }
});
