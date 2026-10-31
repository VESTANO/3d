import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildInterior} from './buildInterior';
import {freePosition,moveWithCollision,obstaclesFor} from './layout';
import {overviewPose} from './viewFraming';
import type {Point2,ViewMode,WarehouseLayout} from './layout';

export interface WarehouseInput {keys:Set<string>;capture:()=>void}
interface Props {data:WarehouseLayout;mode:ViewMode;roof:boolean;zone:string;visit:number;reset:number;input:React.RefObject<WarehouseInput>;onReady:()=>void;onError:(message:string)=>void;onPosition:(position:Point2)=>void}
export default function WarehouseStage(props:Props){
  const host=useRef<HTMLDivElement>(null),live=useRef(props);live.current=props;
  const controller=useRef<{reset:()=>void;goToZone:()=>void;invalidate:()=>void}|null>(null);
  useEffect(()=>{
    const mount=host.current!;let renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene|undefined,controls:OrbitControls|undefined;
    let frame=0,observer:ResizeObserver|undefined,stopped=false,dirty=true,dragging=false,lookPointer:number|null=null,overviewFramed=true,previous:Point2=[0,0],yaw=0,pitch=0,lastMode:ViewMode=live.current.mode;
    let transition:{eye:THREE.Vector3;target:THREE.Vector3;from:THREE.Vector3;fromTarget:THREE.Vector3;t:number}|null=null;
    const keys=props.input.current.keys,colliders=obstaclesFor(props.data);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const camera=new THREE.PerspectiveCamera(46,1,.035,600);camera.rotation.order='YXZ';
    const changeView=()=>{
      if(!controls)return;
      const p=live.current;
      const zone=p.data.zones.find(z=>z.id===p.zone)??p.data.zones[0];
      if(p.mode==='walk'){
        const [x,z]=freePosition(zone.point,p.data,colliders);camera.position.set(x,1.65,z);
        const dx=zone.look[0]-x,dz=zone.look[1]-z;yaw=Math.atan2(-dx,-dz);pitch=0;camera.rotation.set(pitch,yaw,0,'YXZ');
        controls.enabled=false;transition=null;
      }else{
        if(renderer&&document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
        controls.enabled=p.mode==='overview';
        overviewFramed=true;
        const {eye,target}=overviewPose(p.data.bounds,camera.aspect,camera.fov);
        transition={eye,target,from:camera.position.clone(),fromTarget:controls.target.clone(),t:reduced?1:0};
      }
      keys.clear();dragging=false;lookPointer=null;dirty=true;lastMode=p.mode;mount.dataset.mode=p.mode;
    };
    const setLook=(dx:number,dy:number)=>{yaw-=dx*.0026;pitch=THREE.MathUtils.clamp(pitch-dy*.0026,-1.15,1.15);camera.rotation.set(pitch,yaw,0,'YXZ');dirty=true;};
    const down=(e:PointerEvent)=>{if(live.current.mode!=='walk'||lookPointer!==null||e.button!==0)return;e.preventDefault();mount.focus({preventScroll:true});dragging=true;lookPointer=e.pointerId;previous=[e.clientX,e.clientY];mount.setPointerCapture(e.pointerId);};
    const move=(e:MouseEvent)=>{if(live.current.mode!=='walk')return;
      if(document.pointerLockElement===renderer?.domElement)setLook(e.movementX,e.movementY);
      else if(dragging){setLook(e.clientX-previous[0],e.clientY-previous[1]);previous=[e.clientX,e.clientY];}
    };
    const pointerMove=(e:PointerEvent)=>{if(e.pointerId===lookPointer&&document.pointerLockElement!==renderer?.domElement)move(e);};
    const lockedMove=(e:MouseEvent)=>{if(document.pointerLockElement===renderer?.domElement)move(e);};
    const up=(e:PointerEvent)=>{if(e.pointerId===lookPointer){dragging=false;lookPointer=null;}};
    const keydown=(e:KeyboardEvent)=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      if(live.current.mode!=='walk'||(e.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)))return;
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
    };
    const keyup=(e:KeyboardEvent)=>keys.delete(e.code);
    const clear=()=>{keys.clear();dragging=false;lookPointer=null;};
    const visibility=()=>{clear();dirty=true;};
    const lost=(e:Event)=>{e.preventDefault();live.current.onError('3D graphics became unavailable. Use the drawing view or reload to try again.');};
    try{
      const compact=window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
      renderer=new THREE.WebGLRenderer({antialias:!compact,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact?1.25:1.65));
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-label','3D warehouse reconstructed from the Paravoor drawing. Use view controls, zone shortcuts, and keyboard movement in walk mode.');renderer.domElement.setAttribute('role','img');
      mount.appendChild(renderer.domElement);scene=new THREE.Scene();scene.background=new THREE.Color('#e8eef2');scene.fog=new THREE.Fog('#e8eef2',250,500);
      const interior=buildInterior(scene,props.data,()=>{dirty=true;});
      if(compact)scene.traverse(object=>{if(object instanceof THREE.DirectionalLight)object.shadow.mapSize.setScalar(1024);});
      controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!reduced;controls.dampingFactor=.085;controls.minDistance=3;controls.maxDistance=350;controls.maxPolarAngle=Math.PI/2-.025;
      controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
      const initial=overviewPose(props.data.bounds,camera.aspect,camera.fov);controls.target.copy(initial.target);camera.position.copy(initial.eye);controls.update();controls.addEventListener('change',()=>{dirty=true;});
      controls.addEventListener('start',()=>{overviewFramed=false;transition=null;});
      props.input.current.capture=()=>{if(live.current.mode==='walk'){const request=renderer?.domElement.requestPointerLock?.();request?.catch(()=>{});}};
      controller.current={reset:changeView,invalidate:()=>{dirty=true;},goToZone:()=>{
        if(live.current.mode==='walk'){changeView();return;}
        overviewFramed=false;
        const zone=live.current.data.zones.find(z=>z.id===live.current.zone)!;
        const target=new THREE.Vector3(zone.point[0],.8,zone.point[1]);
        transition={eye:target.clone().add(new THREE.Vector3(9,11,13)),target,from:camera.position.clone(),fromTarget:controls!.target.clone(),t:reduced?1:0};dirty=true;
      }};
      const resize=()=>{
        if(!mount.clientWidth||!mount.clientHeight)return;
        camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();
        renderer!.setPixelRatio(Math.min(window.devicePixelRatio,window.matchMedia('(max-width: 900px), (pointer: coarse)').matches?1.25:1.65));
        renderer!.setSize(mount.clientWidth,mount.clientHeight);
        if(live.current.mode==='overview'&&overviewFramed){
          const pose=overviewPose(live.current.data.bounds,camera.aspect,camera.fov);transition=null;
          camera.position.copy(pose.eye);controls!.target.copy(pose.target);controls!.update();
        }
        dirty=true;
      };
      observer=new ResizeObserver(resize);observer.observe(mount);resize();changeView();
      mount.addEventListener('pointerdown',down);mount.addEventListener('pointermove',pointerMove);mount.addEventListener('pointerup',up);mount.addEventListener('pointercancel',up);mount.addEventListener('lostpointercapture',up);
      document.addEventListener('mousemove',lockedMove);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',visibility);renderer.domElement.addEventListener('webglcontextlost',lost);
      let last=performance.now(),lastPositionTime=0;
      const render=()=>{
        if(stopped)return;
        const now=performance.now(),dt=Math.min((now-last)/1000,.045);last=now;
        const p=live.current;if(p.mode!==lastMode)changeView();
        interior.update(p.mode==='walk',p.roof);
        if(transition){
          transition.t=Math.min(1,transition.t+dt/1.05);const t=transition.t*transition.t*(3-2*transition.t);
          camera.position.lerpVectors(transition.from,transition.eye,t);controls!.target.lerpVectors(transition.fromTarget,transition.target,t);controls!.update();dirty=true;
          if(transition.t===1)transition=null;
        }
        if(p.mode==='walk'){
          const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
          const side=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
          if(forward||side){
            const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.4:1.9)*dt/Math.max(1,Math.hypot(forward,side));
            const delta:Point2=[(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed];
            const [x,z]=moveWithCollision([camera.position.x,camera.position.z],delta,p.data,colliders);camera.position.set(x,1.65,z);dirty=true;
          }
          if(now-lastPositionTime>120){p.onPosition([camera.position.x,camera.position.z]);lastPositionTime=now;}
        }else if(p.mode==='overview')controls!.update();
        if(!document.hidden&&p.mode!=='plan'&&dirty){renderer!.render(scene!,camera);dirty=false;mount.dataset.position=[camera.position.x,camera.position.y,camera.position.z].map(v=>v.toFixed(2)).join(',');mount.dataset.drawCalls=String(renderer!.info.render.calls);}
        frame=requestAnimationFrame(render);
      };render();props.onReady();
    }catch(error){console.error('Warehouse graphics:',error);props.onError('The 3D view could not start on this device. The original floor-plan view remains available.');}
    return ()=>{
      stopped=true;cancelAnimationFrame(frame);observer?.disconnect();controller.current=null;props.input.current.capture=()=>{};keys.clear();
      if(renderer&&document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
      mount.removeEventListener('pointerdown',down);mount.removeEventListener('pointermove',pointerMove);mount.removeEventListener('pointerup',up);mount.removeEventListener('pointercancel',up);mount.removeEventListener('lostpointercapture',up);document.removeEventListener('mousemove',lockedMove);
      window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',visibility);renderer?.domElement.removeEventListener('webglcontextlost',lost);controls?.dispose();
      const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>(),ts=new Set<THREE.Texture>();
      scene?.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)ts.add(v);});}}if(o instanceof THREE.InstancedMesh)o.dispose();if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});
      gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());ms.forEach(m=>m.dispose());scene?.clear();renderer?.dispose();renderer?.domElement.remove();
    };
  },[props.data,props.input,props.onReady,props.onError]);
  useEffect(()=>{controller.current?.reset();},[props.mode,props.reset]);
  useEffect(()=>{if(props.visit>0)controller.current?.goToZone();},[props.zone,props.visit]);
  useEffect(()=>{controller.current?.invalidate();},[props.roof]);
  return <div ref={host} className="warehouse-stage" tabIndex={0} data-testid="warehouse-scene" />;
}
