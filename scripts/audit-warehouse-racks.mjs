import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as THREE from 'three';
import {initWasm,Resvg} from '@resvg/resvg-wasm';
import {buildInterior} from '../src/warehouse/buildInterior.ts';

// Project the actual generated top-deck triangles onto the original CAD extract.
// This is a geometry audit, without a browser or a WebGL render.
globalThis.document={
  createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})})}),
  createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value){}}),
};
const publicDirectory=process.argv[2]??'public/warehouse',sourceDirectory=process.argv[3]??'cad-source';
const data=JSON.parse(fs.readFileSync(path.join(publicDirectory,'layout.json'),'utf8'));
const scene=new THREE.Scene();buildInterior(scene,data,()=>{});scene.updateMatrixWorld(true);
const triangles=[];
scene.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||object.material.color?.getHexString()!=='c0c8c9')return;
  const geometry=object.geometry,p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),index=geometry.index;
  for(let i=0;i<(index?.count??p.count);i+=3){
    const ids=[0,1,2].map(offset=>index?index.getX(i+offset):i+offset);
    if(!ids.every(id=>n.getY(id)>.9&&Math.abs(p.getY(id)-3.0025)<.003))continue;
    const points=ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id).applyMatrix4(object.matrixWorld));
    triangles.push(`<polygon points="${points.map(v=>`${v.x},${v.z}`).join(' ')}"/>`);
  }
});
if(triangles.length!==data.racks.length*2)throw new Error('A top shelf is missing or incorrectly oriented.');
let svg=fs.readFileSync(path.join(publicDirectory,'floor-plan.svg'),'utf8');
svg=svg.replace(/(<rect\b[^>]*\/>)/,background=>`${background}<g fill="#147ace" fill-opacity=".3">${triangles.join('')}</g>`);
const require=createRequire(import.meta.url);
await initWasm(fs.readFileSync(path.join(path.dirname(require.resolve('@resvg/resvg-wasm')),'index_bg.wasm')));
const output=path.join(sourceDirectory,'rack-plan-alignment.png');
fs.writeFileSync(output,new Resvg(svg).render().asPng());
console.log(JSON.stringify({rackBays:data.racks.length,topDeckTriangles:triangles.length,output}));
