import fs from 'node:fs';
import path from 'node:path';
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

const source = process.argv[2];
if (!source) throw new Error('Pass the DWG path as the first argument.');
fs.mkdirSync('cad-source', {recursive:true});
fs.mkdirSync('public/warehouse', {recursive:true});
const bytes = fs.readFileSync(source);
fs.writeFileSync('cad-source/paravoor.dwg', bytes);
const parser = await LibreDwg.create(path.resolve('node_modules/@mlightcad/libredwg-web/wasm').replaceAll('\\','/')+'/');
const pointer = parser.dwg_read_data(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength), Dwg_File_Type.DWG);
if (!pointer) throw new Error('The DWG parser could not open the drawing.');
const { database, stats } = parser.convertEx(pointer);
const stringify = (value, space) => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item, space);
fs.writeFileSync('cad-source/paravoor.raw.json', stringify(database));
fs.writeFileSync('cad-source/conversion-stats.json', JSON.stringify(stats,null,2));
try { fs.writeFileSync('public/warehouse/original-plan.svg',parser.dwg_to_svg(database)); } catch (error) { console.warn('SVG preview:',error.message); }
parser.dwg_free(pointer);
console.log(stringify({keys:Object.keys(database),stats,entityCount:database.entities?.length,tables:Object.keys(database.tables??{}),sample:database.entities?.slice(0,3)},2));
