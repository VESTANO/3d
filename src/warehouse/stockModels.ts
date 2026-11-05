import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {STOCK_NAMES,STOCK_STYLES} from './stockPlan.ts';
import {createPackagingAtlas,PACKAGING_KEYS,PACKAGING_ATLAS_ROWS} from './stockPackaging.ts';
import type {PackagingKey} from './stockPackaging';
import type {StockKind,StockPlacement,StockStyle,RiceVariety} from './stockPlan';

const colors:Record<StockStyle,string>={rice:'#d8c39b',flour:'#d4b983',pulses:'#6d8b4f',oils:'#d3ac40',water:'#7fa8b8',groceries:'#b49a74',cleaning:'#6a869d',paper:'#eeeadd',chilli:'#b83e2e',turmeric:'#d9a526',coriander:'#67934d',cumin:'#a17b48',pepper:'#555c4d','rice-flour':'#dedbc3','gram-flour':'#c8aa55',semolina:'#c7af7e',sugar:'#91b7bf',salt:'#72a1b8',tea:'#41664d',coffee:'#705441',biscuits:'#bd8751',noodles:'#bd6b3c','detergent-powder':'#6c809d','puttu-powder':'#35927a','appam-powder':'#679ca3','idiyappam-powder':'#d8b364','coconut-oil':'#e1cf93','banana-chips':'#e8b847',papad:'#e7cf89',jaggery:'#97623c',sambar:'#b86031','garam-masala':'#7c573a',chickpeas:'#bd9957','green-gram':'#5b7c3b','toor-dal':'#d5b348',pickles:'#8e4a29','coconut-milk':'#709a82',rusk:'#a57745',mixture:'#cf7933','dishwash-bar':'#58a695'};
const riceBody:Record<RiceVariety,string>={matta:'#c9aa78',jaya:'#e0d7bc',ponni:'#eae7dc',kaima:'#c0d1b8'};
type Role='body'|'fixed'|'label';
interface Part{geometry:THREE.BufferGeometry;material:THREE.Material;role:Role}
interface Template{parts:Part[];placements:StockPlacement[]}

/** Photographic Kerala grocery packaging. Products share meshes by package shape;
 * label tiles and body colours vary per instance, keeping mobile draw calls low. */
