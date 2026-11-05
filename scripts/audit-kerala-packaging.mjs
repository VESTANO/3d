import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as THREE from 'three';
import {initWasm,Resvg} from '@resvg/resvg-wasm';
import {createStockPlan} from '../src/warehouse/stockPlan.ts';
import {addSupermarketStock} from '../src/warehouse/stockModels.ts';

// Capture the actual label painter's drawing calls for an offline artwork audit.
// This does not run a browser, compile WebGL shaders or claim a scene screenshot.
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const canvases=[];
globalThis.document={createElement:()=>{
  const canvas={width:0,height:0,parts:[]};
  const context={fillStyle:'#000',font:'12px Arial',textAlign:'start',textBaseline:'alphabetic',
    fillRect(x,y,w,h){canvas.parts.push(`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${escape(this.fillStyle)}"/>`);},
    fillText(value,x,y){const size=this.font.match(/([\d.]+)px/)?.[1]??'12',weight=this.font.match(/^\d+/)?.[0]??'400';canvas.parts.push(`<text x="${x}" y="${y}" fill="${escape(this.fillStyle)}" font-family="Arial" font-size="${size}" font-weight="${weight}" text-anchor="middle" dominant-baseline="central">${escape(value)}</text>`);},
  };
  canvas.getContext=()=>context;canvases.push(canvas);return canvas;
}};
const data=JSON.parse(fs.readFileSync('public/warehouse-2/layout.json','utf8'));
const stock=addSupermarketStock(new THREE.Group(),createStockPlan(data));
const atlas=canvases.find(canvas=>canvas.width===1024&&canvas.height>=1024);
if(!atlas)throw new Error('The label atlas was not created.');
const height=Math.ceil(stock.userData.labelKeys.length/4)*256;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="${height}" viewBox="0 0 1024 ${height}">${atlas.parts.join('')}</svg>`;
const require=createRequire(import.meta.url),fontPath=process.argv[2]??'C:/Windows/Fonts/arial.ttf';
await initWasm(fs.readFileSync(path.join(path.dirname(require.resolve('@resvg/resvg-wasm')),'index_bg.wasm')));
const fontBuffers=[fs.readFileSync(fontPath)],boldPath=path.join(path.dirname(fontPath),'arialbd.ttf');
if(fs.existsSync(boldPath))fontBuffers.push(fs.readFileSync(boldPath));
const options={font:{fontBuffers,defaultFontFamily:'Arial'}};
fs.mkdirSync('deliverables',{recursive:true});fs.writeFileSync('deliverables/kerala-stock-labels.svg',svg);
fs.writeFileSync('deliverables/kerala-stock-labels.png',new Resvg(svg,options).render().asPng());
console.log(JSON.stringify({labels:stock.userData.labelKeys.length,textureWidth:atlas.width,textureHeight:atlas.height,output:'deliverables/kerala-stock-labels.png'}));
