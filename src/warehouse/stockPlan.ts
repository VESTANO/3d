import type {Footprint,WarehouseLayout} from './layout';
import {insidePolygon,insetOutline} from './layout.ts';

export type StockKind='sack'|'packet'|'case'|'tin'|'jar'|'oil-bottle'|'water-bottle'|'detergent'|'paper-roll';
export type StockStyle='rice'|'flour'|'pulses'|'oils'|'water'|'groceries'|'cleaning'|'paper'|'chilli'|'turmeric'|'coriander'|'cumin'|'pepper'|'rice-flour'|'gram-flour'|'semolina'|'sugar'|'salt'|'tea'|'coffee'|'biscuits'|'noodles'|'detergent-powder'|'puttu-powder'|'appam-powder'|'idiyappam-powder'|'coconut-oil'|'banana-chips'|'papad'|'jaggery'|'sambar'|'garam-masala'|'chickpeas'|'green-gram'|'toor-dal'|'pickles'|'coconut-milk'|'rusk'|'mixture'|'dishwash-bar';
export const RICE_VARIETIES=['matta','jaya','ponni','kaima'] as const;
export type RiceVariety=typeof RICE_VARIETIES[number];
export const RICE_NAMES:Record<RiceVariety,string>={matta:'KERALA MATTA RICE',jaya:'JAYA RICE',ponni:'PONNI RICE',kaima:'KAIMA RICE'};
export interface StockPlacement {
  owner:string; support:'rack'|'pallet'|'display'|'wall';kind:StockKind;style:StockStyle;
  x:number;z:number;w:number;d:number;h:number;bottom:number;
  riceVariety?:RiceVariety;rotation?:number;
}
export const SHELF_LEVELS=[.2,1.12,2.12,2.98] as const;
// Perimeter rack bays now come from actual CAD edges in data.racks.
// D RACK hatch strokes remain floor markings rather than invented shelf runs.
export const WALL_STORAGE:Footprint[]=[];
export const STOCK_STYLES:StockStyle[]=['rice','flour','pulses','oils','groceries','water','cleaning','paper','chilli','turmeric','coriander','cumin','pepper','rice-flour','gram-flour','semolina','sugar','salt','tea','coffee','biscuits','noodles','detergent-powder','puttu-powder','appam-powder','idiyappam-powder','coconut-oil','banana-chips','papad','jaggery','sambar','garam-masala','chickpeas','green-gram','toor-dal','pickles','coconut-milk','rusk','mixture','dishwash-bar'];
export const STOCK_NAMES:Record<StockStyle,string>={rice:'RICE',flour:'WHEAT FLOUR / ATTA',pulses:'PULSES',oils:'COOKING OIL',water:'DRINKING WATER',groceries:'PROVISION CARTON',cleaning:'HOUSEHOLD CLEANER',paper:'PAPER GOODS',chilli:'CHILLI POWDER',turmeric:'TURMERIC POWDER',coriander:'CORIANDER POWDER',cumin:'CUMIN POWDER',pepper:'BLACK PEPPER','rice-flour':'RICE FLOUR','gram-flour':'GRAM FLOUR',semolina:'RAVA / SEMOLINA',sugar:'SUGAR',salt:'IODISED SALT',tea:'TEA',coffee:'COFFEE',biscuits:'BISCUITS',noodles:'NOODLES','detergent-powder':'DETERGENT POWDER','puttu-powder':'PUTTU POWDER','appam-powder':'APPAM POWDER','idiyappam-powder':'IDIYAPPAM POWDER','coconut-oil':'COCONUT OIL','banana-chips':'BANANA CHIPS',papad:'PAPPADAM',jaggery:'JAGGERY',sambar:'SAMBAR POWDER','garam-masala':'GARAM MASALA',chickpeas:'CHICKPEAS','green-gram':'GREEN GRAM','toor-dal':'TOOR DAL',pickles:'PICKLE','coconut-milk':'COCONUT MILK',rusk:'TOAST RUSK',mixture:'SNACK MIXTURE','dishwash-bar':'DISHWASH BAR'};
export const KERALA_SECTIONS:{name:string;color:string;styles:StockStyle[]}[]=[
  {name:'SPICES & MASALA',color:'#b94631',styles:['chilli','turmeric','coriander','cumin','pepper','sambar','garam-masala']},
  {name:'BREAKFAST FLOURS',color:'#268a70',styles:['puttu-powder','appam-powder','idiyappam-powder','rice-flour','gram-flour','semolina','flour']},
  {name:'PULSES & PANTRY',color:'#a77937',styles:['pulses','toor-dal','green-gram','chickpeas','sugar','salt','jaggery']},
  {name:'TEA & COFFEE',color:'#47633f',styles:['tea','coffee','rusk','sugar']},
  {name:'SNACKS & PACKETS',color:'#cf8c26',styles:['banana-chips','papad','biscuits','mixture','noodles']},
  {name:'OILS & PICKLES',color:'#b18c2e',styles:['coconut-oil','oils','pickles','coconut-milk']},
  {name:'DAILY PROVISIONS',color:'#387793',styles:['groceries','water','salt','sugar']},
  {name:'HOUSEHOLD CARE',color:'#6678a3',styles:['cleaning','detergent-powder','paper','dishwash-bar']},
];
export const rackSectionIndex=(rack:Footprint)=>Math.max(0,Math.min(KERALA_SECTIONS.length-1,Math.round((rack.x-5.086)/3.25)));

