import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as THREE from 'three';
import {initWasm,Resvg} from '@resvg/resvg-wasm';
import {createStockPlan} from '../src/warehouse/stockPlan.ts';
import {addSupermarketStock} from '../src/warehouse/stockModels.ts';

// Capture actual atlas image placements for an offline artwork audit. Local
// JPEGs are rendered with Resvg, without a browser or a WebGL scene screenshot.
const canvases=[];
globalThis.document={
  createElement:()=>{
    const canvas={width:0,height:0,parts:[]};
    canvas.getContext=()=>({fillRect(){},drawImage(image,x,y,width,height){
      const bytes=fs.readFileSync(path.join('public',image.src.slice(2)));
      canvas.parts.push(`<image x="${x}" y="${y}" width="${width}" height="${height}" href="data:image/jpeg;base64,${bytes.toString('base64')}"/>`);
    }});canvases.push(canvas);return canvas;
  },
  createElementNS:()=>({
    listeners:new Map(),value:'',
    addEventListener(type,listener){this.listeners.set(type,listener);},
    removeEventListener(type){this.listeners.delete(type);},
    get src(){return this.value;},
    set src(value){this.value=value;queueMicrotask(()=>this.listeners.get('load')?.call(this));},
  }),
};
const data=JSON.parse(fs.readFileSync('public/warehouse-2/layout.json','utf8'));
const stock=addSupermarketStock(new THREE.Group(),createStockPlan(data));
await Promise.resolve();
const atlas=canvases.find(canvas=>canvas.width===1024&&canvas.height===4096);
if(!atlas||stock.userData.packaging.loaded!==3||atlas.parts.length!==3)throw new Error('Packaging image atlas did not finish loading.');
const height=Math.ceil(stock.userData.labelKeys.length/4)*256;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="${height}" viewBox="0 0 1024 ${height}">${atlas.parts.join('')}</svg>`;
const require=createRequire(import.meta.url);
await initWasm(fs.readFileSync(path.join(path.dirname(require.resolve('@resvg/resvg-wasm')),'index_bg.wasm')));
fs.mkdirSync('deliverables',{recursive:true});fs.writeFileSync('deliverables/kerala-stock-labels.svg',svg);
fs.writeFileSync('deliverables/kerala-stock-labels.png',new Resvg(svg).render().asPng());
console.log(JSON.stringify({labels:stock.userData.labelKeys.length,imageSheets:stock.userData.packaging.loaded,textureWidth:atlas.width,textureHeight:atlas.height,stockBatches:stock.children.length,output:'deliverables/kerala-stock-labels.png'}));
