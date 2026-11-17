import './style.css';
import {JOBS,districtAt} from './city.js';
import {newGame,readProgress,STORED_KEY,currentCar,positionOf,goalOf,nearestRide,distance,stepGame,clamp} from './game.js';
import {create3D} from './scene.js';
import {createTopDown,miniMap} from './map.js';
import {makeRadio} from './audio.js';

const $=id=>document.getElementById(id);
const title=$('title-screen'),gameScreen=$('game-screen'),host=$('world'),dialog=$('game-dialog');
const progressFromStorage=()=>{try{return readProgress(JSON.parse(localStorage.getItem(STORED_KEY)));}catch{return readProgress(null);}};
let progress=progressFromStorage(),state,view,playing=false,starting=false,paused=false,dialogKind='';
let heading=Math.PI,orbit=0,looking=null,lookQuiet=0,pendingRide=false,pendingJump=false,accumulator=0,lastTime=performance.now(),hudTime=0;
const keys=new Set(),held=new Map(),drawMap=miniMap($('map')),radio=makeRadio();
const pad=(n,digits=2)=>String(n).padStart(digits,'0');
const money=n=>'$'+n.toLocaleString('en-US');
const countTime=n=>{const seconds=Math.max(0,Math.ceil(n));return `${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`;};
const runningAudio=()=>playing&&!paused&&!document.hidden&&state?.status==='active';

function storeProgress(){try{localStorage.setItem(STORED_KEY,JSON.stringify(progress));}catch{/* File URLs and private windows can limit local saves. */}}
function paintMenu(){
  $('story').querySelector('span').textContent=progress.jobs===0?'Play story':progress.jobs<JOBS.length?'Continue story':'Replay story';
  $('save-caption').textContent=progress.jobs===0?'NEW GAME AVAILABLE':`${progress.jobs} / ${JOBS.length} JOBS COMPLETE   ·   ${money(progress.cash)} EARNED`;
  for(const button of document.querySelectorAll('[data-sound]')){button.textContent=progress.sound?'Sound on':'Sound off';button.setAttribute('aria-pressed',String(progress.sound));}
}
function sound(){progress.sound=!progress.sound;if(state)state.progress.sound=progress.sound;storeProgress();paintMenu();radio.set(progress.sound,!!runningAudio());}
function resetInputs(){keys.clear();held.clear();looking=null;pendingRide=false;pendingJump=false;for(const button of gameScreen.querySelectorAll('.pressed'))button.classList.remove('pressed');}
function largeMap(){const map=$('map').parentElement,on=map.classList.toggle('large');$('map-toggle').textContent=on?'−':'+';$('map-toggle').setAttribute('aria-pressed',String(on));}

