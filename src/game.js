import {BUILDINGS, LIMITS, SPAWN, PARKED, JOBS, TRAFFIC_ROUTES, roadRoute} from './city.js';

export const STORED_KEY='vice-coast.v1';
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const near=(p,target,r)=>Math.hypot(p.x-target[0],p.z-target[1])<r;
export const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export const defaultProgress=()=>({jobs:0,cash:0,bests:[null,null,null],sound:true});
export function readProgress(value){
  if(!value||typeof value!=='object')return defaultProgress();
  return {
    jobs:Number.isInteger(value.jobs)?clamp(value.jobs,0,JOBS.length):0,
    cash:Number.isFinite(value.cash)?clamp(Math.floor(value.cash),0,1e7):0,
    bests:JOBS.map((_,i)=>Number.isFinite(value.bests?.[i])&&value.bests[i]>=0?value.bests[i]:null),
    sound:value.sound!==false,
  };
}

export function clearAt(x,z,r){
  if(x-r<LIMITS.left||x+r>LIMITS.right||z-r<LIMITS.north||z+r>LIMITS.south)return false;
  return !BUILDINGS.some(b=>Math.hypot(x-clamp(x,b.x,b.x+b.w),z-clamp(z,b.z,b.z+b.d))<r);
}

function displace(entity,dx,dz,r){
  // Even a frame at maximum speed must not pass through a lot or a corner.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.45));let hit=false;
  for(let i=0;i<count;i++){
    const x=entity.x+dx/count,z=entity.z+dz/count;
    if(clearAt(x,entity.z,r))entity.x=x;else hit=true;
    if(clearAt(entity.x,z,r))entity.z=z;else hit=true;
  }
  return hit;
}

export function newGame(mode='story',jobIndex=0,progress=defaultProgress()){
  const job=mode==='story'?JOBS[jobIndex]:null;
  return {
    mode,index:job?jobIndex:-1,phase:job?'meet':'roam',status:'active',time:null,elapsed:0,activeFor:0,leg:0,heat:0,evaded:0,
    progress:readProgress(progress),events:[],hint:'',hintTime:0,t:0,clock:19.7+(job?jobIndex*.68:0),
    player:{...SPAWN,y:0,vy:0,motion:0,car:-1,cooldown:0},
    cars:PARKED.map((p,id)=>({...p,id,speed:0,mx:0,mz:0,integrity:100,color:p.color??'#f83d88'})),
    traffic:TRAFFIC_ROUTES.map((path,i)=>{
      const next=path[(i+1)%path.length],from=path[i%path.length],f=(.24+.18*i)%1;
      return {path,point:(i+1)%path.length,x:from[0]+(next[0]-from[0])*f,z:from[1]+(next[1]-from[1])*f,
        yaw:Math.atan2(next[0]-from[0],next[1]-from[1]),speed:8+i%5,seed:i};
    }),
    patrols:[],
  };
}

export function currentCar(state){return state.cars[state.player.car]??null;}
export function positionOf(state){return currentCar(state)??state.player;}

export function goalOf(s){
  const job=JOBS[s.index];if(!job||s.status!=='active')return null;
  if(s.phase==='meet')return {point:job.pickup,label:job.type==='delivery'?'Collect the film reel':job.type==='race'?'Reach the starting grid':'Meet the stunt crew',color:'gold'};
  if(s.phase==='drop')return {point:job.finish,label:'Deliver the reel',color:'pink'};
  if(s.phase==='race')return {point:job.gates[s.leg],label:`Checkpoint ${s.leg+1} / ${job.gates.length}`,color:'pink'};
  if(s.phase==='garage')return {point:job.finish,label:'Return to the garage',color:'mint'};
  return null;
}

export function nearestRide(s){
  const player=s.player;
  return s.cars.reduce((nearest,car)=>!nearest||distance(player,car)<distance(player,nearest)?car:nearest,null);
}

