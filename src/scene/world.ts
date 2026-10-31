import * as THREE from 'three';
import { batchStatic, box, cargoShip, container, crane, harbourCrane, label, material, palm, rackEquipment, regionalDistrict, truck, warehouse } from './assets';
import type { JourneyMode } from '../journey/timeline';
import { sampleJourney, between } from '../journey/timeline';

export function createWorld(scene: THREE.Scene, mobile: boolean, invalidate: () => void = () => {}) {
  const landscape = new THREE.Group(); scene.add(landscape);
  const originRoad = new THREE.Group(), arrivalRoad = new THREE.Group(); scene.add(originRoad, arrivalRoad);
  const concrete = '#818c7b', asphalt = '#4d5851';
  // Locally generated aggregate adds surface detail without image requests.
  for (const [color, repeats] of [[concrete, 26], [asphalt, 70]] as const) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!, data = ctx.createImageData(128, 128); let seed = 71;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const value = 220 + seed % 36; data.data[i] = data.data[i + 1] = data.data[i + 2] = value; data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0); const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeats, repeats);
    const surface = material(color); surface.map = texture; surface.bumpMap = texture; surface.bumpScale = .07; surface.roughness = .95;
  }
  for (const [x, width] of [[-100, 250], [416, 300]]) {
    const road = x < 0 ? originRoad : arrivalRoad;
    box(landscape, [width, 2.5, 230], [x, -1.4, 100], concrete);
    box(landscape, [width, 3.2, 3], [x, -.7, -13.8], '#58695d');
    box(road, [width, .08, 10], [x, .02, 0], asphalt);
    for (let dx = x - width / 2 + 4; dx < x + width / 2; dx += 8) {
      box(road, [3.5, .04, .12], [dx, .09, 0], '#d1cbb0');
      if (dx % 3 < 1) box(landscape, [.4, .5, 2], [dx, .3, -11.8], '#b5a475');
    }
    for (const z of [-5.1, 5.1]) box(road, [width, .04, .12], [x, .08, z], '#c2c4a5');
    for (const z of [-5, 26]) for (const offset of [-9.1, 9.1]) box(landscape, [40, .09, .1], [x + offset, .07, z], '#c4c6b1');
  }
  for (const x of [-178, -166, -154]) rackEquipment(landscape, x, 42, true);
  rackEquipment(landscape, 472, 43);
  rackEquipment(landscape, 480, 33, true);
  const chinaOrigin = new THREE.Group(), keralaOrigin = new THREE.Group(), chinaArrival = new THREE.Group(), keralaArrival = new THREE.Group();
  warehouse(chinaOrigin, -159, 66, false, 'china'); warehouse(keralaOrigin, -159, 66, false, 'kerala');
  warehouse(chinaArrival, 453, 67, true, 'china'); warehouse(keralaArrival, 453, 67, true, 'kerala');
  regionalDistrict(chinaOrigin, -175, 100, 'china'); regionalDistrict(keralaOrigin, -175, 100, 'kerala');
  regionalDistrict(chinaArrival, 418, 103, 'china', 'INTERNATIONAL  /  CUSTOMER FACILITY'); regionalDistrict(keralaArrival, 418, 103, 'kerala');
  box(keralaOrigin, [145, .08, 60], [-144, .02, 128], '#7f9666');
  box(keralaArrival, [150, .08, 70], [453, .02, 134], '#7f9666');
  scene.add(batchStatic(chinaOrigin), batchStatic(keralaOrigin), batchStatic(chinaArrival), batchStatic(keralaArrival));
  box(landscape, [30, .08, 42], [453, .04, 33], asphalt);
  const colors = ['#9a644c', '#677b74', '#a49e7c', '#455e56', '#b08050'];
  for (const terminal of [-75, 372]) {
    for (let row = 0; row < (mobile ? 3 : 4); row++) for (let col = 0; col < 5; col++) {
      const height = (col + row) % 3 + 1;
      for (let level = 0; level < height; level++) {
        const cargo = container(colors[(col + row * 2 + level) % colors.length]);
        cargo.position.set(terminal + col * 13, 1.4 + level * 2.75, 38 + row * 5);
        landscape.add(cargo);
      }
    }
  }
  // The tracked container starts in this dedicated open stack bay.
  for (let i = 0; i < 3; i++) {
    const cargo = container(colors[i]); cargo.position.set(-132, 1.4 + i * 2.75, 35); landscape.add(cargo);
  }
  for (const x of [-195, -163, -66, 24, 280, 316, 408, 507, 538]) {
    box(landscape, [.22, 15, .22], [x, 7.5, 26], '#5c695b');
    box(landscape, [3.5, .15, .6], [x, 15, 25], '#d6d5b9');
    box(landscape, [1.7, .6, 1.1], [x, .35, 26], '#9ba38c');
  }
  for (const x of [-20, 10, 288, 312]) {
    box(landscape, [5, .3, .5], [x, .3, -12], '#3e4e46');
    box(landscape, [.3, 1, .5], [x - 1.5, .7, -12], '#3e4e46');
    box(landscape, [.3, 1, .5], [x + 1.5, .7, -12], '#3e4e46');
  }
  const originGreen = new THREE.Group(), arrivalGreen = new THREE.Group();
  for (let i = 0; i < 17; i++) {
    palm(arrivalGreen, 278 + i * 16, 78 + Math.sin(i * 6) * 12, .8 + (i % 3) * .15);
    if (i < 9) palm(originGreen, -207 + i * 16, 94, .95);
  }
  // Region-specific factories, rooflines and skylines live in their own groups;
  // avoid the previous repeated generic blocks behind both countries.
  const originSign = label(landscape, 'INTERNATIONAL TERMINAL', 24, 2.2, [-57, 5, 27], 0, '#dedbc1', '#344b42');
  const arrivalSign = label(landscape, 'KOCHI  /  KERALA', 23, 2.2, [376, 5, 27], 0, '#dedbc1', '#344b42');
  batchStatic(landscape);
  batchStatic(originRoad); batchStatic(arrivalRoad);
  scene.add(batchStatic(originGreen), batchStatic(arrivalGreen));
  // Mode-specific landscape detail is kept separate from the static batching.
  // Both ports are representative environments, not a geographical reconstruction.
  const smallCrane = crane(-112, true), departureCrane = crane(-30), destinationCrane = harbourCrane(358, -2);
  scene.add(smallCrane.group, departureCrane.group, destinationCrane.group);
  for (const x of [-68, -94, 294, 269]) {
    const backgroundCrane = crane(x); backgroundCrane.update([x, 23, -20]);
    scene.add(batchStatic(backgroundCrane.group));
  }
  const shipment = container('#126bca'); scene.add(shipment);
  const logo = new THREE.TextureLoader().load('./vestano-logo.png', invalidate); logo.colorSpace = THREE.SRGBColorSpace;
  const logoMaterial = new THREE.MeshBasicMaterial({map: logo});
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.21), logoMaterial);
    decal.position.set(-1.8, 0, side * 1.31); decal.rotation.y = side < 0 ? Math.PI : 0; shipment.add(decal);
    label(shipment, 'RACK EQUIPMENT', 3.8, .7, [2.7, .3, side * 1.32], side < 0 ? Math.PI : 0);
    label(shipment, 'CHINA  /  KERALA', 3.5, .45, [2.7, -.55, side * 1.32], side < 0 ? Math.PI : 0, '#f3c56e');
  }
  // Batch the corrugation while retaining the branded texture planes.
  batchStatic(shipment);
  const originTrucks = [truck('china'), truck('kerala')], lastTrucks = [truck('kerala'), truck('china')];
  [...originTrucks, ...lastTrucks].forEach(vehicle => scene.add(vehicle.group));
  const ship = cargoShip(); scene.add(batchStatic(ship));
  const waterGeometry = new THREE.PlaneGeometry(2400, 1800, mobile ? 100 : 180, mobile ? 70 : 110);
  waterGeometry.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeometry, new THREE.ShaderMaterial({
    uniforms: { uProgress: { value: 0 }, uSun: { value: new THREE.Vector3(-100, 60, -150) } },
    vertexShader: `uniform float uProgress; varying vec3 vWorld; varying vec3 vNormal; void main(){
      vec3 p=position; float t=uProgress*100.;
      p.y+=sin(p.x*.09+t)*.14+sin(p.z*.17+t*.7)*.11+sin(p.x*.27+p.z*.18+t)*.055;
      vNormal=normalize(vec3(-cos(p.x*.09+t)*.0126-cos(p.x*.27+p.z*.18+t)*.01485,1.,-cos(p.z*.17+t*.7)*.0187-cos(p.x*.27+p.z*.18+t)*.0099));
      vWorld=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.); }`,
    fragmentShader: `varying vec3 vWorld; varying vec3 vNormal; uniform vec3 uSun;
      void main(){ vec3 view=normalize(cameraPosition-vWorld); vec3 n=normalize(vNormal);
      float fres=pow(1.-max(dot(view,n),0.),3.); float glint=pow(max(dot(reflect(-normalize(uSun),n),view),0.),90.);
      vec3 color=mix(vec3(.10,.22,.22),vec3(.48,.53,.46),fres*.75);
      color+=vec3(.8,.61,.36)*glint*.6;
      float fog=1.-exp(-length(cameraPosition-vWorld)*.0011); color=mix(color,vec3(.57,.60,.53),fog);
      gl_FragColor=vec4(color,1.); }`,
  }));
  water.position.set(130, -.36, -820); scene.add(water);
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uStrength: { value: 0 }, uProgress: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float uStrength; uniform float uProgress; void main(){
      float width=(1.-vUv.x)*.45+.05; float edge=abs(vUv.y-.5);
      float lines=pow(max(0.,sin((edge/width)*12.+vUv.x*26.-uProgress*60.)),8.);
      float alpha=smoothstep(width+.04,width-.04,edge)*lines*(1.-vUv.x)*uStrength*.24;
      gl_FragColor=vec4(.73,.79,.71,alpha); }`,
  }));
  wake.rotation.x = -Math.PI / 2; scene.add(wake);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1700, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vPosition;void main(){float h=normalize(vPosition).y;vec3 c=mix(vec3(.66,.66,.54),vec3(.20,.33,.35),smoothstep(-.05,.8,h));gl_FragColor=vec4(c,1.);}',
  })); scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 12), new THREE.MeshBasicMaterial({ color: '#f1d9a8', fog: false }));
  sun.position.set(-280, 120, -650); scene.add(sun);
  const clouds = new THREE.Group(); scene.add(clouds);
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#b4b5a0', transparent: true, opacity: .09, depthWrite: false });
  for (let i = 0; i < 16; i++) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), cloudMaterial);
    cloud.position.set(-350 + i * 70, 85 + i % 4 * 12, -260 - i % 3 * 40); cloud.scale.set(35 + i % 3 * 12, 3, 9); clouds.add(cloud);
  }
  const hemi = new THREE.HemisphereLight('#e9f3ff', '#778879', 2.6); scene.add(hemi);
  const sunlight = new THREE.DirectionalLight('#ffe8c2', 3.3); scene.add(sunlight, sunlight.target);
  sunlight.castShadow = true; sunlight.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
  sunlight.shadow.camera.left = -85; sunlight.shadow.camera.right = 85;
  sunlight.shadow.camera.top = 85; sunlight.shadow.camera.bottom = -85;
  sunlight.shadow.camera.near = 1; sunlight.shadow.camera.far = 230;
  sunlight.shadow.bias = -.0006; sunlight.shadow.normalBias = .1;

  return {
    update(p: number, camera: THREE.PerspectiveCamera, mode: JourneyMode, compact = mobile) {
      const state = sampleJourney(p);
      // Keep the lorry in the appropriate lane: China on the right, Kerala on the left.
      originRoad.position.z = mode === 'import' ? 13.5 : 18.5;
      arrivalRoad.position.z = mode === 'import' ? 18.5 : 13.5;
      originGreen.visible = mode === 'export'; arrivalGreen.visible = mode === 'import';
      chinaOrigin.visible = keralaArrival.visible = mode === 'import';
      keralaOrigin.visible = chinaArrival.visible = mode === 'export';
      shipment.position.set(...state.container);
      const turning = state.deliveryTurn;
      shipment.rotation.y = p > .79 ? turning : state.hoistYaw;
      originTrucks.forEach((vehicle, i) => {
        vehicle.group.visible = i === (mode === 'import' ? 0 : 1);
        vehicle.group.position.set(state.truckX, 0, 16);
        vehicle.wheels.forEach(w => {w.rotation.z = -(state.truckX + 105) / .77;});
      });
      lastTrucks.forEach((vehicle, i) => {
        vehicle.group.visible = i === (mode === 'import' ? 0 : 1);
        vehicle.group.position.set(state.deliveryX, 0, state.deliveryZ); vehicle.group.rotation.y = turning;
        vehicle.wheels.forEach(w => {w.rotation.z = -state.deliveryDistance / .77;});
      });
      ship.position.set(state.shipX, Math.sin(p * 46) * .07 * between(p, .405, .45) * (1 - between(p, .65, .68)), -34);
      // The shipment and its slot share the same heave while at sea.
      if (state.attachedTo === 'ship') shipment.position.y += ship.position.y;
      smallCrane.update(state.yardSpreader); departureCrane.update(state.originSpreader); destinationCrane.update(state.arrivalSpreader, state.hoistYaw);
      water.material.uniforms.uProgress.value = p;
      wake.position.set(state.shipX - 65, -.12, -34);
      wake.material.uniforms.uProgress.value = p;
      wake.material.uniforms.uStrength.value = between(p, .41, .45) * (1 - between(p, .65, .68));
      clouds.position.x = p * 28;
      camera.position.set(...state.camera); const target = new THREE.Vector3(...state.target);
      if (compact) {
        const oceanBlend = between(p, .405, .45) * (1 - between(p, .65, .69));
        const offset = camera.position.clone().sub(target).multiplyScalar(1.35 + oceanBlend * .9);
        target.lerp(new THREE.Vector3(...state.container), .65 * (1 - oceanBlend));
        camera.position.copy(target).add(offset); camera.position.y += 6;
      }
      camera.lookAt(target);
      const lightX = state.container[0]; sunlight.position.set(lightX - 55, 100, -58); sunlight.target.position.set(lightX, 0, 3);
      // Textures swap in place; the physical direction remains consistent with travel.
      const originText = mode === 'import' ? 'CHINA  /  EXPORT TERMINAL' : 'KOCHI  /  KERALA';
      const arrivalText = mode === 'import' ? 'KOCHI  /  KERALA' : 'INTERNATIONAL TERMINAL';
      if (originSign.userData.text !== originText) {
        for (const [mesh, text] of [[originSign, originText], [arrivalSign, arrivalText]] as const) {
          const texture = mesh.material.map!, canvas = texture.image as HTMLCanvasElement, ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#344b42'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#dedbc1'; ctx.font = '600 90px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 132, 960); texture.needsUpdate = true; mesh.userData.text = text;
        }
      }
      return state;
    },
  };
}
