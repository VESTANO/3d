import fs from 'node:fs';
import path from 'node:path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const source = process.argv[2];
if (!source) throw new Error('Pass the DWG path as the first argument.');
const sourceDirectory=process.argv[3]??'cad-source';
const publicDirectory=process.argv[4]??'public/warehouse';
fs.mkdirSync(sourceDirectory, {recursive:true});
fs.mkdirSync(publicDirectory, {recursive:true});
const bytes = fs.readFileSync(source);
fs.writeFileSync(path.join(sourceDirectory,'paravoor.dwg'), bytes);
const parser = await LibreDwg.create(path.resolve('node_modules/@mlightcad/libredwg-web/wasm').replaceAll('\\','/')+'/');
const pointer = parser.dwg_read_data(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), Dwg_File_Type.DWG);
if (!pointer) throw new Error('The DWG parser could not open the drawing.');
const { database, stats } = parser.convertEx(pointer);
const stringify = (value, space) => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item, space);
fs.writeFileSync(path.join(sourceDirectory,'paravoor.raw.json'), stringify(database));
fs.writeFileSync(path.join(sourceDirectory,'conversion-stats.json'), JSON.stringify(stats,null,2));
if(process.argv[3]===undefined)try { fs.writeFileSync(path.join(publicDirectory,'original-plan.svg'),parser.dwg_to_svg(database)); } catch (error) { console.warn('SVG preview:',error.message); }
parser.dwg_free(pointer);
console.log(stringify({sourceDirectory,publicDirectory,keys:Object.keys(database),stats,entityCount:database.entities?.length,tables:Object.keys(database.tables??{})},2));
