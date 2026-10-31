import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,Vector3} from 'three';
import {overviewPose} from '../src/warehouse/viewFraming.ts';
import type {WarehouseLayout} from '../src/warehouse/layout.ts';

test('the complete DWG footprint fits phone, tablet and landscape camera frustums',()=>{
  const {bounds}=JSON.parse(fs.readFileSync('public/warehouse/layout.json','utf8')) as WarehouseLayout;
  for(const [width,height] of [[320,700],[390,500],[768,800],[844,240],[1440,900]]){
    const camera=new PerspectiveCamera(46,width/height,.035,600);
    const pose=overviewPose(bounds,camera.aspect,camera.fov);
    camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld();
    for(const x of [bounds.minX,bounds.maxX])for(const y of [0,8])for(const z of [bounds.minZ,bounds.maxZ]){
      const point=new Vector3(x,y,z).project(camera);
      assert.ok(Math.abs(point.x)<=.861&&Math.abs(point.y)<=.861,`${width}×${height}: warehouse corner clipped`);
      assert.ok(point.z>-1&&point.z<1,'warehouse must remain inside the clipping planes');
    }
  }
});
