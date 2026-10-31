import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Footprint, WarehouseLayout} from './layout';
import {createStockPlan,WALL_STORAGE} from './stockPlan.ts';
import {addSupermarketStock} from './stockModels.ts';

export function buildInterior(scene:THREE.Scene,data:WarehouseLayout,invalidate:()=>void){
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const unit=new THREE.BoxGeometry(1,1,1);
  const mat=(color:string,metalness=.1,roughness=.65)=>{
    const key=color+metalness+roughness;
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,metalness,roughness}));
    return materials.get(key)!;
  };
  const root=new THREE.Group();scene.add(root);
  function box(size:number[],pos:number[],color:string,metal=.1){
    const geometry=unit.clone();geometry.scale(size[0],size[1],size[2]);geometry.translate(pos[0],pos[1],pos[2]);
    const material=mat(color,metal),list=batches.get(material)??[];list.push(geometry);batches.set(material,list);
  }
  function rod(a:number[],b:number[],r:number,color:string){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),mid=from.clone().add(to).multiplyScalar(.5);
    const geometry=new THREE.CylinderGeometry(r,r,from.distanceTo(to),6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize()));
    geometry.translate(mid.x,mid.y,mid.z);const material=mat(color,.5),list=batches.get(material)??[];list.push(geometry);batches.set(material,list);
  }
  function text(value:string,pos:number[],width:number,height:number,color='#153a61',floor=false){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=color;ctx.font='600 66px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,512,64,990);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    mesh.position.set(pos[0],pos[1],pos[2]); if(floor)mesh.rotation.x=-Math.PI/2;root.add(mesh);return mesh;
  }
  // Blue epoxy floor with a subtle local grain and flush joint lines.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
  const pixels=ctx.createImageData(256,256);let seed=43;
  for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=228+seed%24;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);const concrete=new THREE.CanvasTexture(canvas);concrete.wrapS=concrete.wrapT=THREE.RepeatWrapping;concrete.repeat.set(38,58);
  const concreteMat=mat('#377bc1',.04);concreteMat.name='warehouse-floor';concreteMat.roughness=.43;concreteMat.map=concrete;concreteMat.bumpMap=concrete;concreteMat.bumpScale=.006;
  box([35,.18,55],[17,-.09,27],'#377bc1',.04);
  for(let x=0;x<=34;x+=2)box([.012,.006,53],[x,.004,27],'#28619e');
  for(let z=1;z<=53;z+=2)box([34,.006,.012],[17,.004,z],'#28619e');
  const wallMaterial=mat('#e9e7df',.05,.8);wallMaterial.transparent=true;
  const walls=new THREE.Group();root.add(walls);
  data.perimeter.forEach((a,i)=>{
    const b=data.perimeter[(i+1)%data.perimeter.length];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(length,6.6,.18),wallMaterial);
    mesh.position.set((a[0]+b[0])/2,3.3,(a[1]+b[1])/2);mesh.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);mesh.castShadow=true;mesh.receiveShadow=true;walls.add(mesh);
  });
  const roof=new THREE.Group();root.add(roof);
  const roofMat=mat('#c8d1d4',.5,.5);
  const roofMesh=new THREE.Mesh(new THREE.BoxGeometry(29.2,.16,41),roofMat);roofMesh.position.set(17.35,7.25,29);roofMesh.receiveShadow=true;roofMesh.castShadow=true;roof.add(roofMesh);
  const beamMat=mat('#677987',.6,.46);
  for(const z of [11,18,25,32,39,46]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(27.7,.22,.14),beamMat);beam.position.set(17.05,6.6,z);roof.add(beam);
    for(const x of [3.2,30.9]){
      box([.22,6.6,.22],[x,3.3,z],'#688298',.6);
      box([.5,.12,.5],[x,.04,z],'#a1aeb1',.6);
      for(const stripe of [.5,.8,1.1])box([.24,.12,.24],[x,stripe,z],'#e3b149');
    }
    for(const x of [9,17,25]){
      const light=new THREE.Mesh(new THREE.BoxGeometry(1.45,.1,.35),new THREE.MeshStandardMaterial({color:'#fff5db',emissive:'#fff0cc',emissiveIntensity:1.6}));light.position.set(x,6.4,z);roof.add(light);
    }
  }
  // Every fixture keeps its recovered CAD footprint. Merchandise is added separately.
  function rack(b:Footprint){
    const {x,z,w,d}=b;
    for(const px of [x+.035,x+w-.035])for(const pz of [z+.04,z+d-.04]){
      box([.055,3.15,.065],[px,1.575,pz],'#2168ac',.6);
      box([.07,.05,.08],[px,.02,pz],'#6f818d',.7);
      for(let y=.35;y<3;y+=.3)box([.06,.035,.016],[px,y,pz-.037],'#263d53');
    }
    for(const y of [.2,1.12,2.12,2.98]){
      box([w-.07,.045,d-.08],[x+w/2,y,z+d/2],'#c0c8c9',.6);
      for(const px of [x+.03,x+w-.03])box([.055,.09,d],[px,y-.035,z+d/2],'#df963d',.4);
    }
    rod([x+.04,.3,z+.05],[x+.04,1.8,z+d-.05],.012,'#7d8f9b');
  }
  data.racks.forEach(rack);
  data.pallets.forEach(b=>{
    for(const dx of [.14,.6,1.06])for(const dz of [.14,1.06])box([.16,.13,.16],[b.x+dx,.065,b.z+dz],'#98724f');
    for(const offset of [.12,.54,1])box([b.w,.13,.12],[b.x+b.w/2,.13,b.z+offset],'#aa875e');
    for(let p=0;p<7;p++)box([b.w,.055,b.d/8],[b.x+b.w/2,.23,b.z+.07+p*(b.d-.14)/6],'#c4a178');
  });
  data.pods.forEach((b,i)=>{
    box([b.w,.8,b.d],[b.x+b.w/2,.4,b.z+b.d/2],'#f0ece1');
    box([b.w,.055,b.d],[b.x+b.w/2,.83,b.z+b.d/2],'#6b828d',.6);
    text('CATEGORY '+(i+1),[b.x+b.w/2,1.45,b.z+b.d/2],1.5,.2);
  });
  // Two rice-bin banks match the labelled strips in the lower-left of the plan.
  const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;
  const grainContext=grainCanvas.getContext('2d')!;grainContext.fillStyle='#c9ba89';grainContext.fillRect(0,0,128,128);
  for(let i=0;i<900;i++){
    grainContext.fillStyle=['#ebe0b8','#e1d3a4','#f2e8c9','#b9a775'][i%4];
    grainContext.fillRect((i*37)%128,(i*67)%128,3+(i%4),1.2);
  }
  const grainTexture=new THREE.CanvasTexture(grainCanvas);grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;grainTexture.repeat.set(2,2);grainTexture.colorSpace=THREE.SRGBColorSpace;
  const riceMaterial=mat('#c2ab70');riceMaterial.map=grainTexture;riceMaterial.bumpMap=grainTexture;riceMaterial.bumpScale=.004;riceMaterial.roughness=.98;
  for(const start of [35.3,41.4])for(let k=0;k<12;k++){
    const z=start+k*.36;
    box([.6,.8,.34],[6.15,.4,z],'#c6ccbf',.45);
    box([.5,.06,.29],[6.15,.83,z],'#c2ab70');
    box([.035,.24,.33],[6.47,.72,z],'#e0e8e6',.65);
    box([.06,.08,.14],[6.52,.63,z],'#3d5567');
  }
  // Layer D RACK: perimeter storage, kept outside the main circulation aisles.
  for(const run of WALL_STORAGE){
    box([run.w,.12,run.d],[run.x+run.w/2,.1,run.z+run.d/2],'#496f8f',.6);
    for(const y of [.55,1.25,1.95,2.65])box([run.w,.06,run.d],[run.x+run.w/2,y,run.z+run.d/2],'#c8d1d1',.5);
    for(let z=run.z;z<=run.z+run.d;z+=1.8)box([.055,2.9,.06],[run.x,1.45,z],'#2168ac',.6);
  }
  // Five distinct source-plan positions: four resolved INSERT blocks and the
  // exploded model-space checkout. The paired counters retain their mirrored sides.
  for(const counter of data.billingCounters){
    const {x,z,w,d,mirrored,number}=counter,cx=x+w/2;
    const deskZ=z+d*(mirrored?.29:.71),chairZ=z+d*(mirrored?.81:.19),front=mirrored?-1:1;
    const anchor=new THREE.Object3D();anchor.name='billing-counter-'+String(number).padStart(2,'0');
    anchor.position.set(cx,0,z+d/2);anchor.userData={sourceId:counter.id,footprint:{x,z,w,d},mirrored};root.add(anchor);
    box([w-.06,.9,d*.52],[cx,.45,deskZ],'#e4e7e4');
    box([w,.065,d*.55],[cx,.93,deskZ],'#4a5d69');
    box([w-.16,.45,.018],[cx,.5,deskZ+front*d*.264],'#1b65ac');
    const screenZ=deskZ+front*.06;
    box([.065,.3,.065],[cx-.24,1.12,screenZ],'#2d3b43');
    box([.5,.32,.045],[cx-.24,1.36,screenZ],'#23343d');
    box([.43,.25,.008],[cx-.24,1.36,screenZ-front*.025],'#6095ae');
    box([.43,.03,.15],[cx-.24,.99,deskZ-front*.16],'#364c59');
    box([.21,.14,.18],[cx+w*.32,1.02,deskZ],'#253b4a');
    box([.13,.1,.14],[cx+w*.15,1,deskZ-front*.15],'#1e3142');
    box([.43,.1,.39],[cx,.51,chairZ],'#435c70');
    box([.43,.48,.075],[cx,.8,chairZ-front*.16],'#435c70');
    rod([cx,.08,chairZ],[cx,.46,chairZ],.04,'#81939f');
    text('BILLING '+String(number).padStart(2,'0'),[cx,1.9,z+d/2],1.5,.19);
  }
  // Toilets and stairs are retained as source-plan service elements.
  for(let i=0;i<3;i++){
    const x=12.2+i*1.9;
    box([.1,2.8,1.8],[x,1.4,49],'#dbddd8');box([1.8,2.8,.1],[x+.9,1.4,49.9],'#dbddd8');
    box([1.8,.6,.1],[x+.9,2.5,48.1],'#dbddd8');box([.82,2.1,.08],[x+.9,1.05,48.08],'#5a7f91');
    box([.05,.12,.09],[x+1.18,1.04,48.02],'#c4cecf',.8);
    text('WC',[x+.9,1.65,48.02],.4,.15,'#ffffff');
  }
  for(let step=0;step<14;step++)box([.29,(step+1)*.155,1.05],[7.15+step*.29,(step+1)*.0775,47.1],'#b9c3c7');
  rod([7,1,46.56],[11.2,3.1,46.56],.035,'#68808c');
  for(let step=0;step<7;step++)box([.6,(step+1)*.15,.18],[31.4,(step+1)*.075,37.7+step*.18],'#b9c3c7');
  // Floor markings leave goods footprints untouched.
  for(const z of [30.1,33.95,45.5,48])box([24,.006,.045],[18,.012,z],'#d3ac50');
  text('RECEIVING',[25.5,.025,49],4,.45,'#edf4fb',true);
  text('DELIVERY',[30,.025,46.8],2.6,.35,'#edf4fb',true);
  text('RICE PALLETS',[16.8,.025,45.5],5,.4,'#edf4fb',true);
  text('RICE BINS',[6.1,2.1,39.8],1.8,.22);
  for(const pos of [[3.5,2.6,4.6],[3.5,2.6,31.1]])text('EXIT',pos,1,.27,'#397c65');
  const logo=new THREE.TextureLoader().load('./vestano-logo.png',invalidate);logo.colorSpace=THREE.SRGBColorSpace;
  const brand=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.41),new THREE.MeshBasicMaterial({map:logo,side:THREE.DoubleSide}));brand.position.set(24.8,3.3,49.8);root.add(brand);
  for(const [material,items] of batches){
    const geometry=mergeGeometries(items,false);items.forEach(g=>g.dispose());if(!geometry)throw new Error('Warehouse geometry batching failed.');
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  const stock=addSupermarketStock(root,createStockPlan(data));
  unit.dispose();
  const ambient=new THREE.HemisphereLight('#e3efff','#a6a28d',2.8);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0d4',3.1);sun.position.set(8,32,42);sun.target.position.set(17,0,25);sun.castShadow=true;sun.shadow.mapSize.setScalar(2048);
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:40,bottom:-40,near:1,far:100});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#d1e7ff',1.2);fill.position.set(36,12,4);scene.add(fill);
  return {roof,walls,wallMaterial,stock,update(walk:boolean,roofVisible:boolean){roof.visible=roofVisible;wallMaterial.opacity=walk?1:.2;wallMaterial.depthWrite=walk;ambient.intensity=walk?3.1:2.8;}};
}
