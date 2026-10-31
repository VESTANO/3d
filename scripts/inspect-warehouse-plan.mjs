import fs from 'node:fs';
import {initWasm, Resvg} from '@resvg/resvg-wasm';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const db=JSON.parse(fs.readFileSync('cad-source/paravoor.raw.json','utf8'));
const region={minX:377900,maxX:381300,minY:55200,maxY:60700};
const inside=p=>p&&p.x>=region.minX&&p.x<=region.maxX&&p.y>=region.minY&&p.y<=region.maxY;
const point=p=>[(p.x-region.minX)/100,(region.maxY-p.y)/100];
const clean=s=>s.replace(/\\P/g,' ').replace(/\\[A-Za-z][^;]*;/g,'').replace(/\\[Ll]/g,'').replace(/[{}]/g,'').trim();
const items=[];const texts=[];
for(const e of db.entities){
 if(e.type==='LINE'&&inside(e.startPoint)&&inside(e.endPoint))items.push({type:e.type,handle:e.handle,layer:e.layer,a:point(e.startPoint),b:point(e.endPoint)});
 if(e.type==='LWPOLYLINE'&&e.vertices?.every(inside))items.push({type:e.type,handle:e.handle,layer:e.layer,points:e.vertices.map(point),closed:!!(e.flag&1)});
 if((e.type==='TEXT'||e.type==='MTEXT')&&inside(e.insertionPoint??e.startPoint))texts.push({handle:e.handle,text:clean(e.text),point:point(e.insertionPoint??e.startPoint),height:(e.textHeight??12)/100,layer:e.layer});
}
const colors={'0':'#40516b','AR-FURNITURE':'#6983a3','D RACK':'#d68b25','LVI_FLOOR BEDS - GENERAL':'#277f80','AR-WALL':'#111827'};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const parts=items.map(e=>e.type==='LINE'?`<path d="M${e.a}L${e.b}"/>`:`<polyline points="${e.points.map(p=>p.join(',')).join(' ')}"/>`);
const paths=items.map((e,i)=>`<g stroke="${colors[e.layer]??'#68798e'}" stroke-width=".014" fill="none">${parts[i]}</g>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 55" width="1360" height="2200"><rect width="34" height="55" fill="#fff"/>${paths}${texts.map(t=>`<text x="${t.point[0]}" y="${t.point[1]}" font-family="Arial" font-size="${Math.min(.25,t.height)}" fill="#0a3b78">${esc(t.text)}</text>`).join('')}</svg>`;
fs.writeFileSync('public/warehouse/floor-plan.svg',svg);
fs.writeFileSync('cad-source/floor-candidate.json',JSON.stringify({region,items,texts}));
await initWasm(fs.readFileSync(path.join(path.dirname(require.resolve('@resvg/resvg-wasm')),'index_bg.wasm')));
fs.writeFileSync('cad-source/floor-plan.png',new Resvg(svg).render().asPng());
console.log(JSON.stringify({items:items.length,texts:texts.length,layers:items.reduce((a,e)=>(a[e.layer]=(a[e.layer]??0)+1,a),{}),polySamples:items.filter(e=>e.type==='LWPOLYLINE').slice(0,6)},null,2));
