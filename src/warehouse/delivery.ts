import type {Footprint,Point2,WarehouseLayout,WarehouseZone} from './layout';

export const DELIVERY_CLEAR_HEIGHT=3.4; // Illustrative height: the source is a 2D plan.
export interface DeliveryBay{
  id:string;number:number;source:string;sourcePoint:Point2;
  start:number;end:number;outline:Point2[];
}
export interface DeliveryLayout{
  innerX:number;frameX:number;outerX:number;west:number;
  bays:DeliveryBay[];piers:Footprint[];bounds:WarehouseLayout['bounds'];
}
export interface WallSection{a:Point2;b:Point2;bottom:number;top:number}

/** Recover the two openings from CAD jamb caps beside the delivery notes.
 * No fixture or stored drawing data is changed. Floor paint is inset from the
 * source boundaries and clipped at the revised plan's diagonal partition. */
export function deliveryLayout(data:WarehouseLayout):DeliveryLayout|null{
  const labels=data.annotations.filter(note=>/^DELIVER(?:ED|D) AREA$/.test(note.text)).sort((a,b)=>a.point[1]-b.point[1]);
  if(!labels.length)return null;
  const noteX=labels[0].point[0];
  const caps=data.floorLines.filter(([x,z,endX,endZ])=>Math.abs(z-endZ)<.003&&Math.abs(Math.abs(endX-x)-.2)<.003&&Math.min(x,endX)>noteX&&Math.max(x,endX)<noteX+.6&&z>labels[0].point[1]-7&&z<labels.at(-1)!.point[1]+7);
  if(!caps.length)return null;
  const innerX=Math.min(...caps.flatMap(line=>[line[0],line[2]]));
  const frameX=Math.max(...caps.flatMap(line=>[line[0],line[2]]));
  const outerX=Math.max(...data.perimeter.map(point=>point[0]));
  const levels=[...new Set(caps.map(line=>line[1]))].sort((a,b)=>a-b);
  const partition=data.partitions?.find(wall=>Math.abs(wall.a[0]-wall.b[0])<.003&&wall.a[0]<innerX&&wall.a[0]>innerX-4&&Math.abs(wall.a[1]-wall.b[1])>5);
  const counterEdge=Math.max(...data.billingCounters.map(counter=>counter.x+counter.w));
  const west=partition?partition.a[0]+partition.thickness/2+.04:counterEdge+.35;
  if(!Number.isFinite(west)||west>=innerX)return null;
  const diagonal=data.partitions?.find(wall=>Math.abs(wall.a[0]-wall.b[0])>1&&Math.abs(wall.a[1]-wall.b[1])>1&&Math.max(wall.a[0],wall.b[0])>innerX-.1&&Math.min(wall.a[0],wall.b[0])>west-.2);
  const bays:DeliveryBay[]=[];
  for(const label of labels){
    const start=levels.filter(z=>z<label.point[1]).at(-1),end=levels.find(z=>z>label.point[1]);
    if(start===undefined||end===undefined||end-start<2||bays.some(bay=>bay.start===start))continue;
    const east=innerX-.08,top=start+.06,bottom=end-.06;
    const limit=(x:number)=>diagonal?Math.min(bottom,diagonal.a[1]+(x-diagonal.a[0])*(diagonal.b[1]-diagonal.a[1])/(diagonal.b[0]-diagonal.a[0])-.06):bottom;
    const outline:Point2[]=[[west,top],[east,top],[east,limit(east)],[west,limit(west)]];
    bays.push({id:'delivery-'+String(bays.length+1).padStart(2,'0'),number:bays.length+1,source:label.handle,sourcePoint:label.point,start,end,outline});
  }
  if(!bays.length)return null;
  const piers:Footprint[]=[];
  for(const [x,z,endX,endZ]of data.floorLines){
    if(Math.abs(x-innerX)>.003||Math.abs(x-endX)>.003||Math.abs(Math.abs(z-endZ)-.2)>.003)continue;
    const top=Math.min(z,endZ);
    if(top<bays[0].start-.21||top>bays.at(-1)!.end+.01||piers.some(pier=>Math.abs(pier.z-top)<.003))continue;
    piers.push({id:'delivery-jamb-'+piers.length,x:innerX,z:top,w:frameX-innerX,d:Math.abs(z-endZ),layer:'0'});
  }
  return {innerX,frameX,outerX,west,bays,piers,bounds:{minX:west-.6,maxX:outerX+.3,minZ:bays[0].start-.4,maxZ:bays.at(-1)!.end+.4}};
}

/** The former solid perimeter must leave the two CAD openings clear. */
export function perimeterWallSections(data:WarehouseLayout,delivery=deliveryLayout(data)):WallSection[]{
  const sections:WallSection[]=[];
  data.perimeter.forEach((a,index)=>{
    const b=data.perimeter[(index+1)%data.perimeter.length];
    if(!delivery||Math.abs(a[0]-delivery.outerX)>.003||Math.abs(b[0]-delivery.outerX)>.003){sections.push({a,b,bottom:0,top:6.6});return;}
    const start=Math.min(a[1],b[1]),end=Math.max(a[1],b[1]);
    const levels=[...new Set([start,end,...delivery.bays.flatMap(bay=>[bay.start,bay.end]).filter(z=>z>start&&z<end)])].sort((x,y)=>x-y);
    for(let i=0;i<levels.length-1;i++){
      const mid=(levels[i]+levels[i+1])/2,opening=delivery.bays.some(bay=>mid>bay.start&&mid<bay.end);
      sections.push({a:[a[0],levels[i]],b:[a[0],levels[i+1]],bottom:opening?DELIVERY_CLEAR_HEIGHT:0,top:6.6});
    }
  });
  return sections;
}

export function warehouseZones(data:WarehouseLayout):WarehouseZone[]{
  const delivery=deliveryLayout(data);if(!delivery)return data.zones;
  const first=delivery.bays[0],cx=(delivery.west+delivery.innerX)/2;
  const zone:WarehouseZone={id:'delivery',name:`Delivery area · ${delivery.bays.length} bays`,point:[cx,(first.start+first.end)/2],look:[delivery.frameX,(first.start+first.end)/2],source:'DELIVERED AREA / DELIVERD AREA',focusBounds:delivery.bounds};
  const existing=data.zones.filter(item=>item.id!=='delivery');
  return [existing[0],zone,...existing.slice(1)];
}
