export type Point2 = [number, number];
export interface Footprint { id: string; x: number; z: number; w: number; d: number; layer: string }
export interface BillingCounter extends Footprint {number:number; mirrored:boolean; sourceType:string; sourceHandles:string[]}
export interface WarehouseZone { id: string; name: string; point: Point2; look: Point2; source: string }
export interface WarehouseLayout {
  source: string; units: string; scaleToMetres: number;
  conversion: { entities: number; unknown: number };
  bounds: {minX:number; minZ:number; maxX:number; maxZ:number};
  perimeter: Point2[]; racks: Footprint[]; pallets: Footprint[]; pods: Footprint[];
  billingCounters:BillingCounter[];
  annotations: {text:string; point:Point2; layer:string; handle:string}[];
  floorLines: number[][]; zones: WarehouseZone[]; assumptions:string[];
}
export type ViewMode = 'overview' | 'walk' | 'plan';
export interface Obstacle {x:number; z:number; w:number; d:number}
export function insidePolygon(x:number,z:number,polygon:Point2[]) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,zi]=polygon[i], [xj,zj]=polygon[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
  }
  return inside;
}
export function obstaclesFor(data:WarehouseLayout):Obstacle[]{
  return [...data.racks,...data.pallets,...data.pods,...data.billingCounters,
    {x:5.85,z:35.3,w:.65,d:4.5},{x:5.85,z:41.4,w:.65,d:4.5},
    {x:12.15,z:48.1,w:5.7,d:1.8},
    {x:7,z:46.6,w:4.2,d:1.05}, {x:31.1,z:37.7,w:.6,d:1.2},
    {x:3.4,z:6.3,w:.55,d:24.9}, {x:7.7,z:34.1,w:.55,d:10.3},
    ...[11,18,25,32,39,46].flatMap(z=>[3.2,30.9].map(x=>({x:x-.13,z:z-.13,w:.26,d:.26})))];
}
export function canWalk(x:number,z:number,data:WarehouseLayout,obstacles:Obstacle[],radius=.22){
  if(!insidePolygon(x,z,data.perimeter))return false;
  return !obstacles.some(b=>{
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
