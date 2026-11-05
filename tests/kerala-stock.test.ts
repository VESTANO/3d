import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createStockPlan,KERALA_SECTIONS,rackSectionIndex,RICE_VARIETIES} from '../src/warehouse/stockPlan.ts';
import {addSupermarketStock} from '../src/warehouse/stockModels.ts';
import type {WarehouseLayout} from '../src/warehouse/layout.ts';

const plans=['warehouse','warehouse-2'].map(directory=>JSON.parse(fs.readFileSync(`public/${directory}/layout.json`,'utf8')) as WarehouseLayout);
test('both warehouses carry the Kerala assortment with a separate household aisle',()=>{
  for(const data of plans){
    const before=JSON.stringify(data),stock=createStockPlan(data),owners=new Map(data.racks.map(rack=>[rack.id,rack]));
    assert.equal(JSON.stringify(data),before,'Stock must not rearrange the source plan');
    for(const style of ['puttu-powder','appam-powder','idiyappam-powder','coconut-oil','banana-chips','papad','jaggery','sambar','garam-masala','chickpeas','green-gram','toor-dal','pickles','coconut-milk']){
      assert.ok(stock.some(item=>item.support==='rack'&&item.style===style),style+' is missing from the shelves');
    }
    for(const item of stock.filter(item=>item.support==='rack')){
      const section=KERALA_SECTIONS[rackSectionIndex(owners.get(item.owner)!)];
      assert.ok(section.styles.includes(item.style),'Food and household goods must stay in their assigned section');
    }
  }
});

test('rice varieties are grouped by pallet with alternating sack orientations',()=>{
  for(const data of plans){
    const stock=createStockPlan(data).filter(item=>item.support==='pallet');
    assert.deepEqual(new Set(stock.map(item=>item.riceVariety)),new Set(RICE_VARIETIES));
    for(const pallet of data.pallets){
      const sacks=stock.filter(item=>item.owner===pallet.id),levels=[...new Set(sacks.map(item=>item.bottom))].sort((a,b)=>a-b);
      assert.ok(sacks.length>0);assert.ok(sacks.every(item=>item.kind==='sack'&&item.style==='rice'));
      assert.equal(new Set(sacks.map(item=>item.riceVariety)).size,1,'One rice variety per pallet');
      levels.forEach((bottom,index)=>{assert.ok(sacks.filter(item=>item.bottom===bottom).every(item=>item.rotation===(index%2?Math.PI/2:0)));if(index>0)assert.ok(bottom-levels[index-1]>=sacks[0].h-1e-8,'Rice layers intersect');});
    }
  }
});

test('actual rotated rice meshes and per-instance label tiles remain valid and batched',()=>{
  const previous=globalThis.document;
  Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){}})}),createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value:string){}})}});
  try{
    const data=plans[1],placements=createStockPlan(data),root=new THREE.Group(),stock=addSupermarketStock(root,placements);
    const sacks=placements.filter(item=>item.kind==='sack'),pallets=new Map(data.pallets.map(pallet=>[pallet.id,pallet]));
    const body=stock.getObjectByName('stock:sack:body') as THREE.InstancedMesh;
    assert.ok(body.instanceColor);assert.equal(body.count,sacks.length);body.geometry.computeBoundingBox();
    const matrix=new THREE.Matrix4();
    sacks.forEach((item,index)=>{
      body.getMatrixAt(index,matrix);const box=body.geometry.boundingBox!.clone().applyMatrix4(matrix),pallet=pallets.get(item.owner)!;
      assert.ok(box.min.x>=pallet.x+.06-1e-6&&box.max.x<=pallet.x+pallet.w-.06+1e-6);
      assert.ok(box.min.z>=pallet.z+.06-1e-6&&box.max.z<=pallet.z+pallet.d-.06+1e-6);
      assert.ok(box.min.y>=.2575-1e-6,'Rice must sit on the pallet deck');
    });
    const label=stock.getObjectByName('stock:sack:label') as THREE.InstancedMesh;
    const tiles=label.geometry.getAttribute('stockTile'),rows=stock.userData.atlasRows as number,keys=stock.userData.labelKeys as string[];
    assert.equal(tiles.count,sacks.length);assert.ok(tiles instanceof THREE.InstancedBufferAttribute);
    sacks.forEach((item,index)=>assert.equal(keys[(rows-1-tiles.getY(index))*4+tiles.getX(index)],'variety:'+item.riceVariety));
    const material=label.material as THREE.MeshStandardMaterial,canvas=material.map!.image as {width:number;height:number};
    assert.ok(canvas.width<=4096&&canvas.height<=4096,'Label atlas exceeds the mobile texture budget');
    const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
    material.onBeforeCompile(shader,{} as THREE.WebGLRenderer);
    assert.ok(shader.vertexShader.includes('attribute vec2 stockTile;')&&shader.vertexShader.includes('mix(vec2(0.0078125)')&&shader.vertexShader.includes('+ stockTile) / vec2(4.0, 16.0)'));
    assert.ok(stock.children.filter(object=>object instanceof THREE.InstancedMesh).length<=40,'Assortment must share package meshes instead of drawing every product separately');
    assert.ok(stock.getObjectByName('stock:jar:body')&&stock.getObjectByName('stock:tin:body'),'Pickle jars and coconut-milk tins are missing');
  }finally{Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:previous});}
});
