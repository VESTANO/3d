import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import type {Point2,ViewMode,WarehouseLayout} from './layout';
import type {WarehouseInput} from './WarehouseStage';
import './warehouse.css';
const Stage=lazy(()=>import('./WarehouseStage'));

export default function WarehousePage(){
  const [data,setData]=useState<WarehouseLayout|null>(null),[mode,setMode]=useState<ViewMode>('overview');
  const [roof,setRoof]=useState(false),[zone,setZone]=useState('receiving'),[reset,setReset]=useState(0);
  const [visit,setVisit]=useState(0);
  const [expanded,setExpanded]=useState(false);
  const [touchDevice,setTouchDevice]=useState(()=>window.matchMedia('(pointer: coarse)').matches);
  const [touchActive,setTouchActive]=useState(false);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[loadError,setLoadError]=useState('');
  const [position,setPosition]=useState<Point2>([25.6,49]),[showDetails,setShowDetails]=useState(false);
  const input=useRef<WarehouseInput>({keys:new Set(),capture:()=>{}}),viewer=useRef<HTMLDivElement>(null);
  const heldPointers=useRef(new Map<number,string>()),expandButton=useRef<HTMLButtonElement>(null);
  const onReady=useCallback(()=>setReady(true),[]),onError=useCallback((message:string)=>{setError(message);setMode('plan');},[]);
  const onPosition=useCallback((point:Point2)=>setPosition(point),[]);
  useEffect(()=>{
    const abort=new AbortController();document.title='Warehouse · Paravoor — Vestano';
    fetch('./warehouse/layout.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Could not load the drawing layout.');return r.json();}).then(setData).catch(e=>{if(e.name!=='AbortError')setLoadError(e.message);});
    return ()=>abort.abort();
  },[]);
  useEffect(()=>{
    const media=window.matchMedia('(pointer: coarse)');
    const update=()=>setTouchDevice(media.matches);media.addEventListener('change',update);
    return ()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const clear=()=>{heldPointers.current.clear();input.current.keys.clear();};
    const hidden=()=>{if(document.hidden)clear();};
    window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);
    return ()=>{clear();window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);};
  },[]);
  useEffect(()=>{
    if(!expanded)return;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const close=()=>{setExpanded(false);expandButton.current?.focus({preventScroll:true});};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    const fullscreen=()=>{if(!document.fullscreenElement)close();};
    document.addEventListener('keydown',escape);document.addEventListener('fullscreenchange',fullscreen);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',escape);document.removeEventListener('fullscreenchange',fullscreen);};
  },[expanded]);
  function changeMode(next:ViewMode){setMode(next);setRoof(next==='walk');if(next==='walk')setTouchActive(true);input.current.keys.clear();}
  function focusZone(id:string){setZone(id);setVisit(n=>n+1);if(mode==='plan')changeMode('overview');}
  function toggleFullscreen(){
    if(expanded||document.fullscreenElement){setExpanded(false);void document.exitFullscreen?.().catch(()=>{});return;}
    setExpanded(true);setTouchActive(true);const request=viewer.current?.requestFullscreen?.();void request?.catch(()=>{});
  }
  function toggleTouch(){input.current.keys.clear();heldPointers.current.clear();setTouchActive(active=>!active);}
  function releasePointer(id:number){
    const key=heldPointers.current.get(id);heldPointers.current.delete(id);
    if(key&&![...heldPointers.current.values()].includes(key))input.current.keys.delete(key);
  }
  const hold=(key:string)=>({
    onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);heldPointers.current.set(e.pointerId,key);input.current.keys.add(key);},
    onPointerUp:(e:React.PointerEvent<HTMLButtonElement>)=>releasePointer(e.pointerId),
    onPointerCancel:(e:React.PointerEvent<HTMLButtonElement>)=>releasePointer(e.pointerId),
    onLostPointerCapture:(e:React.PointerEvent<HTMLButtonElement>)=>releasePointer(e.pointerId),
    onKeyDown:(e:React.KeyboardEvent<HTMLButtonElement>)=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();input.current.keys.add(key);}},
    onKeyUp:(e:React.KeyboardEvent<HTMLButtonElement>)=>{if(e.key===' '||e.key==='Enter')input.current.keys.delete(key);},
    onBlur:()=>input.current.keys.delete(key),
    onContextMenu:(e:React.MouseEvent<HTMLButtonElement>)=>e.preventDefault(),
  });
  return <div className="warehouse-page">
    <header className="wh-header" inert={expanded}><a className="wh-logo" href="#journey" aria-label="Vestano home"><img src="./vestano-logo.png" alt="Vestano" width="246" height="165" /></a><span className="wh-brand-line" /><span className="wh-brand-caption">SPACES THAT WORK.</span><nav aria-label="Main navigation"><a href="#journey">Import & export</a><a href="#warehouse" aria-current="page">Warehouse</a><a className="wh-download" href="./warehouse/paravoor.dwg" download>Original DWG <span>↓</span></a></nav></header>
    <main className="wh-workspace">
      <aside className="wh-sidebar" inert={expanded}>
        <a className="wh-back" href="#journey">← Back to the journey</a>
        <p className="wh-eyebrow">THE VESTANO SPACE STUDY</p>
        <h1>Paravoor.<br /><em>From plan to place.</em></h1>
        <p className="wh-intro">Your drawing’s rack and pallet positions, stocked with supermarket goods. Step inside and explore the aisles at eye level.</p>
        <div className="wh-source"><span className="wh-file-icon">DWG</span><div><strong>paravoor.dwg</strong><small>GROUND FLOOR · DIMENSIONS IN CM</small></div><span className="wh-source-dot" /></div>
        <div className="wh-facts"><div><strong>{data?.racks.length??'—'}</strong><span>rack bay footprints</span></div><div><strong>{data?.pallets.length??'—'}</strong><span>pallet positions</span></div><div><strong>05</strong><span>category displays</span></div></div>
        <div className="wh-stock-note"><strong>DWG LAYOUT RETAINED</strong><p>Pallets: rice sacks.<br/>Racks: chilli, turmeric, wheat flour, spices and supermarket packets.</p><small>Representative stock, placed within the original storage footprints.</small></div>
        <div className="wh-zone-heading"><span>EXPLORE THE SPACE</span><small>Choose a viewpoint</small></div>
        <nav className="wh-zones" aria-label="Warehouse zones">{data?.zones.map((item,i)=><button key={item.id} onClick={()=>focusZone(item.id)} aria-pressed={zone===item.id} className={zone===item.id?'active':''}><small>{String(i+1).padStart(2,'0')}</small><span>{item.name}</span><span>↗</span></button>)}</nav>
        <button className="wh-details-toggle" aria-expanded={showDetails} onClick={()=>setShowDetails(!showDetails)}>Drawing & model notes <span>{showDetails?'−':'+'}</span></button>
        {showDetails&&<div className="wh-model-notes"><p>Footprints and positions come from the DWG. Heights, roof, materials and stock appearance are a 3D interpretation of the 2D plan.</p><p>All five billing counters are retained, together with receiving, delivery, stairs, toilets, exits and rice bins.</p><a href="./warehouse/floor-plan.svg" target="_blank" rel="noreferrer">Open the source floor plan ↗</a></div>}
        <div className="wh-sidebar-footer"><span>VESTANO</span><small>Designed for the way you move.</small></div>
      </aside>
      <section className={`wh-viewer${expanded?' is-expanded':''}`} ref={viewer} aria-label="Interactive warehouse viewer">
        <div className="wh-toolbar"><div className="wh-view-modes" role="group" aria-label="Warehouse view"><button className={mode==='overview'?'active':''} aria-pressed={mode==='overview'} disabled={!!error} onClick={()=>changeMode('overview')}>3D overview</button><button className={mode==='walk'?'active':''} aria-pressed={mode==='walk'} disabled={!!error} onClick={()=>changeMode('walk')}>Walk inside <span>↗</span></button><button className={mode==='plan'?'active':''} aria-pressed={mode==='plan'} onClick={()=>changeMode('plan')}>Floor plan</button></div><div className="wh-tool-actions"><label className="wh-zone-select"><span>Go to</span><select aria-label="Warehouse viewpoint" value={zone} disabled={!data} onChange={e=>focusZone(e.target.value)}>{data?.zones.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={()=>setRoof(!roof)} aria-pressed={roof} disabled={mode==='plan'}>Roof <span>{roof?'On':'Off'}</span></button><button onClick={()=>setReset(n=>n+1)} disabled={mode==='plan'} aria-label="Reset warehouse camera">↻</button><button ref={expandButton} onClick={toggleFullscreen} aria-pressed={expanded} aria-label={expanded?'Exit expanded warehouse view':'Expand warehouse view'}>{expanded?'×':'⛶'}</button></div></div>
        <div className={`wh-canvas-wrap ${mode==='plan'?'plan-active':''}`}>
          {data&&!error&&<Suspense fallback={null}><Stage data={data} mode={mode} interactive={!touchDevice||touchActive} roof={roof} zone={zone} visit={visit} reset={reset} input={input} onReady={onReady} onError={onError} onPosition={onPosition}/></Suspense>}
          {mode==='plan'&&<div className="wh-original-plan"><a className="wh-plan-link" href="./warehouse/floor-plan.svg" target="_blank" rel="noreferrer">Open full-size plan extract ↗</a><img src="./warehouse/floor-plan.svg" alt="Paravoor DWG floor-plan extract showing rack aisles, pallet storage, receiving, billing, delivery, stairs and facilities" /></div>}
          {(!ready||!data)&&mode!=='plan'&&!error&&!loadError&&<div className="wh-loading" role="status"><span /><strong>Building your space.</strong><p>Preparing the drawing, shelving and materials…</p></div>}
          {(loadError||error)&&<div className="wh-error" role="status">{loadError||error} <a href="./warehouse/floor-plan.svg" target="_blank" rel="noreferrer">Open the drawing ↗</a></div>}
          {mode==='walk'&&ready&&(!touchDevice||touchActive)&&<><span className="wh-crosshair" aria-hidden="true"/><div className="wh-walk-hint"><span className="wh-live-dot"/>EYE LEVEL · 1.65 M<button onClick={()=>input.current.capture()}>Mouse look ↗</button></div><div className="wh-move-pad" role="group" aria-label="Walk controls"><button {...hold('KeyW')} aria-label="Walk forward">↑</button><div><button {...hold('KeyA')} aria-label="Strafe left">←</button><button {...hold('KeyS')} aria-label="Walk backward">↓</button><button {...hold('KeyD')} aria-label="Strafe right">→</button></div></div></>}
          {data&&mode!=='plan'&&<div className="wh-minimap"><div><span>YOU ARE HERE</span><small>{mode==='walk'?'LIVE POSITION':'PLAN REFERENCE'}</small></div><div className="wh-map-sheet"><img src="./warehouse/floor-plan.svg" alt="Warehouse layout minimap"/>{mode==='walk'&&<span className="wh-position-dot" style={{left:`${position[0]/34*100}%`,top:`${position[1]/55*100}%`}}/>}</div><span className="wh-map-north">N ↑</span></div>}
          <div className="wh-scene-label"><span className="wh-live-dot"/>{mode==='walk'?'INSIDE THE WAREHOUSE':mode==='plan'?'THE SOURCE DRAWING':'YOUR DRAWING. A NEW PERSPECTIVE.'}</div>
        </div>
        <div className="wh-viewer-foot"><p id="warehouse-gesture-help"><span className="wh-desktop-help">{mode==='walk'?<><kbd>W A S D</kbd> / arrows to walk <span>·</span> Drag to look <span>·</span> Shift to move faster <span>·</span> Esc releases mouse</>:mode==='plan'?'The source plan, with the actual footprint geometry and drawing labels.':'Drag to orbit · Scroll to zoom · Right-drag to pan'}</span><span className="wh-touch-help">{mode==='plan'?'Your original layout · Open the full-size drawing for more detail':!touchActive?'Swipe to scroll the page. Tap Explore 3D to interact with the warehouse.':mode==='walk'?'Hold the arrows to walk · Drag the scene to look around':'One finger to orbit · Pinch to zoom · Two fingers to pan'}</span></p>{touchDevice&&mode!=='plan'&&ready&&!error&&!expanded&&<button className="wh-touch-toggle" onClick={toggleTouch} aria-pressed={touchActive} aria-describedby="warehouse-gesture-help">{touchActive?'Scroll page ↓':'Explore 3D ↗'}</button>}<span>3D STUDY · HEIGHTS & FINISHES TO CONFIRM</span></div>
      </section>
    </main>
  </div>;
}
