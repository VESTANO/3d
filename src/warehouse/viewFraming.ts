import {Vector3} from 'three';
import type {WarehouseLayout} from './layout.ts';

/** Fit every floor/roof corner with a margin, including narrow phone viewports. */
export function overviewPose(bounds:WarehouseLayout['bounds'],aspect:number,verticalFov=46){
  const target=new Vector3((bounds.minX+bounds.maxX)/2,4,(bounds.minZ+bounds.maxZ)/2);
  const back=new Vector3(46,48,55).normalize();
  const right=new Vector3().crossVectors(new Vector3(0,1,0),back).normalize();
  const up=new Vector3().crossVectors(back,right);
  const tanVertical=Math.tan(verticalFov*Math.PI/360),tanHorizontal=tanVertical*Math.max(.1,aspect);
  let distance=0;
  for(const x of [bounds.minX,bounds.maxX])for(const y of [0,8])for(const z of [bounds.minZ,bounds.maxZ]){
    const relative=new Vector3(x,y,z).sub(target);
    const projected=Math.max(Math.abs(relative.dot(right))/tanHorizontal,Math.abs(relative.dot(up))/tanVertical);
    distance=Math.max(distance,relative.dot(back)+projected/.86);
  }
  return {eye:target.clone().addScaledVector(back,distance),target};
}
