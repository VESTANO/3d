import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CITY_X,CITY_Z,ROAD,BLOCKS,BUILDINGS,COAST,LIMITS} from './city.js';
import {positionOf,currentCar,lerpAngle,clamp,goalOf} from './game.js';

const PI=Math.PI, TAU=PI*2;
const texture=canvas=>{const out=new THREE.CanvasTexture(canvas);out.colorSpace=THREE.SRGBColorSpace;out.anisotropy=4;return out;};
const ink=(color)=>new THREE.MeshBasicMaterial({color});
const lambert=(color)=>new THREE.MeshLambertMaterial({color});
const add=(parent,shape,material,x,y,z)=>{const mesh=new THREE.Mesh(shape,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};

// Batch the city blocks, windows, stripes and street furniture into a small
// number of draw calls. Lot bounds are the same ones the simulation collides with.
function cityMeshes(scene){
  const patterns=new Map(),box=new THREE.BoxGeometry(1,1,1),trunk=new THREE.CylinderGeometry(.41,.57,1,6),globe=new THREE.IcosahedronGeometry(.5,0);
  const frondPoints=[];
  for(let i=0;i<8;i++){
    const a=i/8,b=(i+1)/8,f=t=>[Math.sin(t*2.5)*.4,1.8*Math.sin(t*2.25)-1.4*t,4.5*t];
    const p=f(a),q=f(b),w=.52*Math.sin(PI*b)**.55,ww=.52*Math.sin(PI*a)**.55;
    for(const s of [-1,1])frondPoints.push(...p,p[0]+s*ww,p[1]-.18*ww,p[2],q[0]+s*w,q[1]-.18*w,q[2],...p,q[0]+s*w,q[1]-.18*w,q[2],...q);
  }
  const frond=new THREE.BufferGeometry();frond.setAttribute('position',new THREE.Float32BufferAttribute(frondPoints,3));frond.computeVertexNormals();
  const vec=new THREE.Vector3(),scale=new THREE.Vector3(),rot=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4();
  function shape(geo,name,x,y,z,w,h,d,color,yaw=0,q){
    const key=name+geo.id;const batch=patterns.get(key)??{geo,name,data:[]};patterns.set(key,batch);
    vec.set(x,y,z);scale.set(w,h,d);rot.setFromAxisAngle(axis,yaw);matrix.compose(vec,q??rot,scale);
    batch.data.push([matrix.clone(),color]);
  }
  const solid=(x,y,z,w,h,d,color,yaw=0)=>shape(box,'solid',x,y,z,w,h,d,color,yaw);
  const glow=(x,y,z,w,h,d,color,yaw=0)=>shape(box,'glow',x,y,z,w,h,d,color,yaw);
  const mark=(x,z,w,d,color,yaw=0)=>shape(box,'paint',x,.023,z,w,.01,d,color,yaw);
  let seed=8702;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  solid((LIMITS.left+COAST)/2,-1,-1,COAST-LIMITS.left+3,2,446,'#726974');
  solid(147,.03,3,12,.06,436,'#eed4a2');
  solid(135,.07,3,12,.15,436,'#caaab4');
  solid(139,.19,3,.42,.28,435,'#f9cbb5');
  for(const x of CITY_X){
    solid(x,.006,4,ROAD*2,.021,433,'#3e3949');
    for(let z=-200;z<212;z+=9)mark(x,z,.15,4.1,'#e9b164');
    for(const side of [-1,1]) mark(x+side*(ROAD-.55),4,.12,425,'#b6a8a9');
  }
  for(const z of CITY_Z){
    solid(-4,.008,z,300,.023,ROAD*2,'#413b4d');
    for(let x=-149;x<143;x+=8.5)if(CITY_X.every(cx=>Math.abs(x-cx)>ROAD+2))mark(x,z,4,.13,'#e9b164');
    for(const x of CITY_X){
      // Erase the centre dashes in junctions, then add four striped crossings.
      solid(x,.019,z,16,.012,16,'#413b4d');
      for(let i=-3;i<=3;i++)for(const s of [-1,1]){
        shape(box,'paint',x+i*1.35,.032,z+s*6.7,.63,.008,1.75,'#dbced0');
        shape(box,'paint',x+s*6.7,.032,z+i*1.35,1.75,.008,.63,'#dbced0');
      }
    }
  }

  function palm(x,z,height){
    const bend=(rand()-.5)*1.6,ax=(rand()-.5)*1.6;
    for(let i=0;i<6;i++){
      const a=new THREE.Vector3(x+ax*(i/6)**2,height*i/6,z+bend*(i/6)**2),k=(i+1)/6;
      const b=new THREE.Vector3(x+ax*k*k,height*k,z+bend*k*k),mid=a.clone().add(b).multiplyScalar(.5);
      const q=new THREE.Quaternion().setFromUnitVectors(axis,b.clone().sub(a).normalize());
      shape(trunk,'solid',mid.x,mid.y,mid.z,.52-i*.033,b.distanceTo(a)+.12,.52-i*.033,i%2?'#826349':'#987658',0,q);
    }
    const phi=rand()*TAU;
    for(let i=0;i<8;i++){const s=.66+rand()*.33;shape(frond,'leaf',x+ax,height,z+bend,s,.7+rand()*.23,s, i%2?'#3f6762':'#436d4b',phi+i*TAU/8);}
  }
  function streetlight(x,z,side){
    solid(x,2.55,z,.14,5.1,.14,'#665767');solid(x+side*.58,5.0,z,1.2,.12,.14,'#6d5f76');
    glow(x+side*1.08,4.91,z,.44,.09,.32,'#ffd49b');
    shape(globe,'solid',x,.48,z,.38,.96,.38,'#887783');
  }
  for(const block of BLOCKS){
    const {x,z,w,d,park}=block;
    solid(x+w/2,.079,z+d/2,w,.14,d,park?'#749079':'#c7acb1');
    for(const xx of [x+.14,x+w-.14])solid(xx,.138,z+d/2,.24,.11,d,'#ddd0ca');
    for(const zz of [z+.13,z+d-.13])solid(x+w/2,.14,zz,w,.11,.24,'#d9c5bf');
    for(let k=0;k<3;k++){
      const zz=z+5+k*(d-10)/2;
      palm(x+1.9,zz,6.4+rand()*3.1);if(park||block.x>55)palm(x+w-2.1,zz,6.5+rand()*3.5);
      if(k===0||k===2)streetlight(x+w-1.4,zz,1);
    }
    if(park){
      solid(x+w/2,.17,z+d/2,2.3,.06,d-1,'#d6ad9d');solid(x+w/2,.17,z+d/2,w-1,.06,2.3,'#d6ad9d');
      for(const [dx,dz] of [[8,8],[w-8,8],[8,d-8],[w-8,d-8]]){
        solid(x+dx,.26,z+dz,4,.48,3.8,'#b5a2a6');solid(x+dx,.515,z+dz,3.6,.04,3.4,'#59775d');
        shape(globe,'leaf',x+dx,1.12,z+dz,2.2,2.4,2.1,'#548d70');
      }
    }
  }
  for(let z=-190;z<215;z+=10.7){
    palm(137+rand()*1.6,z,8+rand()*4);if(Math.floor(z)%3===0)streetlight(132,z,-1);
    if(z>-75&&z<154&&Math.floor(z/10)%3===0){
      solid(145,.08,z,3.2,.14,.08,'#a2939d');
      shape(trunk,'solid',145,1.15,z,.09,2.3,.09,'#f5c8c4');
      shape(globe,'solid',145,2.24,z,4,.58,4,rand()>.5?'#e8689d':'#e88665');
    }
  }
  for(let z=-43;z>-182;z-=20){
    solid(-150,.05,z,8,.16,6.2,'#9c7d76');solid(-154,.28,z-3,3.8,.48,.32,'#b89a7b');
    for(let i=0;i<3;i++)solid(-151+i*2,.53,z+2,.22,1,.22,'#94706d');
  }
  const glass=['#3c405c','#475779','#605877','#665377','#425d66'];
  const neon=['#ff74ca','#9dfbee','#ffbb8c'];
  for(const b of BUILDINGS){
    const {x,z,w,d,h,deco,style}=b,cx=x+w/2,cz=z+d/2,trim=style===1?'#e8f1f5':'#ffdacb';
    solid(cx,h/2+.16,cz,w,h,d,b.color);
    solid(cx,.51,cz,w+.11,.8,d+.12,'#927580');
    solid(cx,h+.26,cz,w+.38,.31,d+.38,trim);
    solid(cx,h+.46,cz,w-.45,.15,d-.45,'#756779');
    for(const y of deco?[2.8,h*.66,h-.75]:[2.7,h-.83]){
      solid(cx,y,cz,w+.3,.22,d+.31,trim);
      if(deco){glow(cx,y+.13,z-.19,w+.3,.075,.065,neon[style]);glow(x+w+.19,y+.13,cz,.065,.075,d+.29,neon[style]);}
    }
    if(deco){
      solid(cx,h+.8,cz,w*.48,1.06,d*.6,b.color);solid(cx,h+1.35,cz,w*.49,.13,d*.62,trim);
      solid(cx,h+1.6,cz,w*.29,.43,d*.42,b.color);
      for(const dx of [-w*.42,-w*.21,w*.21,w*.42])solid(cx+dx,h*.51,z-.11,.24,h-.125,.16,trim);
    }else{solid(cx+1,h+.9,cz-1,w*.43,1.4,d*.45,'#7e789a');}
    const front=4+(style%2),side=5,levels=Math.floor((h-.8)/2.55);
    for(let story=1;story<=levels;story++){
      const y=.3+story*2.32;
      for(const [count,len,depth,south] of [[front,w,z-.04,true],[front,w,z+d+.04,true],[side,d,x-.039,false],[side,d,x+w+.039,false]]){
        for(let n=0;n<count;n++){
          const along=(n+.5)*len/count,lit=rand()<.16,c=glass[(n+story+style)%glass.length],span=len/count*.66;
          const wx=south?x+along:depth,wz=south?depth:z+along;
          solid(wx,y,wz,south?span:.09,1.24,south?.09:span,c);
          const off=(south?(depth<z):(depth<x))?-.062:.062;
          if(lit)glow(wx+(south?0:off),y,wz+(south?off:0),south?span*.82:.035,.91,south?.035:span*.82,story%2?'#ffc58c':'#cca2c0');
          else solid(wx+(south?0:off),y-.3,wz+(south?off:0),south?span:.055,.08,south?.055:span,'#a29ab4');
        }
      }
    }
    solid(cx,1.14,z-.055,w*.34,2.1,.12,'#4a3e57');
    solid(cx,2.38,z-.54,w*.43,.16,1.3,trim);
    if(!b.sign)continue;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;const c=canvas.getContext('2d');
    if(!c)continue;
    c.fillStyle='#281831';c.fillRect(0,0,512,112);c.strokeStyle=neon[style];c.lineWidth=4;c.strokeRect(4,4,504,104);
    c.font='bold 55px Arial';c.textAlign='center';c.textBaseline='middle';c.shadowBlur=14;c.shadowColor=neon[style];c.fillStyle=neon[style];c.fillText(b.sign,256,59,474);
    const mat=new THREE.MeshBasicMaterial({map:texture(canvas),side:THREE.DoubleSide});
    add(scene,new THREE.PlaneGeometry(8,1.75),mat,cx,3.3,z-.21);
    add(scene,new THREE.PlaneGeometry(8,1.75),mat,x+w+.21,3.3,cz).rotation.y=PI/2;
  }
  // Distant skyline and the strip of coastal road visible beyond the play area.
  for(let i=0;i<32;i++){
    const x=-245+i*15,z=-235-rand()*87,h=11+rand()*44;
    solid(x,h/2,z,8+rand()*11,h,9+rand()*17,['#8b719d','#b37ea1','#8d789c','#99788e'][i%4]);
    if(i%3===0)solid(x,h+1.4,z,4,2.8,6,'#93738c');
  }
  for(const batch of patterns.values()){
    const mat=batch.name==='glow'?ink('#ffffff'):lambert('#ffffff');
    if(batch.name==='leaf')mat.side=THREE.DoubleSide;
    const mesh=new THREE.InstancedMesh(batch.geo,mat,batch.data.length),shade=new THREE.Color();
    batch.data.forEach(([m,c],i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,shade.set(c));});mesh.computeBoundingSphere();scene.add(mesh);
  }
}