function actions(buttons){
  const root=$('dialog-actions');root.replaceChildren();
  buttons.forEach(([label,action,primary])=>{const button=document.createElement('button');button.type='button';button.className='button '+(primary?'primary':'secondary');button.textContent=label;button.addEventListener('click',action);root.appendChild(button);});
}
function showDialog(kind,kicker,label,content,buttons){
  dialogKind=kind;$('dialog-kicker').textContent=kicker;$('dialog-title').textContent=label;$('dialog-content').innerHTML=content;actions(buttons);
  if(!dialog.open)dialog.showModal();$('dialog-actions').querySelector('button')?.focus();
}
function hideDialog(){if(dialog.open)dialog.close();dialogKind='';}
function resume(){hideDialog();paused=false;resetInputs();lastTime=performance.now();radio.set(progress.sound,!!runningAudio());gameScreen.focus({preventScroll:true});}
function finishDialog(){
  if(!state)return;
  paused=true;resetInputs();radio.set(progress.sound,false);
  const job=JOBS[state.index];
  if(state.status==='failed'){
    showDialog('failed','JOB INCOMPLETE','Try the run again.',`<p>${state.reason}</p><p>You’ll restart <b>${job.name}</b> with a fresh car and clock.</p>`,[
      ['Retry job',()=>start('story',state.index),true],['Free roam',()=>start('roam')],['Title screen',backToTitle],
    ]);return;
  }
  const next=JOBS[state.index+1],best=progress.bests[state.index];
  showDialog('success',next?'JOB COMPLETE':'STORY COMPLETE',next?job.name:'The coast is yours.',
    `<p><span class="reward">+${money(job.reward)}</span> ${next?'Job complete.':'All three jobs are in the books.'}</p><p class="result-meta">RUN ${countTime(state.activeFor)} · BEST ${countTime(best)} · ${money(progress.cash)} TOTAL</p>${next?`<p>Up next: <b>${next.name}</b>. ${next.intro}</p>`:'<p>Keep cruising the city in Free Roam, or replay the story to beat your best times.</p>'}`,
    [[next?'Next job':'Free roam',()=>next?start('story',state.index+1):start('roam'),true],['Title screen',backToTitle]]);
}
function showPause(){
  if(!playing||starting||state.status!=='active')return;
  paused=true;resetInputs();radio.set(progress.sound,false);
  showDialog('pause','VICE COAST ’86','Game paused',`<p>${state.index>=0?JOBS[state.index].name:'Free roam'} · ${districtAt(positionOf(state).x,positionOf(state).z)}</p>`,[
    ['Resume',resume,true],['Controls',showControls],[state.index>=0?'Restart job':'Reset position',()=>start(state.mode,state.index)],
    [progress.sound?'Mute sound':'Unmute sound',()=>{sound();showPause();}],['Title screen',backToTitle],
  ]);
}
function showControls(){
  showDialog('controls','FIELD GUIDE','Take the wheel',`<p>Start on foot beside the pink coupe. Get in, then follow the diamond on your minimap to the next objective.</p>
    <dl class="control-list"><div><dt>Walk / Drive</dt><dd><kbd>W A S D</kbd> or <kbd>Arrows</kbd></dd></div><div><dt>Enter / Exit car</dt><dd><kbd>E</kbd></dd></div><div><dt>Handbrake / Jump</dt><dd><kbd>Space</kbd></dd></div><div><dt>Run on foot</dt><dd><kbd>Shift</kbd></dd></div><div><dt>Look around</dt><dd>Drag the view</dd></div><div><dt>Expand map / Pause</dt><dd><kbd>M</kbd> / <kbd>Esc</kbd></dd></div></dl>
    <p>On touch screens, hold the arrows and use <b>CAR</b> to enter or exit. Drag anywhere on the view to look around.</p>`,
    [['Got it',()=>playing?showPause():hideDialog(),true]]);
}
function dismissDialog(){
  if(dialogKind==='pause')resume();else if(dialogKind==='controls'&&playing)showPause();else if(['success','failed','error'].includes(dialogKind))backToTitle();else hideDialog();
}
function backToTitle(){
  hideDialog();playing=false;paused=false;resetInputs();radio.set(progress.sound,false);
  gameScreen.hidden=true;title.hidden=false;document.body.classList.remove('in-game');paintMenu();$('story').focus({preventScroll:true});
}
function setRenderer(){
  try{
    view=create3D(host);
    view.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();view?.dispose?.();view=createTopDown(host);heading=Math.PI;orbit=0;view.draw(state);paintHud();},{once:true});
  }catch(error){console.info('Using the top-down renderer.',error.message);view=createTopDown(host);}
}
async function start(mode,index=progress.jobs<JOBS.length?progress.jobs:0){
  if(starting)return;
  starting=true;hideDialog();resetInputs();title.hidden=true;gameScreen.hidden=false;document.body.classList.add('in-game');
  state=newGame(mode,index,progress);playing=true;paused=false;accumulator=0;heading=state.player.yaw;orbit=0;hudTime=0;lookQuiet=0;
  radio.set(progress.sound,true);$('loading').hidden=false;gameScreen.tabIndex=-1;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  try{
    if(!view)setRenderer();if(view.kind==='2D')heading=Math.PI;
    view.reset();view.draw(state,.016,heading,orbit);paintHud();aimMarker();$('loading').hidden=true;gameScreen.focus({preventScroll:true});
  }catch(error){console.error(error);$('loading').hidden=true;paused=true;showDialog('error','GRAPHICS UNAVAILABLE','Couldn’t start the city.',`<p>Allow graphics in your browser settings or try another browser that supports Canvas.</p>`,[['Title screen',backToTitle,true]]);}
  starting=false;lastTime=performance.now();
}

