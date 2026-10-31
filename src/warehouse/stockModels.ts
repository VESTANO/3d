import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {STOCK_NAMES,STOCK_STYLES} from './stockPlan.ts';
import type {StockKind,StockPlacement,StockStyle} from './stockPlan';

const colors:Record<StockStyle,string>={rice:'#d8c39b',flour:'#d4b983',pulses:'#5c7962',oils:'#b89537',water:'#7fa8b8',groceries:'#ac6951',cleaning:'#6a869d',paper:'#eeeadd',chilli:'#ac392d',turmeric:'#d2a227',coriander:'#5c844f',cumin:'#9e7a49',pepper:'#555c4d','rice-flour':'#bfc5b3','gram-flour':'#c8aa55',semolina:'#c7af7e',sugar:'#869faa',salt:'#6d93ab',tea:'#41664d',coffee:'#705441',biscuits:'#bd8751',noodles:'#bd6b3c','detergent-powder':'#6c809d'};
interface Part{geometry:THREE.BufferGeometry;material:THREE.Material}
interface Template{parts:Part[];placements:StockPlacement[]}

/** Shared product meshes and an original generic-label atlas. No third-party brands,
 * product photographs, customer inventory or SKU/weight claims are fabricated. */
export function addSupermarketStock(root:THREE.Object3D,placements:StockPlacement[]){
  const group=new THREE.Group();group.name='supermarket-stock';root.add(group);
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  function material(color:string,metal=.02,rough=.52){
    const key=color+metal+rough;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough}));return materials.get(key)!;
  }
  const atlasRows=2**Math.ceil(Math.log2(Math.ceil(STOCK_STYLES.length/4)));
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=256*atlasRows;
  const ctx=atlas.getContext('2d')!;
  const order=STOCK_STYLES;
  order.forEach((style,i)=>{
    const x=i%4*256,y=Math.floor(i/4)*256;
    ctx.fillStyle='#f2eee4';ctx.fillRect(x,y,256,256);
    ctx.fillStyle=colors[style];ctx.fillRect(x,y,256,69);
    ctx.fillStyle='#fffdf3';ctx.font='600 17px Arial';ctx.textAlign='center';ctx.fillText('SUPERMARKET STOCK',x+128,y+43,240);
    ctx.fillStyle='#24383f';ctx.font='700 27px Arial';ctx.fillText(STOCK_NAMES[style],x+128,y+117,240);
    ctx.fillStyle=colors[style];ctx.fillRect(x+30,y+136,196,7);
    ctx.font='400 15px Arial';ctx.fillStyle='#6c736f';ctx.fillText('STORAGE & DISTRIBUTION',x+128,y+171,234);
    ctx.fillStyle='#2f393d';for(let bar=0;bar<33;bar++)ctx.fillRect(x+49+bar*4.8,y+189,bar%3===0?3:1.4,39-(bar%4)*2);
  });
  const atlasMap=new THREE.CanvasTexture(atlas);atlasMap.colorSpace=THREE.SRGBColorSpace;atlasMap.anisotropy=4;
  const labelMaterial=new THREE.MeshStandardMaterial({map:atlasMap,color:'#ffffff',roughness:.62});
  const templates=new Map<string,Template>();
  function tile(geometry:THREE.BufferGeometry,style:StockStyle){
    const index=order.indexOf(style),u=index%4/4,v=1-(Math.floor(index/4)+1)/atlasRows,uv=geometry.getAttribute('uv');
    for(let n=0;n<uv.count;n++)uv.setXY(n,u+uv.getX(n)/4,v+uv.getY(n)/atlasRows);return geometry;
  }
  function makeTemplate(kind:StockKind,style:StockStyle):Template{
    const parts:Part[]=[];
    function part(geometry:THREE.BufferGeometry,mat:THREE.Material,pos=[0,0,0],scale=[1,1,1],rotateY=0){
      geometry.scale(...scale as [number,number,number]);geometry.rotateY(rotateY);geometry.translate(...pos as [number,number,number]);parts.push({geometry,material:mat});
    }
    function box(size:number[],pos:number[],mat:THREE.Material){part(new THREE.BoxGeometry(...size as [number,number,number]),mat,pos);}
    function labelFaces(halfX:number,halfZ:number,y:number,w:number,h:number){
      for(const side of [-1,1]){
        part(tile(new THREE.PlaneGeometry(w,h),style),labelMaterial,[side*halfX,y,0],[1,1,1],side*Math.PI/2);
        part(tile(new THREE.PlaneGeometry(w,h),style),labelMaterial,[0,y,side*halfZ],[1,1,1],side<0?Math.PI:0);
      }
    }
    const body=material(colors[style],.02,kind==='sack'?.95:.48);
    const seam=material('#aa9068',.01,.9),white=material('#eaece7',.02,.62),cap=material(style==='oils'?'#486d4c':'#345e78',.08,.4);
    if(kind==='case'){
      part(new RoundedBoxGeometry(.98,.96,.98,1,.018),material('#b49972',.01,.88),[0,.48,0]);
      box([.09,.01,.985],[0,.965,0],seam);box([.987,.01,.045],[0,.966,0],seam);
      labelFaces(.492,.492,.49,.72,.54);
    }else if(kind==='sack'){
      part(new RoundedBoxGeometry(.94,.88,.87,1,.14),body,[0,.44,0]);
      box([.76,.055,.065],[0,.916,0],seam);box([.73,.035,.05],[0,.019,0],seam);
      labelFaces(.468,.435,.47,.56,.4);
    }else if(kind==='packet'){
      part(new RoundedBoxGeometry(.9,.89,.82,1,.075),body,[0,.465,0]);
      box([.9,.045,.07],[0,.946,0],material('#e0cba4',.1,.43));box([.9,.04,.07],[0,.03,0],body);
      labelFaces(.451,.411,.48,.68,.58);
    }else if(kind==='tin'){
      part(new THREE.CylinderGeometry(.47,.47,.89,20),material('#a8b0a8',.78,.35),[0,.455,0]);
      part(tile(new THREE.CylinderGeometry(.473,.473,.57,24,1,true),style),labelMaterial,[0,.45,0]);
      for(const y of [.025,.89]){const rim=new THREE.TorusGeometry(.455,.025,4,16);rim.rotateX(Math.PI/2);part(rim,material('#c2c9c4',.8,.28),[0,y,0]);}
    }else if(kind==='paper-roll'){
      part(new THREE.CylinderGeometry(.47,.47,.92,24,1,true),white,[0,.46,0]);
      const top=new THREE.RingGeometry(.14,.47,24);top.rotateX(-Math.PI/2);part(top,white,[0,.922,0]);
      const core=new THREE.CylinderGeometry(.14,.14,.91,16,1,true);core.scale(-1,1,1);part(core,seam,[0,.46,0]);
      part(tile(new THREE.CylinderGeometry(.474,.474,.24,24,1,true),style),labelMaterial,[0,.41,0]);
    }else{
      const detergent=kind==='detergent',oil=kind==='oil-bottle';
      if(detergent){
        part(new RoundedBoxGeometry(.85,.69,.76,1,.13),body,[0,.345,0]);
        part(new THREE.CylinderGeometry(.14,.18,.2,16),body,[-.2,.77,0]);
        part(new THREE.CylinderGeometry(.15,.15,.1,16),cap,[-.2,.92,0]);
        const handle=new THREE.TorusGeometry(.19,.045,7,20);part(handle,body,[.255,.72,0]);
        labelFaces(.424,.381,.36,.58,.39);
      }else{
        const profile=[new THREE.Vector2(.28,0),new THREE.Vector2(.4,.045),new THREE.Vector2(.4,.58),new THREE.Vector2(.35,.7),new THREE.Vector2(.16,.83),new THREE.Vector2(.14,.91)];
        part(new THREE.LatheGeometry(profile,16),oil?material('#b99b42',.05,.28):material('#83adbb',.03,.23));
        part(new THREE.CylinderGeometry(.16,.16,.085,16),cap,[0,.953,0]);
        part(tile(new THREE.CylinderGeometry(.404,.404,.27,24,1,true),style),labelMaterial,[0,.39,0]);
        if(!oil)for(const y of [.14,.38,.64]){const ring=new THREE.TorusGeometry(.4,.012,3,12);ring.rotateX(Math.PI/2);part(ring,material('#7fa8b5',.04,.26),[0,y,0]);}
      }
    }
    // RoundedBoxGeometry is non-indexed; normalise all parts before merging.
    const byMaterial=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const p of parts){const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry;const list=byMaterial.get(p.material)??[];list.push(g);byMaterial.set(p.material,list);if(g!==p.geometry)p.geometry.dispose();}
    const merged:Part[]=[];
    for(const [mat,list]of byMaterial){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(!geometry)throw new Error('Stock geometry merge failed.');merged.push({geometry,material:mat});}
    return {parts:merged,placements:[]};
  }
  for(const placement of placements){const key=placement.kind+':'+placement.style;if(!templates.has(key))templates.set(key,makeTemplate(placement.kind,placement.style));templates.get(key)!.placements.push(placement);}
  const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
  for(const [key,template]of templates)for(const p of template.parts){
    const mesh=new THREE.InstancedMesh(p.geometry,p.material,template.placements.length);mesh.name='stock:'+key;
    template.placements.forEach((item,i)=>{position.set(item.x+item.w/2,item.bottom,item.z+item.d/2);scale.set(item.w,item.h,item.d);matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  group.userData.stockCount=placements.length;group.userData.categories=STOCK_STYLES.map(style=>STOCK_NAMES[style]);
  return group;
}
