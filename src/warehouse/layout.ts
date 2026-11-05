export type Point2 = [number, number];
export interface Footprint { id: string; x: number; z: number; w: number; d: number; layer: string; outline?:Point2[];sourceHandles?:string[];group?:string }
export interface BillingCounter extends Footprint {number:number; mirrored:boolean; sourceType:string; sourceHandles:string[]}
export interface WarehouseZone { id: string; name: string; point: Point2; look: Point2; source: string }
export interface WarehouseLayout {
  variant?:'warehouse-2';sourceSha256?:string;
  riceBins?:Footprint[];partitions?:{id:string;a:Point2;b:Point2;height:number;thickness:number}[];
  source: string; units: string; scaleToMetres: number;
  conversion: { entities: number; unknown: number };
  bounds: {minX:number; minZ:number; maxX:number; maxZ:number};
  perimeter: Point2[]; racks: Footprint[]; pallets: Footprint[]; pods: Footprint[];
  billingCounters:BillingCounter[];
  annotations: {text:string; point:Point2; layer:string; handle:string}[];
  floorLines: number[][]; hatchLines:number[][];zones: WarehouseZone[]; assumptions:string[];
}
export type ViewMode = 'overview' | 'walk' | 'plan' | 'top';
export interface Obstacle {x:number; z:number; w:number; d:number;outline?:Point2[];segment?:[Point2,Point2];thickness?:number}
export function footprintOutline(b:Footprint):Point2[]{return b.outline??[[b.x,b.z],[b.x+b.w,b.z],[b.x+b.w,b.z+b.d],[b.x,b.z+b.d]];}
export function insetOutline(points:Point2[],distance:number):Point2[]{
  const area=points.reduce((sum,p,i)=>{const n=points[(i+1)%points.length];return sum+p[0]*n[1]-n[0]*p[1];},0);
  const sign=Math.sign(area);
  return points.map((p,i)=>{
    const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
    const normal=(a:Point2,b:Point2):Point2=>{const length=Math.hypot(b[0]-a[0],b[1]-a[1]);return[-sign*(b[1]-a[1])/length,sign*(b[0]-a[0])/length];};
    const a=normal(prev,p),b=normal(p,next),scale=distance/(1+a[0]*b[0]+a[1]*b[1]);
    return[p[0]+(a[0]+b[0])*scale,p[1]+(a[1]+b[1])*scale];
  });
}
export function insidePolygon(x:number,z:number,polygon:Point2[]) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,zi]=polygon[i], [xj,zj]=polygon[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
  }
  return inside;
}
export function obstaclesFor(data:WarehouseLayout):Obstacle[]{
  if(data.variant==='warehouse-2')return [...data.racks,...data.pallets,...data.pods,...(data.riceBins??[]),...(data.partitions??[]).map(wall=>({x:Math.min(wall.a[0],wall.b[0]),z:Math.min(wall.a[1],wall.b[1]),w:Math.abs(wall.b[0]-wall.a[0]),d:Math.abs(wall.b[1]-wall.a[1]),segment:[wall.a,wall.b] as [Point2,Point2],thickness:wall.thickness})),{x:7,z:46.6,w:4.2,d:1.05},{x:31.1,z:37.7,w:.6,d:1.2},{x:12.15,z:48.1,w:5.7,d:1.8}];
  return [...data.racks,...data.pallets,...data.pods,...data.billingCounters,
    {x:5.85,z:35.3,w:.65,d:4.5},{x:5.85,z:41.4,w:.65,d:4.5},
    {x:12.15,z:48.1,w:5.7,d:1.8},
    {x:7,z:46.6,w:4.2,d:1.05}, {x:31.1,z:37.7,w:.6,d:1.2},
    ...[11,18,25,32,39,46].flatMap(z=>[3.2,30.9].map(x=>({x:x-.13,z:z-.13,w:.26,d:.26})))];
}
export function canWalk(x:number,z:number,data:WarehouseLayout,obstacles:Obstacle[],radius=.22){
  if(!insidePolygon(x,z,data.perimeter))return false;
  return !obstacles.some(b=>{
    if(b.segment){const [a,end]=b.segment,dx=end[0]-a[0],dz=end[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<radius+(b.thickness??0)/2;}
    if(b.outline){
      if(insidePolygon(x,z,b.outline))return true;
      return b.outline.some((a,i)=>{const end=b.outline![(i+1)%b.outline!.length],dx=end[0]-a[0],dz=end[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<radius;});
    }
    const cx=Math.max(b.x,Math.min(x,b.x+b.w)),cz=Math.max(b.z,Math.min(z,b.z+b.d));
    return Math.hypot(x-cx,z-cz)<radius;
  });
}
export function freePosition(point:Point2,data:WarehouseLayout,obstacles:Obstacle[]):Point2{
  if(canWalk(...point,data,obstacles))return point;
  for(let r=.25;r<4;r+=.25)for(let angle=0;angle<Math.PI*2;angle+=Math.PI/16){
    const test:Point2=[point[0]+Math.cos(angle)*r,point[1]+Math.sin(angle)*r];
    if(canWalk(...test,data,obstacles))return test;
  }
  return [25.6,49];
}
export function moveWithCollision(position:Point2,delta:Point2,data:WarehouseLayout,obstacles:Obstacle[]):Point2{
  let [x,z]=position;const steps=Math.max(1,Math.ceil(Math.hypot(...delta)/.08));
  for(let i=0;i<steps;i++){
    if(canWalk(x+delta[0]/steps,z,data,obstacles))x+=delta[0]/steps;
    if(canWalk(x,z+delta[1]/steps,data,obstacles))z+=delta[1]/steps;
  }
  return [x,z];
}
