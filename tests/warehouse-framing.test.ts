import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerspectiveCamera,OrthographicCamera,Vector3} from 'three';
import {overviewPose,planFrustum} from '../src/warehouse/viewFraming.ts';
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

test('top view preserves the drawing orientation and scale at every rack height',()=>{
  for(const aspect of [.45,1,2.5]){
    const frame=planFrustum(aspect),camera=new OrthographicCamera(frame.left,frame.right,frame.top,frame.bottom,.035,600);
    camera.position.set(17,100,27.5);camera.up.set(0,0,-1);camera.lookAt(17,0,27.5);camera.updateMatrixWorld();
    const floor=new Vector3(5,0,10).project(camera),shelf=new Vector3(5,3.15,10).project(camera);
    assert.ok(Math.abs(floor.x-shelf.x)<1e-10&&Math.abs(floor.y-shelf.y)<1e-10,'Perspective must not distort the rack arrangement');
    assert.ok(new Vector3(5,0,5).project(camera).y>new Vector3(5,0,45).project(camera).y,'Drawing top must remain screen top');
    for(const x of [0,34])for(const z of [0,55]){const point=new Vector3(x,0,z).project(camera);assert.ok(Math.abs(point.x)<=1&&Math.abs(point.y)<=1);}
  }
});