function environment(scene){
  const look=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{dark:{value:0}},
    vertexShader:`varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 v; uniform float dark;
void main(){vec3 d=normalize(v);float y=max(d.y,0.);vec3 col=mix(vec3(1.,.56,.38),vec3(.30,.09,.31),smoothstep(0.,.69,y));
col=mix(col,vec3(.94,.29,.46),exp(-abs(y-.22)*13.)*.35);float sun=dot(d,normalize(vec3(.28,.115,-.95)));
col+=vec3(.55,.19,.055)*pow(max(0.,sun),19.);col=mix(col,vec3(1.,.83,.55),smoothstep(.9961,.9967,sun));
float streak=sin(d.x*15.+d.z*9.+sin(d.y*22.)*2.7+sin(d.x*41.))*.5+.5;col=mix(col,vec3(1.,.42,.41),pow(streak,8.)*smoothstep(.09,.2,y)*(1.-smoothstep(.20,.44,y))*.27);
col=mix(col,col*vec3(.39,.35,.63),dark);gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  const sky=add(scene,new THREE.SphereGeometry(750,32,20),look,0,0,0);sky.frustumCulled=false;sky.renderOrder=-100;
  const water=new THREE.ShaderMaterial({uniforms:{time:{value:0},dark:look.uniforms.dark},
    vertexShader:`varying vec2 v; void main(){vec4 p=modelMatrix*vec4(position,1.);v=p.xz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`varying vec2 v;uniform float time;uniform float dark;
void main(){float r=sin(v.x*.19+v.y*.12+time*1.5)+sin(v.x*.54-v.y*.23-time*.72)*.57+sin(v.y*.63+time*.5)*.36;
float ripples=smoothstep(.5,1.6,r);float sand=exp(-abs(v.x-151.)*.13);vec3 teal=mix(vec3(.115,.31,.40),vec3(.28,.49,.52),ripples*.7+sand*.24);
float stripe=pow(max(0.,sin(v.y*.32+sin(v.x*.07+time*.49)*3.)),13.);float glow=exp(-abs(v.y-(v.x-151.)*.36+60.)*.009);
teal+=vec3(.31,.15,.10)*stripe*glow;float foam=sin((v.x-151.)*1.35+sin(v.y*.19)*.4+time*.8)*.5+.5;
teal=mix(teal,vec3(.78,.73,.65),pow(foam,15.)*sand*.48);gl_FragColor=vec4(teal*(1.-dark*.4),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
  const sea=add(scene,new THREE.PlaneGeometry(1600,1000),water,98,-.065,-40);sea.rotation.x=-PI/2;
  return {sky,look,water};
}

function wedge(width,depth,height,topWidth,topDepth,offset=0){
  const p=[[-width/2,0,-depth/2],[width/2,0,-depth/2],[width/2,0,depth/2],[-width/2,0,depth/2],[-topWidth/2,height,offset-topDepth/2],[topWidth/2,height,offset-topDepth/2],[topWidth/2,height,offset+topDepth/2],[-topWidth/2,height,offset+topDepth/2]];
  const f=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(f.flatMap(i=>p[i]),3));geo.computeVertexNormals();return geo;
}
function actors(scene){
  const tyre=lambert('#24212d'),dark=lambert('#382c42'),glass=lambert('#454660'),metal=lambert('#ae9caa'),white=ink('#ffe8ad'),red=ink('#ff365d');
  const wheelGeometry=new THREE.CylinderGeometry(.37,.37,.34,12),rimGeometry=new THREE.CylinderGeometry(.216,.216,.355,10),bodyGeometry=wedge(2.2,4.55,.55,2.03,4.18),cabin=wedge(1.95,2.22,.65,1.6,1.25,-.13);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const ctx=shadowCanvas.getContext('2d');
  const shadow=ctx.createRadialGradient(32,32,3,32,32,31);shadow.addColorStop(0,'#1a1224c6');shadow.addColorStop(1,'#1a122400');ctx.fillStyle=shadow;ctx.fillRect(0,0,64,64);
  const shadowMat=new THREE.MeshBasicMaterial({map:texture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function car(color,patrol=false){
    const root=new THREE.Group(),shell=new THREE.Group();scene.add(root);root.add(shell);
    const shadowPlane=add(root,new THREE.PlaneGeometry(3.7,6),shadowMat,0,.033,0);shadowPlane.rotation.x=-PI/2;
    const paint=new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.18});
    add(shell,bodyGeometry,paint,0,.33,0);add(shell,cabin,glass,0,.87,-.2);
    add(shell,new THREE.BoxGeometry(1.65,.084,1.28),paint,0,1.52,-.32);
    add(shell,new THREE.BoxGeometry(2.2,.22,4.1),dark,0,.31,0);
    for(const side of [-1,1]){
      const rear=add(shell,new THREE.BoxGeometry(.87,.14,.08),red,side*.56,.7,-2.213);
      const head=add(shell,new THREE.BoxGeometry(.65,.18,.07),white,side*.66,.69,2.15);
      rear.rotation.y=side*.05;head.rotation.y=-side*.06;
      add(shell,new THREE.BoxGeometry(.12,.095,.25),metal,side*1.03,.96,.59);
      add(shell,new THREE.BoxGeometry(.045,.62,.07),paint,side*.884,1.18,-.43);
    }
    add(shell,new THREE.BoxGeometry(1.98,.12,.11),metal,0,.38,-2.255);
    add(shell,new THREE.BoxGeometry(1.15,.13,.11),dark,0,.52,2.236);
    add(shell,new THREE.BoxGeometry(.42,.17,.035),white,0,.55,-2.252);
    for(let i=0;i<3;i++)add(shell,new THREE.BoxGeometry(1.46,.075,.12),dark,0,.925+i*.11,-1.31+i*.14);
    const wheels=[];
    for(const x of [-1,1])for(const z of [-1.43,1.42]){
      const wheel=new THREE.Group();wheel.position.set(x*1.03,.37,z);shell.add(wheel);
      add(wheel,wheelGeometry,tyre,0,0,0).rotation.z=PI/2;add(wheel,rimGeometry,metal,0,0,0).rotation.z=PI/2;
      add(wheel,new THREE.BoxGeometry(.366,.05,.3),dark,0,0,0);wheels.push(wheel);
    }
    // Collapse rigid body parts by material. Keep steering-independent wheels
    // and blinking patrol lights separate from the body.
    const parts=new Map();
    for(const child of [...shell.children]){
      if(!child.isMesh)continue;
      child.updateMatrix();const list=parts.get(child.material)??[];parts.set(child.material,list);
      const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
      // The custom tapered panels have no UVs; their paint is solid.
      geo.deleteAttribute('uv');geo.applyMatrix4(child.matrix);list.push(geo);shell.remove(child);
      if(child.geometry!==bodyGeometry&&child.geometry!==cabin)child.geometry.dispose();
    }
    for(const [mat,list]of parts){const geo=mergeGeometries(list);list.forEach(item=>item.dispose());if(geo)add(shell,geo,mat,0,0,0);}
    let lights;
    if(patrol)lights=[add(shell,new THREE.BoxGeometry(.53,.14,.24),ink('#ff4398'),-.37,1.64,-.33),add(shell,new THREE.BoxGeometry(.53,.14,.24),ink('#73dbff'),.37,1.64,-.33)];
    return {root,shell,wheels,lights};
  }
  const person=new THREE.Group(),footShadow=add(scene,new THREE.PlaneGeometry(1.7,1.7),shadowMat,0,.031,0);footShadow.rotation.x=-PI/2;scene.add(person);
  const linen=lambert('#71d9cc'),trousers=lambert('#333448'),skin=lambert('#c98868'),hair=lambert('#302336'),shirt=lambert('#f4b0be');
  add(person,new THREE.BoxGeometry(.51,.69,.31),linen,0,1.18,0);
  for(let i=0;i<3;i++)add(person,new THREE.BoxGeometry(.53,.07,.32),shirt,0,1.1+i*.15,0);
  add(person,new THREE.CylinderGeometry(.12,.12,.16,6),skin,0,1.61,0);
  add(person,new THREE.IcosahedronGeometry(.215,1),skin,0,1.79,0).scale.set(.88,1.15,.9);
  add(person,new THREE.IcosahedronGeometry(.215,1),hair,0,1.9,-.052).scale.set(.95,.68,1.05);
  add(person,new THREE.BoxGeometry(.27,.066,.045),dark,0,1.81,.169);
  const limbs=[];
  for(const x of [-1,1]){
    const arm=new THREE.Group();arm.position.set(x*.33,1.48,0);person.add(arm);
    add(arm,new THREE.BoxGeometry(.17,.255,.19),linen,0,-.12,0);add(arm,new THREE.BoxGeometry(.133,.36,.146),skin,0,-.405,0);
    const leg=new THREE.Group();leg.position.set(x*.148,.89,0);person.add(leg);
    add(leg,new THREE.BoxGeometry(.211,.754,.24),trousers,0,-.37,0);add(leg,new THREE.BoxGeometry(.235,.15,.34),white,0,-.798,.07);
    limbs.push([arm,leg]);
  }
  return {car,person,limbs,footShadow};
}

export function create3D(host){
  const renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer: coarse)').matches,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.domElement.className='world-canvas';renderer.domElement.setAttribute('aria-label','Vice Coast interactive 3D city');
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#cb8c9f',.0028);
  scene.add(new THREE.HemisphereLight('#ffd7ce','#766d9e',1.72));
  const sun=new THREE.DirectionalLight('#ffe1ab',1.92);sun.position.set(86,44,-96);scene.add(sun);
  const fill=new THREE.DirectionalLight('#b58fe8',.7);fill.position.set(-53,28,29);scene.add(fill);
  const env=environment(scene);cityMeshes(scene);const people=actors(scene);
  const rides=[],traffic=[],patrols=[];const npcColors=['#e8bb7c','#83bfca','#bf96c4','#d8a284','#9ac1b7','#c6c2dc','#df8eb4'];
  const camera=new THREE.PerspectiveCamera(54,1,.16,1180),target=new THREE.Vector3(),eye=new THREE.Vector3(),aim=new THREE.Vector3();
  const beacon=new THREE.Group(),beaconMaterial=new THREE.MeshBasicMaterial({color:'#ff477f'});scene.add(beacon);
  const ring=add(beacon,new THREE.TorusGeometry(3.6,.115,8,48),beaconMaterial,0,.105,0);ring.rotation.x=-PI/2;
  const halo=add(beacon,new THREE.CylinderGeometry(3.6,3.6,9,36,1,true),new THREE.MeshBasicMaterial({color:'#ff477f',side:THREE.DoubleSide,transparent:true,opacity:.12,depthWrite:false}),0,4.53,0);
  const diamond=add(beacon,new THREE.OctahedronGeometry(.93),beaconMaterial,0,6.3,0);
  let initialized=false,chaseYaw=PI;
  const observer=new ResizeObserver(resize);
  function resize(){const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,w<760?1.3:1.6));renderer.setSize(w,h,false);}
  host.replaceChildren(renderer.domElement);observer.observe(host);resize();
  function seedModels(items,models,make){while(models.length<items.length)models.push(make(models.length));models.forEach((m,i)=>{m.root.visible=!!items[i];});}
  function drawModel(model,u,t,index,stunt=false){
    model.root.position.set(u.x,0,u.z);model.root.rotation.y=u.yaw;
    const speed=u.speed??0;
    model.shell.rotation.x=clamp(speed*.002,-.032,.038)*Math.sin(t*1.9+index);
    for(const wheel of model.wheels)wheel.rotation.x=(t*speed/1.5)%(TAU);
    if(stunt)model.lights.forEach((lamp,i)=>{lamp.visible=Math.floor(t*8)%2===i;});
  }
  const marker=new THREE.Vector3(),direction=new THREE.Vector3();
  return {
    kind:'3D',canvas:renderer.domElement,
    reset(){initialized=false;},
    dispose(){observer.disconnect();renderer.dispose();renderer.domElement.remove();},
    draw(s,dt,heading,orbit){
      const car=currentCar(s),p=positionOf(s);const speed=Math.abs(car?.speed??0);
      seedModels(s.cars,rides,i=>people.car(s.cars[i].color));s.cars.forEach((u,i)=>drawModel(rides[i],u,s.t,i));
      seedModels(s.traffic,traffic,i=>people.car(npcColors[i%npcColors.length]));s.traffic.forEach((u,i)=>drawModel(traffic[i],u,s.t,i));
      seedModels(s.patrols,patrols,()=>people.car('#303851',true));s.patrols.forEach((u,i)=>drawModel(patrols[i],u,s.t,i,true));
      people.person.visible=people.footShadow.visible=!car;
      if(!car){
        const p=s.player;people.person.position.set(p.x,p.y+.025,p.z);people.person.rotation.y=p.yaw;people.footShadow.position.set(p.x,.033,p.z);
        const swing=p.motion?.6*Math.sin(s.t*(p.motion===10?14:10)):0;
        people.limbs.forEach(([arm,leg],i)=>{leg.rotation.x=swing*(i===0?1:-1);arm.rotation.x=-leg.rotation.x*.8;});
      }
      const goal=goalOf(s);beacon.visible=!!goal;
      if(goal){beacon.position.set(goal.point[0],0,goal.point[1]);const color=goal.color==='gold'?'#ffc877':goal.color==='mint'?'#93f9e1':'#ff5aa6';beaconMaterial.color.set(color);halo.material.color.set(color);halo.material.opacity=.14+Math.sin(s.t*2.1)*.036;diamond.position.y=5.0+Math.sin(s.t*3)*.44;diamond.rotation.y=s.t*1.9;}
      if(!initialized)chaseYaw=p.yaw;
      chaseYaw=car?lerpAngle(chaseYaw,p.yaw+orbit,1-Math.exp(-6*dt)):heading;
      const sx=Math.sin(chaseYaw),sz=Math.cos(chaseYaw),radius=car?8.4+speed*.062:5.9;
      eye.set(p.x-sx*radius,car?4.17+speed*.012:3.3+s.player.y*.65,p.z-sz*radius);
      // Shorten the camera boom at walls so it cannot look through a building.
      for(let fraction=1;fraction>.17;fraction-=.1){
        const x=p.x+(eye.x-p.x)*fraction,z=p.z+(eye.z-p.z)*fraction;
        if(!BUILDINGS.some(b=>x>b.x-.4&&x<b.x+b.w+.4&&z>b.z-.4&&z<b.z+b.d+.4)){eye.x=x;eye.z=z;break;}
      }
      aim.set(p.x+sx*(car?4.2:2.2),car?1.57:1.72+s.player.y*.7,p.z+sz*(car?4.2:2.2));
      if(!initialized){camera.position.copy(eye);target.copy(aim);initialized=true;}
      else{camera.position.lerp(eye,1-Math.exp(-8*dt));target.lerp(aim,1-Math.exp(-10*dt));}
      camera.lookAt(target);env.sky.position.copy(camera.position);env.water.uniforms.time.value=s.t;env.look.uniforms.dark.value=clamp((Math.max(0,s.index)*.68+s.t*.009)*.43,0,.66);
      renderer.render(scene,camera);
    },
    marker(x,z){
      marker.set(x,6,z);direction.copy(marker).sub(camera.position);
      const ahead=direction.dot(camera.getWorldDirection(aim))>0;marker.project(camera);
      if(!ahead)return {x:.5+(marker.x>0?-.43:.43),y:.63};
      return {x:clamp(marker.x*.5+.5,.08,.92),y:clamp(.5-marker.y*.5,.16,.67)};
    },
  };
}
