/**
 * A pose is a snapshot of the trainer's joints.
 * Plane angles are in DEGREES, maths convention: 0 = forward, 90 = up, -90 = down,
 * measured in the body's own sagittal plane (the figure is drawn facing RIGHT).
 * "F" = the near (right) limb, "B" = the far (left) limb.
 * x / y is the pelvis centre in a 200 x 200 viewBox; the floor sits at y = 171.
 * The out-of-plane fields make the motion three-dimensional (see kin.ts).
 */
export type Pose = {
  x: number;   y: number;  z: number;     // pelvis centre; z = sideways shift
  torso: number;  // chest line (pelvis -> shoulders)
  pelv: number;   // pelvis tilt relative to the chest; the spine curves between them
  head: number;   // head pitch
  twist: number; lean: number; roll: number; yaw: number; tilt: number;
  armF: number;   faF: number;  abF: number; rtF: number; plF: number; hdF: number; wlF: number;
  armB: number;   faB: number;  abB: number; rtB: number; plB: number; hdB: number; wlB: number;
  thF: number;    shF: number;  ftF: number; lgF: number; lrF: number; tyF: number; tkF: number;
  thB: number;    shB: number;  ftB: number; lgB: number; lrB: number; tyB: number; tkB: number;
};
// ab = arm out to the side, rt = humeral rotation, pl = palm flat on the floor (0..1),
// hd = finger direction when flat; lg = leg out to the side, lr = hip rotation,
// ty = toe-out, tk = toes tucked flat (plank) (0..1).

export type Frame = { t: number; pin?: string; anchor?: string; fit?: string } & Partial<Pose>;

export type Anim = {
  dur: number;              // seconds for one full loop
  base?: Partial<Pose>;     // merged over STAND, then frames merge over this
  frames: Frame[];
  floor?: boolean;          // draw the floor line
  mirror?: boolean;         // flip horizontally (for left/right symmetric moves)
  /** named floor/wall spots (svg units; y = 171 is the floor). Missing parts come from the first key that uses the spot. */
  plant?: Record<string, { x?: number; y?: number; z?: number; wall?: 'front' | 'back' }>;
  /** furniture the body works against: boxes in svg units (x0..x1, y0 = top .. y1 = bottom, z0..z1 sideways) */
  props?: { x0: number; x1: number; y0: number; y1?: number; z0?: number; z1?: number }[];
};

/** Neutral standing pose every animation is built on top of. */
export const STAND: Pose = {
  x: 100, y: 107.3, z: 0,
  torso: 90, pelv: 0, head: 90,
  twist: 0, lean: 0, roll: 0, yaw: 0, tilt: 0,
  armF: -86, faF: -78, abF: 9, rtF: 0, plF: 0, hdF: 0, wlF: 0,
  armB: -86, faB: -78, abB: 9, rtB: 0, plB: 0, hdB: 0, wlB: 0,
  thF: -88, shF: -91, ftF: 0, lgF: 3, lrF: 0, tyF: 8, tkF: 0,
  thB: -88, shB: -91, ftB: 0, lgB: 3, lrB: 0, tyB: 8, tkB: 0,
};

/**
 * Segment lengths of the model's skeleton (body.glb), in viewBox units
 * (10 units = 1 model unit; stature 120 units). Used by the 2D figure for drawing.
 */
export const SEG = {
  torso: 33.0,
  neck: 12,
  headR: 7.8,
  upperArm: 20.7,
  foreArm: 17.6,
  thigh: 30.4,
  shin: 27.5,
  foot: 14,
};

export const FLOOR_Y = 171;