const mapped={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'brake',ShiftLeft:'run',ShiftRight:'run'};
window.addEventListener('keydown',event=>{
  if(!playing||starting||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.code==='Escape'&&!dialog.open){event.preventDefault();showPause();return;}
  if(paused||dialog.open)return;
  if(event.code==='KeyM'&&!event.repeat){event.preventDefault();largeMap();return;}
  if(event.code==='KeyE'){event.preventDefault();if(!event.repeat)pendingRide=true;return;}
  if(mapped[event.code]){
    if(event.code==='Space'&&event.target instanceof HTMLButtonElement)return;
    event.preventDefault();keys.add(mapped[event.code]);if(event.code==='Space'&&!event.repeat)pendingJump=true;
  }
});
window.addEventListener('keyup',event=>{if(mapped[event.code])keys.delete(mapped[event.code]);});
window.addEventListener('blur',resetInputs);
document.addEventListener('visibilitychange',()=>{resetInputs();lastTime=performance.now();radio.set(progress.sound,!!runningAudio());});
for(const button of gameScreen.querySelectorAll('[data-held]')){
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();button.setPointerCapture(event.pointerId);held.set(event.pointerId,button.dataset.held);button.classList.add('pressed');if(button.dataset.held==='brake')pendingJump=true;
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,event=>{held.delete(event.pointerId);button.classList.remove('pressed');});
}
const rideButton=gameScreen.querySelector('[data-action="ride"]');rideButton.addEventListener('click',()=>{pendingRide=true;});
gameScreen.addEventListener('contextmenu',event=>event.preventDefault());
host.addEventListener('pointerdown',event=>{
  if(view?.kind!=='3D'||paused||looking||event.button!==0)return;
  host.setPointerCapture(event.pointerId);looking={id:event.pointerId,x:event.clientX};
});
host.addEventListener('pointermove',event=>{
  if(looking?.id!==event.pointerId)return;
  const delta=(event.clientX-looking.x)*.005;looking.x=event.clientX;
  if(currentCar(state)){orbit=clamp(orbit-delta,-Math.PI,Math.PI);lookQuiet=2;}else heading-=delta;
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(name,event=>{if(looking?.id===event.pointerId)looking=null;});

const ui={mode:$('mode-label'),name:$('job-name'),objective:$('objective'),district:$('district'),clock:$('clock'),cash:$('cash'),stars:$('stars'),timer:$('timer'),escape:$('escape'),toast:$('toast'),marker:$('objective-marker'),distance:$('distance-label'),driving:$('car-hud'),speed:$('speed'),condition:$('condition-bar').firstElementChild,ride:$('ride-hint'),renderer:$('view-mode')};
function paintHud(){
  const s=state,p=positionOf(s),car=currentCar(s),job=JOBS[s.index],goal=goalOf(s),near=nearestRide(s),canEnter=!car&&near&&distance(p,near)<=9;
  ui.mode.textContent=job?`STORY / JOB ${pad(s.index+1)}`:'EXPLORE / FREE ROAM';
  ui.name.textContent=job?.name??'The coast is yours';
  ui.objective.textContent=!car?(canEnter?'Enter the car to start driving.':'Find a parked car or explore on foot.'):
    s.phase==='escape'?'Lose the patrols. Keep moving.':goal?.label??'Drive anywhere. No clock, no route.';
  ui.district.textContent=districtAt(p.x,p.z);const clock=s.clock;ui.clock.textContent=pad(Math.floor(clock))+':'+pad(Math.floor((clock%1)*60+1e-7));
  ui.cash.textContent='$'+pad(progress.cash,6);ui.stars.textContent='★'.repeat(s.heat)+'☆'.repeat(5-s.heat);ui.stars.setAttribute('aria-label',s.heat?`Patrol alert: ${s.heat} stars`:'Patrol alert: none');
  ui.timer.hidden=s.time===null;if(s.time!==null){ui.timer.textContent=countTime(s.time);ui.timer.classList.toggle('hurry',s.time<=15);}
  ui.escape.hidden=s.phase!=='escape';ui.escape.firstElementChild.style.width=`${s.evaded/18*100}%`;
  ui.toast.hidden=!s.hintTime;if(s.hintTime)ui.toast.textContent=s.hint;
  ui.driving.hidden=!car;if(car){ui.speed.textContent=pad(Math.round(Math.abs(car.speed)*3.6),3);ui.condition.style.width=`${car.integrity}%`;ui.condition.classList.toggle('low',car.integrity<36);}
  ui.ride.hidden=!(canEnter||car&&Math.abs(car.speed)<2);ui.ride.lastElementChild.textContent=car?'Exit car':'Enter car';
  rideButton.textContent=car?'EXIT CAR':'ENTER CAR';rideButton.classList.toggle('near',canEnter);
  ui.renderer.textContent=view.kind==='2D'?'TOP-DOWN VIEW':'VICE COAST / GRID';drawMap(s);
  if(goal){ui.distance.textContent=`${Math.round(Math.hypot(p.x-goal.point[0],p.z-goal.point[1]))} m`;ui.marker.dataset.tone=goal.color;}
  ui.marker.hidden=!goal;
}
function aimMarker(){const goal=goalOf(state);if(!goal)return;const point=view.marker(...goal.point);ui.marker.style.left=`${point.x*100}%`;ui.marker.style.top=`${point.y*100}%`;}
function frame(now){
  const dt=Math.min(.06,(now-lastTime)/1000);lastTime=now;
  if(playing&&!starting&&!paused&&!document.hidden&&view&&state){
    accumulator+=dt;const ready=(key)=>keys.has(key)||[...held.values()].includes(key);
    lookQuiet-=dt;if(lookQuiet<=0&&!looking)orbit*=Math.exp(-2.1*dt);
    const input={up:ready('up'),down:ready('down'),left:ready('left'),right:ready('right'),run:ready('run'),brake:ready('brake'),heading};
    while(accumulator>=1/60&&state.status==='active'){
      input.interact=pendingRide;input.jump=pendingJump;pendingRide=pendingJump=false;
      stepGame(state,input,1/60);accumulator-=1/60;
      for(const event of state.events){
        if(event==='exit'){heading=view.kind==='3D'?state.player.yaw:Math.PI;orbit=0;}
        if(event==='enter'){orbit=0;}
        if(event==='success'){progress=state.progress;storeProgress();}
        radio.cue(event);
      }
    }
    const ride=currentCar(state);radio.frame(Math.abs(ride?.speed??0),!!ride);
    view.draw(state,Math.max(.001,dt),heading,orbit);aimMarker();hudTime-=dt;
    if(hudTime<=0){paintHud();hudTime=.09;}
    if(state.status!=='active'){paintHud();finishDialog();}
  }
  requestAnimationFrame(frame);
}

$('story').addEventListener('click',()=>start('story'));$('roam').addEventListener('click',()=>start('roam'));
$('pause').addEventListener('click',showPause);$('map-toggle').addEventListener('click',largeMap);
document.querySelectorAll('[data-controls]').forEach(button=>button.addEventListener('click',showControls));
document.querySelectorAll('[data-sound]').forEach(button=>button.addEventListener('click',sound));
$('dialog-close').addEventListener('click',dismissDialog);dialog.addEventListener('cancel',event=>{event.preventDefault();dismissDialog();});
paintMenu();requestAnimationFrame(frame);
