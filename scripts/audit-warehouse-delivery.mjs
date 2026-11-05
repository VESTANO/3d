import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as THREE from 'three';
import {initWasm,Resvg} from '@resvg/resvg-wasm';
import {buildInterior} from '../src/warehouse/buildInterior.ts';
import {deliveryLayout} from '../src/warehouse/delivery.ts';

// Project actual floor triangles and wall bounds at eye height onto the source
// drawing. This is an offline geometry audit, not a WebGL scene screenshot.
globalThis.document={
  createElement:()=>({width:0,height:0,getContext:()=>({fillText(){},fillRect(){},putImageData(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})})}),
  createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_value){}}),
};
const directory=process.argv[2]??'public/warehouse-2';
const data=JSON.parse(fs.readFileSync(path.join(directory,'layout.json'),'utf8')),delivery=deliveryLayout(data);
if(!delivery)throw new Error('No source delivery bays were found');
const scene=new THREE.Scene();buildInterior(scene,data,()=>{});scene.updateMatrixWorld(true);
const shapes=[];let meshes=0,wallParts=0;
scene.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;meshes++;
  if(/^delivery-\d+-floor$/.test(object.name)){
    const geometry=object.geometry,points=geometry.getAttribute('position'),indices=geometry.index;
    for(let i=0;i<indices.count;i+=3){
      const vertices=[0,1,2].map(offset=>new THREE.Vector3().fromBufferAttribute(points,indices.getX(i+offset)).applyMatrix4(object.matrixWorld));
      shapes.push(`<polygon points="${vertices.map(point=>point.x+','+point.z).join(' ')}" fill="#168cb4" fill-opacity=".22" stroke="#087bac" stroke-width=".025"/>`);
    }
  }
  if(object.name==='perimeter-wall'){
    wallParts++;const bounds=new THREE.Box3().setFromObject(object);
    if(bounds.min.y>1.65||bounds.max.x<delivery.innerX-.2)return;
    shapes.push(`<rect x="${bounds.min.x}" y="${bounds.min.z}" width="${Math.max(.02,bounds.max.x-bounds.min.x)}" height="${Math.max(.02,bounds.max.z-bounds.min.z)}" fill="#c97441" fill-opacity=".6"/>`);
  }
});
for(const bay of delivery.bays){
  const mid=(bay.start+bay.end)/2;
  shapes.push(`<path d="M${delivery.frameX},${bay.start}L${delivery.frameX},${bay.end}" stroke="#118a5b" stroke-width=".09" stroke-dasharray=".14 .08"/><text x="${delivery.innerX-.65}" y="${mid}" transform="rotate(90 ${delivery.innerX-.65} ${mid})" font-family="Arial" font-size=".2" text-anchor="middle" fill="#075f82">DELIVERY ${String(bay.number).padStart(2,'0')}</text>`);
}
for(const pier of delivery.piers)shapes.push(`<rect x="${pier.x}" y="${pier.z}" width="${pier.w}" height="${pier.d}" fill="#d3a244"/>`);
let svg=fs.readFileSync(path.join(directory,'floor-plan.svg'),'utf8');
svg=svg.replace('viewBox="0 0 34 55" width="1360" height="2200"','viewBox="17.5 37.5 15.5 15" width="1240" height="1200"').replace('</svg>',shapes.join('')+'</svg>');
const require=createRequire(import.meta.url);
await initWasm(fs.readFileSync(path.join(path.dirname(require.resolve('@resvg/resvg-wasm')),'index_bg.wasm')));
const fonts=[fs.readFileSync(process.argv[3]??'C:/Windows/Fonts/arial.ttf')];
fs.mkdirSync('deliverables',{recursive:true});
const output='deliverables/delivery-'+path.basename(directory)+'.png';
fs.writeFileSync(output,new Resvg(svg,{font:{fontBuffers:fonts,defaultFontFamily:'Arial'}}).render().asPng());
console.log(JSON.stringify({output,bays:delivery.bays.map(bay=>({id:bay.id,start:bay.start,end:bay.end,width:bay.end-bay.start})),wallParts,sceneMeshes:meshes}));
