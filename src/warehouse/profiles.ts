export const WAREHOUSE_PROFILES=[
  {id:'warehouse',label:'Warehouse',title:'Paravoor.',subtitle:'From plan to place.',assetRoot:'./warehouse',revision:'source-racks-v2'},
  {id:'warehouse-2',label:'Warehouse 2',title:'Paravoor 02.',subtitle:'The revised ground floor.',assetRoot:'./warehouse-2',revision:'6d6ad0b8'},
] as const;
export type WarehouseProfile=typeof WAREHOUSE_PROFILES[number];
export function warehouseFromHash(hash:string){return WAREHOUSE_PROFILES.find(profile=>hash==='#'+profile.id);}
