import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDINGS,JOBS,LIMITS} from '../src/city.js';
import {clearAt,currentCar,goalOf,newGame,readProgress,stepGame} from '../src/game.js';

const frame=(state,input={})=>stepGame(state,input,1/60);
function driveTo(state,[x,z]){
  for(let frameIndex=0;frameIndex<60*24&&state.status==='active';frameIndex++){
    const car=currentCar(state),dx=x-car.x,dz=z-car.z,d=Math.hypot(dx,dz);
    if(d<4)return;
    const heading=Math.atan2(dx,dz),error=Math.atan2(Math.sin(heading-car.yaw),Math.cos(heading-car.yaw));
    const speed=Math.min(26,4+d*.59,6+18/(1+Math.abs(error)*8));
    frame(state,{up:car.speed<speed,down:car.speed>speed+2,left:error>.037,right:error<-.037,brake:Math.abs(error)>.67&&car.speed>8});
  }
  assert.notEqual(state.status,'failed',state.reason);
  if(state.status==='active')assert.ok(Math.hypot(x-currentCar(state).x,z-currentCar(state).z)<4,'Test driver did not reach the checkpoint');
}

test('walk, jump, enter a car, accelerate, brake and exit',()=>{
  const s=newGame('roam');assert.equal(s.phase,'roam');assert.equal(goalOf(s),null);
  frame(s,{jump:true,up:true,heading:s.player.yaw});assert.ok(s.player.y>0);assert.equal(s.player.motion,6);
  frame(s,{interact:true});const car=currentCar(s);assert.equal(car.id,0);assert.equal(s.player.y,0);
  for(let i=0;i<90;i++)frame(s,{up:true});assert.ok(car.speed>10);
  frame(s,{interact:true});assert.strictEqual(currentCar(s),car);assert.match(s.hint,/Slow down/);
  for(let i=0;i<90;i++)frame(s,{brake:true});assert.ok(car.speed<2);
  frame(s,{interact:true});assert.equal(currentCar(s),null);assert.ok(clearAt(s.player.x,s.player.z,.48));
});

test('solid lots and the shoreline block high-speed motion',()=>{
  const s=newGame('roam');s.traffic=[];frame(s,{interact:true});const car=currentCar(s),b=BUILDINGS[1];
  Object.assign(car,{x:b.x-3,z:b.z+b.d/2,yaw:Math.PI/2,speed:36,mx:36,mz:0});
  for(let i=0;i<30;i++)frame(s,{up:true});
  assert.ok(car.x<=b.x-1.419);assert.ok(car.integrity<100);assert.ok(clearAt(car.x,car.z,1.42));
  Object.assign(car,{x:LIMITS.right-2.4,z:112,yaw:Math.PI/2,speed:36,mx:36,mz:0});
  for(let i=0;i<30;i++)frame(s,{up:true});assert.ok(car.x<=LIMITS.right-1.419);
});

test('a full drive through the courier, race and chase unlocks each next job and records rewards once',()=>{
  const routes=[
    [[122,81],[122,48],[-130,48],[-130,-40]],
    [[122,48],[59,48],[59,119],...JOBS[1].gates],
    [[122,48],[122,-94],[59,-94],[59,-23],[59,48],[-67,48],[-67,119],[-67,190],[122,190],[122,108]],
  ];
  let progress,earnings=0;
  routes.forEach((route,index)=>{
    const s=newGame('story',index,progress);
    assert.equal(s.time,null);assert.equal(s.phase,'meet');frame(s,{interact:true});
    if(index===1){driveTo(s,route[0]);assert.equal(s.time,null);}
    const visited=new Set();
    for(const point of (index===1?route.slice(1):route)){
      driveTo(s,point);visited.add(s.phase);
      if(s.phase==='escape'){assert.equal(s.heat,2);assert.equal(s.patrols.length,2);}
    }
    assert.equal(s.status,'success',JOBS[index].name);assert.equal(s.heat,0);
    if(index===1)assert.equal(s.leg,8);
    if(index===2){assert.ok(visited.has('escape'));assert.ok(visited.has('garage'));assert.equal(s.patrols.length,0);}
    earnings+=JOBS[index].reward;
    assert.equal(s.progress.jobs,index+1);assert.equal(s.progress.cash,earnings);assert.ok(s.progress.bests[index]>0);
    for(let i=0;i<120;i++)frame(s);assert.equal(s.progress.cash,earnings);
    progress=readProgress(JSON.parse(JSON.stringify(s.progress)));
  });
  assert.equal(progress.jobs,3);assert.equal(progress.cash,2700);
});

test('running out of time is retryable and does not award cash',()=>{
  const s=newGame();for(let i=0;i<900;i++)frame(s);assert.equal(s.time,null);
  frame(s,{interact:true});driveTo(s,JOBS[0].pickup);assert.equal(s.phase,'drop');
  s.time=.01;frame(s);assert.equal(s.status,'failed');assert.match(s.reason,/time/);assert.equal(s.progress.cash,0);
  const retry=newGame(s.mode,s.index,s.progress);assert.equal(retry.status,'active');assert.equal(retry.time,null);assert.equal(retry.cars[0].integrity,100);
});

test('bad save data cannot corrupt the next run',()=>{
  assert.deepEqual(readProgress({jobs:99,cash:-10,bests:[-1,3,'bad'],sound:false}),{jobs:3,cash:0,bests:[null,3,null],sound:false});
  assert.deepEqual(readProgress('bad input'),newGame().progress);
});
