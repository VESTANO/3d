import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {extractRackFootprints} from '../scripts/extract-rack-footprints.mjs';
import {warehouseFromHash} from '../src/warehouse/profiles.ts';
import {footprintOutline,freePosition,canWalk,moveWithCollision,obstaclesFor} from '../src/warehouse/layout.ts';
import {createStockPlan,SHELF_LEVELS} from '../src/warehouse/stockPlan.ts';
import {buildInterior} from '../src/warehouse/buildInterior.ts';
import type {Point2,WarehouseLayout} from '../src/warehouse/layout.ts';
const data=JSON.parse(fs.readFileSync('public/warehouse-2/layout.json','utf8')) as WarehouseLayout;
const source=JSON.parse(fs.readFileSync('tests/fixtures/warehouse-2-rack-source.json','utf8')) as {sourceSha256:string;edges:{a:Point2;b:Point2;handles:string[]}[];polylines:{id:string;points:Point2[]}[]};

test('Warehouse 2 routes to its own drawing and retains the first warehouse route',()=>{
  const first=warehouseFromHash('#warehouse'),second=warehouseFromHash('#warehouse-2');
  assert.equal(first?.assetRoot,'./warehouse');assert.equal(second?.assetRoot,'./warehouse-2');assert.equal(second?.label,'Warehouse 2');
  assert.equal(warehouseFromHash('#stage-2'),undefined);
  const hash=(file:string)=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(hash('public/warehouse-2/paravoor.dwg'),'6d6ad0b844d5d77bfa8364879d79b54575c13314d1b1eb480e588e6c4307547b');
  assert.equal(hash('cad-source/warehouse-2/paravoor.dwg'),source.sourceSha256);
  assert.notEqual(hash('public/warehouse/paravoor.dwg'),source.sourceSha256);
});

test('the revised 171 rack bays are supported by actual edges of the new source',()=>{
  assert.equal(data.racks.length,171);assert.deepEqual(data.racks,extractRackFootprints(source.edges));
  assert.equal(data.racks.filter(r=>r.outline).length,14);
  for(const rack of data.racks){
    const points=footprintOutline(rack);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      const intervals=source.edges.flatMap(edge=>{
        const ex=edge.b[0]-edge.a[0],ez=edge.b[1]-edge.a[1],edgeLength=Math.hypot(ex,ez);
        const distance=(p:Point2)=>Math.abs(ex*(p[1]-edge.a[1])-ez*(p[0]-edge.a[0]))/edgeLength;
        if(distance(a)>.003||distance(b)>.003)return [];
        const along=(p:Point2)=>((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length;
        return[[Math.min(along(edge.a),along(edge.b)),Math.max(along(edge.a),along(edge.b))]];
      }).sort((x,y)=>x[0]-y[0]);
      let covered=0;for(const [start,end]of intervals){if(end<covered-.003)continue;if(start>covered+.003)break;covered=Math.max(covered,end);}
      assert.ok(covered>=length-.003,rack.id+' has an edge missing from this source');
    }
  }
});

test('58 pallets and eight work tables retain the new source polyline bounds',()=>{
  assert.equal(data.pallets.length,58);assert.equal(data.pods.length,8);assert.equal(data.riceBins?.length,30);
  for(const fixture of [...data.pallets,...data.pods]){
    const polyline=source.polylines.find(item=>item.id===fixture.id);assert.ok(polyline,fixture.id);
    const xs=polyline.points.map(p=>p[0]),zs=polyline.points.map(p=>p[1]);
    assert.ok(Math.abs(fixture.x-Math.min(...xs))<.0011&&Math.abs(fixture.z-Math.min(...zs))<.0011);
    assert.ok(Math.abs(fixture.w-(Math.max(...xs)-Math.min(...xs)))<.0011&&Math.abs(fixture.d-(Math.max(...zs)-Math.min(...zs)))<.0011);
  }
});

test('the revised walk stays in free aisles and cannot cross the receiving partition',()=>{
  const obstacles=obstaclesFor(data);
  for(const zone of data.zones){const point=freePosition(zone.point,data,obstacles);assert.ok(canWalk(...point,data,obstacles),zone.id);assert.ok(Math.hypot(point[0]-zone.point[0],point[1]-zone.point[1])<4,zone.id);}
  const start:Point2=[22,41.8];assert.ok(canWalk(...start,data,obstacles));
  const stop=moveWithCollision(start,[0,-3],data,obstacles);assert.ok(stop[1]>40.63);assert.ok(canWalk(...stop,data,obstacles));
  for(const wall of data.partitions??[])assert.equal(canWalk((wall.a[0]+wall.b[0])/2,(wall.a[1]+wall.b[1])/2,data,obstacles),false);
});

test('the new rack tiers and rice pallets are stocked within their own fixture bounds',()=>{
  const stock=createStockPlan(data),owners=new Map([...data.racks,...data.pallets,...data.pods].map(b=>[b.id,b]));
  for(const item of stock){const owner=owners.get(item.owner)!;assert.ok(owner);assert.ok(item.x>=owner.x+.06&&item.z>=owner.z+.06);assert.ok(item.x+item.w<=owner.x+owner.w-.06+1e-8&&item.z+item.d<=owner.z+owner.d-.06+1e-8);}
  for(const bay of data.racks)for(const level of SHELF_LEVELS)assert.ok(stock.some(item=>item.owner===bay.id&&Math.abs(item.bottom-level-.026)<1e-7),bay.id);
  assert.ok(stock.filter(item=>item.support==='pallet').every(item=>item.kind==='sack'&&item.style==='rice'));
});

test('the second 3D model assembles with finite geometry and new partition walls',()=>{
  const previous=globalThis.document;
  Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){},putImageData(){},createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})})}),createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value:string){}})}});
  try{
    const scene=new THREE.Scene(),interior=buildInterior(scene,data,()=>{});let vertices=0;
    scene.traverse(object=>{if(object instanceof THREE.Mesh){const points=object.geometry.getAttribute('position');vertices+=points.count;for(const value of points.array)assert.ok(Number.isFinite(value));}});
    assert.ok(vertices>30000);assert.ok(interior.stock.userData.stockCount>1000);assert.ok((data.partitions?.length??0)>3);
    interior.update(true,true);assert.equal(interior.roof.visible,true);interior.update(false,false);assert.equal(interior.roof.visible,false);
  }finally{Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:previous});}
});