export function addSupermarketStock(root:THREE.Object3D,placements:StockPlacement[],invalidate:()=>void=()=>{}){
  const group=new THREE.Group();group.name='supermarket-stock';root.add(group);
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  function material(color:string,metal=.02,rough=.52,map?:THREE.Texture){
    const key=color+metal+rough+(map?.uuid??'');
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,map:map??null}));
    return materials.get(key)!;
  }
  const labelKeys=PACKAGING_KEYS,atlasRows=PACKAGING_ATLAS_ROWS;
  const {texture:atlasMap,state:packaging}=createPackagingAtlas(invalidate);
  const labelMaterial=new THREE.MeshStandardMaterial({map:atlasMap,color:'#ffffff',roughness:.62});
  labelMaterial.userData.stockLabelAtlas=true;
  labelMaterial.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 stockTile;');
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mix(vec2(0.0078125), vec2(0.9921875), vMapUv) + stockTile) / vec2(4.0, ${atlasRows.toFixed(1)});\n#endif`);
  };
  labelMaterial.customProgramCacheKey=()=>`kerala-photo-packaging-v1-${atlasRows}`;
  const weave=document.createElement('canvas');weave.width=weave.height=128;const weaveContext=weave.getContext('2d')!;
  weaveContext.fillStyle='#e4e0d5';weaveContext.fillRect(0,0,128,128);
  for(let n=0;n<128;n+=4){weaveContext.fillStyle='#faf7ef';weaveContext.fillRect(n,0,1,128);weaveContext.fillStyle='#bdb8aa';weaveContext.fillRect(0,n,128,1);}
  const cloth=new THREE.CanvasTexture(weave);cloth.colorSpace=THREE.SRGBColorSpace;cloth.wrapS=cloth.wrapT=THREE.RepeatWrapping;cloth.repeat.set(4,4);
  const templates=new Map<StockKind,Template>();
  function makeTemplate(kind:StockKind):Template{
    const parts:Part[]=[];
    function part(geometry:THREE.BufferGeometry,mat:THREE.Material,pos=[0,0,0],scale=[1,1,1],rotateY=0,role:Role='fixed'){
      geometry.scale(...scale as [number,number,number]);geometry.rotateY(rotateY);geometry.translate(...pos as [number,number,number]);parts.push({geometry,material:mat,role});
    }
    function box(size:number[],pos:number[],mat:THREE.Material,role:Role='fixed'){part(new THREE.BoxGeometry(...size as [number,number,number]),mat,pos,[1,1,1],0,role);}
    function labelFaces(halfX:number,halfZ:number,y:number,w:number,h:number){
      for(const side of [-1,1]){
        part(new THREE.PlaneGeometry(w,h),labelMaterial,[side*halfX,y,0],[1,1,1],side*Math.PI/2,'label');
        part(new THREE.PlaneGeometry(w,h),labelMaterial,[0,y,side*halfZ],[1,1,1],side<0?Math.PI:0,'label');
      }
    }
    function wrappedLabel(radius:number,height:number,y:number){
      // Repeat complete labels so names and food pictures stay together from
      // either aisle, instead of stretching one image around the whole bottle.
      for(let side=0;side<3;side++)part(new THREE.CylinderGeometry(radius,radius,height,12,1,true,side*Math.PI*2/3,Math.PI*2/3),labelMaterial,[0,y,0],[1,1,1],0,'label');
    }
    const body=material('#ffffff',kind==='tin'?.65:.02,kind==='sack'?.95:kind==='case'?.88:.48,kind==='sack'?cloth:undefined);
    const seam=material('#aa9068',.01,.9),white=material('#eaece7',.02,.62),cap=material(kind==='oil-bottle'?'#426d48':kind==='jar'?'#9c3c2e':'#345e78',.08,.4);
    if(kind==='case'){
      part(new RoundedBoxGeometry(.98,.96,.98,1,.018),body,[0,.48,0],[1,1,1],0,'body');
      box([.09,.01,.985],[0,.965,0],seam);box([.987,.01,.045],[0,.966,0],seam);labelFaces(.492,.492,.49,.72,.54);
    }else if(kind==='sack'){
      part(new RoundedBoxGeometry(.94,.98,.87,1,.14),body,[0,.49,0],[1,1,1],0,'body');
      box([.76,.035,.025],[0,.82,.43],seam);box([.73,.035,.025],[0,.15,-.43],seam);labelFaces(.471,.438,.48,.78,.7);
      const top=new THREE.PlaneGeometry(.82,.68);top.rotateX(-Math.PI/2);part(top,labelMaterial,[0,.986,0],[1,1,1],0,'label');
    }else if(kind==='packet'){
      part(new RoundedBoxGeometry(.9,.89,.82,1,.075),body,[0,.465,0],[1,1,1],0,'body');
      box([.9,.045,.07],[0,.946,0],material('#e0cba4',.1,.43));box([.9,.04,.07],[0,.03,0],body,'body');labelFaces(.452,.412,.48,.86,.82);
    }else if(kind==='tin'){
      part(new THREE.CylinderGeometry(.47,.47,.89,20),body,[0,.455,0],[1,1,1],0,'body');
      wrappedLabel(.473,.68,.45);
      for(const y of [.025,.89]){const rim=new THREE.TorusGeometry(.455,.025,4,16);rim.rotateX(Math.PI/2);part(rim,material('#c2c9c4',.8,.28),[0,y,0]);}
    }else if(kind==='jar'){
      part(new THREE.CylinderGeometry(.43,.43,.75,20),body,[0,.4,0],[1,1,1],0,'body');
      part(new THREE.CylinderGeometry(.35,.43,.12,20),body,[0,.825,0],[1,1,1],0,'body');
      part(new THREE.CylinderGeometry(.46,.46,.1,20),cap,[0,.93,0]);
      wrappedLabel(.435,.58,.4);
    }else if(kind==='paper-roll'){
      part(new THREE.CylinderGeometry(.47,.47,.92,24,1,true),body,[0,.46,0],[1,1,1],0,'body');
      const top=new THREE.RingGeometry(.14,.47,24);top.rotateX(-Math.PI/2);part(top,white,[0,.922,0]);
      const core=new THREE.CylinderGeometry(.14,.14,.91,16,1,true);core.scale(-1,1,1);part(core,seam,[0,.46,0]);
      wrappedLabel(.474,.56,.46);
    }else if(kind==='detergent'){
      part(new RoundedBoxGeometry(.85,.69,.76,1,.13),body,[0,.345,0],[1,1,1],0,'body');
      part(new THREE.CylinderGeometry(.14,.18,.2,16),body,[-.2,.77,0],[1,1,1],0,'body');part(new THREE.CylinderGeometry(.15,.15,.1,16),cap,[-.2,.92,0]);
      part(new THREE.TorusGeometry(.19,.045,7,20),body,[.255,.72,0],[1,1,1],0,'body');labelFaces(.424,.381,.36,.58,.39);
    }else{
      const profile=[new THREE.Vector2(.28,0),new THREE.Vector2(.4,.045),new THREE.Vector2(.4,.58),new THREE.Vector2(.35,.7),new THREE.Vector2(.16,.83),new THREE.Vector2(.14,.91)];
      part(new THREE.LatheGeometry(profile,16),body,[0,0,0],[1,1,1],0,'body');part(new THREE.CylinderGeometry(.16,.16,.085,16),cap,[0,.953,0]);
      wrappedLabel(.404,.48,.36);
      if(kind==='water-bottle')for(const y of [.14,.38,.64]){const ring=new THREE.TorusGeometry(.4,.012,3,12);ring.rotateX(Math.PI/2);part(ring,material('#7fa8b5',.04,.26),[0,y,0]);}
    }
    const batches=new Map<string,{material:THREE.Material;role:Role;geometries:THREE.BufferGeometry[]}>();
    for(const p of parts){
      const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry,key=p.role+':'+p.material.uuid;
      const batch=batches.get(key)??{material:p.material,role:p.role,geometries:[]};batch.geometries.push(g);batches.set(key,batch);if(g!==p.geometry)p.geometry.dispose();
    }
    const merged:Part[]=[];
    for(const batch of batches.values()){
      const geometry=mergeGeometries(batch.geometries,false);batch.geometries.forEach(g=>g.dispose());if(!geometry)throw new Error('Stock geometry merge failed.');
      merged.push({geometry,material:batch.material,role:batch.role});
    }
    return {parts:merged,placements:[]};
  }
  for(const placement of placements){if(!templates.has(placement.kind))templates.set(placement.kind,makeTemplate(placement.kind));templates.get(placement.kind)!.placements.push(placement);}
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion(),tint=new THREE.Color();
  const labelFor=(item:StockPlacement):PackagingKey=>item.riceVariety?`variety:${item.riceVariety}`:item.style;
  for(const [kind,template]of templates)for(const p of template.parts){
    const mesh=new THREE.InstancedMesh(p.geometry,p.material,template.placements.length);mesh.name=`stock:${kind}:${p.role}`;
    const tiles=p.role==='label'?new Float32Array(template.placements.length*2):null;
    template.placements.forEach((item,i)=>{
      position.set(item.x+item.w/2,item.bottom,item.z+item.d/2);scale.set(item.w,item.h,item.d);rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,item.rotation??0);matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);
      if(p.role==='body')mesh.setColorAt(i,tint.set(item.riceVariety?riceBody[item.riceVariety]:colors[item.style]));
      if(tiles){const tile=labelKeys.indexOf(labelFor(item));tiles[i*2]=tile%4;tiles[i*2+1]=atlasRows-1-Math.floor(tile/4);}
    });
    if(tiles)p.geometry.setAttribute('stockTile',new THREE.InstancedBufferAttribute(tiles,2));
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.castShadow=p.role!=='label';mesh.receiveShadow=true;group.add(mesh);
  }
  group.userData.stockCount=placements.length;group.userData.categories=STOCK_STYLES.map(style=>STOCK_NAMES[style]);group.userData.labelKeys=labelKeys;group.userData.atlasRows=atlasRows;group.userData.packaging=packaging;
  return group;
}