function prompt(s,text){s.hint=text;s.hintTime=2.8;}
function useRide(s){
  const player=s.player,car=currentCar(s);
  if(car){
    if(Math.abs(car.speed)>4){prompt(s,'Slow down to get out.');return;}
    const sideX=Math.cos(car.yaw)*2.65,sideZ=-Math.sin(car.yaw)*2.65;
    for(const [dx,dz] of [[sideX,sideZ],[-sideX,-sideZ],[-Math.sin(car.yaw)*3.5,-Math.cos(car.yaw)*3.5]]){
      if(!clearAt(car.x+dx,car.z+dz,.48))continue;
      player.x=car.x+dx;player.z=car.z+dz;player.yaw=car.yaw;player.car=-1;car.speed=car.mx=car.mz=0;
      s.events.push('exit');return;
    }
    prompt(s,'There’s no room to get out here.');return;
  }
  const nearest=nearestRide(s);
  if(!nearest||distance(player,nearest)>9){prompt(s,'Walk closer to a parked car.');return;}
  player.car=nearest.id;player.y=player.vy=0;player.yaw=nearest.yaw;s.events.push('enter');
}

function bump(s,car,damage){
  if(s.player.cooldown>0)return;
  car.integrity=clamp(car.integrity-damage,0,100);s.player.cooldown=.5;s.events.push('bump');
}

function drive(s,car,input,dt){
  const throttle=(input.up?1:0)-(input.down?1:0), steer=(input.left?1:0)-(input.right?1:0);
  const opposite=car.speed*throttle<0;
  const factor=car.integrity<35?.72:1,running=!!throttle;
  car.speed=clamp(car.speed+throttle*(opposite?32:throttle===1?15:11)*dt,-11,36*factor);
  if(!running)car.speed*=Math.exp(-1.22*dt);
  if(input.brake)car.speed*=Math.exp(-3.1*dt);
  const lock=clamp(Math.abs(car.speed)/5,0,1),reverse=car.speed<-.1?-1:1;
  car.yaw+=steer*reverse*lock*(input.brake?2.65:1.85)/(1+Math.max(0,Math.abs(car.speed)-16)*.022)*dt;
  const grip=1-Math.exp(-(input.brake?4:11)*dt);
  car.mx+=(Math.sin(car.yaw)*car.speed-car.mx)*grip;car.mz+=(Math.cos(car.yaw)*car.speed-car.mz)*grip;
  if(displace(car,car.mx*dt,car.mz*dt,1.42)){
    if(Math.abs(car.speed)>7)bump(s,car,Math.min(25,Math.abs(car.speed)*.8));
    car.speed*=.63;car.mx*=.52;car.mz*=.52;
  }
  for(const obstacle of [...s.traffic,...s.patrols,...s.cars]){
    if(obstacle===car||distance(car,obstacle)>2.9)continue;
    const speed=Math.abs(car.speed)+(obstacle.speed??0)*.35;
    if(speed>5)bump(s,car,Math.min(23,speed*.57));
    const angle=Math.atan2(car.x-obstacle.x,car.z-obstacle.z);
    displace(car,Math.sin(angle)*3.6*dt,Math.cos(angle)*3.6*dt,1.42);
    car.speed*=.92;
  }
  s.player.x=car.x;s.player.z=car.z;s.player.yaw=car.yaw;
}

function walk(s,input,dt){
  const p=s.player,dz=(input.up?1:0)-(input.down?1:0),dx=(input.left?1:0)-(input.right?1:0);
  p.motion=0;
  if(dx||dz){
    const yaw=(input.heading??Math.PI)+Math.atan2(dx,dz),speed=input.run?10:6;
    displace(p,Math.sin(yaw)*speed*dt,Math.cos(yaw)*speed*dt,.48);
    p.yaw=lerpAngle(p.yaw,yaw,1-Math.exp(-15*dt));p.motion=speed;
  }
  if(input.jump&&p.y===0)p.vy=5.2;
  if(p.y>0||p.vy>0){p.y=Math.max(0,p.y+p.vy*dt);p.vy=p.y>0?p.vy-15*dt:0;}
}

function moveTraffic(npc,dt){
  const dest=npc.path[npc.point],dx=dest[0]-npc.x,dz=dest[1]-npc.z,d=Math.hypot(dx,dz),amount=npc.speed*dt;
  if(d<=amount){npc.x=dest[0];npc.z=dest[1];npc.point=(npc.point+1)%npc.path.length;return;}
  npc.yaw=lerpAngle(npc.yaw,Math.atan2(dx,dz),1-Math.exp(-9*dt));npc.x+=dx/d*amount;npc.z+=dz/d*amount;
}

