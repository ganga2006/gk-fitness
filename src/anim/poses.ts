import type { Anim, Pose } from './types';

/**
 * Exercise library — every movement written as real key positions of the body.
 *
 * Conventions (see types.ts / kin.ts):
 *  · plane angles in degrees, 0 = forward, 90 = up, measured in the body's
 *    sagittal plane; the trainer faces +x (right) when standing,
 *  · elbows: fa = arm + flexion; knees: sh = th − flexion (both always ≥ 0),
 *  · ab / lg swing an arm / leg out to the side, rt / lr rotate it,
 *  · ft = 0 is a level sole; negative points the toes (heel up),
 *  · pin: contacts held this key ("ballF ballB" = both feet flat on their
 *    spots, "palmF" = right palm, "tipF" = toes tucked, "kneeF" ...),
 *    "spot@name" = a named spot, "palmF^iliacF" = hand held on the hip,
 *  · anchor: the contact the whole body is placed by (planks, lying, kneeling).
 * Keys inherit the previous key, interpolate with continuous velocity, and
 * contacts held between two keys are solved by IK every frame — feet and
 * hands stay exactly planted, nothing sinks through the floor.
 *
 * Lying and plank poses are written in the standing frame and turned with
 * `turn()`: supine = +90 (head to the left, face up), prone = −90 (head to
 * the right, face down).
 */

type P = Partial<Pose>;
const ROT = ['torso', 'head', 'armF', 'faF', 'armB', 'faB', 'thF', 'shF', 'thB', 'shB', 'ftF', 'ftB'] as const;
/** the same body attitude rotated by d degrees in the sagittal plane */
const turn = (p: P, d: number): P => {
  const o: Record<string, number> = { ...(p as Record<string, number>) };
  for (const k of ROT) if (o[k] !== undefined) o[k] += d;
  return o as P;
};
/** both arms: plane angle a, elbow flexion e */
const A = (a: number, e: number, x: P = {}): P => ({ armF: a, faF: a + e, armB: a, faB: a + e, ...x });
const AF = (a: number, e: number, x: P = {}): P => ({ armF: a, faF: a + e, ...x });
const AB = (a: number, e: number, x: P = {}): P => ({ armB: a, faB: a + e, ...x });
/** both legs: thigh angle th, knee flexion k */
const L = (th: number, k: number, x: P = {}): P => ({ thF: th, shF: th - k, thB: th, shB: th - k, ...x });
const LF = (th: number, k: number, x: P = {}): P => ({ thF: th, shF: th - k, ...x });
const LB = (th: number, k: number, x: P = {}): P => ({ thB: th, shB: th - k, ...x });
const FT = (f: number): P => ({ ftF: f, ftB: f });
const FEET = 'ballF ballB';

/* ── reference attitudes ── */
const STANDA: P = { x: 100, y: 107.3, torso: 90, pelv: 0, head: 90, ...A(-86, 8, { abF: 9, abB: 9 }),
  ...L(-88, 3), ...FT(0), lgF: 3, lgB: 3, twist: 0, lean: 0, z: 0 };
/** high plank, head to the right, on tucked toes and flat palms */
const PLANK = (T = 17): P => ({ torso: T, head: T - 4, pelv: 0, ...L(T - 180, 0), ...FT(-70), tkF: 1, tkB: 1,
  ...A(-90, 2), plF: 1, plB: 1, abF: 7, abB: 7, lgF: 2, lgB: 2, tyF: 0, tyB: 0 });
const PLANK_PINS = 'tipB palmF palmB';
/** hands and knees, head to the right */
const QUAD: P = { torso: 9, head: 3, pelv: 0, ...L(-90, -270), ...FT(-130), ...A(-90, 0), plF: 1, plB: 1,
  abF: 9, abB: 9, lgF: 4, lgB: 4, tyF: 0, tyB: 0 };
const QUAD_PINS = 'kneeB palmF palmB';
/** lying on the back, head to the left */
const SUPINE: P = { ...turn({ torso: 90, head: 90, ...A(-86, 6), ...L(-88, 3), ftF: -40, ftB: -40 }, 90),
  pelv: 0, abF: 12, abB: 12, plF: 1, plB: 1 };
/** lying on the back, knees bent, feet flat */
const HOOK: P = { ...SUPINE, ...L(45, 105), ...FT(0) };
/** lying face down, head to the right */
const PRONE: P = { ...turn({ torso: 90, head: 90, ...A(-86, 6), ...L(-88, 2), ftF: -50, ftB: -50 }, -90),
  pelv: 0, abF: 10, abB: 10 };
/** hands behind the head, elbows out (standing frame) */
const BEHIND_HEAD = A(-90, 140, { abF: 95, abB: 95, rtF: 90, rtB: 90 });
/** running arms: near arm forward, far arm back */
const PUMP_F = { ...AF(-40, 95, { abF: 8 }), ...AB(-125, 80, { abB: 8 }) };
const PUMP_B = { ...AF(-125, 80, { abF: 8 }), ...AB(-40, 95, { abB: 8 }) };
const HIPS = 'palmF^iliacF palmB^iliacB';
const HANDS_ON_HIPS = A(-100, 95, { abF: 40, abB: 40 });

