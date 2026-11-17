import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const html=await readFile('dist/index.html','utf8');
const script=html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/);
const style=html.match(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/);
assert.ok(script&&style,'The game build should have one entry script and one stylesheet.');
const file=reference=>path.join('dist',reference.replace(/^\.\//,'').replace(/^\//,''));
const js=await readFile(file(script[1]),'utf8'),css=await readFile(file(style[1]),'utf8');
const assets=await readdir('dist/assets');
assert.equal(assets.filter(name=>name.endsWith('.js')).length,1,'Offline mode must have no external chunks.');
const cover=assets.find(name=>/^vice-coast-cover-.*\.jpg$/.test(name));
assert.ok(cover&&css.includes(cover),'The cover image did not make it into the game build.');
const uri='data:image/jpeg;base64,'+(await readFile(path.join('dist/assets',cover))).toString('base64');
const embedded=css.replace(/url\((?:'|")?[^)'" ]*vice-coast-cover-[^)'" ]*\.jpg(?:'|")?\)/,()=>`url("${uri}")`);
const license=await readFile('node_modules/three/LICENSE','utf8');
const ready=html.replace(script[0],()=>`<script type="module">\n${js.replaceAll('</script','<\\/script')}\n</script>`)
  .replace(style[0],()=>`<style>\n${embedded}\n</style>`).replace('</body>',()=>`<!-- Three.js license:\n${license.replaceAll('--','—')}\n-->\n</body>`);
assert.ok(!/<script\b[^>]*\bsrc=/.test(ready)&&!/\bhref="[^" ]*assets\//.test(ready)&&!embedded.includes(cover),'The offline copy refers to an external build file.');
await mkdir('deliverables',{recursive:true});
await writeFile('deliverables/Play Vice Coast.html',ready);
console.log(`Offline game: deliverables/Play Vice Coast.html (${Math.round(Buffer.byteLength(ready)/1024)} KB)`);
