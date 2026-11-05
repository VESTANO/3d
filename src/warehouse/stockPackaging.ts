import * as THREE from 'three';
import type {StockStyle,RiceVariety} from './stockPlan';

export type PackagingKey=StockStyle|`variety:${RiceVariety}`;
export const PACKAGING_COLUMNS=4;
export const PACKAGING_TILE_SIZE=256;
export const PACKAGING_ATLAS_ROWS=16;
// Row-major order in the generated artwork. Keep these keys beside the files:
// a changed tile order must never put the wrong product picture on a package.
export const PACKAGING_SHEETS:{src:string;rows:number;keys:PackagingKey[]}[]=[
  {src:'./warehouse-stock/kerala-spices-breakfast-v1.jpg',rows:4,keys:[
    'chilli','turmeric','coriander','cumin',
    'pepper','sambar','garam-masala','gram-flour',
    'puttu-powder','appam-powder','idiyappam-powder','rice-flour',
    'flour','semolina','banana-chips','papad',
  ]},
  {src:'./warehouse-stock/kerala-pantry-snacks-v1.jpg',rows:4,keys:[
    'pulses','chickpeas','green-gram','toor-dal',
    'sugar','salt','jaggery','tea',
    'coffee','biscuits','rusk','mixture',
    'noodles','coconut-oil','oils','pickles',
  ]},
  {src:'./warehouse-stock/kerala-rice-household-v1.jpg',rows:3,keys:[
    'variety:matta','variety:jaya','variety:ponni','variety:kaima',
    'rice','groceries','coconut-milk','water',
    'cleaning','detergent-powder','paper','dishwash-bar',
  ]},
];
export const PACKAGING_KEYS=PACKAGING_SHEETS.flatMap(sheet=>sheet.keys);

/** Load local photographic packaging into one shared mobile-sized GPU texture.
 * Loading each sheet invalidates the render-on-change scene. Pending callbacks
 * stop touching the canvas after disposal when changing warehouse routes. */
export function createPackagingAtlas(invalidate:()=>void=()=>{}){
  const canvas=document.createElement('canvas');
  canvas.width=PACKAGING_COLUMNS*PACKAGING_TILE_SIZE;
  canvas.height=PACKAGING_ATLAS_ROWS*PACKAGING_TILE_SIZE;
  const context=canvas.getContext('2d')!;
  context.fillStyle='#f3eddf';context.fillRect(0,0,canvas.width,canvas.height);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const state={loaded:0,failed:[] as string[]};
  let disposed=false,row=0;
  texture.addEventListener('dispose',()=>{disposed=true;});
  const loader=new THREE.ImageLoader();
  for(const sheet of PACKAGING_SHEETS){
    const y=row*PACKAGING_TILE_SIZE;row+=sheet.rows;
    loader.load(sheet.src,image=>{
      if(disposed)return;
      context.drawImage(image,0,y,canvas.width,sheet.rows*PACKAGING_TILE_SIZE);
      texture.needsUpdate=true;state.loaded++;invalidate();
    },undefined,()=>{
      if(disposed)return;
      state.failed.push(sheet.src);invalidate();
    });
  }
  return {texture,state};
}
