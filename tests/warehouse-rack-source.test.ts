import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractRackFootprints} from '../scripts/extract-rack-footprints.mjs';
import {footprintOutline,insidePolygon,insetOutline} from '../src/warehouse/layout.ts';
import {createStockPlan} from '../src/warehouse/stockPlan.ts';
import type {Point2,WarehouseLayout} from '../src/warehouse/layout.ts';
const data=JSON.parse(fs.readFileSync('public/warehouse/layout.json','utf8')) as WarehouseLayout;
const {edges}=JSON.parse(fs.readFileSync('tests/fixtures/warehouse-rack-source.json','utf8')) as {edges:{a:Point2;b:Point2;handles:string[]}[]};

test('all 164 aisle bays and 28 wall bays come from the original CAD edges',()=>{
  assert.deepEqual(data.racks,extractRackFootprints(edges));
  assert.equal(data.racks.filter(r=>!r.outline).length,164);
  assert.equal(data.racks.filter(r=>r.outline).length,28);
  assert.equal(new Set(data.racks.map(r=>r.id)).size,192);
  for(const rack of data.racks){
    const outline=footprintOutline(rack);
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      const intervals=edges.filter(edge=>edge.handles.some(handle=>rack.sourceHandles!.includes(handle))).flatMap(edge=>{
        const ex=edge.b[0]-edge.a[0],ez=edge.b[1]-edge.a[1],edgeLength=Math.hypot(ex,ez);
        const distance=(p:Point2)=>Math.abs(ex*(p[1]-edge.a[1])-ez*(p[0]-edge.a[0]))/edgeLength;
        if(distance(a)>.003||distance(b)>.003)return [];
        const along=(p:Point2)=>((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length;
        return [[Math.min(along(edge.a),along(edge.b)),Math.max(along(edge.a),along(edge.b))]];
      }).sort((x,y)=>x[0]-y[0]);
      let covered=0;
      for(const [start,end]of intervals){if(end<covered-.003)continue;if(start>covered+.003)break;covered=Math.max(covered,end);}
      assert.ok(covered>=length-.003,`${rack.id}: a model edge is absent from the drawing`);
    }
  }
});

test('source drafting gaps do not delete lower bays or produce overlapping racks',()=>{
  const main=data.racks.filter(r=>!r.outline);
  for(const x of new Set(main.map(r=>r.x)))assert.equal(main.filter(r=>r.x===x&&r.z>21).length,5,`Five lower bays at x=${x}`);
  for(let i=0;i<data.racks.length;i++)for(let j=i+1;j<data.racks.length;j++){
    const a=footprintOutline(data.racks[i]),b=footprintOutline(data.racks[j]);
    const separated=[a,b].some(polygon=>polygon.some((p,index)=>{
      const next=polygon[(index+1)%polygon.length],axis=[-(next[1]-p[1]),next[0]-p[0]],length=Math.hypot(...axis);
      const project=(points:Point2[])=>points.map(point=>(point[0]*axis[0]+point[1]*axis[1])/length);
      const pa=project(a),pb=project(b);
      return Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb))<.003;
    }));
    assert.ok(separated,`Overlapping source bays: ${data.racks[i].id} / ${data.racks[j].id}`);
  }
});

test('stock on sloping wall racks remains within the actual shelf polygon',()=>{
  const owners=new Map(data.racks.filter(r=>r.outline).map(r=>[r.id,insetOutline(r.outline!,.04)]));
  const goods=createStockPlan(data).filter(item=>owners.has(item.owner));
  assert.ok(goods.length>0);
  for(const item of goods)for(const [x,z]of [[item.x,item.z],[item.x+item.w,item.z],[item.x+item.w,item.z+item.d],[item.x,item.z+item.d]]){
    assert.ok(insidePolygon(x,z,owners.get(item.owner)!),item.owner+' stock extends beyond its drawn outline');
  }
});
