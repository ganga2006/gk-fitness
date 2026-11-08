import type { Exercise } from '../data/exercises';

/** Anatomical regions the 3D model can highlight and the split plans train. */
export type PartKey =
  | 'chest' | 'serratus' | 'abs' | 'obliques'
  | 'lats' | 'upperBack' | 'lowerBack' | 'traps'
  | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'glutes' | 'quads' | 'hamstrings' | 'calves' | 'adductors' | 'tibialis'
  | 'hipFlexors' | 'neck';

export const PART_LABEL: Record<PartKey, string> = {
  chest: 'Chest', serratus: 'Serratus', abs: 'Abs', obliques: 'Obliques',
  lats: 'Lats', upperBack: 'Upper back', lowerBack: 'Lower back', traps: 'Traps',
  shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves',
  adductors: 'Inner thighs', tibialis: 'Shins', hipFlexors: 'Hip flexors',
  neck: 'Neck',
};

/** The anatomical name behind each region, shown on the exercise detail sheet. */
export const PART_ANATOMY: Record<PartKey, string> = {
  chest: 'Pectoralis major', serratus: 'Serratus anterior',
  abs: 'Rectus abdominis', obliques: 'External oblique',
  lats: 'Latissimus dorsi', upperBack: 'Rhomboids & teres',
  lowerBack: 'Erector spinae', traps: 'Trapezius',
  shoulders: 'Deltoid', biceps: 'Biceps brachii', triceps: 'Triceps brachii',
  forearms: 'Forearm flexors', glutes: 'Gluteus maximus',
  quads: 'Quadriceps femoris', hamstrings: 'Hamstrings',
  calves: 'Gastrocnemius', adductors: 'Adductor group',
  tibialis: 'Tibialis anterior', hipFlexors: 'Iliopsoas',
  neck: 'Sternocleidomastoid',
};

/** Free-text muscle names in the library mapped to model regions. */
const MAP: [RegExp, PartKey[]][] = [
  [/chest/i,                      ['chest']],
  [/serratus/i,                   ['serratus']],
  [/abs|core/i,                   ['abs']],
  [/oblique/i,                    ['obliques']],
  [/lats/i,                       ['lats']],
  [/upper back/i,                 ['upperBack']],
  [/lower back|spine/i,           ['lowerBack']],
  [/^back$/i,                     ['lats', 'upperBack', 'lowerBack']],
  [/trap/i,                       ['traps']],
  [/neck/i,                       ['neck']],
  [/rear shoulder|shoulder|delt|posture/i, ['shoulders']],
  [/tricep/i,                     ['triceps']],
  [/bicep/i,                      ['biceps']],
  [/forearm/i,                    ['forearms']],
  [/glute med|glute|hip abduct/i, ['glutes']],
  [/quad/i,                       ['quads']],
  [/hamstring/i,                  ['hamstrings']],
  [/calf|calves/i,                ['calves']],
  [/shin|tibialis/i,              ['tibialis']],
  [/adductor|inner thigh/i,       ['adductors']],
  [/hip flexor/i,                 ['hipFlexors']],
  [/^hips$|thoracic/i,            ['hipFlexors', 'lowerBack']],
  [/full body/i,                  ['chest', 'abs', 'quads', 'glutes', 'shoulders', 'lats']],
];

export function partsOf(e: Exercise): PartKey[] {
  const out = new Set<PartKey>();
  for (const m of e.muscles) {
    for (const [re, parts] of MAP) {
      if (re.test(m)) { parts.forEach((p) => out.add(p)); break; }
    }
  }
  // A few whole-body patterns deserve their prime movers even if unnamed.
  if (e.group === 'fullbody') { out.add('abs'); out.add('quads'); }
  if (e.group === 'cardio') { out.add('quads'); out.add('calves'); }
  return [...out];
}

/* ── the body-part focus areas offered in the UI and the split plans ── */

export type Focus =
  | 'chest' | 'back' | 'shoulders' | 'arms' | 'abs' | 'legs' | 'glutes' | 'fullbody' | 'cardio';

export const FOCUS_LABEL: Record<Focus, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms',
  abs: 'Abs & Core', legs: 'Legs', glutes: 'Glutes',
  fullbody: 'Full Body', cardio: 'Cardio',
};

const FOCUS_PARTS: Record<Focus, PartKey[]> = {
  chest: ['chest', 'triceps', 'shoulders', 'serratus'],
  back: ['lats', 'upperBack', 'lowerBack', 'traps', 'biceps'],
  shoulders: ['shoulders', 'traps', 'upperBack', 'triceps'],
  arms: ['triceps', 'biceps', 'forearms'],
  abs: ['abs', 'obliques', 'hipFlexors', 'serratus'],
  legs: ['quads', 'hamstrings', 'calves', 'adductors', 'tibialis'],
  glutes: ['glutes', 'hamstrings', 'lowerBack'],
  fullbody: ['chest', 'abs', 'quads', 'glutes', 'shoulders', 'lats'],
  cardio: ['quads', 'calves', 'abs'],
};

export const focusParts = (f: Focus) => FOCUS_PARTS[f];

/** How strongly an exercise serves a focus area — used to rank picks. */
export function focusScore(e: Exercise, f: Focus): number {
  const want = FOCUS_PARTS[f];
  const have = partsOf(e);
  let score = 0;
  have.forEach((p) => {
    const i = want.indexOf(p);
    if (i === 0) score += 3;
    else if (i > 0) score += 2;
  });
  if (f === 'cardio' && e.group === 'cardio') score += 4;
  if (f === 'fullbody' && e.group === 'fullbody') score += 4;
  if (e.group === 'mobility') score -= 2;
  return score;
}
