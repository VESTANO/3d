export type JourneyMode = 'import' | 'export';
export type Vec3 = [number, number, number];
export const STAGE_STARTS = [0, 0.15, 0.3, 0.45, 0.65, 0.8] as const;
export const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
export const between = (p: number, a: number, b: number) => smooth((p - a) / (b - a));
export function mix(a: Vec3, b: Vec3, t: number): Vec3 { return a.map((v, i) => lerp(v, b[i], t)) as Vec3; }
// Shape-preserving Hermite interpolation: continuous camera velocity without
// overshooting the safe positions or stopping at every camera waypoint.
function cameraSpline(frames: { p: number; eye: Vec3; aim: Vec3 }[], index: number, p: number, key: 'eye' | 'aim'): Vec3 {
  const a = frames[index], b = frames[index + 1], h = b.p - a.p, t = clamp((p - a.p) / h);
  return a[key].map((value, axis) => {
    const tangent = (i: number) => {
      if (i === 0 || i === frames.length - 1) return 0;
      const prev = frames[i - 1], at = frames[i], next = frames[i + 1];
      const h0 = at.p - prev.p, h1 = next.p - at.p;
      const d0 = (at[key][axis] - prev[key][axis]) / h0, d1 = (next[key][axis] - at[key][axis]) / h1;
      if (d0 * d1 <= 0) return 0;
      const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
      return (w0 + w1) / (w0 / d0 + w1 / d1);
    };
    return (2*t*t*t-3*t*t+1)*value + (t*t*t-2*t*t+t)*h*tangent(index)
      + (-2*t*t*t+3*t*t)*b[key][axis] + (t*t*t-t*t)*h*tangent(index+1);
  }) as Vec3;
}
export function stageAt(p: number) { return STAGE_STARTS.reduce<number>((stage, start, i) => p >= start ? i : stage, 0); }

