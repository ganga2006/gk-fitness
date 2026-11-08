/**
 * Face palette and proportions, derived by sampling the reference portrait.
 * No photograph is shipped or rendered — the head is built from geometry and
 * these values only describe colouring and shape.
 */
export const FACE = {
  skin:       0xB08270,
  skinLit:    0xC09484,
  skinShadow: 0x8E6A5C,
  hair:       0x241F1E,
  hairLit:    0x3A3230,
  beard:      0x2E2523,
  brow:       0x241F1E,
  lip:        0x8D6765,
  eyeWhite:   0xEDE6E0,
  iris:       0x2B1C14,
};

/** Head proportions as multiples of the head radius. */
export const FACE_GEO = {
  skull: [0.94, 1.10, 0.96] as [number, number, number],
  jawY: -0.58, jawX: 0.10, jaw: [0.96, 0.74, 0.88] as [number, number, number],
  eyeX: 0.72, eyeY: 0.10, eyeZ: 0.33, eyeR: 0.16,
  browY: 0.28,
  noseX: 0.86, noseY: -0.10,
  lipX: 0.80, lipY: -0.42,
  earZ: 0.92, earY: -0.02,
  hairBack: -0.20, hairY: 0.18,
};
