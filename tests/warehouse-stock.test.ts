import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import type {WarehouseLayout} from '../src/warehouse/layout.ts';
import {createStockPlan,SHELF_LEVELS,STOCK_STYLES,WALL_STORAGE} from '../src/warehouse/stockPlan.ts';

const data=JSON.parse(fs.readFileSync('public/warehouse/layout.json','utf8')) as WarehouseLayout;
test('merchandise stays inside the original fixtures and does not alter the CAD layout',()=>{
  const before=JSON.stringify(data),stock=createStockPlan(data);
  assert.equal(JSON.stringify(data),before);
  const owners=new Map([...data.racks,...data.pallets,...data.pods,...WALL_STORAGE].map(b=>[b.id,b]));
  for(const item of stock){
    const owner=owners.get(item.owner)!;assert.ok(owner);
    assert.ok(item.x>=owner.x+.06&&item.z>=owner.z+.06);
    assert.ok(item.x+item.w<=owner.x+owner.w-.06+1e-8);
    assert.ok(item.z+item.d<=owner.z+owner.d-.06+1e-8);
    assert.ok(item.h>0&&item.bottom>=0);
  }
  for(const owner of owners.values())assert.ok(stock.some(item=>item.owner===owner.id),`Empty storage ${owner.id}`);
  for(const bay of data.racks)for(const level of SHELF_LEVELS)assert.ok(stock.some(item=>item.owner===bay.id&&Math.abs(item.bottom-level-.026)<1e-7));
  for(const style of STOCK_STYLES)assert.ok(stock.some(item=>item.style===style));
});
test('stock packages cannot overlap on a shelf or within a pallet stack',()=>{
  const groups=new Map<string,ReturnType<typeof createStockPlan>>();
  for(const item of createStockPlan(data)){const key=item.owner+':'+item.bottom;const row=groups.get(key)??[];row.push(item);groups.set(key,row);}
  for(const row of groups.values())for(let i=0;i<row.length;i++)for(let j=i+1;j<row.length;j++){
    const a=row[i],b=row[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.z+a.d<=b.z||b.z+b.d<=a.z,'Intersecting merchandise');
  }
});
test('stock addition retains the exact source drawing, layout and plan extract',()=>{
  const lock=JSON.parse(fs.readFileSync('tests/fixtures/warehouse-layout-lock.json','utf8')) as Record<string,string>;
  for(const [file,expected]of Object.entries(lock))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),expected,`${file} was changed`);
});
test('billing correction does not rearrange any existing racks, pallets, pods or perimeter',()=>{
  const lock=JSON.parse(fs.readFileSync('tests/fixtures/warehouse-storage-lock.json','utf8')) as Record<string,string>;
  for(const [key,expected]of Object.entries(lock))assert.equal(crypto.createHash('sha256').update(JSON.stringify(data[key as keyof WarehouseLayout])).digest('hex'),expected,key+' changed');
});
test('all pallets carry rice and racks include the requested supermarket powder packets',()=>{
  const goods=createStockPlan(data),palletGoods=goods.filter(g=>g.support==='pallet');
  assert.ok(palletGoods.length>0);assert.ok(palletGoods.every(g=>g.kind==='sack'&&g.style==='rice'));
  for(const pallet of data.pallets)assert.ok(palletGoods.some(g=>g.owner===pallet.id));
  for(const style of ['chilli','turmeric','flour','coriander','cumin','pepper','rice-flour','gram-flour','semolina','biscuits','noodles']){
    assert.ok(goods.some(g=>g.support==='rack'&&g.kind==='packet'&&g.style===style),style+' packets missing');
  }
});
