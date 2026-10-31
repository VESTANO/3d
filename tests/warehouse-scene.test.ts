import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {buildInterior} from '../src/warehouse/buildInterior.ts';
import type {WarehouseLayout} from '../src/warehouse/layout.ts';

test('warehouse geometry assembles with finite vertices, batched shelves and textured floor',()=>{
  // Supply only the canvas/image interfaces needed to build geometry. This test
  // does not emulate a browser, exercise WebGL, or claim visual verification.
  const previous=globalThis.document;
  Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{
    createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){},putImageData(){},createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})})}),
    createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value:string){}}),
  }});
  try{
    const scene=new THREE.Scene();const data=JSON.parse(fs.readFileSync('public/warehouse/layout.json','utf8')) as WarehouseLayout;
    const interior=buildInterior(scene,data,()=>{});let meshes=0,vertices=0,texturedFloor=false;
    scene.traverse(object=>{if(object instanceof THREE.Mesh){
      meshes++;const attr=object.geometry.getAttribute('position');vertices+=attr.count;
      for(let i=0;i<attr.array.length;i++)assert.ok(Number.isFinite(attr.array[i]));
      if(object.material instanceof THREE.MeshStandardMaterial&&object.material.name==='warehouse-floor'){
        texturedFloor=!!object.material.map;
        assert.equal(object.material.color.getHexString(),'377bc1','warehouse floor must be blue');
      }
      if(object instanceof THREE.InstancedMesh){
        object.geometry.computeBoundingBox();const bounds=object.geometry.boundingBox!;
        assert.ok(bounds.min.x>=-.501&&bounds.max.x<=.501&&bounds.min.z>=-.501&&bounds.max.z<=.501,object.name+' has oversized merchandise');
        assert.ok(bounds.min.y>=-.001&&bounds.max.y<=1.001,object.name+' has unsupported merchandise');
        for(let i=0;i<object.count;i++){const matrix=new THREE.Matrix4();object.getMatrixAt(i,matrix);matrix.elements.forEach(v=>assert.ok(Number.isFinite(v)));}
      }
    }});
    assert.ok(vertices>30000);assert.ok(meshes<180,'static stock and shelving must remain batched');assert.ok(texturedFloor);
    assert.ok(interior.stock.userData.stockCount>2000,'stock all the storage areas with supermarket products');
    const checkoutAnchors:THREE.Object3D[]=[];scene.traverse(object=>{if(object.name.startsWith('billing-counter-'))checkoutAnchors.push(object);});
    assert.equal(checkoutAnchors.length,5);
    for(const counter of data.billingCounters){const anchor=checkoutAnchors.find(a=>a.userData.sourceId===counter.id)!;assert.ok(anchor);assert.equal(anchor.position.x,counter.x+counter.w/2);assert.equal(anchor.position.z,counter.z+counter.d/2);}
    interior.update(true,true);assert.equal(interior.roof.visible,true);assert.equal(interior.wallMaterial.opacity,1);
    interior.update(false,false);assert.equal(interior.roof.visible,false);assert.equal(interior.wallMaterial.opacity,.2);
  }finally{Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:previous});}
});
