import fs from 'node:fs';
import {extractBillingCounters} from './extract-billing-counters.mjs';
const source=JSON.parse(fs.readFileSync('cad-source/floor-candidate.json','utf8'));
const round=v=>Math.round(v*1000)/1000;
const boxes=[];
for(const e of source.items.filter(e=>e.type==='LWPOLYLINE'&&e.layer!=='SPN-DIM')){
 const xs=e.points.map(p=>p[0]),zs=e.points.map(p=>p[1]);
 const x=Math.min(...xs),z=Math.min(...zs),w=Math.max(...xs)-x,d=Math.max(...zs)-z;
 if(w>.5&&d>.5)boxes.push({id:e.handle,x:round(x),z:round(z),w:round(w),d:round(d),layer:e.layer});
}
// Recover the other rack bay outlines from ordinary LINE entities, not a guessed grid.
const lines=source.items.filter(e=>e.type==='LINE'&&e.layer==='0');
const horizontal=new Map();const vertical=[];
for(const e of lines){
 if(Math.abs(e.a[1]-e.b[1])<.002){const x=round(Math.min(e.a[0],e.b[0])),w=round(Math.abs(e.a[0]-e.b[0]));if(w>.59&&w<.61){const key=x+','+w;const a=horizontal.get(key)??new Set();a.add(round(e.a[1]));horizontal.set(key,a);}}
 if(Math.abs(e.a[0]-e.b[0])<.002)vertical.push({x:round(e.a[0]),z:Math.min(e.a[1],e.b[1]),end:Math.max(e.a[1],e.b[1])});
}
for(const [key,values] of horizontal){const [x,w]=key.split(',').map(Number);const zs=[...values].sort((a,b)=>a-b);for(const z of zs){for(const d of [1.8,1.2]){
 if(zs.some(end=>Math.abs(end-z-d)<.003)&&[x,x+w].every(side=>vertical.some(v=>Math.abs(v.x-side)<.003&&v.z<z+.003&&v.end>z+d-.003)))boxes.push({id:'line-'+x+'-'+z,x,z,w,d,layer:'0'});
}}}
const dedupe=items=>[...new Map(items.map(b=>[[b.x,b.z,b.w,b.d].map(v=>v.toFixed(2)).join(','),b])).values()];
const racks=dedupe(boxes.filter(b=>b.layer==='0'&&b.w<.7));
const pallets=dedupe(boxes.filter(b=>b.layer==='0'&&b.w>1.1&&b.w<1.3&&b.d>1.1&&b.d<1.3));
const pods=dedupe(boxes.filter(b=>b.layer==='LVI_FLOOR BEDS - GENERAL'&&b.w>1.79&&b.d>1.49));
const textSet=new Map();for(const t of source.texts){const key=t.text+','+t.point.map(v=>v.toFixed(1));if(!textSet.has(key))textSet.set(key,t);}
const annotations=[...textSet.values()];
const checkout=extractBillingCounters();
const billingCounters=checkout.map(({segments,...counter},i)=>({...counter,number:i+1}));
// Use a simple non-self-intersecting perimeter, keeping the drawing's angled north wall.
const perimeter=[[2.986,4.4],[4.248,4.645],[31.176,9.89],[31.776,38.565],[31.776,50.065],[31.176,51.565],[19.376,51.565],[19.376,50.065],[12.086,50.065],[12.086,47.765],[2.986,47.765]];
const floorLines=dedupe(source.items.filter(e=>e.type==='LINE'&&['0','D RACK'].includes(e.layer)).map(e=>({x:round(e.a[0]),z:round(e.a[1]),w:round(e.b[0]),d:round(e.b[1])}))).filter(e=>Math.hypot(e.w-e.x,e.d-e.z)>.08).map(e=>[e.x,e.z,e.w,e.d]);
const data={source:'paravoor.dwg',units:'cm',scaleToMetres:.01,conversion:{entities:37122,unknown:0},bounds:{minX:0,minZ:3,maxX:34,maxZ:53},perimeter,racks,pallets,pods,billingCounters,annotations,floorLines,
 zones:[{id:'receiving',name:'Receiving area',point:[25.6,49],look:[25.6,46],source:'RECEIVING AREA'},{id:'pallets',name:'Pallet storage',point:[20.8,44.9],look:[20.8,35],source:'PALLET'},{id:'categories',name:'Categories 1–5',point:[17,33.9],look:[17,31.9],source:'CATEGORIE 1–5'},{id:'racks',name:'Rack aisles',point:[16.7,28.5],look:[16.7,12],source:'CAD rack footprints'},{id:'bins',name:'Rice bins',point:[7.4,39.8],look:[6.2,38],source:'RICE BINS'},{id:'billing',name:'Billing & delivery',point:[28.8,46.5],look:[27.5,44.8],source:'BILLING COUNTER / DELIVERD AREA'},{id:'services',name:'Stairs & facilities',point:[18.5,47],look:[14.5,49],source:'UP / TOILET'}],
 assumptions:['Rack and pallet footprints are extracted from the DWG.','The north wall is angled as drawn. Some perimeter closures are inferred.','Heights, lighting, roof, materials and stock appearance are illustrative; the source is a 2D ground-floor plan.']};
Object.assign(data.zones.find(zone=>zone.id==='billing'),{name:'Billing counters · 5',point:[29.4,42],look:[27.6,41]});
fs.writeFileSync('public/warehouse/layout.json',JSON.stringify(data));
fs.copyFileSync('cad-source/paravoor.dwg','public/warehouse/paravoor.dwg');
// A compact, safe SVG: retain meaningful source geometry, remove repeated CAD
// lines and tiny drafting artefacts, and escape every annotation as plain text.
const svgParts=new Map();
for(const counter of checkout)for(const s of counter.segments){
  if(Math.hypot(s[0]-s[2],s[1]-s[3])<.02)continue;
  const a=s.slice(0,2).map(round),b=s.slice(2).map(round),key=[a.join(','),b.join(',')].sort().join('|');
  svgParts.set(key,`<path d="M${a}L${b}" stroke="#537e9a"/>`);
}
for(const e of source.items){
 if(e.type==='LINE'){
  if(Math.hypot(e.a[0]-e.b[0],e.a[1]-e.b[1])<.02)continue;
  const a=e.a.map(round),b=e.b.map(round),key=[a.join(','),b.join(',')].sort().join('|');
  svgParts.set(key,`<path d="M${a}L${b}" stroke="${e.layer==='D RACK'?'#c99640':'#71849a'}"/>`);
 }else{
  const points=e.points.map(p=>p.map(round).join(',')).join(' ');
  svgParts.set(points,`<polyline points="${points}" stroke="${e.layer==='LVI_FLOOR BEDS - GENERAL'?'#47888e':'#7a8ea3'}"/>`);
 }
}
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 55" width="1360" height="2200"><rect width="34" height="55" fill="#fff"/><g fill="none" stroke-width=".018">${[...svgParts.values()].join('')}</g>${annotations.map(t=>`<text x="${t.point[0]}" y="${t.point[1]}" font-family="Arial,sans-serif" font-size="${Math.min(.23,t.height)}" fill="#153e68">${esc(t.text)}</text>`).join('')}</svg>`;
fs.writeFileSync('public/warehouse/floor-plan.svg',svg);
if(fs.existsSync('public/warehouse/original-plan.svg'))fs.unlinkSync('public/warehouse/original-plan.svg');
console.log(JSON.stringify({racks:racks.length,pallets:pallets.length,pods:pods.length,annotations:annotations.length,footprints:racks.slice(0,3),bytes:fs.statSync('public/warehouse/layout.json').size},null,2));