function movePatrol(npc,target,dt){
  npc.think-=dt;
  if(npc.think<=0){npc.think=1.05;npc.route=roadRoute(npc.x,npc.z,target.x,target.z).slice(1);npc.route.push([target.x,target.z]);}
  while(npc.route.length>1&&near(npc,npc.route[0],3.8))npc.route.shift();
  const p=npc.route[0];if(!p)return;
  const dx=p[0]-npc.x,dz=p[1]-npc.z,d=Math.hypot(dx,dz);
  if(d<1)return;
  npc.yaw=lerpAngle(npc.yaw,Math.atan2(dx,dz),1-Math.exp(-5*dt));
  const speed=npc.speed*(d<7?.78:1);
  displace(npc,Math.sin(npc.yaw)*speed*dt,Math.cos(npc.yaw)*speed*dt,1.34);
}

function complete(s){
  const job=JOBS[s.index];s.status='success';s.heat=0;s.patrols=[];s.events.push('success');
  s.progress.jobs=Math.max(s.progress.jobs,s.index+1);s.progress.cash+=job.reward;
  const best=s.progress.bests[s.index];s.progress.bests[s.index]=best===null?s.activeFor:Math.min(best,s.activeFor);
}

function fail(s,reason){s.status='failed';s.reason=reason;s.events.push('failed');}

function advance(s,dt){
  const job=JOBS[s.index],car=currentCar(s);
  if(!job)return;
  if(s.time!==null){
    s.time=Math.max(0,s.time-dt);s.activeFor+=dt;
    if(s.time<=0){fail(s,'You ran out of time.');return;}
  }
  if(!car)return;
  if(s.phase==='meet'&&near(car,job.pickup,7.5)){
    s.time=job.time;s.events.push('checkpoint');
    if(job.type==='delivery'){s.phase='drop';prompt(s,'Reel secured. Head to the marina!');}
    if(job.type==='race'){s.phase='race';prompt(s,'GO! Follow the pink checkpoints.');}
    if(job.type==='chase'){
      s.phase='escape';s.heat=2;s.evaded=0;
      s.patrols=[{x:-4,z:-94,yaw:Math.PI/2,speed:22,think:0,route:[]},{x:59,z:-151,yaw:0,speed:23,think:0,route:[]}];
      prompt(s,'Stay moving and keep the patrols behind you.');
    }
    return;
  }
  if(s.phase==='drop'&&near(car,job.finish,7.5)){complete(s);return;}
  if(s.phase==='race'&&near(car,job.gates[s.leg],9)){
    s.leg++;s.events.push('checkpoint');if(s.leg===job.gates.length)complete(s);
  }
  if(s.phase==='escape'){
    if(Math.abs(car.speed)>6&&s.patrols.every(p=>distance(car,p)>19))s.evaded=Math.min(18,s.evaded+dt);
    else s.evaded=Math.max(0,s.evaded-dt*.3);
    if(s.evaded>=18){s.heat=0;s.patrols=[];s.phase='garage';s.time=Math.max(s.time,50);s.events.push('checkpoint');prompt(s,'Patrols lost. Take the car back to Ocean Mile.');}
  }
  if(s.phase==='garage'&&near(car,job.finish,8))complete(s);
}

export function stepGame(state,input,dt){
  if(state.status!=='active')return;
  const s=state;dt=clamp(dt,0,.05);s.events=[];s.t+=dt;s.elapsed+=dt;s.clock=(19.7+Math.max(0,s.index)*.68+s.t*.009)%24;
  s.hintTime=Math.max(0,s.hintTime-dt);s.player.cooldown=Math.max(0,s.player.cooldown-dt);
  if(input.interact)useRide(s);
  const car=currentCar(s);if(car)drive(s,car,input,dt);else walk(s,input,dt);
  for(const npc of s.traffic)moveTraffic(npc,dt);
  for(const patrol of s.patrols)movePatrol(patrol,positionOf(s),dt);
  if(car&&car.integrity<=0){
    if(s.mode==='roam'){car.integrity=100;car.speed=car.mx=car.mz=0;prompt(s,'Your car has been repaired.');}
    else {fail(s,'Your ride is wrecked.');return;}
  }
  advance(s,dt);
}
