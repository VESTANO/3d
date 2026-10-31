import fs from 'node:fs';

/** DWG INSERTs retain a remote insertion origin. Resolve their actual block
 * geometry before cropping; otherwise four checkout counters disappear. */
export function extractBillingCounters(){
  const db=JSON.parse(fs.readFileSync('cad-source/paravoor.raw.json','utf8'));
  const block=db.tables.BLOCK_RECORD.entries.find(b=>b.name==='billing');
  if(!block)throw new Error('The billing block was not found in the source DWG.');
  const lines=block.entities.filter(e=>e.type==='LINE');
  const local=p=>[(p.x-377900)/100,(60700-p.y)/100];
  const unique=new Map();
  for(const e of db.entities.filter(e=>e.type==='INSERT'&&e.name==='billing')){
    const key=[e.insertionPoint.x,e.insertionPoint.y,e.xScale,e.yScale,e.rotation].join(',');
    const item=unique.get(key)??{entity:e,handles:[]};item.handles.push(e.handle);unique.set(key,item);
  }
  const records=[];
  for(const {entity:e,handles}of unique.values()){
    const transform=p=>local({x:e.insertionPoint.x+Math.cos(e.rotation)*p.x*e.xScale-Math.sin(e.rotation)*p.y*e.yScale,
      y:e.insertionPoint.y+Math.sin(e.rotation)*p.x*e.xScale+Math.cos(e.rotation)*p.y*e.yScale});
    records.push({id:handles[0],sourceHandles:handles,sourceType:'INSERT',mirrored:e.xScale<0,segments:lines.map(l=>[...transform(l.startPoint),...transform(l.endPoint)])});
  }
  // The fifth counter is exploded into model-space lines. Fit the block's long
  // exterior edge to that exact source edge instead of guessing a fifth location.
  const sourceLine=db.entities.find(e=>e.handle==='F0283B'),reference=lines[0];
  if(!sourceLine)throw new Error('The exploded counter source edge was not found.');
  const a=local(sourceLine.startPoint),b=local(sourceLine.endPoint);
  const u=[reference.startPoint.x/100,-reference.startPoint.y/100],v=[reference.endPoint.x/100,-reference.endPoint.y/100];
  const angle=Math.atan2(b[1]-a[1],b[0]-a[0])-Math.atan2(v[1]-u[1],v[0]-u[0]);
  const fit=p=>{const x=p.x/100-u[0],z=-p.y/100-u[1];return[a[0]+Math.cos(angle)*x-Math.sin(angle)*z,a[1]+Math.sin(angle)*x+Math.cos(angle)*z];};
  records.push({id:sourceLine.handle,sourceHandles:[sourceLine.handle],sourceType:'EXPLODED_LINES',mirrored:false,segments:lines.map(l=>[...fit(l.startPoint),...fit(l.endPoint)])});
  return records.map(record=>{
    const xs=record.segments.flatMap(s=>[s[0],s[2]]),zs=record.segments.flatMap(s=>[s[1],s[3]]);
    const x=Math.min(...xs),z=Math.min(...zs);
    return{...record,x,z,w:Math.max(...xs)-x,d:Math.max(...zs)-z,layer:'AR-FURNITURE'};
  }).sort((a,b)=>a.z-b.z);
}