function packFor(style:StockStyle):[StockKind,number,number,number]{
  if(style==='rice')return['sack',.43,.45,.3];
  if(style==='coconut-oil'||style==='oils')return['oil-bottle',.17,.19,.36];
  if(style==='water')return['water-bottle',.17,.19,.33];
  if(style==='cleaning')return['detergent',.2,.2,.34];
  if(style==='paper')return['paper-roll',.21,.21,.26];
  if(style==='groceries')return['case',.38,.32,.3];
  if(style==='pickles')return['jar',.16,.16,.24];
  if(style==='coconut-milk')return['tin',.16,.16,.23];
  if(style==='papad')return['packet',.26,.24,.16];
  if(style==='dishwash-bar')return['packet',.23,.16,.11];
  if(['flour','puttu-powder','appam-powder','idiyappam-powder','rice-flour','gram-flour','semolina'].includes(style))return['packet',.27,.25,.38];
  if(style==='banana-chips'||style==='mixture')return['packet',.22,.19,.33];
  if(style==='jaggery')return['packet',.2,.2,.22];
  return['packet',.19,.2,.29];
}

/** Adds merchandise only. This function never changes a fixture or source coordinate.
 * x/z are the goods envelope, with an inset from every original rack/pallet edge. */
export function createStockPlan(data:WarehouseLayout):StockPlacement[]{
  const goods:StockPlacement[]=[];
  function row(owner:Footprint,support:StockPlacement['support'],bottom:number,style:StockStyle,kind:StockKind,maxW:number,maxD:number,height:number,packing:{riceVariety?:RiceVariety;rotation?:number}={}){
    const outline=owner.outline?insetOutline(owner.outline,.045):null;
    const margin=.065,usableW=owner.w-margin*2,usableD=owner.d-margin*2,gap=.035;
    const columns=Math.max(1,Math.floor((usableW+gap)/(maxW+gap)));
    const rows=Math.max(1,Math.floor((usableD+gap)/(maxD+gap)));
    const w=Math.min(maxW,(usableW-(columns-1)*gap)/columns),d=Math.min(maxD,(usableD-(rows-1)*gap)/rows);
    const startX=owner.x+(owner.w-columns*w-(columns-1)*gap)/2,startZ=owner.z+(owner.d-rows*d-(rows-1)*gap)/2;
    for(let c=0;c<columns;c++){
      const x=startX+c*(w+gap);
      const place=(z:number)=>{
        if(outline&&![[x,z],[x+w,z],[x+w,z+d],[x,z+d]].every(p=>insidePolygon(p[0],p[1],outline)))return false;
        goods.push({owner:owner.id,support,kind,style,x,z,w,d,h:height,bottom,...packing});return true;
      };
      let placed=false;for(let r=0;r<rows;r++)placed=place(startZ+r*(d+gap))||placed;
      // A diagonal shelf can fit cartons along its centreline even when none
      // of the ordinary rectangular grid rows land inside its sloping edges.
      if(!placed&&outline){
        const cx=x+w/2,crossings=outline.flatMap((a,i)=>{const b=outline[(i+1)%outline.length],dx=b[0]-a[0];return Math.abs(dx)>.00001&&cx>=Math.min(a[0],b[0])&&cx<=Math.max(a[0],b[0])?[a[1]+(cx-a[0])/dx*(b[1]-a[1])]:[];});
        if(crossings.length>=2)place((Math.min(...crossings)+Math.max(...crossings)-d)/2);
      }
    }
  }
  function shelf(owner:Footprint,support:StockPlacement['support'],bottom:number,style:StockStyle){
    const [kind,w,d,h]=packFor(style),layers=style==='papad'?3:style==='dishwash-bar'?3:1;
    for(let layer=0;layer<layers;layer++)row(owner,support,bottom+layer*(h+.002),style,kind,w,d,h);
  }
  data.racks.forEach(b=>{
    const section=KERALA_SECTIONS[rackSectionIndex(b)].styles;
    const offset=Math.floor(b.z/1.8);
    SHELF_LEVELS.forEach((level,tier)=>{
      shelf(b,'rack',level+.026,section[(tier+offset)%section.length]);
    });
  });
  const ordered=[...data.pallets].sort((a,b)=>a.x-b.x||a.z-b.z);
  const varieties=new Map(ordered.map((pallet,index)=>[pallet.id,RICE_VARIETIES[Math.min(3,Math.floor(index/Math.ceil(ordered.length/4)))]]));
  data.pallets.forEach(b=>{
    // Rice-only pallets, with cross-tied layers and one rice variety per pallet.
    for(let layer=0;layer<5;layer++)row(b,'pallet',.258+layer*.23,'rice','sack',.51,.51,.23,{riceVariety:varieties.get(b.id),rotation:layer%2?Math.PI/2:0});
  });
  data.pods.forEach((b,i)=>{
    const styles:StockStyle[]=['banana-chips','papad','puttu-powder','coconut-oil','pickles','coconut-milk','jaggery','appam-powder'];
    shelf(b,'display',.86,styles[i%styles.length]);
  });
  WALL_STORAGE.forEach((b,i)=>{
    const styles:StockStyle[]=i?['flour','salt','sugar','groceries']:['chilli','turmeric','coriander','cumin'];
    [.55,1.25,1.95,2.65].forEach((level,tier)=>row(b,'wall',level+.031,styles[tier],'packet',.17,.23,.33));
  });
  return goods;
}
