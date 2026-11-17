export const CITY_X = [-130, -67, -4, 59, 122];
export const CITY_Z = [-165, -94, -23, 48, 119, 190];
export const ROAD = 8;
export const COAST = 151;
export const LIMITS = {left:-154, right:COAST-3, north:-196, south:213};
export const CAR_SPAWN = {x:122.8,z:108,yaw:Math.PI};
export const SPAWN = {x:115.8,z:111,yaw:Math.atan2(7,-3)};
export const PALETTES = [
  ['#ffae96','#ffd5ae','#fc87a7','#adccd9','#f6c3db'],
  ['#ffa881','#ffe3a0','#85c9c0','#b79dc4','#e6bac4'],
  ['#b5b6d5','#9abcca','#e5badc','#9ea2c8','#daceda'],
];
export const JOBS = [
  {name:'The Sunset Drop',type:'delivery',district:'Ocean Mile → Marina West',reward:650,time:90,
    intro:'A film crew left a reel at Ocean Mile. Pick it up, then get it to the marina before the premiere.',
    pickup:[122,81],finish:[-130,-40]},
  {name:'Ocean Sprint',type:'race',district:'Ocean Mile Circuit',reward:850,time:100,
    intro:'Eight checkpoints. One lap around the waterfront. Cross the last gate before the clock runs out.',
    pickup:[59,119],gates:[[122,119],[122,48],[122,-23],[59,-23],[-4,-23],[-4,48],[59,48],[59,119]]},
  {name:'After Hours',type:'chase',district:'Neon Quarter → Palm Row',reward:1200,time:85,
    intro:'The stunt crew is waiting downtown. Shake the two patrol cars, then bring your ride back to the garage.',
    pickup:[59,-94],finish:[122,108]},
];

export const PARKED = [CAR_SPAWN,
  {x:56,z:-77,yaw:0,color:'#63dcd0'}, {x:-70.5,z:89,yaw:Math.PI,color:'#f9bb62'},
  {x:-124,z:-43,yaw:0,color:'#a78de4'}, {x:63,z:149,yaw:Math.PI,color:'#f2e2be'},
];

function rand(seed){let n=seed;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
const random=rand(8603);
export const BLOCKS=[];
export const BUILDINGS=[];
const named={
  '3,1':'THE LIDO', '3,2':'SUNSET HOTEL', '3,3':'THE FLAMINGO',
  '2,1':'VICE FM', '0,1':'MARINA CLUB', '2,2':'CLUB NOVA', '3,4':'OCEAN MOTORS',
};
const parks=new Set(['0,0','1,3','2,0','0,4']);
for(let j=0;j<CITY_Z.length-1;j++)for(let i=0;i<CITY_X.length-1;i++){
  const x=CITY_X[i]+ROAD,z=CITY_Z[j]+ROAD,w=CITY_X[i+1]-CITY_X[i]-2*ROAD,d=CITY_Z[j+1]-CITY_Z[j]-2*ROAD;
  const key=`${i},${j}`,park=parks.has(key);
  BLOCKS.push({x,z,w,d,park});
  if(park)continue;
  for(let lot=0;lot<4;lot++){
    const bw=w/2-5-random()*2,bd=d/2-5-random()*2;
    const cx=x+(lot%2+.5)*w/2,cz=z+(Math.floor(lot/2)+.5)*d/2;
    const tower=(j===0||j===1&&i===1)&&lot%2===1;
    const h=tower?17+random()*19:6+random()*(i===3?6:10);
    BUILDINGS.push({x:cx-bw/2,z:cz-bd/2,w:bw,d:bd,h,color:PALETTES[tower?2:(i+j)%2][(i+lot+j)%5],
      deco:i===3||lot===0, sign:lot===1?named[key]:undefined,style:(i+2*j+lot)%3});
  }
}

export const districtAt=(x,z)=>x>95?'Ocean Mile':x< -91?'Marina West':z< -91?'Bayside Heights':z>116?'Palm Row':'Neon Quarter';
const closest=(values,n)=>values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a);
export function nearestCross(x,z){return [closest(CITY_X,x),closest(CITY_Z,z)];}
export function roadPoint(x,z){
  const [cx,cz]=nearestCross(x,z);
  return Math.abs(cx-x)<=Math.abs(cz-z)?[cx,z]:[x,cz];
}
export function roadRoute(x,z,tx,tz){
  const a=roadPoint(x,z),b=roadPoint(tx,tz),ac=nearestCross(...a),bc=nearestCross(...b);
  if(Math.abs(a[0]-b[0])<0.01||Math.abs(a[1]-b[1])<0.01)return [a,b];
  return [a,ac,[bc[0],ac[1]],bc,b].filter((p,i,list)=>!i||p[0]!==list[i-1][0]||p[1]!==list[i-1][1]);
}

export const TRAFFIC_ROUTES=[
  [0,0,1,1], [1,0,2,2], [2,0,4,1], [3,1,4,2], [1,1,3,3], [0,2,1,4],
  [2,3,4,4], [0,3,2,5], [1,3,3,5], [2,2,4,3], [0,1,2,2], [2,0,3,2], [1,2,2,4], [0,0,4,5],
].map(([i,j,k,l],n)=>{
  const x=CITY_X[i],y=CITY_X[k],z=CITY_Z[j],t=CITY_Z[l],lane=3;
  const corners=[[x+lane,z+lane],[y-lane,z+lane],[y-lane,t-lane],[x+lane,t-lane]];
  return n%2?corners:[corners[0],corners[3],corners[2],corners[1]];
});