export function sampleJourney(value: number) {
  const p = clamp(value);
  const truckX = lerp(-105, -30, between(p, .15, .3));
  let shipX = -44;
  if (p > .41 && p <= .45) shipX = lerp(-44, -10, between(p, .41, .45));
  else if (p > .45 && p <= .65) shipX = lerp(-10, 300, between(p, .45, .65));
  else if (p > .65) shipX = lerp(300, 320, between(p, .65, .68));
  const deliveryTurn = between(p, .92, .96) * Math.PI / 2;
  const deliveryX = p < .92 ? lerp(334, 442, between(p, .8, .92)) : 442 + 11 * Math.sin(deliveryTurn);
  const deliveryZ = p < .96 ? 5 + 11 * Math.cos(deliveryTurn) : lerp(5, 40, between(p, .96, .995));
  const deliveryDistance = p < .92 ? deliveryX - 334 : p < .96 ? 108 + deliveryTurn * 11 : 108 + Math.PI * 5.5 - (deliveryZ - 5);
  // The arrival crane slews through a real polar arc, unlike the origin gantry's straight trolley path.
  const slew = between(p, .715, .755);
  const slewStart = Math.atan2(-38.2, -24), slewEnd = Math.atan2(18, -24) - Math.PI * 2;
  const slewRadius = lerp(Math.hypot(24, 38.2), 30, slew);
  const slewAngle = lerp(slewStart, slewEnd, slew);
  const hoistYaw = Math.sin(slew * Math.PI) * .07;
  let container: Vec3;
  if (p < .035) container = [-119, lerp(1.55, 14, between(p, .012, .035)), 35];
  else if (p < .095) container = mix([-119, 14, 35], [-105, 14, 16], between(p, .035, .095));
  else if (p < .13) container = [-105, lerp(14, 3.24, between(p, .095, .13)), 16];
  else if (p <= .31) container = [truckX, 3.24, 16];
  else if (p < .335) container = [-30, lerp(3.24, 21, between(p, .31, .335)), 16];
  else if (p < .375) container = [-30, 21, lerp(16, -40.2, between(p, .335, .375))];
  else if (p < .405) container = [-30, lerp(21, 11.41, between(p, .375, .405)), -40.2];
  else if (p <= .69) container = [shipX + 14, 11.41, -40.2];
  else if (p < .715) container = [334, lerp(11.41, 21, between(p, .69, .715)), -40.2];
  else if (p < .755) container = [358 + Math.cos(slewAngle) * slewRadius, 21, -2 + Math.sin(slewAngle) * slewRadius];
  else if (p < .79) container = [334, lerp(21, 3.24, between(p, .755, .79)), 16];
  else container = [deliveryX, 3.24, deliveryZ];

  const yardSpreader: Vec3 = p <= .13
    ? [container[0], container[1] + 1.49 + (1 - between(p, 0, .012)) * 8, container[2]]
    : [-105, lerp(4.73, 19, between(p, .13, .15)), 16];
  const originSpreader: Vec3 = p < .31 ? [-30, lerp(25, 4.73, between(p, .3, .31)), 16]
    : p <= .405 ? [container[0], container[1] + 1.49, container[2]]
    : [-30, lerp(12.9, 25, between(p, .405, .42)), -40.2];
  const arrivalSpreader: Vec3 = p < .69 ? [334, lerp(21, 12.9, between(p, .68, .69)), -40.2]
    : p <= .79 ? [container[0], container[1] + 1.49, container[2]]
    : [334, lerp(4.73, 25, between(p, .79, .8)), 16];

  const cameraFrames: { p: number; eye: Vec3; aim: Vec3 }[] = [
    { p: 0, eye: [-61, 37, 88], aim: [-116, 5, 16] },
    { p: .15, eye: [-75, 20, 58], aim: [-106, 4, 18] },
    { p: .3, eye: [5, 29, 62], aim: [-30, 5, -3] },
    { p: .335, eye: [12, 35, 53], aim: [-30, 13, 16] },
    { p: .365, eye: [-7, 58, -4], aim: [-30, 17, -12] },
    { p: .385, eye: [-7, 38, -79], aim: [-30, 15, -40.2] },
    { p: .41, eye: [3, 33, -108], aim: [-29, 5, -30] },
    { p: .45, eye: [37, 25, -95], aim: [-10, 5, -34] },
    { p: .52, eye: [125, 20, -91], aim: [78, 4, -34] },
    { p: .59, eye: [255, 65, -120], aim: [232, 3, -34] },
    { p: .65, eye: [351, 39, -105], aim: [300, 4, -28] },
    { p: .69, eye: [293, 26, -60], aim: [334, 11, -40.2] },
    { p: .715, eye: [298, 30, -45], aim: [334, 19, -38] },
    { p: .735, eye: [297, 28, 12], aim: [323, 19, -13] },
    { p: .755, eye: [301, 21, 43], aim: [334, 12, 16] },
    { p: .8, eye: [369, 20, 55], aim: [334, 3, 16] },
    { p: .94, eye: [480, 28, -16], aim: [450, 4, 14] },
    { p: 1, eye: [492, 29, -15], aim: [451, 4, 40] },
  ];
  const rightIndex = cameraFrames.findIndex(f => f.p >= p);
  const frameIndex = Math.max(0, rightIndex - 1);
  return {
    p, stage: stageAt(p), container, truckX, shipX, deliveryX, deliveryZ, deliveryTurn, deliveryDistance, hoistYaw,
    yardSpreader, originSpreader, arrivalSpreader,
    camera: cameraSpline(cameraFrames, frameIndex, p, 'eye'), target: cameraSpline(cameraFrames, frameIndex, p, 'aim'),
    attachedTo: p < .13 ? 'yard-crane' : p <= .31 ? 'origin-truck' : p < .405 ? 'origin-crane' : p <= .69 ? 'ship' : p < .79 ? 'arrival-crane' : 'delivery-truck',
  };
}
