import type {Footprint,WarehouseLayout} from './layout';

export type StockKind='sack'|'packet'|'case'|'tin'|'oil-bottle'|'water-bottle'|'detergent'|'paper-roll';
export type StockStyle='rice'|'flour'|'pulses'|'oils'|'water'|'groceries'|'cleaning'|'paper'|'chilli'|'turmeric'|'coriander'|'cumin'|'pepper'|'rice-flour'|'gram-flour'|'semolina'|'sugar'|'salt'|'tea'|'coffee'|'biscuits'|'noodles'|'detergent-powder';
export interface StockPlacement {
  owner:string; support:'rack'|'pallet'|'display'|'wall';kind:StockKind;style:StockStyle;
  x:number;z:number;w:number;d:number;h:number;bottom:number;
}
export const SHELF_LEVELS=[.2,1.12,2.12,2.98] as const;
export const WALL_STORAGE:Footprint[]=[
  {id:'wall-storage-west',x:3.4,z:6.3,w:.55,d:24.9,layer:'D RACK'},
  {id:'wall-storage-lower',x:7.7,z:34.1,w:.55,d:10.3,layer:'D RACK'},
];
export const STOCK_STYLES:StockStyle[]=['rice','flour','pulses','oils','groceries','water','cleaning','paper','chilli','turmeric','coriander','cumin','pepper','rice-flour','gram-flour','semolina','sugar','salt','tea','coffee','biscuits','noodles','detergent-powder'];
export const STOCK_NAMES:Record<StockStyle,string>={rice:'RICE',flour:'WHEAT FLOUR',pulses:'PULSES',oils:'COOKING OIL',water:'DRINKING WATER',groceries:'GROCERIES',cleaning:'HOUSEHOLD',paper:'PAPER GOODS',chilli:'CHILLI POWDER',turmeric:'TURMERIC POWDER',coriander:'CORIANDER POWDER',cumin:'CUMIN POWDER',pepper:'PEPPER POWDER','rice-flour':'RICE FLOUR','gram-flour':'GRAM FLOUR',semolina:'RAVA / SEMOLINA',sugar:'SUGAR',salt:'SALT',tea:'TEA',coffee:'COFFEE',biscuits:'BISCUITS',noodles:'NOODLES','detergent-powder':'DETERGENT POWDER'};
const shelfKind=(style:StockStyle):StockKind=>style==='rice'?'sack':style==='oils'?'oil-bottle':style==='water'?'water-bottle':style==='cleaning'?'detergent':style==='paper'?'paper-roll':'packet';
const RACK_SECTIONS:StockStyle[][]=[
  ['chilli','turmeric','coriander','cumin'],
  ['flour','rice-flour','gram-flour','semolina'],
  ['pepper','pulses','salt','sugar'],
  ['tea','coffee','biscuits','noodles'],
  ['groceries','biscuits','tea','coffee'],
  ['oils','water','groceries','oils'],
  ['cleaning','detergent-powder','paper','cleaning'],
  ['turmeric','chilli','flour','groceries'],
];

/** Adds merchandise only. This function never changes a fixture or source coordinate.
 * x/z are the goods envelope, with an inset from every original rack/pallet edge. */
export function createStockPlan(data:WarehouseLayout):StockPlacement[]{
  const goods:StockPlacement[]=[];
  function row(owner:Footprint,support:StockPlacement['support'],bottom:number,style:StockStyle,kind:StockKind,maxW:number,maxD:number,height:number){
    const margin=.065,usableW=owner.w-margin*2,usableD=owner.d-margin*2,gap=.035;
    const columns=Math.max(1,Math.floor((usableW+gap)/(maxW+gap)));
    const rows=Math.max(1,Math.floor((usableD+gap)/(maxD+gap)));
    const w=Math.min(maxW,(usableW-(columns-1)*gap)/columns),d=Math.min(maxD,(usableD-(rows-1)*gap)/rows);
    const startX=owner.x+(owner.w-columns*w-(columns-1)*gap)/2,startZ=owner.z+(owner.d-rows*d-(rows-1)*gap)/2;
    for(let c=0;c<columns;c++)for(let r=0;r<rows;r++)goods.push({owner:owner.id,support,kind,style,x:startX+c*(w+gap),z:startZ+r*(d+gap),w,d,h:height,bottom});
  }
  data.racks.forEach(b=>{
    // Related packets share a rack section, with a distinct product on each tier.
    const section=RACK_SECTIONS[Math.max(0,Math.round((b.x-5.1)/3.25))%RACK_SECTIONS.length];
    SHELF_LEVELS.forEach((level,tier)=>{
      const style=section[tier],kind=shelfKind(style);
      if(kind==='case')row(b,'rack',level+.026,style,kind,.43,.5,.29);
      else if(kind==='sack')row(b,'rack',level+.026,style,kind,.43,.45,.3);
      else if(kind==='packet')row(b,'rack',level+.026,style,kind,.2,.21,.32);
      else if(kind==='tin')row(b,'rack',level+.026,style,kind,.16,.16,.23);
      else if(kind==='paper-roll')row(b,'rack',level+.026,style,kind,.21,.21,.26);
      else row(b,'rack',level+.026,style,kind,.17,.19,kind==='water-bottle'?.31:.34);
    });
  });
  data.pallets.forEach(b=>{
    // Every existing pallet carries rice sacks; the original pallet footprint stays fixed.
    for(let layer=0;layer<5;layer++)row(b,'pallet',.258+layer*.237,'rice','sack',.51,.51,.225);
  });
  data.pods.forEach((b,i)=>{
    const style=(['chilli','turmeric','flour','groceries','biscuits'] as StockStyle[])[i%5];
    row(b,'display',.86,style,'packet',.19,.22,.35);
  });
  WALL_STORAGE.forEach((b,i)=>{
    const styles:StockStyle[]=i?['flour','salt','sugar','groceries']:['chilli','turmeric','coriander','cumin'];
    [.55,1.25,1.95,2.65].forEach((level,tier)=>row(b,'wall',level+.031,styles[tier],'packet',.17,.23,.33));
  });
  return goods;
}
