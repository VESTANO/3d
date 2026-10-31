import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleJourney, stageAt } from '../src/journey/timeline.ts';

test('truck waits for crane and container follows each carrier', () => {
  for (let p = 0; p <= .15; p += .001) assert.equal(sampleJourney(p).truckX, -105);
  for (let p = .15; p <= .31; p += .001) {
    const s = sampleJourney(p); assert.equal(s.container[0], s.truckX); assert.equal(s.container[1], 3.24);
  }
  for (let p = .405; p <= .69; p += .001) {
    const s = sampleJourney(p); assert.equal(s.container[0], s.shipX + 14); assert.equal(s.container[2], -40.2);
  }
  for (let p = .79; p <= 1; p += .001) {
    const s = sampleJourney(p); assert.equal(s.container[0], s.deliveryX); assert.equal(s.container[2], s.deliveryZ);
  }
});
test('all transforms are continuous and finite, including handoff boundaries', () => {
  let previous = sampleJourney(0);
  for (let i = 1; i <= 10000; i++) {
    const state = sampleJourney(i / 10000);
    for (const key of ['container', 'camera', 'target', 'yardSpreader', 'originSpreader', 'arrivalSpreader'] as const) {
      state[key].forEach((value, j) => { assert.ok(Number.isFinite(value)); assert.ok(Math.abs(value - previous[key][j]) < 1, `${key} jumps at ${i / 10000}`); });
    }
    previous = state;
  }
});
test('backward seeking reproduces the exact forward state', () => {
  const forward = Array.from({ length: 101 }, (_, i) => sampleJourney(i / 100));
  for (let i = 100; i >= 0; i--) assert.deepEqual(sampleJourney(i / 100), forward[i]);
  assert.equal(stageAt(.65), 4); assert.equal(stageAt(1), 5);
  assert.deepEqual(sampleJourney(-2), sampleJourney(0)); assert.deepEqual(sampleJourney(3), sampleJourney(1));
});
test('last-mile truck turns continuously, then reverses into the centre loading bay', () => {
  const turnStart = sampleJourney(.92), turnEnd = sampleJourney(.96), parked = sampleJourney(1);
  assert.equal(turnStart.deliveryX, 442); assert.equal(turnStart.deliveryZ, 16);
  assert.equal(turnEnd.deliveryX, 453); assert.equal(turnEnd.deliveryZ, 5);
  assert.equal(parked.deliveryX, 453); assert.equal(parked.deliveryZ, 40);
  assert.equal(parked.deliveryTurn, Math.PI / 2);
  assert.ok(parked.deliveryDistance < turnEnd.deliveryDistance, 'wheels must reverse when backing into the bay');
  assert.ok(parked.deliveryZ + 6.1 < 49.5, 'trailer must stop before the loading platform');
});
test('camera velocity remains continuous through its waypoints', () => {
  const epsilon = 1e-7;
  for (const p of [.15, .3, .365, .41, .45, .52, .59, .65, .69, .72, .8, .94]) {
    const before = sampleJourney(p - epsilon), at = sampleJourney(p), after = sampleJourney(p + epsilon);
    for (const key of ['camera', 'target'] as const) for (let axis = 0; axis < 3; axis++) {
      const incoming = (at[key][axis] - before[key][axis]) / epsilon;
      const outgoing = (after[key][axis] - at[key][axis]) / epsilon;
      assert.ok(Math.abs(incoming - outgoing) < .5, `${key} velocity discontinuity at ${p}`);
    }
  }
});
test('ship loading traverses straight while unloading swings clear before trailer placement', () => {
  for (let p = .335; p < .375; p += .001) assert.equal(sampleJourney(p).container[0], -30);
  const start = sampleJourney(.715), middle = sampleJourney(.735), end = sampleJourney(.755);
  assert.ok(Math.abs(start.container[0] - 334) < 1e-8);
  assert.ok(middle.container[0] < 328, 'unloading must follow a visible arc');
  assert.equal(middle.container[1], 21, 'keep the load above the ship while slewing');
  assert.equal(end.container[0], 334); assert.equal(end.container[2], 16);
  for (let p = .69; p < .79; p += .001) {
    const state = sampleJourney(p);
    assert.equal(state.deliveryX, 334, 'waiting lorry must remain stationary');
    assert.deepEqual(state.arrivalSpreader, [state.container[0], state.container[1] + 1.49, state.container[2]]);
  }
});
