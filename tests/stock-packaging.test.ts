import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STOCK_STYLES,RICE_VARIETIES} from '../src/warehouse/stockPlan.ts';
import {createPackagingAtlas,PACKAGING_SHEETS,PACKAGING_KEYS,PACKAGING_COLUMNS,PACKAGING_TILE_SIZE,PACKAGING_ATLAS_ROWS} from '../src/warehouse/stockPackaging.ts';

function jpegDimensions(bytes:Buffer){
  assert.equal(bytes.readUInt16BE(0),0xffd8,'Packaging must be a real JPEG, not a missing-image placeholder');
  let position=2;
  while(position<bytes.length){
    assert.equal(bytes[position],0xff);const marker=bytes[position+1],length=bytes.readUInt16BE(position+2);
    if(marker===0xc0||marker===0xc2)return {width:bytes.readUInt16BE(position+7),height:bytes.readUInt16BE(position+5)};
    position+=length+2;
  }
  throw new Error('JPEG dimensions not found');
}

test('all grocery and rice varieties have a unique photographic tile in shipped image files',()=>{
  assert.equal(new Set(PACKAGING_KEYS).size,44);
  assert.deepEqual(new Set(PACKAGING_KEYS),new Set([...STOCK_STYLES,...RICE_VARIETIES.map(variety=>'variety:'+variety)]));
  let bytes=0;
  for(const sheet of PACKAGING_SHEETS){
    assert.equal(sheet.keys.length,sheet.rows*PACKAGING_COLUMNS);
    const image=fs.readFileSync('public/'+sheet.src.slice(2)),dimensions=jpegDimensions(image);bytes+=image.length;
    assert.equal(dimensions.width,PACKAGING_COLUMNS*PACKAGING_TILE_SIZE);
    assert.equal(dimensions.height,sheet.rows*PACKAGING_TILE_SIZE);
    assert.ok(image.length>10000,'Product images must contain detailed artwork');
  }
  assert.ok(bytes<2_000_000,'Keep packaging download below 2 MB on phones');
  assert.ok(PACKAGING_ATLAS_ROWS*PACKAGING_TILE_SIZE<=4096,'Do not exceed the mobile texture budget');
});

class TestImage{
  src='';listeners=new Map<string,()=>void>();
  addEventListener(name:string,listener:()=>void){this.listeners.set(name,listener);}
  removeEventListener(name:string){this.listeners.delete(name);}
  emit(name:string){this.listeners.get(name)?.call(this);}
}

test('images that finish after the first frame repaint their correct atlas rows and request a render',()=>{
  const previous=globalThis.document,images:TestImage[]=[],painted:{image:TestImage;box:number[]}[]=[];
  Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{
    createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(image:TestImage,...box:number[]){painted.push({image,box});}})}),
    createElementNS:()=>{const image=new TestImage();images.push(image);return image;},
  }});
  try{
    let renders=0;const atlas=createPackagingAtlas(()=>{renders++;}),initialVersion=atlas.texture.version;
    assert.deepEqual(images.map(image=>image.src),PACKAGING_SHEETS.map(sheet=>sheet.src));
    assert.equal(atlas.state.loaded,0);
    // Downloads may finish in any order. Food labels must not be assigned by
    // completion order, and each upload must wake the otherwise idle renderer.
    for(const index of [2,0,1])images[index].emit('load');
    assert.deepEqual(painted.map(call=>call.box),[[0,2048,1024,768],[0,0,1024,1024],[0,1024,1024,1024]]);
    assert.deepEqual(painted.map(call=>call.image),[images[2],images[0],images[1]]);
    assert.equal(atlas.state.loaded,3);assert.equal(renders,3);assert.equal(atlas.texture.version,initialVersion+3);
    assert.deepEqual(atlas.state.failed,[]);atlas.texture.dispose();
  }finally{Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:previous});}
});

test('leaving a warehouse cancels late packaging repaints and image errors are recorded',()=>{
  const previous=globalThis.document,images:TestImage[]=[];let painted=0,renders=0;
  Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{
    createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){painted++;}})}),
    createElementNS:()=>{const image=new TestImage();images.push(image);return image;},
  }});
  try{
    const atlas=createPackagingAtlas(()=>{renders++;});images[0].emit('error');
    assert.deepEqual(atlas.state.failed,[PACKAGING_SHEETS[0].src]);assert.equal(renders,1);
    atlas.texture.dispose();const version=atlas.texture.version;
    images[1].emit('load');images[2].emit('error');
    assert.equal(painted,0);assert.equal(renders,1);assert.equal(atlas.texture.version,version);assert.equal(atlas.state.failed.length,1);
  }finally{Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:previous});}
});
