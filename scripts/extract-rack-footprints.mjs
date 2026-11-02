const round=value=>Math.round(value*1000)/1000;
const close=(a,b)=>Math.abs(a-b)<.002;

export function rackSourceEdges(source){
  const edges=new Map();
  const add=(a,b,handle)=>{
    a=a.map(round);b=b.map(round);
    if(Math.hypot(b[0]-a[0],b[1]-a[1])<.003)return;
    const key=[a.join(','),b.join(',')].sort().join('|');
    const edge=edges.get(key)??{a,b,handles:[]};
    if(!edge.handles.includes(handle))edge.handles.push(handle);
    edges.set(key,edge);
  };
  for(const e of source.items.filter(item=>item.layer==='0')){
    if(e.type==='LINE')add(e.a,e.b,e.handle);
    else if(e.type==='LWPOLYLINE'){
      for(let i=1;i<e.points.length;i++)add(e.points[i-1],e.points[i],e.handle);
      if(e.closed)add(e.points.at(-1),e.points[0],e.handle);
    }
  }
  return [...edges.values()];
}

/** Recover the actual faces between adjacent crossbars. Thin double lines and
 * gaps are retained; fixed 1.8m guesses previously skipped or duplicated bays. */
export function extractRackFootprints(edges){
  const horizontals=edges.filter(e=>close(e.a[1],e.b[1]));
  const verticals=edges.filter(e=>close(e.a[0],e.b[0]));
  const starts=new Set(horizontals.filter(e=>close(Math.abs(e.b[0]-e.a[0]),.6)).map(e=>round(Math.min(e.a[0],e.b[0]))));
  const supports=(x,z,end)=>{
    let cursor=z;
    const matches=verticals.filter(e=>close(e.a[0],x)).map(e=>({lo:Math.min(e.a[1],e.b[1]),hi:Math.max(e.a[1],e.b[1]),edge:e})).sort((a,b)=>a.lo-b.lo);
    const used=[];
    for(const segment of matches){
      if(segment.hi<cursor-.002)continue;
      if(segment.lo>cursor+.002)break;
      used.push(segment.edge);cursor=Math.max(cursor,segment.hi);
      if(cursor>=end-.002)return used;
    }
    return null;
  };
  const racks=[];
  for(const x of [...starts].sort((a,b)=>a-b)){
    const crosses=horizontals.filter(e=>Math.min(e.a[0],e.b[0])<=x+.002&&Math.max(e.a[0],e.b[0])>=x+.6-.002);
    const levels=[...new Set(crosses.map(e=>e.a[1]))].sort((a,b)=>a-b);
    for(let i=0;i<levels.length-1;i++){
      const z=levels[i],end=levels[i+1],d=round(end-z);
      if(d<1.17||d>1.81)continue;
      const left=supports(x,z,end),right=supports(round(x+.6),z,end);
      if(!left||!right)continue;
      const boundaries=crosses.filter(e=>close(e.a[1],z)||close(e.a[1],end));
      const handles=[...new Set([...left,...right,...boundaries].flatMap(e=>e.handles))];
      racks.push({id:`rack-${x}-${z}`,x,z,w:.6,d,layer:'0',sourceHandles:handles});
    }
  }
  return [...racks,...extractPerimeterRacks(edges)];
}

function extractPerimeterRacks(edges){
  const length=e=>Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]);
  const rails=edges.filter(e=>length(e)>8),caps=edges.filter(e=>length(e)>.35&&length(e)<.9);
  const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
  const result=[];
  for(let i=0;i<rails.length;i++)for(let j=i+1;j<rails.length;j++){
    const a=rails[i],b=rails[j],v=sub(a.b,a.a),u=v.map(n=>n/length(a)),w=sub(b.b,b.a);
    if(Math.abs(cross(u,w.map(n=>n/length(b))))>.001)continue;
    const separation=Math.abs(cross(u,sub(b.a,a.a)));
    if(separation<.4||separation>.7)continue;
    const on=(point,rail)=>{
      const direction=sub(rail.b,rail.a),offset=sub(point,rail.a),t=dot(offset,direction)/dot(direction,direction);
      return Math.abs(cross(direction,offset))/length(rail)<.003&&t>=-.001&&t<=1.001;
    };
    const sections=[];
    for(const cap of caps){
      const p=on(cap.a,a)&&on(cap.b,b)?[cap.a,cap.b]:on(cap.b,a)&&on(cap.a,b)?[cap.b,cap.a]:null;
      if(p&&!sections.some(s=>Math.hypot(...sub(s.points[0],p[0]))<.003))sections.push({points:p,edge:cap,t:dot(sub(p[0],a.a),u)});
    }
    sections.sort((s,t)=>s.t-t.t);
    for(let k=0;k<sections.length-1;k++){
      const start=sections[k],end=sections[k+1],span=end.t-start.t;
      if(span<1.1||span>2)continue;
      const outline=[start.points[0],end.points[0],end.points[1],start.points[1]];
      // The remaining perimeter bays follow the sloping wall/crossbars. Ordinary
      // axis-aligned racks were already recovered above; wall thickness is not storage.
      if(!outline.some((point,index)=>{const next=outline[(index+1)%4];return Math.abs(next[0]-point[0])>.01&&Math.abs(next[1]-point[1])>.01;}))continue;
      const xs=outline.map(p=>p[0]),zs=outline.map(p=>p[1]),x=Math.min(...xs),z=Math.min(...zs);
      result.push({id:'wall-rack-'+start.edge.handles[0],x,z,w:round(Math.max(...xs)-x),d:round(Math.max(...zs)-z),outline,group:'perimeter',layer:'0',sourceHandles:[...new Set([a,b,start.edge,end.edge].flatMap(e=>e.handles))]});
    }
  }
  return result;
}
