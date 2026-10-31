import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map<string, THREE.MeshStandardMaterial>();
export function material(color: string, metalness = .18, roughness = .66) {
  const key = `${color}-${metalness}-${roughness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, metalness, roughness }));
  return materials.get(key)!;
}
export function box(parent: THREE.Object3D, size: number[], position: number[], color: string, metal = .18) {
  const mesh = new THREE.Mesh(unitBox, material(color, metal));
  mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, r: number, h: number, pos: number[], color: string, segments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), material(color));
  mesh.position.set(pos[0], pos[1], pos[2]); mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function beam(parent: THREE.Object3D, a: number[], b: number[], radius: number, color: string) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const mesh = cylinder(parent, radius, from.distanceTo(to), [0, 0, 0], color, 6);
  mesh.position.copy(from.add(to).multiplyScalar(.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());
  return mesh;
}
export function label(parent: THREE.Object3D, text: string, width: number, height: number, pos: number[], rotation = 0, color = '#efe7d9', background?: string) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 256); }
  ctx.fillStyle = color; ctx.font = '600 120px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 132, 960);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  mesh.position.set(pos[0], pos[1], pos[2]); mesh.rotation.y = rotation; parent.add(mesh); return mesh;
}

export function container(color: string, branded = false) {
  const group = new THREE.Group();
  box(group, [12.2, 2.6, 2.44], [0, 0, 0], color);
  for (const z of [-1.25, 1.25]) {
    for (let x = -5.85; x <= 5.85; x += .33) box(group, [.075, 2.38, .075], [x, 0, z], color);
    for (const y of [-1.3, 1.3]) box(group, [12.2, .12, .13], [0, y, z], color);
    for (const x of [-6.04, 6.04]) box(group, [.15, 2.6, .14], [x, 0, z], color);
  }
  for (let x = -5.85; x <= 5.85; x += .33) box(group, [.075, .055, 2.4], [x, 1.32, 0], color);
  for (const z of [-.58, .58]) {
    box(group, [.065, 2.5, 1.15], [-6.14, 0, z], color);
    for (const offset of [-.36, .36]) box(group, [.08, 2.38, .035], [-6.19, 0, z + offset], '#858c86', .65);
  }
  if (branded) {
    label(group, 'V E S T A N O', 7.3, 1.8, [0, .12, 1.297]);
    label(group, 'V E S T A N O', 7.3, 1.8, [0, .12, -1.297], Math.PI);
    label(group, 'VSTU 240180  6', 2.3, .45, [3.9, -.8, 1.304]);
  }
  return group;
}

export function truck(region: 'china' | 'kerala' = 'china') {
  const group = new THREE.Group(); const wheels: THREE.Group[] = [];
  const paint = region === 'china' ? '#e9eff3' : '#b95b31';
  box(group, [13.4, .35, 2.65], [0, 1.7, 0], '#69706a', .6);
  for (const z of [-.88, .88]) {
    box(group, [16, .35, .22], [1, 1.24, z], '#2a302e');
    for (let x = -5.9; x < 6; x += 1.5) box(group, [.2, .2, 1.9], [x, 1.3, 0], '#424b46');
  }
  box(group, [3.8, 3.15, 2.6], [8, 2.5, 0], paint);
  box(group, [3.1, region === 'china' ? 1.05 : .35, 2.54], [7.8, 4.2, 0], paint);
  if (region === 'kerala') {
    box(group, [.7, .14, 2.95], [9.8, 4.07, 0], '#175c9e');
    box(group, [.22, .22, 2.8], [10.07, 2.66, 0], '#f3ce5a');
    box(group, [.12, .28, .7], [10.17, 1.12, 0], '#eec748');
    for (const z of [-1.325, 1.325]) {
      box(group, [3.5, .18, .04], [8, 2.54, z], '#f2d48b');
      box(group, [3.5, .1, .04], [8, 2.31, z], '#1669ac');
      box(group, [1.4, .12, .43], [8, .95, z], '#a4b2b6');
    }
    beam(group, [6.3, 3.98, -1.4], [9.3, 3.98, -1.4], .045, '#f2cc80');
    beam(group, [6.3, 3.98, 1.4], [9.3, 3.98, 1.4], .045, '#f2cc80');
  } else {
    box(group, [.08, .24, .75], [10.16, 1.1, 0], '#4a89c5');
    box(group, [2.5, .1, 2.1], [7.8, 4.8, 0], '#d0dce4');
  }
  box(group, [.08, 1.18, 2.25], [9.92, 3.35, 0], '#243a3a', .4);
  for (const z of [-1.31, 1.31]) {
    box(group, [2, 1.03, .06], [8.55, 3.35, z], '#243a3a', .4);
    box(group, [.55, .13, .08], [7.9, 2.6, z], '#434e49');
    box(group, [.24, .5, .18], [9.75, 3.1, z * 1.19], '#171e1d');
    box(group, [3.2, .25, .3], [8, 1.17, z * 1.03], '#67736b');
    box(group, [1.1, .24, .06], [9.32, 1.7, z], '#e3d9ad');
  }
  box(group, [.16, .9, 1.75], [9.98, 2, 0], '#293733');
  for (let y = 1.7; y < 2.4; y += .15) box(group, [.18, .045, 1.7], [10, y, 0], '#848e84');
  box(group, [.26, .32, 2.65], [10, 1.24, 0], '#69756e');
  box(group, [2.2, .9, 1.8], [4.8, 1, 0], '#6c7770', .6);
  for (const x of [-5, -3.6, -2.2, 5.7, 8.6]) {
    for (const z of [-1.31, 1.31]) {
      const wheel = new THREE.Group(); wheel.position.set(x, .86, z); group.add(wheel); wheels.push(wheel);
      const tire = cylinder(wheel, .77, .44, [0, 0, 0], '#1d2423', 20); tire.rotation.x = Math.PI / 2;
      const rim = cylinder(wheel, .43, .465, [0, 0, 0], '#9aa49b', 16); rim.rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) box(wheel, [.12, .12, .48], [Math.cos(i * Math.PI / 3) * .29, Math.sin(i * Math.PI / 3) * .29, 0], '#414b45');
    }
  }
  for (const x of [-6, 6]) for (const z of [-1.18, 1.18]) box(group, [.22, .2, .22], [x, 1.94, z], '#c1a365');
  return { group, wheels };
}

/** Representative product geometry, not a catalogue SKU or engineering drawing. */
export function rackEquipment(parent: THREE.Object3D, x: number, z: number, packed = false) {
  const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
  if (packed) {
    box(group, [10, .2, 2.5], [0, .22, 0], '#a48358');
    for (let i = 0; i < 9; i++) box(group, [9.5, .14, .17], [0, .45 + Math.floor(i / 3) * .2, -.7 + i % 3 * .7], '#176bc0');
    for (const dx of [-3.8, 0, 3.8]) box(group, [.06, 1.1, 2.6], [dx, .65, 0], '#d6dfe5');
    for (let i = 0; i < 5; i++) box(group, [4, .25, .25], [2, 1.2 + i * .26, 0], '#efa53e');
    return group;
  }
  for (let bay = 0; bay < 3; bay++) {
    for (const dx of [bay * 4.2, (bay + 1) * 4.2]) for (const dz of [-1.2, 1.2]) {
      box(group, [.14, 6.2, .16], [dx, 3.1, dz], '#176bc0');
      box(group, [.44, .08, .42], [dx, .08, dz], '#647781');
      for (let y = .45; y < 6; y += .3) box(group, [.025, .07, .17], [dx + .08, y, dz], '#102c4d');
    }
    for (const y of [1.6, 3.6, 5.6]) {
      for (const dz of [-1.2, 1.2]) box(group, [4.2, .23, .14], [bay * 4.2 + 2.1, y, dz], '#efa53e');
      box(group, [4.1, .08, 2.3], [bay * 4.2 + 2.1, y + .16, 0], '#a4b0b5');
      box(group, [2.3, .8, 1.6], [bay * 4.2 + 2.1, y + .6, 0], '#bba379');
    }
  }
  return group;
}

function industrialRoof(parent: THREE.Object3D, width: number, depth: number, height: number, pos: number[], sawtooth = false) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0);
  shape.lineTo(sawtooth ? width / 2 : 0, height); shape.closePath();
  const raw = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  const geometry = mergeVertices(raw); raw.dispose(); geometry.translate(0, 0, -depth / 2);
  const roof = new THREE.Mesh(geometry, material(sawtooth ? '#537999' : '#a75b40'));
  roof.position.set(pos[0], pos[1], pos[2]); roof.castShadow = true; roof.receiveShadow = true; parent.add(roof);
  if (sawtooth) {
    box(parent, [.08, height * .7, depth - 1], [pos[0] + width / 2 + .05, pos[1] + height * .5, pos[2]], '#a3c4da');
  } else {
    for (let dz = -depth / 2; dz <= depth / 2; dz += .9) {
      beam(parent, [pos[0] - width / 2, pos[1] + .04, pos[2] + dz], [pos[0], pos[1] + height + .04, pos[2] + dz], .055, '#bd7552');
      beam(parent, [pos[0], pos[1] + height + .04, pos[2] + dz], [pos[0] + width / 2, pos[1] + .04, pos[2] + dz], .055, '#bd7552');
    }
    beam(parent, [pos[0], pos[1] + height + .12, pos[2] - depth / 2], [pos[0], pos[1] + height + .12, pos[2] + depth / 2], .14, '#884432');
  }
}

export function regionalDistrict(parent: THREE.Object3D, x: number, z: number, region: 'china' | 'kerala', heading?: string) {
  const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
  if (region === 'china') {
    for (let i = 0; i < 3; i++) {
      box(group, [24, 10, 18], [i * 30, 5, 0], '#c5d1d9');
      for (let roof = 0; roof < 3; roof++) industrialRoof(group, 8, 20, 2.8, [i * 30 - 8 + roof * 8, 10, 0], true);
      for (const dx of [-12, 12]) box(group, [.5, 10.5, 18.5], [i * 30 + dx, 5.25, 0], '#567f9c');
      for (let j = 0; j < 6; j++) box(group, [2.7, 1.5, .09], [i * 30 - 9 + j * 3.6, 7.7, -9.1], '#648da8');
      for (const dx of [-7, 7]) {
        const duct = cylinder(group, .7, 4, [i * 30 + dx, 13, 6], '#aabac4');
        duct.add(new THREE.Mesh(new THREE.SphereGeometry(.7, 8, 6), material('#aabac4')));
      }
    }
    // Repeated office windows and large clean factory blocks make a distinct skyline.
    for (let i = 0; i < 6; i++) {
      const dx = -30 + i * 24, h = 20 + i % 3 * 7;
      box(group, [17, h, 16], [dx, h / 2, 49 + i % 2 * 17], '#bdcbd4');
      for (let floor = 3; floor < h; floor += 3) box(group, [16, 1.25, .1], [dx, floor, 40.9 + i % 2 * 17], '#5f829c');
      box(group, [18, .7, 17], [dx, h, 49 + i % 2 * 17], '#416a8c');
    }
    for (let i = 0; i < 20; i++) {
      box(group, [.15, 3, .15], [-21 + i * 5, 1.5, -15], '#5c7383');
      beam(group, [-21 + i * 5, 2.8, -15], [-16 + i * 5, 2.8, -15], .04, '#6b8291');
    }
    label(group, heading ?? 'CHINA  /  RACK MANUFACTURING', 32, 2.2, [25, 5, -9.2], Math.PI, '#ffffff', '#176bc0');
  } else {
    for (let i = 0; i < 4; i++) {
      const dx = i * 19;
      box(group, [16, 6, 12], [dx, 3, 0], i % 2 ? '#e7decb' : '#e0e5dd');
      industrialRoof(group, 18.5, 15, 3.4, [dx, 6.1, 0]);
      box(group, [17, .3, 3.1], [dx, 4.9, -7], '#b9cabd');
      for (const pillar of [-7.4, 7.4]) box(group, [.28, 4.7, .28], [dx + pillar, 2.35, -8.2], '#e5dcc5');
      box(group, [7, 4.8, 5], [dx + 5, 2.4, 9], '#d7ddc8');
      cylinder(group, .9, 1.5, [dx + 5, 5.65, 9], '#303a3d');
      for (let j = 0; j < 3; j++) box(group, [3.4, 3.6, .12], [dx - 5 + j * 5, 2.1, -6.1], '#536b72');
      palm(group, dx - 9, 9, .9);
    }
    // Low, varied residential/commercial rooflines instead of the Chinese office blocks.
    for (let i = 0; i < 8; i++) {
      const dx = -29 + i * 16, h = 4 + i % 3 * 2;
      box(group, [12, h, 12], [dx, h / 2, 31 + i % 2 * 10], ['#e5dcc5','#d4ded7','#d9d5ba'][i%3]);
      industrialRoof(group, 14, 14, 2.8, [dx, h, 31 + i % 2 * 10]);
      for (const side of [-3.5, 3.5]) box(group, [2.2, 1.7, .12], [dx + side, h - 2, 24.9 + i % 2 * 10], '#4c7277');
      if (i % 2 === 0) palm(group, dx + 7.5, 23, 1.05);
    }
    label(group, 'KERALA  /  WAREHOUSE DISTRICT', 28, 2, [22, 4.4, -6.3], Math.PI, '#ffffff', '#176bc0');
  }
  return group;
}

export function cargoShip() {
  const group = new THREE.Group();
  // A shaped hull with a tapered bow, full beam amidships and a raised forecastle.
  const outline = new THREE.Shape();
  outline.moveTo(-39, -6); outline.lineTo(-35, -7.7); outline.lineTo(29, -7.7);
  outline.quadraticCurveTo(39, -5.5, 43, 0); outline.quadraticCurveTo(39, 5.5, 29, 7.7);
  outline.lineTo(-35, 7.7); outline.lineTo(-39, 6); outline.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(outline, { depth: 5.8, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .75, bevelThickness: .4 });
  hullGeo.rotateX(Math.PI / 2); hullGeo.translate(0, 4.3, 0);
  const hull = new THREE.Mesh(hullGeo, material('#1f3939', .5, .43)); hull.castShadow = true; group.add(hull);
  box(group, [65, 1.3, 15], [-3, -.1, 0], '#774338');
  box(group, [69, .25, 14.2], [-2, 4.5, 0], '#7d8a7a');
  const colors = ['#9b6549', '#b4b39b', '#425b52', '#a87850', '#6b7871', '#647e7f'];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) for (let level = 0; level < 2; level++) {
    const x = -25 + col * 13, z = -6.2 + row * 3.1;
    const item = container(colors[(row * 3 + col + level * 2) % colors.length]);
    item.position.set(x, 5.95 + level * 2.73, z); group.add(item);
  }
  // The shipment sits on tier three at x=14,z=-6.2, visible above two supporting tiers.
  box(group, [8.6, 9, 12.3], [-32, 8.9, 0], '#d8ddcf');
  box(group, [10.8, 2.1, 14.5], [-32, 14.3, 0], '#e6e7d9');
  box(group, [.07, .9, 12.7], [-26.57, 14.5, 0], '#334a47');
  for (const z of [-7.29, 7.29]) box(group, [9.2, .9, .08], [-31.8, 14.5, z], '#334a47');
  box(group, [2.4, 5.8, 3], [-35, 16.2, 0], '#d1c49d');
  box(group, [2.5, 1, 3.1], [-35, 19.3, 0], '#353d38');
  beam(group, [-28, 15, 0], [-28, 21, 0], .09, '#b5bca9');
  beam(group, [-30.5, 19.5, 0], [-25.5, 19.5, 0], .075, '#b5bca9');
  for (const z of [-7.5, 7.5]) {
    beam(group, [-38, 5.5, z], [33, 5.5, z], .045, '#b8c0b1');
    for (let x = -38; x < 34; x += 3) beam(group, [x, 4.5, z], [x, 5.5, z], .035, '#b8c0b1');
  }
  box(group, [7, .45, 8], [32, 4.75, 0], '#7d8a7a');
  for (const z of [-3, 3]) cylinder(group, .65, .8, [33, 5.4, z], '#344b42');
  label(group, 'V E S T A N O', 14, 2, [14, 2.45, 7.98]);
  label(group, 'V E S T A N O', 14, 2, [14, 2.45, -7.98], Math.PI);
  return group;
}

export function crane(x: number, small = false) {
  const group = new THREE.Group(); group.position.x = x;
  const height = small ? 23 : 36;
  const back = small ? 45 : 30, front = small ? 8 : -43;
  const steel = small ? '#8b9580' : '#a9b2a1';
  for (const side of [-9, 9]) {
    for (const z of [back, small ? 8 : -5]) {
      box(group, [1, height, 1.2], [side, height / 2, z], steel);
      box(group, [3, 1.1, 7], [side, .9, z], '#4d5d53');
      for (const dz of [-2, 2]) {
        const tire = cylinder(group, .65, 1.1, [side, .6, z + dz], '#26302a'); tire.rotation.z = Math.PI / 2;
      }
    }
    box(group, [.9, 1, back - front], [side, height, (back + front) / 2], steel);
    for (let z = front; z < back; z += 7) {
      beam(group, [side, height, z], [side, height + 2.2, z + 3.5], .16, steel);
      beam(group, [side, height + 2.2, z + 3.5], [side, height, Math.min(back, z + 7)], .16, steel);
    }
    box(group, [.7, .7, back - front], [side, height + 2.3, (back + front) / 2], steel);
    if (!small) {
      beam(group, [side, 35, -4], [side, 48, 7], .45, steel);
      beam(group, [side, 48, 7], [side, 35, 26], .45, steel);
      beam(group, [side, 48, 7], [side, 36, -40], .065, '#b4bbaf');
      beam(group, [side, 48, 7], [side, 36, 30], .065, '#b4bbaf');
    }
  }
  for (const z of [back, small ? 8 : -5]) {
    box(group, [19, 1, 1.2], [0, height - 2, z], steel);
    // Open portals keep the container handling lane clear below the crossbeam.
    beam(group, [-9, height - 6, z], [-4, height - 2, z], .23, steel);
    beam(group, [9, height - 6, z], [4, height - 2, z], .23, steel);
  }
  const moving = new THREE.Group(); group.add(moving);
  const spreader = new THREE.Group(); box(spreader, [12.4, .35, 2.7], [0, 0, 0], '#c69c55'); moving.add(spreader);
  const trolley = box(group, [19, 1.3, 4.2], [0, height + 1, 16], '#586657');
  const ropes = Array.from({ length: 4 }, (_, i) => {
    const rope = new THREE.Mesh(unitBox, material('#383f38')); group.add(rope);
    return { mesh: rope, dx: i < 2 ? -5.3 : 5.3, dz: i % 2 ? -1 : 1 };
  });
  return {
    group,
    update(position: [number, number, number]) {
      const localX = position[0] - x;
      spreader.position.set(localX, position[1], position[2]); trolley.position.z = position[2];
      ropes.forEach(({ mesh, dx, dz }) => {
        const top = height + .5, length = Math.max(.1, top - position[1]);
        mesh.position.set(localX + dx, position[1] + length / 2, position[2] + dz);
        mesh.scale.set(.048, length, .048);
      });
    },
  };
}

/** Illustrative luffing harbour crane. Boom and hoist solve from the load position;
 * the spreader swivels independently so the container remains aligned to the trailer. */
export function harbourCrane(x: number, z: number) {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const base = new THREE.Group(); group.add(base);
  box(base, [12, 1.4, 7], [0, 1.5, 0], '#1d4775');
  box(base, [7, 2.4, 5], [0, 3, 0], '#d6e1e6');
  cylinder(base, 2.1, 1, [0, 4.7, 0], '#546c7c', 24);
  for (const dx of [-5, 5]) for (const dz of [-3.7, 3.7]) {
    const wheel = cylinder(base, 1, 1, [dx, 1, dz], '#25333b', 16); wheel.rotation.x = Math.PI / 2;
  }
  for (const dx of [-8.8, 8.8]) for (const dz of [-7, 7]) {
    beam(base, [dx > 0 ? 4 : -4, 1.7, dz > 0 ? 2.4 : -2.4], [dx, 1.7, dz], .38, '#c3aa60');
    box(base, [.55, 1.6, .55], [dx, .9, dz], '#758c9a');
    box(base, [2.1, .25, 2.1], [dx, .18, dz], '#263d50');
  }
  batchStatic(base);
  const turret = new THREE.Group(); turret.position.y = 6; group.add(turret);
  box(turret, [6, 2.5, 5], [-2.5, 0, 0], '#d9e5e9');
  box(turret, [4, 3.8, 5.8], [-6.7, .2, 0], '#d3a34b');
  box(turret, [3.2, 2.6, 2.2], [1.5, .6, 3], '#e1e9ea');
  box(turret, [2.5, 1.5, .06], [1.7, 1, 4.14], '#406c88');
  box(turret, [.06, 1.5, 1.8], [3.13, 1, 3], '#406c88');
  const boom = new THREE.Group(); turret.add(boom);
  for (const side of [-.75, .75]) {
    for (const h of [-.75, .75]) beam(boom, [0, h, side], [50, h, side], .14, '#d4a849');
    for (let i = 0; i < 50; i += 4) {
      beam(boom, [i, -.75, side], [Math.min(50, i + 4), .75, side], .09, '#d4a849');
      beam(boom, [i, .75, side], [Math.min(50, i + 4), -.75, side], .09, '#d4a849');
    }
  }
  const pulley = box(boom, [1, 2.1, 2.1], [50, 0, 0], '#476279');
  // Preserve a named pivot after batching for alignment checks and future asset swaps.
  const pulleyPivot = new THREE.Object3D(); pulleyPivot.position.copy(pulley.position); pulleyPivot.name = 'harbour-pulley'; boom.add(pulleyPivot);
  batchStatic(boom);
  const spreader = new THREE.Group(); spreader.name = 'harbour-spreader'; group.add(spreader);
  box(spreader, [12.4, .35, 2.7], [0, 0, 0], '#d6aa4c');
  box(spreader, [2.1, .65, 1], [0, 3.3, 0], '#d3a34b');
  for (const dx of [-5.3, 5.3]) for (const dz of [-1, 1]) {
    beam(spreader, [0, 3.3, 0], [dx, .15, dz], .045, '#485c69');
    box(spreader, [.3, .35, .3], [dx, -.15, dz], '#576d77');
  }
  batchStatic(spreader);
  const cable = new THREE.Mesh(unitBox, material('#364955')); cable.name = 'harbour-hoist-cable'; group.add(cable);
  return {
    group,
    update(position: [number, number, number], yaw = 0) {
      const dx = position[0] - x, dz = position[2] - z, reach = Math.hypot(dx, dz);
      const rise = Math.sqrt(Math.max(1, 50 * 50 - reach * reach));
      turret.rotation.y = -Math.atan2(dz, dx); boom.rotation.z = Math.atan2(rise, reach);
      spreader.position.set(dx, position[1], dz); spreader.rotation.y = yaw;
      const top = 6 + rise, bottom = position[1] + 3.65;
      cable.position.set(dx, (top + bottom) / 2, dz); cable.scale.set(.09, Math.max(.1, top - bottom), .09);
    },
  };
}

export function warehouse(parent: THREE.Object3D, x: number, z: number, destination = false, region: 'china' | 'kerala' = 'china') {
  const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
  box(group, [48, 12, 29], [0, 6, 0], region === 'china' ? '#bccedb' : '#e4ddc8');
  if (region === 'china') {
    for (let roof = 0; roof < 4; roof++) industrialRoof(group, 12.5, 31, 4.2, [-18.75 + roof * 12.5, 12, 0], true);
    for (let dx = -23; dx <= 23; dx += .65) box(group, [.055, 11.7, .15], [dx, 5.9, -14.6], '#8ca9bb');
    for (const side of [-1, 1]) {
      box(group, [.35, 11.8, 29], [side * 24, 5.9, 0], '#507da4');
      for (let dz = -12; dz < 14; dz += 4) box(group, [.1, 2.3, 2.8], [side * 24.2, 8.7, dz], '#7199b4');
    }
    box(group, [7, 4.5, 7], [30, 2.25, -17], '#d5e0e5');
    box(group, [8, .4, 8], [30, 4.7, -17], '#356c9c');
    box(group, [5.8, 1.5, .1], [30, 3.2, -20.6], '#4b7b9a');
    for (const dx of [-27, -31]) cylinder(group, 1.25, 8, [dx, 4, 5], '#9cabb4');
    label(group, 'RACK EQUIPMENT  /  FACTORY', 24, 1.4, [0, 14, -15.6], Math.PI, '#f2f7fc');
  } else {
    industrialRoof(group, 52, 34, 5.6, [0, 12, 0]);
    box(group, [51, .32, 3.7], [0, 8.6, -16.2], '#8fa89b');
    for (const dx of [-24.5, 24.5]) {
      box(group, [.42, 8.4, .42], [dx, 4.2, -17.3], '#d4c8aa');
      box(group, [.16, .2, 29], [dx, 11.9, 0], '#8b6950');
      box(group, [.14, 11.7, .14], [dx, 5.85, -14], '#786c54');
    }
    box(group, [7, 6.2, 11], [29, 3.1, 1], '#d1dbd0');
    industrialRoof(group, 9, 13, 2.8, [29, 6.2, 1]);
    box(group, [3, 2.2, .12], [29, 3.9, -4.6], '#537a73');
    for (const dx of [-30, 38]) palm(group, dx, 11, 1.1);
  }
  for (let dx = -17; dx <= 17; dx += 17) {
    box(group, [10, 7.8, .2], [dx, 4.1, -14.7], '#56645b');
    for (let y = .6; y < 8; y += .5) box(group, [9.8, .045, .08], [dx, y, -14.85], '#84917e');
    box(group, [11.5, .4, 3.5], [dx, .45, -16], '#899183');
    for (const side of [-5.5, 5.5]) box(group, [.3, 1.5, .3], [dx + side, 1.2, -17], '#c8a953');
  }
  label(group, destination ? 'V E S T A N O  /  DELIVERY' : 'V E S T A N O  /  LOGISTICS', 27, 2.8, [0, 10.3, -14.85], Math.PI, '#263a33');
  return group;
}

export function palm(parent: THREE.Object3D, x: number, z: number, scale = 1) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); parent.add(group);
  const trunk = cylinder(group, .25, 11, [0, 5.5, 0], '#716b4e', 8); trunk.rotation.z = -.08;
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const points = [new THREE.Vector3(0, 11, 0), new THREE.Vector3(Math.cos(angle) * 3, 12.4, Math.sin(angle) * 3), new THREE.Vector3(Math.cos(angle) * 5, 10, Math.sin(angle) * 5)];
    const curve = new THREE.CatmullRomCurve3(points);
    const leaf = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, .34, 3, false), material('#465d46')); group.add(leaf);
    for (let k = 1; k < 6; k++) {
      const t = k / 6, mid = curve.getPoint(t);
      for (const side of [-1, 1]) beam(group, mid.toArray(), [mid.x + Math.cos(angle + Math.PI / 2) * side * .8, mid.y - .4, mid.z + Math.sin(angle + Math.PI / 2) * side * .8], .08, '#4c654a');
    }
  }
}

/** Merge static opaque meshes by material: detailed industrial geometry, few draw calls. */
export function batchStatic(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const grouped = new Map<THREE.Material, THREE.BufferGeometry[]>(); const removed: THREE.Mesh[] = [];
  const sourceGeometries = new Set<THREE.BufferGeometry>();
  root.traverse(obj => {
    if (!(obj instanceof THREE.Mesh) || Array.isArray(obj.material) || !(obj.material instanceof THREE.MeshStandardMaterial)) return;
    const geo = obj.geometry.clone().applyMatrix4(inverse.clone().multiply(obj.matrixWorld));
    if (obj.geometry !== unitBox) sourceGeometries.add(obj.geometry);
    const list = grouped.get(obj.material) ?? []; list.push(geo); grouped.set(obj.material, list); removed.push(obj);
  });
  removed.forEach(mesh => mesh.removeFromParent());
  const result = new THREE.Group();
  grouped.forEach((geometries, mat) => {
    const geo = mergeGeometries(geometries, false);
    if (geo) { const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; result.add(mesh); }
    geometries.forEach(g => g.dispose());
  });
  sourceGeometries.forEach(geo => geo.dispose());
  root.add(result); return root;
}

export function disposeAssetCache() {
  unitBox.dispose(); materials.forEach(mat => mat.dispose()); materials.clear();
}
