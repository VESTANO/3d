import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {deliveryLayout,warehouseZones,DELIVERY_CLEAR_HEIGHT} from '../src/warehouse/delivery.ts';
import {buildInterior} from '../src/warehouse/buildInterior.ts';
import {canWalk,insidePolygon,obstaclesFor,moveWithCollision} from '../src/warehouse/layout.ts';
import {overviewPose,planFrustum,planFocus} from '../src/warehouse/viewFraming.ts';
import type {Point2,WarehouseLayout} from '../src/warehouse/layout.ts';

const plans=['warehouse','warehouse-2'].map(directory=>JSON.parse(fs.readFileSync(`public/${directory}/layout.json`,'utf8')) as WarehouseLayout);
const sources=['warehouse-rack-source','warehouse-2-rack-source'].map(file=>JSON.parse(fs.readFileSync(`tests/fixtures/${file}.json`,'utf8')) as {edges:{a:Point2;b:Point2;handles:string[]}[]});

test('both delivery bays follow the annotated source jambs and preserve the original layout',()=>{
  plans.forEach((data,index)=>{
    const before=JSON.stringify(data),delivery=deliveryLayout(data)!;assert.ok(delivery);
    assert.equal(delivery.bays.length,2);assert.equal(delivery.piers.length,3);
    assert.deepEqual(delivery.bays.map(bay=>[bay.start,bay.end]),[[39.665,44.665],[44.865,49.865]]);
    for(const bay of delivery.bays){
      const note=data.annotations.find(note=>note.handle===bay.source)!;assert.ok(note);assert.deepEqual(bay.sourcePoint,note.point);
      assert.ok(note.point[1]>bay.start&&note.point[1]<bay.end);
      for(const z of [bay.start,bay.end])assert.ok(sources[index].edges.some(edge=>Math.abs(edge.a[1]-z)<.002&&Math.abs(edge.b[1]-z)<.002&&Math.abs(Math.min(edge.a[0],edge.b[0])-delivery.innerX)<.002&&Math.abs(Math.max(edge.a[0],edge.b[0])-delivery.frameX)<.002),'Door endpoint is not a source jamb cap');
    }
    for(const pier of delivery.piers)assert.ok(sources[index].edges.some(edge=>Math.abs(edge.a[0]-pier.x)<.002&&Math.abs(edge.b[0]-pier.x)<.002&&Math.abs(Math.min(edge.a[1],edge.b[1])-pier.z)<.002&&Math.abs(Math.max(edge.a[1],edge.b[1])-pier.z-pier.d)<.002),'Jamb footprint is not in the plan');
    assert.equal(JSON.stringify(data),before,'Delivery rendering must not edit drawing or fixture coordinates');
  });
});

test('delivery is reachable through both openings and solid source jambs still block walking',()=>{
  for(const data of plans){
    const delivery=deliveryLayout(data)!,obstacles=obstaclesFor(data),zone=warehouseZones(data).find(zone=>zone.id==='delivery')!;
    assert.ok(canWalk(...zone.point,data,obstacles));assert.ok(zone.look[0]>zone.point[0]);
    for(const bay of delivery.bays){
      const z=(bay.start+bay.end)/2;
      assert.ok(canWalk(delivery.frameX-.1,z,data,obstacles));
      const end=moveWithCollision([delivery.innerX-.6,z],[1.25,0],data,obstacles);
      assert.ok(end[0]>delivery.frameX+.3,'Opening is blocked by a phantom wall');
    }
    for(const pier of delivery.piers)assert.equal(canWalk(pier.x+pier.w/2,pier.z+pier.d/2,data,obstacles),false);
    const originalZoneIds=new Set(data.zones.map(zone=>zone.id));
    assert.ok(warehouseZones(data).filter(zone=>zone.id!=='delivery').every(zone=>originalZoneIds.has(zone.id)));
  }
});

test('actual 3D walls leave delivery openings clear and floor labels stay inside the clipped lane',()=>{
  const previous=globalThis.document;
  Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{
    createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){},putImageData(){},createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})})}),
    createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value:string){}}),
  }});
  try{
    for(const data of plans){
      const scene=new THREE.Scene(),delivery=deliveryLayout(data)!;buildInterior(scene,data,()=>{});scene.updateMatrixWorld(true);
      const walls:THREE.Mesh[]=[],meshes:THREE.Mesh[]=[];
      scene.traverse(object=>{if(object instanceof THREE.Mesh){meshes.push(object);if(object.name==='perimeter-wall')walls.push(object);}});
      assert.ok(meshes.length<180,'Keep the corrected delivery area within the scene draw-batch budget');
      for(const bay of delivery.bays){
        const anchor=scene.getObjectByName(bay.id)!;assert.ok(anchor);assert.equal(anchor.userData.sourceId,bay.source);
        for(const wall of walls){
          const bounds=new THREE.Box3().setFromObject(wall);
          if(bounds.min.y>=DELIVERY_CLEAR_HEIGHT-.001)continue;
          assert.equal(bounds.intersectsBox(new THREE.Box3(new THREE.Vector3(delivery.outerX-.04,0,bay.start+.12),new THREE.Vector3(delivery.outerX+.04,3.2,bay.end-.12))),false,'A full-height wall still blocks the loading opening');
        }
        const label=scene.getObjectByName(bay.id+'-floor-label') as THREE.Mesh,positions=label.geometry.getAttribute('position');
        for(let i=0;i<positions.count;i++){
          const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(label.matrixWorld);
          assert.ok(insidePolygon(point.x,point.z,bay.outline),bay.id+' label spills across the partition or lane boundary');
        }
        for(const point of bay.outline)assert.ok(insidePolygon(point[0],point[1],data.perimeter));
      }
    }
  }finally{Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:previous});}
});

test('focused delivery camera contains both bays and their signs on phone and desktop screens',()=>{
  for(const data of plans){
    const delivery=deliveryLayout(data)!,zone=warehouseZones(data).find(zone=>zone.id==='delivery')!;
    for(const aspect of [390/844,844/390,768/1024,16/9]){
      const camera=new THREE.PerspectiveCamera(46,aspect,.035,600),pose=overviewPose(zone.focusBounds!,aspect,46,4.8);
      camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true);
      const focus=planFocus(zone.focusBounds!,aspect),frustum=planFrustum(aspect),top=new THREE.OrthographicCamera(frustum.left,frustum.right,frustum.top,frustum.bottom,.035,600);
      top.up.set(0,0,-1);top.zoom=focus.zoom;top.position.set(focus.x,100,focus.z);top.lookAt(focus.x,0,focus.z);top.updateProjectionMatrix();top.updateMatrixWorld(true);
      for(const view of [camera,top])for(const bay of delivery.bays)for(const z of [bay.start,bay.end])for(const y of [0,4.1]){
        const point=new THREE.Vector3(delivery.frameX,y,z).project(view);
        assert.ok(Math.abs(point.x)<.98&&Math.abs(point.y)<.98&&point.z>-1&&point.z<1,'A delivery bay is cropped at aspect '+aspect+' in '+view.type);
      }
    }
  }
});
