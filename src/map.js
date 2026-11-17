import {BLOCKS,BUILDINGS,CITY_X,CITY_Z,COAST,LIMITS,ROAD,roadRoute} from './city.js';
import {currentCar,goalOf,positionOf,clamp} from './game.js';

const width=COAST-LIMITS.left,height=LIMITS.south-LIMITS.north;
function plan(c,detailed=false){
  const rect=(color,x,z,w,h)=>{c.fillStyle=color;c.fillRect(x,z,w,h);};
  rect(detailed?'#4d7585':'#233c57',-900,-900,2200,2200);
  rect(detailed?'#a28a8c':'#443550',LIMITS.left,LIMITS.north-7,width,height+14);
  rect(detailed?'#e5ba97':'#8b6369',139,LIMITS.north-7,12,height+14);
  for(const x of CITY_X)rect(detailed?'#453948':'#6e5874',x-ROAD,LIMITS.north-7,ROAD*2,height+14);
  for(const z of CITY_Z)rect(detailed?'#42384a':'#6b5871',LIMITS.left,z-ROAD,284,ROAD*2);
  for(const b of BLOCKS)rect(b.park?(detailed?'#849575':'#4a635e'):(detailed?'#b9a1a6':'#55445d'),b.x,b.z,b.w,b.d);
  for(const b of BUILDINGS){
    if(detailed)rect('#291d385b',b.x+3,b.z+4,b.w+1,b.d+1);
    rect(detailed?b.color:'#6e5a77',b.x,b.z,b.w,b.d);
    if(detailed)rect('#fff0df',b.x+1.1,b.z+1.1,b.w-2.2,.72);
  }
  if(detailed){
    c.fillStyle='#e8bb83';
    for(const x of CITY_X)for(let z=-191;z<212;z+=11)if(CITY_Z.every(k=>Math.abs(z-k)>8))c.fillRect(x-.18,z,.36,4.5);
    for(const z of CITY_Z)for(let x=-151;x<134;x+=11)if(CITY_X.every(k=>Math.abs(x-k)>8))c.fillRect(x,z-.18,4.5,.36);
    for(let z=-194;z<214;z+=10){c.beginPath();c.ellipse(136,z,2.2,2.45,(z%3)*.23,0,Math.PI*2);c.fillStyle=z%2?'#4b766e':'#6b9a73';c.fill();}
  }
}
function glyph(c,x,z,yaw,scale,fill,edge){
  c.save();c.translate(x,z);c.rotate(-yaw);c.scale(scale,scale);c.beginPath();c.moveTo(0,5.4);c.lineTo(-3,-3.6);c.lineTo(0,-2.15);c.lineTo(3,-3.6);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=edge;c.lineWidth=.8;c.stroke();c.restore();
}
function diamond(c,x,z,r,color){
  c.fillStyle=color;c.beginPath();c.moveTo(x,z-r);c.lineTo(x+r,z);c.lineTo(x,z+r);c.lineTo(x-r,z);c.closePath();c.fill();
}
export function miniMap(canvas){
  const buffer=document.createElement('canvas');buffer.width=buffer.height=canvas.width;
  const bg=buffer.getContext('2d'),c=canvas.getContext('2d');if(!bg||!c)return ()=>{};
  const scale=canvas.width/(height+35),offsetX=canvas.width/2-(LIMITS.left+COAST)*scale/2,offsetY=canvas.height/2-(LIMITS.north+LIMITS.south)*scale/2;
  bg.setTransform(scale,0,0,scale,offsetX,offsetY);plan(bg);
  return state=>{
    const p=positionOf(state),goal=goalOf(state);c.setTransform(1,0,0,1,0,0);c.drawImage(buffer,0,0);
    c.setTransform(scale,0,0,scale,offsetX,offsetY);
    if(goal){
      const [x,z]=goal.point,route=roadRoute(p.x,p.z,x,z),color=goal.color==='gold'?'#ffd09c':goal.color==='mint'?'#88ffe1':'#ff91c7';
      c.strokeStyle=color;c.lineWidth=3.3;c.setLineDash([5.5,5]);c.beginPath();c.moveTo(p.x,p.z);for(const [a,b] of route)c.lineTo(a,b);c.lineTo(x,z);c.stroke();c.setLineDash([]);diamond(c,x,z,6.8,color);
    }
    for(const patrol of state.patrols)diamond(c,patrol.x,patrol.z,5.3,'#ff759a');
    glyph(c,p.x,p.z,p.yaw,1.9,'#e9fff6','#222131');
  };
}
export function createTopDown(host){
  const canvas=document.createElement('canvas');canvas.className='world-canvas';canvas.setAttribute('aria-label','Vice Coast top-down playable city');
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas is unavailable');
  host.replaceChildren(canvas);let w=0,h=0,scale=4,ratio=1,center={x:0,z:0};
  const resize=()=>{w=host.clientWidth||innerWidth;h=host.clientHeight||innerHeight;ratio=Math.min(devicePixelRatio,1.75);canvas.width=Math.floor(w*ratio);canvas.height=Math.floor(h*ratio);scale=clamp(Math.min(w,h)/115,2.7,8);};
  new ResizeObserver(resize).observe(host);resize();
  const vehicle=(car,color,lights=false)=>{
    c.save();c.translate(car.x,car.z);c.rotate(-car.yaw);
    c.fillStyle='#231c2dbc';c.fillRect(-1.43,-2.7,2.86,5.4);
    c.fillStyle=color;c.fillRect(-1.12,-2.25,2.24,4.5);
    c.fillStyle='#45435b';c.fillRect(-.84,-1.26,1.68,2.39);
    c.fillStyle='#ff4579';c.fillRect(-1.06,-2.27,2.12,.3);
    c.fillStyle='#fff2bd';c.fillRect(-.98,1.92,.55,.34);c.fillRect(.43,1.92,.55,.34);
    if(lights){c.fillStyle='#74e3fb';c.fillRect(-1.03,-.25,2.06,.48);}
    c.restore();
  };
  return {kind:'2D',canvas,reset(){},
    draw(s){
      const p=positionOf(s),car=currentCar(s);center=p;c.setTransform(ratio*scale,0,0,ratio*scale,ratio*(w/2-p.x*scale),ratio*(h/2-p.z*scale));plan(c,true);
      const goal=goalOf(s);
      if(goal){
        const [x,z]=goal.point;c.strokeStyle=goal.color==='gold'?'#ffc976':'#ff76bb';c.lineWidth=.5;c.beginPath();c.arc(x,z,5.7+Math.sin(s.t*3)*.6,0,Math.PI*2);c.stroke();diamond(c,x,z,2.1,c.strokeStyle);
      }
      s.traffic.forEach((npc,i)=>vehicle(npc,['#edad85','#80c8bf','#dfbbd3','#f0df9f'][i%4]));
      s.cars.forEach(ride=>vehicle(ride,ride.color));s.patrols.forEach(npc=>vehicle(npc,'#55607d',Math.floor(s.t*10)%2===0));
      if(!car)glyph(c,p.x,p.z,p.yaw,.47,'#aaffdc','#261b39');
    },
    marker(x,z){return {x:clamp((x-center.x)*scale/w+.5,.08,.92),y:clamp((z-center.z)*scale/h+.5,.16,.67)};},
  };
}