export const ANIMS: Record<string, Anim> = {

  /* ───────────────────────── standing cardio ───────────────────────── */

  jumpingJacks: {
    dur: 0.95, floor: true, base: STANDA,
    frames: [
      { t: 0, pin: FEET },
      { t: 0.1, pin: FEET, y: 109, abF: 30, abB: 30 },
      { t: 0.22, y: 103.5, lgF: 11, lgB: 11, ...FT(-30), abF: 105, abB: 105, ...A(-90, 12) },
      { t: 0.35, pin: 'ballF@out ballB@out', y: 110, lgF: 19, lgB: 19, ...FT(0), tyF: 14, tyB: 14, abF: 160, abB: 160 },
      { t: 0.47, pin: 'ballF@out ballB@out', y: 109.5, abF: 172, abB: 172 },
      { t: 0.58, pin: 'ballF@out ballB@out', y: 110.5, abF: 160, abB: 160 },
      { t: 0.71, y: 103.5, lgF: 10, lgB: 10, ...FT(-30), tyF: 8, tyB: 8, abF: 85, abB: 85 },
      { t: 0.85, pin: FEET, y: 109, lgF: 3, lgB: 3, ...FT(0), abF: 22, abB: 22, ...A(-86, 8) },
    ],
  },

  starJump: {
    dur: 1.45, floor: true, base: STANDA,
    frames: [
      { t: 0, pin: FEET },
      { t: 0.2, pin: FEET, x: 95, y: 126, torso: 66, head: 80, ...A(-90, 20, { abF: 30, abB: 30 }) },
      { t: 0.32, pin: FEET, x: 103, y: 104, torso: 88, head: 92, ...FT(-35), ...A(-90, 8, { abF: 95, abB: 95 }) },
      { t: 0.44, x: 100, y: 92, torso: 90, ...L(-88, 4), lgF: 28, lgB: 28, ...FT(-40), ...A(-90, 8, { abF: 135, abB: 135 }) },
      { t: 0.58, x: 100, y: 101, lgF: 8, lgB: 8, ...FT(-30), ...A(-90, 8, { abF: 60, abB: 60 }) },
      { t: 0.68, pin: FEET, x: 98, y: 120, torso: 72, head: 84, lgF: 3, lgB: 3, ...FT(0), ...A(-72, 20, { abF: 22, abB: 22 }) },
      { t: 0.85, pin: FEET, x: 100, y: 107.3, torso: 90, head: 90, ...A(-86, 8, { abF: 9, abB: 9 }) },
    ],
  },

  marchInPlace: {
    dur: 1.2, floor: true, base: STANDA,
    frames: [
      { t: 0, pin: FEET, ...A(-86, 45) },
      { t: 0.25, pin: 'ballB', ...LF(-22, 80, { ftF: -18 }), ...AF(-112, 40), ...AB(-55, 70), x: 100.5, z: -7, lean: -3 },
      { t: 0.5, pin: FEET, ...LF(-88, 3, { ftF: 0 }), ...A(-86, 45), x: 100, z: 0, lean: 0 },
      { t: 0.75, pin: 'ballF', ...LB(-22, 80, { ftB: -18 }), ...AB(-112, 40), ...AF(-55, 70), x: 100.5, z: 7, lean: 3 },
      { t: 1, pin: FEET, ...LB(-88, 3, { ftB: 0 }), ...A(-86, 45), x: 100, z: 0, lean: 0 },
    ],
  },

  highKnees: {
    dur: 0.62, floor: true, base: { ...STANDA, torso: 88 },
    frames: [
      { t: 0, pin: 'ballB', y: 106, ...LF(-2, 95, { ftF: -28 }), ...LB(-90, 6, { ftB: -18 }), ...PUMP_B },
      { t: 0.25, y: 104.5, ...LF(-50, 50, { ftF: -25 }), ...LB(-50, 55, { ftB: -25 }), ...A(-85, 85) },
      { t: 0.5, pin: 'ballF', y: 106, ...LB(-2, 95, { ftB: -28 }), ...LF(-90, 6, { ftF: -18 }), ...PUMP_F },
      { t: 0.75, y: 104.5, ...LF(-50, 55, { ftF: -25 }), ...LB(-50, 50, { ftB: -25 }), ...A(-85, 85) },
    ],
  },

  buttKicks: {
    dur: 0.62, floor: true, base: { ...STANDA, torso: 87 },
    frames: [
      { t: 0, pin: 'ballB', y: 106.5, ...LF(-96, 135, { ftF: -180 }), ...LB(-88, 8, { ftB: -18 }), ...PUMP_B },
      { t: 0.25, y: 105, ...LF(-92, 70, { ftF: -100 }), ...LB(-92, 70, { ftB: -100 }), ...A(-85, 85) },
      { t: 0.5, pin: 'ballF', y: 106.5, ...LB(-96, 135, { ftB: -180 }), ...LF(-88, 8, { ftF: -18 }), ...PUMP_F },
      { t: 0.75, y: 105, ...LF(-92, 70, { ftF: -100 }), ...LB(-92, 70, { ftB: -100 }), ...A(-85, 85) },
    ],
  },

  jumpRope: {
    dur: 0.46, floor: true, base: { ...STANDA, x: 105.5, torso: 88, ...A(-74, 62, { abF: 24, abB: 24 }) },
    frames: [
      { t: 0, pin: FEET, y: 107.8, ...FT(-14), ...A(-76, 64) },
      { t: 0.25, pin: FEET, y: 106.8, ...FT(-26), ...A(-72, 58) },
      { t: 0.55, y: 104.4, ...FT(-30), ...L(-88, 9), ...A(-70, 56) },
      { t: 0.82, pin: FEET, y: 107.3, ...FT(-16), ...L(-88, 3), ...A(-76, 62) },
    ],
  },

  skater: {
    dur: 1.6, floor: true, base: { ...STANDA, torso: 64, head: 76 },
    frames: [
      { t: 0, pin: 'ballF@R', z: 24, y: 118, ...LF(-62, 48, { lgF: 4 }), ...LB(-122, 62, { lgB: -16, ftB: -120 }),
        ...AF(-125, 30, { abF: 10 }), ...AB(-30, 30, { abB: -20 }), twist: -12 },
      { t: 0.25, z: 0, y: 103, ...LF(-82, 30, { lgF: 8, ftF: -25 }), ...LB(-82, 30, { lgB: 8, ftB: -25 }),
        ...A(-86, 30, { abF: 10, abB: 10 }), twist: 0 },
      { t: 0.5, pin: 'ballB@L', z: -24, y: 118, ...LB(-62, 48, { lgB: 4, ftB: 0 }), ...LF(-122, 62, { lgF: -16, ftF: -120 }),
        ...AB(-125, 30, { abB: 10 }), ...AF(-30, 30, { abF: -20 }), twist: 12 },
      { t: 0.75, z: 0, y: 103, ...LF(-82, 30, { lgF: 8, ftF: -25 }), ...LB(-82, 30, { lgB: 8, ftB: -25 }),
        ...A(-86, 30, { abF: 10, abB: 10 }), twist: 0 },
    ],
  },

  torsoTwist: {
    dur: 2.4, floor: true,
    base: { ...STANDA, y: 108.5, lgF: 11, lgB: 11, tyF: 12, tyB: 12, ...A(-90, 8, { abF: 84, abB: 84 }) },
    frames: [
      { t: 0, pin: FEET, twist: 0 },
      { t: 0.25, pin: FEET, twist: 48 },
      { t: 0.5, pin: FEET, twist: 0 },
      { t: 0.75, pin: FEET, twist: -48 },
    ],
  },

  armCircles: {
    dur: 1.2, floor: true, base: { ...STANDA, lgF: 8, lgB: 8 },
    frames: [
      { t: 0, pin: FEET, ...A(-90, 6, { abF: 100, abB: 100 }) },
      { t: 0.25, pin: FEET, ...A(-74, 6, { abF: 89, abB: 89 }) },
      { t: 0.5, pin: FEET, ...A(-90, 6, { abF: 78, abB: 78 }) },
      { t: 0.75, pin: FEET, ...A(-106, 6, { abF: 89, abB: 89 }) },
    ],
  },

  hipCircle: {
    dur: 3.2, floor: true,
    base: { ...STANDA, y: 108, lgF: 9, lgB: 9, ...HANDS_ON_HIPS },
    frames: [
      { t: 0, pin: `${FEET} ${HIPS}`, x: 103.5, torso: 95 },
      { t: 0.25, pin: `${FEET} ${HIPS}`, x: 100, z: 3.5, torso: 90, lean: -6 },
      { t: 0.5, pin: `${FEET} ${HIPS}`, x: 97.5, z: 0, torso: 86, lean: 0 },
      { t: 0.75, pin: `${FEET} ${HIPS}`, x: 100, z: -3.5, torso: 90, lean: 6 },
    ],
  },

  standingToeTouch: {
    dur: 3.0, floor: true, base: STANDA,
    frames: [
      { t: 0, pin: FEET, ...A(88, 6, { abF: 14, abB: 14 }) },
      { t: 0.12, pin: FEET, ...A(88, 6) },
      { t: 0.48, pin: FEET, x: 93, y: 108, torso: -18, pelv: 34, head: -50, ...L(-86, 12), ...A(-94, 4, { abF: 6, abB: 6 }) },
      { t: 0.64, pin: FEET, x: 93, y: 108, torso: -18, pelv: 34, head: -50 },
      { t: 0.92, pin: FEET, x: 100, y: 107.3, torso: 90, pelv: 0, head: 90, ...L(-88, 3), ...A(88, 6, { abF: 14, abB: 14 }) },
    ],
  },

  /* ───────────────────────── lower body ───────────────────────── */

  squat: {
    dur: 2.6, floor: true, base: { ...STANDA, tyF: 15, tyB: 15, lgF: 5, lgB: 5 },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.42, pin: FEET, x: 89, y: 141, torso: 46, head: 74, lgF: 10, lgB: 10, ...A(0, 8, { abF: 12, abB: 12 }) },
      { t: 0.56, pin: FEET, x: 90.5, y: 136 },
      { t: 0.92, pin: FEET, x: 100, y: 107.3, torso: 90, head: 90, lgF: 5, lgB: 5, ...A(-86, 8, { abF: 9, abB: 9 }) },
    ],
  },

  sumoSquat: {
    dur: 2.8, floor: true,
    base: { ...STANDA, y: 110, lgF: 24, lgB: 24, tyF: 36, tyB: 36, ...A(-62, 128, { abF: 22, abB: 22 }) },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.42, pin: FEET, x: 97, y: 142, torso: 80, head: 86, lgF: 30, lgB: 30 },
      { t: 0.56, pin: FEET, x: 97, y: 133 },
      { t: 0.92, pin: FEET, x: 100, y: 110, torso: 90, head: 90, lgF: 24, lgB: 24 },
    ],
  },

  jumpSquat: {
    dur: 1.8, floor: true, base: { ...STANDA, tyF: 12, tyB: 12 },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.28, pin: FEET, x: 91, y: 134, torso: 50, head: 76, ...A(-135, 12, { abF: 12, abB: 12 }) },
      { t: 0.42, pin: FEET, x: 103, y: 104, torso: 88, head: 90, ...FT(-38), ...A(60, 10) },
      { t: 0.55, x: 100, y: 93, ...L(-88, 4), ...FT(-42), ...A(85, 8) },
      { t: 0.68, pin: FEET, x: 99, y: 108.5, ...FT(0), ...L(-88, 8), ...A(20, 12) },
      { t: 0.8, pin: FEET, x: 93, y: 126, torso: 62, head: 80, ...A(-10, 12) },
      { t: 0.95, pin: FEET, x: 100, y: 107.3, torso: 90, head: 90, ...A(-86, 8, { abF: 9, abB: 9 }) },
    ],
  },

  wallSit: {
    dur: 4.0, floor: true,
    props: [{ x0: 88, x1: 94.4, y0: 30 }],
    base: { ...STANDA, x: 100, y: 138, torso: 90, head: 90, ...L(0, 90), ...A(-88, 6, { abF: 10, abB: 10 }), lgF: 4, lgB: 4 },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.5, pin: FEET, y: 138.6, head: 92 },
    ],
  },

  lunge: {
    dur: 6.0, floor: true, base: { ...STANDA, ...HANDS_ON_HIPS },
    plant: { 'ballF@fwd': { x: 151 }, 'ballB@fwd': { x: 151 } },
    frames: [
      { t: 0.000, pin: `${FEET} ${HIPS}`, x: 100, y: 107.3, z: 0, lean: 0, ...LF(-88, 3, { ftF: 0 }), ...LB(-88, 3, { ftB: 0 }) },
      { t: 0.040, pin: `${FEET} ${HIPS}`, x: 101, z: -9, lean: -3 },
      { t: 0.080, pin: `ballB ${HIPS}`, x: 102, ...LF(-55, 45, { ftF: -5 }) },
      { t: 0.130, pin: `ballF@fwd ballB ${HIPS}`, x: 103.5, y: 108.5, z: -8, ...LF(-45, 8, { ftF: 0 }), ...LB(-100, 8, { ftB: 0 }) },
      { t: 0.220, pin: `ballF@fwd ballB ${HIPS}`, x: 119, y: 137, z: 0, lean: 0, torso: 88, ...LF(-15, 90), ...LB(-110, 95, { ftB: -52 }) },
      { t: 0.280, pin: `ballF@fwd ballB ${HIPS}`, x: 119, y: 133 },
      { t: 0.370, pin: `ballF@fwd ballB ${HIPS}`, x: 106, y: 109, z: -6.3, lean: -3, torso: 90, ...LF(-45, 8), ...LB(-100, 8, { ftB: -4 }) },
      { t: 0.420, pin: `ballB ${HIPS}`, x: 102, y: 108, z: -9, ...LF(-55, 45, { ftF: -5 }), ...LB(-88, 3, { ftB: 0 }) },
      { t: 0.460, pin: `${FEET} ${HIPS}`, x: 101, y: 107.3, ...LF(-88, 3, { ftF: 0 }) },
      { t: 0.500, pin: `${FEET} ${HIPS}`, x: 100, y: 107.3, z: 0, lean: 0, ...LB(-88, 3, { ftB: 0 }), ...LF(-88, 3, { ftF: 0 }) },
      { t: 0.540, pin: `${FEET} ${HIPS}`, x: 101, z: 9, lean: 3 },
      { t: 0.580, pin: `ballF ${HIPS}`, x: 102, ...LB(-55, 45, { ftB: -5 }) },
      { t: 0.630, pin: `ballB@fwd ballF ${HIPS}`, x: 103.5, y: 108.5, z: 8, ...LB(-45, 8, { ftB: 0 }), ...LF(-100, 8, { ftF: 0 }) },
      { t: 0.720, pin: `ballB@fwd ballF ${HIPS}`, x: 119, y: 137, z: 0, lean: 0, torso: 88, ...LB(-15, 90), ...LF(-110, 95, { ftF: -52 }) },
      { t: 0.780, pin: `ballB@fwd ballF ${HIPS}`, x: 119, y: 133 },
      { t: 0.870, pin: `ballB@fwd ballF ${HIPS}`, x: 106, y: 109, z: 6.3, lean: 3, torso: 90, ...LB(-45, 8), ...LF(-100, 8, { ftF: -4 }) },
      { t: 0.920, pin: `ballF ${HIPS}`, x: 102, y: 108, z: 9, ...LB(-55, 45, { ftB: -5 }), ...LF(-88, 3, { ftF: 0 }) },
      { t: 0.960, pin: `${FEET} ${HIPS}`, x: 101, y: 107.3, ...LB(-88, 3, { ftB: 0 }) },
    ],
  },

  jumpLunge: {
    dur: 1.6, floor: true, base: { ...STANDA, ...A(-86, 40) },
    plant: { 'ballF@fwd': { x: 128 }, 'ballB@back': { x: 72 }, 'ballB@fwd': { x: 128 }, 'ballF@back': { x: 72 } },
    frames: [
      { t: 0, pin: 'ballF@fwd ballB@back', x: 100, y: 133, ...LF(-15, 90), ...LB(-110, 95, { ftB: -64 }), ...AF(-120, 50), ...AB(-40, 70) },
      { t: 0.14, pin: 'ballF@fwd ballB@back', y: 119, ...LF(-40, 40), ...LB(-115, 40, { ftB: -45 }) },
      { t: 0.25, y: 101, ...LF(-75, 45, { ftF: -25 }), ...LB(-100, 45, { ftB: -25 }), ...A(-85, 60) },
      { t: 0.36, pin: 'ballB@fwd ballF@back', y: 120, ...LB(-40, 40, { ftB: 0 }), ...LF(-115, 40, { ftF: -45 }), ...AB(-120, 50), ...AF(-40, 70) },
      { t: 0.5, pin: 'ballB@fwd ballF@back', y: 133, ...LB(-15, 90), ...LF(-110, 95, { ftF: -64 }) },
      { t: 0.64, pin: 'ballB@fwd ballF@back', y: 119, ...LB(-40, 40), ...LF(-115, 40, { ftF: -45 }) },
      { t: 0.75, y: 101, ...LB(-75, 45, { ftB: -25 }), ...LF(-100, 45, { ftF: -25 }), ...A(-85, 60) },
      { t: 0.86, pin: 'ballF@fwd ballB@back', y: 120, ...LF(-40, 40, { ftF: 0 }), ...LB(-115, 40, { ftB: -45 }), ...AF(-120, 50), ...AB(-40, 70) },
    ],
  },

  calfRaise: {
    dur: 2.6, floor: true, base: { ...STANDA, ...HANDS_ON_HIPS },
    frames: [
      { t: 0, pin: `${FEET} ${HIPS}` },
      { t: 0.12, pin: `${FEET} ${HIPS}`, x: 106, torso: 88 },
      { t: 0.24, pin: `${FEET} ${HIPS}`, x: 110.5, y: 106.5, torso: 87, ...FT(-6) },
      { t: 0.42, pin: `${FEET} ${HIPS}`, x: 110.5, y: 102.6, ...FT(-38) },
      { t: 0.56, pin: `${FEET} ${HIPS}`, x: 110.5, y: 102.6, ...FT(-38) },
      { t: 0.76, pin: `${FEET} ${HIPS}`, x: 110.5, y: 106.5, ...FT(-6) },
      { t: 0.84, pin: `${FEET} ${HIPS}`, x: 107, y: 107.3, torso: 88, ...FT(0) },
    ],
  },

  gluteBridge: {
    dur: 2.8, floor: true, base: { ...HOOK, ...turn(A(-86, 8), 90) },
    frames: [
      { t: 0, anchor: 'scap', pin: 'ballF ballB palmF palmB', torso: 181, head: 180 },
      { t: 0.38, anchor: 'scap', pin: 'ballF ballB palmF palmB', torso: 204, head: 181, ...L(20, 90), ...turn(A(-74, 4), 90) },
      { t: 0.58, anchor: 'scap', pin: 'ballF ballB palmF palmB', torso: 204, head: 181 },
      { t: 0.92, anchor: 'scap', pin: 'ballF ballB palmF palmB', torso: 181, head: 180, ...L(45, 105), ...turn(A(-86, 8), 90) },
    ],
  },

  gluteKickback: {
    dur: 2.2, floor: true, base: QUAD,
    frames: [
      { t: 0, anchor: 'kneeB', pin: 'kneeF palmF palmB' },
      { t: 0.4, anchor: 'kneeB', pin: 'palmF palmB', ...LF(172, 4, { ftF: 172 + 91 - 40 }), torso: 8 },
      { t: 0.56, anchor: 'kneeB', pin: 'palmF palmB', ...LF(174, 4) },
      { t: 0.9, anchor: 'kneeB', pin: 'kneeF palmF palmB', ...LF(-90, -270, { ftF: -130 }), torso: 9 },
    ],
  },

  sideLegRaise: {
    dur: 2.2, floor: true,
    base: { ...SUPINE, roll: -90, ...LF(4, 25), ...LB(2, 2), ...FT(48), ...AF(176, 120, { abF: 14, plF: 0 }), ...AB(4, 6, { abB: 0, plB: 0 }),
      head: 175, tilt: -14 },
    frames: [
      { t: 0, anchor: 'side', pin: 'elbowF', lgB: 2 },
      { t: 0.42, anchor: 'side', pin: 'elbowF', lgB: 42 },
      { t: 0.58, anchor: 'side', pin: 'elbowF', lgB: 42 },
      { t: 0.94, anchor: 'side', pin: 'elbowF', lgB: 2 },
    ],
  },

  /* ───────────────────────── push ───────────────────────── */

  pushup: {
    dur: 2.4, floor: true, base: PLANK(17),
    frames: [
      { t: 0, anchor: 'tipF', pin: PLANK_PINS, fit: 'body' },
      { t: 0.42, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(5) },
      { t: 0.52, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(5) },
      { t: 0.88, anchor: 'tipF', pin: PLANK_PINS, fit: 'body', ...PLANK(17) },
    ],
  },

  kneePushup: {
    dur: 2.4, floor: true,
    base: { ...PLANK(30), ...L(-150, 60), ...FT(-150), tkF: 0, tkB: 0 },
    frames: [
      { t: 0, anchor: 'kneeF', pin: 'kneeB palmF palmB', fit: 'body' },
      { t: 0.42, anchor: 'kneeF', pin: 'kneeB palmF palmB', torso: 12.5, head: 8, ...L(-167.5, 70) },
      { t: 0.52, anchor: 'kneeF', pin: 'kneeB palmF palmB', torso: 12.5, head: 8, ...L(-167.5, 70) },
      { t: 0.88, anchor: 'kneeF', pin: 'kneeB palmF palmB', fit: 'body', torso: 30, head: 26, ...L(-150, 60) },
    ],
  },

  inclinePushup: {
    dur: 2.4, floor: true,
    props: [{ x0: 128, x1: 152, y0: 141 }],
    plant: { palmF: { y: 141, x: 140 }, palmB: { y: 141, x: 140 } },
    base: PLANK(36),
    frames: [
      { t: 0, anchor: 'tipF', pin: PLANK_PINS, fit: 'body' },
      { t: 0.42, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(22) },
      { t: 0.52, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(22) },
      { t: 0.88, anchor: 'tipF', pin: PLANK_PINS, fit: 'body', ...PLANK(36) },
    ],
  },

  wallPushup: {
    dur: 2.4, floor: true,
    props: [{ x0: 146, x1: 152, y0: 20 }],
    plant: { palmF: { x: 146, y: 88, wall: 'front' }, palmB: { x: 146, y: 88, wall: 'front' } },
    base: { ...STANDA, x: 101, y: 109, torso: 74, head: 76, ...L(-104, 0), ...FT(0), ...A(0, 6, { abF: 16, abB: 16, plF: 1, plB: 1, wlF: 1, wlB: 1 }) },
    frames: [
      { t: 0, pin: 'ballF ballB palmF palmB', fit: 'x' },
      { t: 0.42, pin: 'ballF ballB palmF palmB', fit: 'x', x: 106, y: 110.5, torso: 70, head: 74, ...L(-108, 0) },
      { t: 0.52, pin: 'ballF ballB palmF palmB', x: 106, y: 110.5 },
      { t: 0.88, pin: 'ballF ballB palmF palmB', fit: 'x', x: 101, y: 109, torso: 74, head: 76, ...L(-104, 0) },
    ],
  },

  diamondPushup: {
    dur: 2.6, floor: true, base: { ...PLANK(17), abF: -12, abB: -12, rtF: -30, rtB: -30 },
    frames: [
      { t: 0, anchor: 'tipF', pin: PLANK_PINS, fit: 'body' },
      { t: 0.44, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(7), abF: -12, abB: -12 },
      { t: 0.54, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(7), abF: -12, abB: -12 },
      { t: 0.9, anchor: 'tipF', pin: PLANK_PINS, fit: 'body', ...PLANK(17), abF: -12, abB: -12 },
    ],
  },

  pikePushup: {
    dur: 2.6, floor: true,
    plant: { palmF: { x: 144.5 }, palmB: { x: 144.5 }, ballF: { x: 78.9 }, ballB: { x: 78.9 } },
    base: { x: 100, y: 107.8, torso: -52, head: -58, pelv: 0, ...L(-114.6, 0), ...FT(-40), ...A(-62, 2, { abF: 12, abB: 12, plF: 1, plB: 1 }), lgF: 4, lgB: 4, tyF: 0, tyB: 0 },
    frames: [
      { t: 0, pin: 'ballF ballB palmF palmB' },
      { t: 0.44, pin: 'ballF ballB palmF palmB', x: 103, y: 110, torso: -70, head: -78, ...A(-110, 90) },
      { t: 0.54, pin: 'ballF ballB palmF palmB', x: 103, y: 110 },
      { t: 0.9, pin: 'ballF ballB palmF palmB', x: 100, y: 107.8, torso: -52, head: -58, ...A(-62, 2) },
    ],
  },

  tricepDip: {
    dur: 2.4, floor: true,
    props: [{ x0: 70, x1: 93, y0: 141 }],
    plant: { palmF: { x: 90, y: 141 }, palmB: { x: 90, y: 141 }, heelF: { x: 146 }, heelB: { x: 146 } },
    base: { ...STANDA, x: 99, y: 131, torso: 94, head: 92, ...L(-35, 0), ...FT(55),
      ...A(-104, 2, { abF: 14, abB: 14, plF: 1, plB: 1 }) },
    frames: [
      { t: 0, pin: 'heelF heelB palmF palmB', fit: 'x y' },
      { t: 0.42, pin: 'heelF heelB palmF palmB', fit: 'x y', y: 145, x: 93, torso: 98, ...L(-19, 0), ...FT(40) },
      { t: 0.52, pin: 'heelF heelB palmF palmB', fit: 'x y' },
      { t: 0.88, pin: 'heelF heelB palmF palmB', fit: 'x y', y: 131, x: 99, torso: 94, ...L(-35, 0), ...FT(55) },
    ],
  },

  /* ───────────────────────── plank family ───────────────────────── */

  plank: {
    dur: 4.0, floor: true, base: PLANK(17),
    frames: [
      { t: 0, anchor: 'tipF', pin: PLANK_PINS, fit: 'body' },
      { t: 0.5, anchor: 'tipF', pin: PLANK_PINS, fit: 'body', ...PLANK(16.4), head: 12 },
    ],
  },

  forearmPlank: {
    dur: 4.0, floor: true,
    base: { ...PLANK(8), ...A(-98, 98, { abF: 8, abB: 8, plF: 1, plB: 1 }) },
    frames: [
      { t: 0, anchor: 'tipF', pin: 'tipB elbowF elbowB', fit: 'body' },
      { t: 0.5, anchor: 'tipF', pin: 'tipB elbowF elbowB', fit: 'body', ...PLANK(7.5), ...A(-98, 98, { abF: 8, abB: 8, plF: 1, plB: 1 }), head: 2 },
    ],
  },

  sidePlank: {
    dur: 4.0, floor: true,
    plant: { palmF: { x: 66, z: 1 } },
    base: { torso: 153, head: 153, pelv: 0, roll: -90, ...L(-24, 0), ...FT(64), lgF: 0, lgB: 0, tyF: 0, tyB: 0,
      ...AF(-110, 2, { abF: 10, plF: 1, hdF: 230 }), ...AB(-2, 8, { abB: 6 }) },
    frames: [
      { t: 0, anchor: 'ballF', pin: 'palmF', fit: 'body' },
      { t: 0.5, anchor: 'ballF', pin: 'palmF', fit: 'body', torso: 152.4, head: 151 },
    ],
  },

  shoulderTapPlank: {
    dur: 2.6, floor: true, base: { ...PLANK(17), lgF: 8, lgB: 8 },
    frames: [
      { t: 0, anchor: 'tipF', pin: PLANK_PINS },
      { t: 0.1, anchor: 'tipF', pin: PLANK_PINS, z: -3 },
      { t: 0.16, anchor: 'tipF', pin: 'tipB palmB', z: -4, ...AF(-70, 70, { abF: 6, plF: 0.2 }) },
      { t: 0.22, anchor: 'tipF', pin: 'tipB palmB palmF^upperarm_l>clavicle_l:0.3+0.42,-0.08,0', z: -4, twist: 3, ...AF(-75, 120, { abF: 10, plF: 0 }) },
      { t: 0.28, anchor: 'tipF', pin: 'tipB palmB', z: -4, ...AF(-70, 70, { abF: 6, plF: 0.2 }) },
      { t: 0.34, anchor: 'tipF', pin: PLANK_PINS, z: -3, twist: 0, ...AF(-90, 2, { abF: 7, plF: 1 }) },
      { t: 0.5, anchor: 'tipF', pin: PLANK_PINS, z: 0 },
      { t: 0.6, anchor: 'tipF', pin: PLANK_PINS, z: 3 },
      { t: 0.66, anchor: 'tipF', pin: 'tipB palmF', z: 4, ...AB(-70, 70, { abB: 6, plB: 0.2 }) },
      { t: 0.72, anchor: 'tipF', pin: 'tipB palmF palmB^upperarm_r>clavicle_r:0.3+0.42,-0.08,0', z: 4, twist: -3, ...AB(-75, 120, { abB: 10, plB: 0 }) },
      { t: 0.78, anchor: 'tipF', pin: 'tipB palmF', z: 4, ...AB(-70, 70, { abB: 6, plB: 0.2 }) },
      { t: 0.84, anchor: 'tipF', pin: PLANK_PINS, z: 3, twist: 0, ...AB(-90, 2, { abB: 7, plB: 1 }) },
    ],
  },

  mountainClimber: {
    dur: 0.8, floor: true, base: { ...PLANK(19), x: 100, y: 140.5 },
    frames: [
      { t: 0, pin: 'tipB@back palmF palmB', fit: 'y', ...LF(-55, 110, { ftF: -110, tkF: 0 }), ...LB(-161, 0, { ftB: -70, tkB: 1 }) },
      { t: 0.25, pin: 'palmF palmB', fit: 'torso', y: 133.5, torso: 6, head: 2, ...LF(-90, 120, { ftF: -120, tkF: 0 }), ...LB(-90, 120, { ftB: -120, tkB: 0 }) },
      { t: 0.5, pin: 'tipF@back palmF palmB', fit: 'y', y: 140.5, ...LB(-55, 110, { ftB: -110, tkB: 0 }), ...LF(-161, 0, { ftF: -70, tkF: 1 }) },
      { t: 0.75, pin: 'palmF palmB', fit: 'torso', y: 133.5, torso: 6, head: 2, ...LF(-90, 120, { ftF: -120, tkF: 0 }), ...LB(-90, 120, { ftB: -120, tkB: 0 }) },
    ],
  },

  bearCrawl: {
    dur: 2.0, floor: true,
    base: { torso: 6, head: 4, pelv: 0, x: 100, y: 137, ...L(-92, 92), ...FT(-82), tkF: 1, tkB: 1, ...A(-90, 2, { abF: 9, abB: 9, plF: 1, plB: 1 }),
      lgF: 6, lgB: 6, tyF: 0, tyB: 0 },
    frames: [
      { t: 0, pin: 'tipF tipB palmF palmB', fit: 'y' },
      { t: 0.18, pin: 'tipF palmB', ...AF(-70, 30, { abF: 9, plF: 0.4 }), ...LB(-75, 110, { ftB: -82 }) },
      { t: 0.36, pin: 'tipF tipB palmF palmB', ...A(-90, 2, { plF: 1 }), ...L(-92, 92) },
      { t: 0.5, pin: 'tipF tipB palmF palmB' },
      { t: 0.68, pin: 'tipB palmF', ...AB(-70, 30, { abB: 9, plB: 0.4 }), ...LF(-75, 110, { ftF: -82 }) },
      { t: 0.86, pin: 'tipF tipB palmF palmB', ...A(-90, 2, { plB: 1 }), ...L(-92, 92) },
    ],
  },

  /* ───────────────────────── core ───────────────────────── */

  crunch: {
    dur: 2.2, floor: true, base: { ...HOOK, ...turn(BEHIND_HEAD, 90), plF: 0, plB: 0 },
    frames: [
      { t: 0, anchor: 'glute', pin: FEET, torso: 180, pelv: 0, head: 180 },
      { t: 0.42, anchor: 'glute', pin: FEET, torso: 150, pelv: 30, head: 128 },
      { t: 0.56, anchor: 'glute', pin: FEET, torso: 150, pelv: 30, head: 128 },
      { t: 0.92, anchor: 'glute', pin: FEET, torso: 180, pelv: 0, head: 180 },
    ],
  },

  situp: {
    dur: 3.0, floor: true, base: { ...HOOK, ...L(50, 110), ...turn(BEHIND_HEAD, 90), plF: 0, plB: 0 },
    frames: [
      { t: 0, anchor: 'glute', pin: FEET, torso: 180, pelv: 0, head: 180 },
      { t: 0.22, anchor: 'glute', pin: FEET, torso: 150, pelv: 28, head: 130 },
      { t: 0.42, anchor: 'glute', pin: FEET, torso: 98, pelv: 18, head: 84 },
      { t: 0.52, anchor: 'glute', pin: FEET, torso: 96, pelv: 18, head: 82 },
      { t: 0.78, anchor: 'glute', pin: FEET, torso: 150, pelv: 28, head: 132 },
      { t: 0.92, anchor: 'glute', pin: FEET, torso: 180, pelv: 0, head: 180 },
    ],
  },

  bicycleCrunch: {
    dur: 1.8, floor: true, base: { ...SUPINE, ...turn({ ...BEHIND_HEAD, abF: 74, abB: 74 }, 90), plF: 0, plB: 0, torso: 152, pelv: 28, head: 134, ...FT(70) },
    frames: [
      { t: 0, anchor: 'glute', ...LF(105, 105, { ftF: 85 }), ...LB(22, 8, { ftB: 70 }), twist: -20 },
      { t: 0.5, anchor: 'glute', ...LB(105, 105, { ftB: 85 }), ...LF(22, 8, { ftF: 70 }), twist: 20 },
    ],
  },

  legRaise: {
    dur: 3.0, floor: true, base: { ...SUPINE, ...FT(64) },
    frames: [
      { t: 0, anchor: 'glute', pin: 'palmF palmB', ...L(10, 3, FT(70)) },
      { t: 0.42, anchor: 'glute', pin: 'palmF palmB', ...L(86, 5, FT(140)) },
      { t: 0.52, anchor: 'glute', pin: 'palmF palmB', ...L(88, 5, FT(142)) },
      { t: 0.92, anchor: 'glute', pin: 'palmF palmB', ...L(10, 3, FT(70)) },
    ],
  },

  flutterKick: {
    dur: 0.8, floor: true, base: { ...SUPINE, torso: 172, pelv: 8, head: 160, ...FT(78) },
    frames: [
      { t: 0, anchor: 'glute', pin: 'palmF palmB', ...LF(28, 3, { ftF: 86 }), ...LB(12, 3, { ftB: 72 }) },
      { t: 0.5, anchor: 'glute', pin: 'palmF palmB', ...LB(28, 3, { ftB: 86 }), ...LF(12, 3, { ftF: 72 }) },
    ],
  },

  hollowHold: {
    dur: 4.0, floor: true,
    base: { ...SUPINE, torso: 162, pelv: 18, head: 150, ...L(22, 2, FT(80)), ...A(168, 4, { abF: 10, abB: 10, plF: 0, plB: 0 }) },
    frames: [
      { t: 0, anchor: 'glute' },
      { t: 0.5, anchor: 'glute', torso: 163, ...L(21, 2) },
    ],
  },

  russianTwist: {
    dur: 2.2, floor: true,
    base: { ...STANDA, torso: 128, pelv: 12, head: 120, ...L(38, 82), ...FT(10), lgF: 6, lgB: 6,
      ...A(-8, 95, { abF: -6, abB: -6 }) },
    frames: [
      { t: 0, anchor: 'glute', twist: 0 },
      { t: 0.25, anchor: 'glute', twist: 42, head: 118 },
      { t: 0.5, anchor: 'glute', twist: 0, head: 120 },
      { t: 0.75, anchor: 'glute', twist: -42, head: 118 },
    ],
  },

  deadBug: {
    dur: 3.6, floor: true, base: { ...SUPINE, ...A(90, 4, { abF: 12, abB: 12, plF: 0, plB: 0 }), ...L(90, 90), ...FT(100) },
    frames: [
      { t: 0, anchor: 'glute' },
      { t: 0.22, anchor: 'glute', ...AF(172, 4), ...LB(14, 4, { ftB: 70 }) },
      { t: 0.3, anchor: 'glute', ...AF(172, 4), ...LB(14, 4) },
      { t: 0.5, anchor: 'glute', ...AF(90, 4), ...LB(90, 90, { ftB: 100 }) },
      { t: 0.72, anchor: 'glute', ...AB(172, 4), ...LF(14, 4, { ftF: 70 }) },
      { t: 0.8, anchor: 'glute', ...AB(172, 4), ...LF(14, 4) },
    ],
  },

  superman: {
    dur: 3.0, floor: true, base: { ...PRONE, ...turn(A(90, 6, { abF: 14, abB: 14 }), -90) },
    frames: [
      { t: 0, anchor: 'belly' },
      { t: 0.4, anchor: 'belly', torso: 14, pelv: -14, head: 18, ...turn(A(104, 6), -90), ...turn(L(-100, 4), -90) },
      { t: 0.6, anchor: 'belly', torso: 14, pelv: -14, head: 18 },
      { t: 0.94, anchor: 'belly', torso: 0, pelv: 0, head: 0, ...turn(A(90, 6), -90), ...turn(L(-88, 2), -90) },
    ],
  },

  birdDog: {
    dur: 5.6, floor: true, base: QUAD,
    frames: [
      { t: 0, anchor: 'kneeF', pin: 'kneeB palmF palmB' },
      { t: 0.2, anchor: 'kneeF', pin: 'palmB', ...AF(0, 2, { abF: 6, plF: 0 }), ...LB(176, 2, { ftB: 176 + 91 - 45, lgB: 2 }) },
      { t: 0.3, anchor: 'kneeF', pin: 'palmB', ...AF(0, 2), ...LB(176, 2) },
      { t: 0.48, anchor: 'kneeF', pin: 'kneeB palmF palmB', ...AF(-90, 0, { abF: 9, plF: 1 }), ...LB(-90, -270, { ftB: -130, lgB: 4 }) },
      { t: 0.5, anchor: 'kneeB', pin: 'kneeF palmF palmB' },
      { t: 0.7, anchor: 'kneeB', pin: 'palmF', ...AB(0, 2, { abB: 6, plB: 0 }), ...LF(176, 2, { ftF: 176 + 91 - 45, lgF: 2 }) },
      { t: 0.8, anchor: 'kneeB', pin: 'palmF', ...AB(0, 2), ...LF(176, 2) },
      { t: 0.98, anchor: 'kneeB', pin: 'kneeF palmF palmB', ...AB(-90, 0, { abB: 9, plB: 1 }), ...LF(-90, -270, { ftF: -130, lgF: 4 }) },
    ],
  },

  /* ───────────────────────── full body ───────────────────────── */

  burpee: {
    dur: 3.4, floor: true, base: STANDA,
    plant: { palmF: { x: 128 }, palmB: { x: 128 }, 'tipF@back': { x: 38 }, 'tipB@back': { x: 38 } },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.1, pin: FEET, x: 93, y: 133, torso: 22, head: 30, ...A(-80, 6, { abF: 9, abB: 9 }) },
      { t: 0.18, pin: 'ballF ballB palmF palmB', fit: 'y', x: 99, y: 134, torso: 14, head: 16, ...A(-88, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-46) },
      { t: 0.27, pin: 'palmF palmB', fit: 'y torso', x: 88, y: 132, torso: 12, ...L(-150, 60), ...FT(-80) },
      { t: 0.34, anchor: 'tipF@back', pin: 'tipB@back palmF palmB', ...PLANK(17) },
      { t: 0.44, anchor: 'tipF@back', pin: 'tipB@back palmF palmB', ...PLANK(7) },
      { t: 0.52, anchor: 'tipF@back', pin: 'tipB@back palmF palmB', ...PLANK(17) },
      { t: 0.6, pin: 'palmF palmB', fit: 'y torso', x: 88, y: 132, torso: 12, head: 10, ...L(-150, 60), ...FT(-80), tkF: 0, tkB: 0 },
      { t: 0.67, pin: 'ballF ballB palmF palmB', fit: 'y', x: 99, y: 134, torso: 14, head: 16, ...L(-30, 120), ...FT(-46), lgF: 6, lgB: 6 },
      { t: 0.75, pin: FEET, x: 93, y: 128, ...FT(0), torso: 40, head: 70, ...A(-60, 20, { plF: 0, plB: 0, abF: 12, abB: 12 }) },
      { t: 0.84, x: 100, y: 95, torso: 90, head: 92, ...L(-88, 4), ...FT(-46), ...A(88, 6) },
      { t: 0.93, pin: FEET, x: 100, y: 110, ...L(-88, 12), ...FT(0), ...A(-60, 20) },
    ],
  },

  squatThrust: {
    dur: 2.6, floor: true, base: STANDA,
    plant: { palmF: { x: 128 }, palmB: { x: 128 }, 'tipF@back': { x: 38 }, 'tipB@back': { x: 38 } },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.14, pin: FEET, x: 93, y: 133, torso: 22, head: 30, ...A(-80, 6) },
      { t: 0.24, pin: 'ballF ballB palmF palmB', fit: 'y', x: 99, y: 134, torso: 14, head: 16, ...A(-88, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-46) },
      { t: 0.34, pin: 'palmF palmB', fit: 'y torso', x: 88, y: 132, torso: 12, ...L(-150, 60), ...FT(-80) },
      { t: 0.42, anchor: 'tipF@back', pin: 'tipB@back palmF palmB', ...PLANK(17) },
      { t: 0.56, anchor: 'tipF@back', pin: 'tipB@back palmF palmB', ...PLANK(17) },
      { t: 0.65, pin: 'palmF palmB', fit: 'y torso', x: 88, y: 132, torso: 12, head: 10, ...L(-150, 60), ...FT(-80), tkF: 0, tkB: 0 },
      { t: 0.74, pin: 'ballF ballB palmF palmB', fit: 'y', x: 99, y: 134, torso: 14, head: 16, ...L(-30, 120), ...FT(-46), lgF: 6, lgB: 6 },
      { t: 0.84, pin: FEET, x: 93, y: 128, ...FT(0), torso: 40, head: 70, ...A(-60, 20, { plF: 0, plB: 0, abF: 12, abB: 12 }) },
    ],
  },

  inchworm: {
    dur: 9.0, floor: true, base: STANDA,
    plant: { 'palmF@1': { x: 130 }, 'palmB@1': { x: 130 }, 'palmF@2': { x: 155 }, 'palmB@2': { x: 155 }, 'palmF@3': { x: 180 }, 'palmB@3': { x: 180 }, 'palmF@4': { x: 203 }, 'palmB@4': { x: 203 } },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.08, pin: FEET, x: 93, y: 108, torso: -20, pelv: 36, head: -50, ...L(-86, 14), ...A(-92, 4) },
      { t: 0.130, pin: 'ballF ballB palmF@1 palmB@1', fit: 'x y torso pelv', x: 94, y: 112, torso: -30, pelv: 40, head: -58, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(0) },
      { t: 0.161, pin: 'ballF ballB palmB@1', fit: 'x y torso', ...AF(-55, 40, { plF: 0.3 }) },
      { t: 0.193, pin: 'ballF ballB palmF@2 palmB@1', fit: 'x y torso pelv', x: 100, y: 115, torso: -22, pelv: 34, head: -44, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-10) },
      { t: 0.224, pin: 'ballF ballB palmF@2', fit: 'x y torso', ...AB(-55, 40, { plB: 0.3 }) },
      { t: 0.255, pin: 'ballF ballB palmF@2 palmB@2', fit: 'x y torso pelv', x: 106, y: 119, torso: -14, pelv: 28, head: -30, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-18) },
      { t: 0.286, pin: 'ballF ballB palmB@2', fit: 'x y torso', ...AF(-55, 40, { plF: 0.3 }) },
      { t: 0.318, pin: 'ballF ballB palmF@3 palmB@2', fit: 'x y torso pelv', x: 116, y: 125, torso: -6, pelv: 20, head: -18, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-30) },
      { t: 0.349, pin: 'ballF ballB palmF@3', fit: 'x y torso', ...AB(-55, 40, { plB: 0.3 }) },
      { t: 0.380, pin: 'ballF ballB palmF@3 palmB@3', fit: 'x y torso pelv', x: 126, y: 131, torso: 2, pelv: 12, head: -6, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-42) },
      { t: 0.411, pin: 'ballF ballB palmB@3', fit: 'x y torso', ...AF(-55, 40, { plF: 0.3 }) },
      { t: 0.443, pin: 'ballF ballB palmF@4 palmB@3', fit: 'x y torso pelv', x: 140, y: 137, torso: 10, pelv: 5, head: 4, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-54) },
      { t: 0.474, pin: 'ballF ballB palmF@4', fit: 'x y torso', ...AB(-55, 40, { plB: 0.3 }) },
      { t: 0.505, pin: 'ballF ballB palmF@4 palmB@4', fit: 'x y torso pelv', x: 152, y: 141, torso: 15, pelv: 0, head: 11, ...L(-164, 0), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-60) },
      { t: 0.535, pin: 'ballF ballB palmF@4 palmB@4', fit: 'x y torso' },
      { t: 0.551, pin: 'ballF ballB palmB@4', fit: 'x y torso', ...AF(-55, 40, { plF: 0.3 }) },
      { t: 0.568, pin: 'ballF ballB palmF@3 palmB@4', fit: 'x y torso pelv', x: 140, y: 137, torso: 10, pelv: 5, head: 4, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-54) },
      { t: 0.599, pin: 'ballF ballB palmF@3', fit: 'x y torso', ...AB(-55, 40, { plB: 0.3 }) },
      { t: 0.630, pin: 'ballF ballB palmF@3 palmB@3', fit: 'x y torso pelv', x: 126, y: 131, torso: 2, pelv: 12, head: -6, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-42) },
      { t: 0.661, pin: 'ballF ballB palmB@3', fit: 'x y torso', ...AF(-55, 40, { plF: 0.3 }) },
      { t: 0.693, pin: 'ballF ballB palmF@2 palmB@3', fit: 'x y torso pelv', x: 116, y: 125, torso: -6, pelv: 20, head: -18, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-30) },
      { t: 0.724, pin: 'ballF ballB palmF@2', fit: 'x y torso', ...AB(-55, 40, { plB: 0.3 }) },
      { t: 0.755, pin: 'ballF ballB palmF@2 palmB@2', fit: 'x y torso pelv', x: 106, y: 119, torso: -14, pelv: 28, head: -30, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-18) },
      { t: 0.786, pin: 'ballF ballB palmB@2', fit: 'x y torso', ...AF(-55, 40, { plF: 0.3 }) },
      { t: 0.818, pin: 'ballF ballB palmF@1 palmB@2', fit: 'x y torso pelv', x: 100, y: 115, torso: -22, pelv: 34, head: -44, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(-10) },
      { t: 0.849, pin: 'ballF ballB palmF@1', fit: 'x y torso', ...AB(-55, 40, { plB: 0.3 }) },
      { t: 0.880, pin: 'ballF ballB palmF@1 palmB@1', fit: 'x y torso pelv', x: 94, y: 112, torso: -30, pelv: 40, head: -58, ...L(-86, 10), ...A(-85, 2, { plF: 1, plB: 1, abF: 7, abB: 7 }), ...FT(0) },
      { t: 0.94, pin: FEET, x: 93, y: 108, torso: -20, pelv: 36, head: -50, ...L(-86, 14), ...A(-92, 4, { plF: 0, plB: 0 }), ...FT(0) },
    ],
  },

  /* ───────────────────────── mobility & cool-down ───────────────────────── */

  catCow: {
    dur: 5.0, floor: true, base: QUAD,
    frames: [
      { t: 0, anchor: 'kneeF', pin: QUAD_PINS, fit: 'torso', pelv: 0 },
      { t: 0.25, anchor: 'kneeF', pin: QUAD_PINS, fit: 'torso', torso: 3, pelv: 26, head: -30 },
      { t: 0.5, anchor: 'kneeF', pin: QUAD_PINS, fit: 'torso', torso: 9, pelv: 0, head: 3 },
      { t: 0.75, anchor: 'kneeF', pin: QUAD_PINS, fit: 'torso', torso: 14, pelv: -22, head: 30 },
    ],
  },

  childPose: {
    dur: 5.0, floor: true,
    plant: { palmF: { x: 172 }, palmB: { x: 172 } },
    base: { torso: -12, pelv: 42, head: -20, ...L(-32, -212), ...FT(-140), lgF: 10, lgB: 10, tyF: 0, tyB: 0,
      ...A(-12, 2, { abF: 10, abB: 10, plF: 1, plB: 1 }) },
    frames: [
      { t: 0, anchor: 'kneeF', pin: 'kneeB palmF palmB', fit: 'torso' },
      { t: 0.5, anchor: 'kneeF', pin: 'kneeB palmF palmB', fit: 'torso', torso: -10, pelv: 41, head: -19 },
    ],
  },

  cobra: {
    dur: 4.5, floor: true,
    plant: { palmF: { x: 128 }, palmB: { x: 128 } },
    base: { ...PRONE, ...A(-105, 120, { abF: 14, abB: 14, plF: 1, plB: 1 }) },
    frames: [
      { t: 0, anchor: 'belly', pin: 'palmF palmB', torso: 2, pelv: -2, head: 4 },
      { t: 0.4, anchor: 'belly', pin: 'palmF palmB', torso: 36, pelv: -34, head: 52 },
      { t: 0.62, anchor: 'belly', pin: 'palmF palmB', torso: 36, pelv: -34, head: 52 },
      { t: 0.94, anchor: 'belly', pin: 'palmF palmB', torso: 2, pelv: -2, head: 4 },
    ],
  },

  downwardDog: {
    dur: 5.0, floor: true,
    plant: { palmF: { x: 151.5 }, palmB: { x: 151.5 }, ballF: { x: 79.9 }, ballB: { x: 79.9 } },
    base: { x: 100, y: 113.2, torso: -44, head: -52, pelv: 0, ...L(-117.5, 0), ...FT(-14), ...A(-56, 2, { abF: 12, abB: 12, plF: 1, plB: 1 }), lgF: 4, lgB: 4, tyF: 0, tyB: 0 },
    frames: [
      { t: 0, pin: 'palmF palmB ballF ballB' },
      { t: 0.25, pin: 'palmF palmB ballF ballB', ...LF(-117.5, 18, { ftF: -38 }), ftB: -8 },
      { t: 0.5, pin: 'palmF palmB ballF ballB', ...LF(-117.5, 0, { ftF: -14 }), ftB: -14 },
      { t: 0.75, pin: 'palmF palmB ballF ballB', ...LB(-117.5, 18, { ftB: -38 }), ftF: -8 },
    ],
  },

  hamstringStretch: {
    dur: 5.6, floor: true, base: STANDA,
    plant: { 'heelF@fwd': { x: 128 } },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.05, pin: FEET, x: 100, z: -7, lean: -3 },
      { t: 0.1, pin: 'ballB', x: 100, ...LF(-62, 30, { ftF: 10 }), ...LB(-92, 8) },
      { t: 0.16, pin: 'heelF@fwd ballB', x: 100, y: 109, z: -7, ...LF(-58, 0, { ftF: 28 }), ...LB(-95, 16) },
      { t: 0.22, pin: 'heelF@fwd ballB', x: 98, y: 110, z: -7, lean: -2 },
      { t: 0.38, pin: 'heelF@fwd ballB', x: 97, y: 113, torso: 42, pelv: -2, head: 40, ...A(-62, 10, { abF: 4, abB: 4 }), ...LB(-90, 28) },
      { t: 0.68, pin: 'heelF@fwd ballB', x: 97, y: 113, torso: 40, head: 38 },
      { t: 0.8, pin: 'heelF@fwd ballB', x: 98, y: 110, torso: 90, pelv: 0, head: 90, ...A(-86, 8, { abF: 9, abB: 9 }), ...LB(-95, 16) },
      { t: 0.85, pin: 'heelF@fwd ballB', x: 100, y: 109, z: -7, lean: -3 },
      { t: 0.9, pin: 'ballB', x: 100, y: 108, z: -7, lean: -3, ...LF(-62, 30, { ftF: 10 }), ...LB(-92, 8) },
      { t: 0.95, pin: FEET, x: 100, y: 107.3, z: -6, ...LF(-88, 3, { ftF: 0 }), ...LB(-88, 3) },
    ],
  },

  quadStretch: {
    dur: 5.0, floor: true, base: STANDA,
    frames: [
      { t: 0, pin: FEET },
      { t: 0.08, pin: FEET, z: -6, lean: 3 },
      { t: 0.18, pin: 'ballB', z: -10, lean: 3, ...LF(-100, 150, { ftF: -165, lgF: 0 }), ...AF(-128, 28, { abF: 14 }), ...AB(-90, 8, { abB: 34 }) },
      { t: 0.26, pin: 'ballB palmF^foot_r>toe_r:0.3+0,0.15,0', z: -10 },
      { t: 0.74, pin: 'ballB palmF^foot_r>toe_r:0.3+0,0.15,0', z: -10, lean: 2 },
      { t: 0.84, pin: 'ballB', z: -10, ...AF(-120, 30) },
      { t: 0.94, pin: FEET, z: -3, lean: 1, ...LF(-88, 3, { ftF: 0, lgF: 3 }), ...A(-86, 8, { abF: 9, abB: 9 }) },
    ],
  },

  shoulderStretch: {
    dur: 5.0, floor: true, base: STANDA,
    frames: [
      { t: 0, pin: FEET },
      { t: 0.15, pin: 'ballF ballB palmB^upperarm_r>forearm_r:0.9+0.06,0.05,0', ...AF(6, 6, { abF: -52 }), ...AB(-20, 115, { abB: 2 }), twist: 6, head: 88 },
      { t: 0.45, pin: 'ballF ballB palmB^upperarm_r>forearm_r:0.9+0.06,0.05,0', ...AF(8, 6, { abF: -62 }), twist: 8 },
      { t: 0.7, pin: 'ballF ballB palmB^upperarm_r>forearm_r:0.9+0.06,0.05,0', ...AF(8, 6, { abF: -62 }), twist: 8 },
      { t: 0.88, pin: FEET, ...A(-86, 8, { abF: 9, abB: 9 }), twist: 0, head: 90 },
    ],
  },

  neckRoll: {
    dur: 6.0, floor: true, base: STANDA,
    frames: [
      { t: 0, pin: FEET, head: 66, tilt: 0 },
      { t: 0.25, pin: FEET, head: 84, tilt: 30 },
      { t: 0.5, pin: FEET, head: 98, tilt: 0 },
      { t: 0.75, pin: FEET, head: 84, tilt: -30 },
    ],
  },

  worldsGreatest: {
    dur: 6.0, floor: true, base: STANDA,
    plant: { 'ballF@fwd': { x: 156 }, palmB: { x: 152 } },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.04, pin: FEET, x: 101, z: -8, lean: -3 },
      { t: 0.08, pin: 'ballB', x: 102, ...LF(-50, 50, { ftF: -5 }) },
      { t: 0.12, pin: 'ballF@fwd ballB', x: 108, y: 110, z: -5, ...LF(-40, 10, { ftF: 0 }), ...LB(-100, 8, { ftB: 0 }) },
      { t: 0.18, pin: 'ballF@fwd ballB', x: 118, y: 132, z: 0, lean: 0, torso: 60, head: 50, ...LF(-12, 92, { ftF: 0 }), ...LB(-150, 40, { ftB: -66 }) },
      { t: 0.28, pin: 'ballF@fwd ballB palmB', fit: 'y torso', x: 118, y: 134, torso: 22, pelv: 10, head: 10, lgF: 24, tyF: 22, lean: -12, ...AB(-86, 2, { plB: 1, abB: -8 }), ...AF(-100, 60, { abF: -10 }) },
      { t: 0.38, pin: 'ballF@fwd ballB palmB', fit: 'y torso', torso: 22, twist: -12, ...AF(-108, 92, { abF: -16 }) },
      { t: 0.52, pin: 'ballF@fwd ballB palmB', fit: 'y torso', torso: 26, twist: -70, head: 40, ...AF(-90, 6, { abF: 88 }) },
      { t: 0.62, pin: 'ballF@fwd ballB palmB', torso: 26, twist: -70, head: 40 },
      { t: 0.74, pin: 'ballF@fwd ballB palmB', fit: 'y torso', torso: 22, twist: 0, head: 10, ...AF(-100, 60, { abF: -10 }) },
      { t: 0.82, pin: 'ballF@fwd ballB', x: 118, y: 132, torso: 60, head: 50, lgF: 3, tyF: 8, lean: 0, ...A(-86, 8, { plB: 0, abF: 9, abB: 9 }) },
      { t: 0.88, pin: 'ballF@fwd ballB', x: 108, y: 110, z: -5, lean: -3, torso: 90, pelv: 0, head: 90, ...LF(-40, 10), ...LB(-100, 8, { ftB: -12 }) },
      { t: 0.92, pin: 'ballB', x: 102, y: 108, z: -8, ...LF(-50, 50, { ftF: -5 }), ...LB(-88, 3, { ftB: 0 }) },
      { t: 0.96, pin: FEET, x: 101, y: 107.3, z: -5, ...LF(-88, 3, { ftF: 0 }) },
    ],
  },

  /* ─────────── split-training additions ─────────── */

  widePushup: {
    dur: 2.4, floor: true, base: { ...PLANK(17), abF: 30, abB: 30 },
    frames: [
      { t: 0, anchor: 'tipF', pin: PLANK_PINS, fit: 'body' },
      { t: 0.42, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(6), abF: 30, abB: 30 },
      { t: 0.52, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(6), abF: 30, abB: 30 },
      { t: 0.88, anchor: 'tipF', pin: PLANK_PINS, fit: 'body', ...PLANK(17), abF: 30, abB: 30 },
    ],
  },

  archerPushup: {
    dur: 3.6, floor: true, base: { ...PLANK(17), abF: 42, abB: 42, lgF: 12, lgB: 12 },
    frames: [
      { t: 0, anchor: 'tipF', pin: PLANK_PINS, fit: 'body' },
      { t: 0.22, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(7), abF: 42, abB: 42, lgF: 12, lgB: 12, lean: 6, twist: -6 },
      { t: 0.3, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(7), abF: 42, abB: 42, lgF: 12, lgB: 12 },
      { t: 0.5, anchor: 'tipF', pin: PLANK_PINS, fit: 'body', ...PLANK(17), abF: 42, abB: 42, lgF: 12, lgB: 12, lean: 0, twist: 0 },
      { t: 0.72, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(7), abF: 42, abB: 42, lgF: 12, lgB: 12, lean: -6, twist: 6 },
      { t: 0.8, anchor: 'tipF', pin: PLANK_PINS, ...PLANK(7), abF: 42, abB: 42, lgF: 12, lgB: 12 },
    ],
  },

  proneYRaise: {
    dur: 3.0, floor: true, base: { ...PRONE, ...turn(A(90, 4, { abF: 34, abB: 34, rtF: -90, rtB: -90 }), -90) },
    frames: [
      { t: 0, anchor: 'belly' },
      { t: 0.4, anchor: 'belly', torso: 7, pelv: -7, head: 9, ...turn(A(106, 4), -90) },
      { t: 0.6, anchor: 'belly', torso: 7, pelv: -7, head: 9 },
      { t: 0.94, anchor: 'belly', torso: 0, pelv: 0, head: 0, ...turn(A(90, 4), -90) },
    ],
  },

  swimmer: {
    dur: 1.3, floor: true, base: { ...PRONE, torso: 7, pelv: -7, head: 10, ...turn(A(96, 4, { abF: 22, abB: 22 }), -90) },
    frames: [
      { t: 0, anchor: 'belly', ...turn({ ...AF(110, 4), ...AB(92, 4) }, -90), ...turn({ ...LF(-90, 2), ...LB(-102, 2) }, -90) },
      { t: 0.5, anchor: 'belly', ...turn({ ...AB(110, 4), ...AF(92, 4) }, -90), ...turn({ ...LB(-90, 2), ...LF(-102, 2) }, -90) },
    ],
  },

  reversePlank: {
    dur: 4.0, floor: true,
    base: { torso: 158, head: 156, pelv: 0, ...L(-22, 0), ...FT(28), lgF: 3, lgB: 3, tyF: 4, tyB: 4,
      ...A(-92, 2, { abF: 10, abB: 10, plF: 1, plB: 1 }) },
    frames: [
      { t: 0, anchor: 'heelF', pin: 'heelB palmF palmB', fit: 'body' },
      { t: 0.5, anchor: 'heelF', pin: 'heelB palmF palmB', fit: 'body', torso: 157.4, head: 154 },
    ],
  },

  doorwayRow: {
    dur: 2.4, floor: true,
    props: [{ x0: 141, x1: 147, y0: 20, z0: 27, z1: 33 }, { x0: 141, x1: 147, y0: 20, z0: -33, z1: -27 }],
    plant: { palmF: { x: 141, y: 90, z: 27, wall: 'front' }, palmB: { x: 141, y: 90, z: -27, wall: 'front' },
      ballF: { x: 138 }, ballB: { x: 138 } },
    base: { ...STANDA, x: 117, y: 108, torso: 113, head: 106, ...L(-80, 6), ...FT(0), ...A(-2, 4, { abF: 34, abB: 34 }) },
    frames: [
      { t: 0, pin: 'ballF ballB palmF palmB', fit: 'x y' },
      { t: 0.42, pin: 'ballF ballB palmF palmB', fit: 'x y', x: 129, y: 107.5, torso: 98, head: 94, ...L(-86, 4), ...A(-25, 105, { abF: 46, abB: 46 }) },
      { t: 0.54, pin: 'ballF ballB palmF palmB', fit: 'x y' },
      { t: 0.92, pin: 'ballF ballB palmF palmB', fit: 'x y', x: 117, y: 108, torso: 113, head: 106, ...L(-80, 6), ...A(-2, 4, { abF: 34, abB: 34 }) },
    ],
  },

  wallAngel: {
    dur: 3.6, floor: true,
    props: [{ x0: 88, x1: 94.4, y0: 20 }],
    base: { ...STANDA, x: 100, y: 107.6, torso: 90, head: 90, ...A(-90, 90, { abF: 88, abB: 88, rtF: 90, rtB: 90 }) },
    frames: [
      { t: 0, pin: FEET },
      { t: 0.45, pin: FEET, ...A(-90, 22, { abF: 158, abB: 158 }) },
      { t: 0.55, pin: FEET, ...A(-90, 22, { abF: 158, abB: 158 }) },
      { t: 0.95, pin: FEET, ...A(-90, 90, { abF: 88, abB: 88 }) },
    ],
  },
};

export type AnimKey = keyof typeof ANIMS;
