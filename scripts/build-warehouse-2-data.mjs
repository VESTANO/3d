import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {rackSourceEdges,extractRackFootprints} from './extract-rack-footprints.mjs';
const directory='cad-source/warehouse-2',output='public/warehouse-2';
const source=JSON.parse(fs.readFileSync(directory+'/floor-candidate.json','utf8'));
const round=value=>Math.round(value*1000)/1000;
const boxes=new Map();
for(const e of source.items.filter(e=>e.type==='LWPOLYLINE'&&e.layer!=='SPN-DIM')){
  const x=Math.min(...e.points.map(p=>p[0])),z=Math.min(...e.points.map(p=>p[1]));
  const w=Math.max(...e.points.map(p=>p[0]))-x,d=Math.max(...e.points.map(p=>p[1]))-z;
  if(w<.5||d<.5)continue;
  const box={id:e.handle,x:round(x),z:round(z),w:round(w),d:round(d),layer:e.layer};
  boxes.set([box.x,box.z,box.w,box.d].join(','),box);
}
const edges=rackSourceEdges(source),racks=extractRackFootprints(edges);
const pallets=[...boxes.values()].filter(b=>b.layer==='0'&&Math.abs(b.w-1.2)<.002&&Math.abs(b.d-1.2)<.002);
const pods=[...boxes.values()].filter(b=>b.layer==='LVI_FLOOR BEDS - GENERAL'&&b.w>=1.19&&b.d>=1.19).sort((a,b)=>a.z-b.z||a.x-b.x);
const riceBins=extractRackFootprints(edges,{width:.62,minDepth:.26,maxDepth:.32,perimeter:false}).map(b=>({...b,id:b.id.replace('rack-','rice-bin-')}));
const annotations=[...new Map(source.texts.map(t=>[t.text+','+t.point.map(n=>n.toFixed(1)),t])).values()];
const partitions=['1054C5B','1054C62','1054C86'].map(handle=>{
  const line=source.items.find(e=>e.handle===handle&&e.type==='LINE');if(!line)throw new Error('Source partition missing: '+handle);
  return{id:handle,a:line.a.map(round),b:line.b.map(round),height:2.8,thickness:.04};
});
// The two new western rooms are represented by their actual source wall segments.
for(const e of edges){
  const westernRooms=e.a[0]>=2.98&&e.b[0]>=2.98&&e.a[0]<=7&&e.b[0]<=7&&e.a[1]>=44.9&&e.b[1]>=44.9;
  const toilets=e.a[0]>=12.08&&e.b[0]>=12.08&&e.a[0]<=17.99&&e.b[0]<=17.99&&e.a[1]>=48.1&&e.b[1]>=48.1&&e.a[1]<=49.87&&e.b[1]<=49.87;
  if((westernRooms||toilets)&&Math.hypot(e.a[0]-e.b[0],e.a[1]-e.b[1])>1){
    partitions.push({id:e.handles[0],a:e.a,b:e.b,height:2.8,thickness:.06});
  }
}
const hatchMap=new Map();
for(const e of source.items.filter(e=>e.layer==='D RACK')){
  const segments=e.type==='LINE'?[[e.a,e.b]]:e.points.slice(1).map((p,i)=>[e.points[i],p]);
  for(const [a,b]of segments)if(Math.hypot(a[0]-b[0],a[1]-b[1])>.05)hatchMap.set([a,b].flat().map(round).join(','),[...a,...b].map(round));
}
const original=JSON.parse(fs.readFileSync('public/warehouse/layout.json','utf8'));
const hash=createHash('sha256').update(fs.readFileSync(directory+'/paravoor.dwg')).digest('hex');
const data={source:'paravoor.dwg',sourceSha256:hash,variant:'warehouse-2',units:'cm',scaleToMetres:.01,conversion:{entities:88519,unknown:0},bounds:original.bounds,perimeter:original.perimeter,
  racks,pallets,pods,riceBins,partitions,billingCounters:[],annotations,hatchLines:[...hatchMap.values()],floorLines:edges.map(e=>[...e.a,...e.b]),
  zones:[
    {id:'receiving',name:'Receiving area',point:[23.2,49],look:[23.2,45],source:'RECEIVING AREA'},
    {id:'racks',name:'Rack aisles',point:[16.7,27],look:[16.7,12],source:'CAD rack outlines'},
    {id:'pallets',name:'Rice pallet storage',point:[16.8,34],look:[14.5,36],source:'PALLET'},
    {id:'orders',name:'Order consolidation',point:[25,35.8],look:[23,34],source:'ORDER CONSOLTATION'},
    {id:'dispatch',name:'Dispatch work tables',point:[23,39.7],look:[23,38.2],source:'DISPATCHING'},
    {id:'staging',name:'Staging area',point:[14.6,43.7],look:[14.6,41.5],source:'STAGGING AREA'},
    {id:'bins',name:'Rice bins',point:[7.4,36],look:[6.2,35],source:'RICE BINS'},
    {id:'services',name:'Rooms & facilities',point:[8,45.6],look:[5,46],source:'ROOM / TOILET / UP'},
  ],assumptions:['Source: titled developmental ground-floor plan in the revised DWG.','Rack, pallet, work-table, bin and receiving-partition coordinates are taken from this source.','Heights, roof, finishes and representative supermarket stock are illustrative.']};
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/layout.json',JSON.stringify(data));fs.copyFileSync(directory+'/paravoor.dwg',output+'/paravoor.dwg');
fs.writeFileSync('tests/fixtures/warehouse-2-rack-source.json',JSON.stringify({sourceSha256:hash,edges,polylines:source.items.filter(e=>e.type==='LWPOLYLINE'&&e.layer!=='SPN-DIM').map(e=>({id:e.handle,points:e.points.map(p=>p.map(round))}))}));
console.log(JSON.stringify({racks:racks.length,pallets:pallets.length,workTables:pods.length,riceBins:riceBins.length,partitions:partitions.length,sourceSha256:hash}));
