import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createWorld } from '../scene/world';
import { disposeAssetCache } from '../scene/assets';
import type { JourneyMode } from '../journey/timeline';

export default function LogisticsScene({ progress, mode, onReady, onError }: {
  progress: React.RefObject<number>; mode: JourneyMode; onReady: () => void; onError: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  useEffect(() => {
    const host = mount.current!;
    let renderer: THREE.WebGLRenderer | undefined, frame = 0, disposed = false;
    let scene: THREE.Scene | undefined;
    let observer: ResizeObserver | undefined;
    let visible = true;
    let lastP = -1, lastMode = '';
    const contextLost = (event: Event) => { event.preventDefault(); onError(); };
    const visibility = () => { visible = !document.hidden; };
    try {
      const mobile = window.innerWidth < 768;
      renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.7));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D logistics journey. Follow the written stage description for an accessible account.');
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.addEventListener('webglcontextlost', contextLost);
      host.appendChild(renderer.domElement);
      scene = new THREE.Scene(); scene.background = new THREE.Color('#8e9986'); scene.fog = new THREE.FogExp2('#909b86', .0018);
      const camera = new THREE.PerspectiveCamera(43, 1, .3, 2100);
      const world = createWorld(scene, mobile, () => { lastP = -1; });
      const resize = () => {
        if (!host.clientWidth || !host.clientHeight || !renderer) return;
        camera.aspect = host.clientWidth / host.clientHeight;
        if (host.clientWidth >= 768) camera.setViewOffset(host.clientWidth, host.clientHeight, -host.clientWidth * .13, 0, host.clientWidth, host.clientHeight);
        else camera.setViewOffset(host.clientWidth, host.clientHeight, 0, -host.clientHeight * .1, host.clientWidth, host.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, host.clientWidth < 768 ? 1.25 : 1.7));
        renderer.setSize(host.clientWidth, host.clientHeight); lastP = -1;
      };
      observer = new ResizeObserver(resize); observer.observe(host); resize();
      document.addEventListener('visibilitychange', visibility);
      let easedProgress = progress.current, lastTime = performance.now();
      const render = () => {
        if (disposed) return;
        const now = performance.now(), dt = Math.min(.06, (now - lastTime) / 1000); lastTime = now;
        easedProgress += (progress.current - easedProgress) * (1 - Math.exp(-12 * dt));
        if (Math.abs(easedProgress - progress.current) < .000005) easedProgress = progress.current;
        const p = easedProgress;
        if (visible && (Math.abs(p - lastP) > .000001 || modeRef.current !== lastMode)) {
          const state = world.update(p, camera, modeRef.current, host.clientWidth < 768);
          renderer!.render(scene!, camera); lastP = p; lastMode = modeRef.current;
          host.dataset.progress = p.toFixed(4); host.dataset.carrier = state.attachedTo;
          host.dataset.container = state.container.map(n => n.toFixed(2)).join(',');
          host.dataset.drawCalls = String(renderer!.info.render.calls);
        }
        frame = requestAnimationFrame(render);
      }; render(); onReady();
    } catch (error) { console.error('3D journey could not initialise:', error); onError(); }
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility);
      renderer?.domElement.removeEventListener('webglcontextlost', contextLost);
      if (scene) {
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
        scene.traverse(obj => { if (obj instanceof THREE.DirectionalLight) obj.shadow.dispose(); if (obj instanceof THREE.Mesh) {
          geometries.add(obj.geometry);
          for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
            materials.add(mat); Object.values(mat).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
          }
        } });
        geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); scene.clear();
      }
      disposeAssetCache(); renderer?.dispose(); renderer?.domElement.remove();
    };
  }, [progress, onReady, onError]);
  return <div className="scene-canvas" ref={mount} data-testid="logistics-scene" />;
}
