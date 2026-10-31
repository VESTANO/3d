import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { harbourCrane } from '../src/scene/assets.ts';
import { sampleJourney } from '../src/journey/timeline.ts';

test('rotating boom, hoist cable and swivel spreader remain physically aligned', () => {
  const crane = harbourCrane(358, -2);
  for (let p = .65; p <= .805; p += .001) {
    const state = sampleJourney(p);
    crane.update(state.arrivalSpreader, state.hoistYaw); crane.group.updateMatrixWorld(true);
    const tip = crane.group.getObjectByName('harbour-pulley')!.getWorldPosition(new THREE.Vector3());
    const spreader = crane.group.getObjectByName('harbour-spreader')!;
    const cable = crane.group.getObjectByName('harbour-hoist-cable')!;
    const cableTop = cable.localToWorld(new THREE.Vector3(0, .5, 0));
    const cableBottom = cable.localToWorld(new THREE.Vector3(0, -.5, 0));
    const hook = spreader.localToWorld(new THREE.Vector3(0, 3.65, 0));
    assert.ok(tip.distanceTo(cableTop) < 1e-7, `boom tip detached at ${p}`);
    assert.ok(hook.distanceTo(cableBottom) < 1e-7, `hook detached at ${p}`);
    assert.ok(tip.y > hook.y, 'hoist cable must hang below the boom');
    assert.ok(spreader.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...state.arrivalSpreader)) < 1e-7);
  }
});
