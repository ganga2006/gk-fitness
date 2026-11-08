import type { Level } from './exercises';

export type PlanItem =
  | { id: string; mode: 'time'; seconds: number; rest: number }
  | { id: string; mode: 'reps'; sets: number; reps: number; rest: number };

export type Block = { name: string; items: PlanItem[] };

export type DayPlan = {
  /** 0 = Monday … 6 = Sunday */
  day: number;
  title: string;
  focus: string;
  kind: 'workout' | 'recovery' | 'rest';
  blocks: Block[];
};

/** Two ways to run the week. */
export type PlanStyle = 'smart' | 'focus' | 'split';

const T = (id: string, seconds: number, rest = 15): PlanItem => ({ id, mode: 'time', seconds, rest });
const R = (id: string, sets: number, reps: number, rest = 30): PlanItem => ({ id, mode: 'reps', sets, reps, rest });

/* ── reusable warm-ups and cool-downs ───────────────────────────── */

const WARM_EASY: Block = { name: 'Warm-up', items: [
  T('march-in-place', 45, 10), T('arm-circles', 30, 10), T('hip-circles', 30, 10), T('torso-twist', 30, 10),
]};
const WARM_STD: Block = { name: 'Warm-up', items: [
  T('jumping-jacks', 40, 10), T('arm-circles', 30, 10), T('hip-circles', 30, 10), T('inchworm', 40, 15),
]};
const WARM_HARD: Block = { name: 'Warm-up', items: [
  T('jumping-jacks', 45, 10), T('high-knees', 30, 10), T('worlds-greatest', 50, 10), T('inchworm', 45, 15),
]};
const WARM_PUSH: Block = { name: 'Warm-up', items: [
  T('jumping-jacks', 40, 10), T('arm-circles', 35, 10), T('wall-angel', 40, 10), T('inchworm', 40, 15),
]};

const COOL_STD: Block = { name: 'Cool-down', items: [
  T('child-pose', 45, 5), T('hamstring-stretch', 45, 5), T('cobra', 40, 5), T('neck-roll', 30, 0),
]};
const COOL_LOWER: Block = { name: 'Cool-down', items: [
  T('quad-stretch', 50, 5), T('hamstring-stretch', 50, 5), T('child-pose', 45, 5), T('downward-dog', 40, 0),
]};
const COOL_UPPER: Block = { name: 'Cool-down', items: [
  T('shoulder-stretch', 50, 5), T('cobra', 40, 5), T('child-pose', 45, 5), T('wall-angel', 35, 0),
]};
const COOL_CORE: Block = { name: 'Cool-down', items: [
  T('cobra', 45, 5), T('child-pose', 50, 5), T('hamstring-stretch', 45, 5), T('neck-roll', 30, 0),
]};

const RECOVERY_FLOW: Block = { name: 'Mobility Flow', items: [
  T('cat-cow', 60, 10), T('downward-dog', 50, 10), T('worlds-greatest', 60, 10),
  T('hip-circles', 40, 10), T('hamstring-stretch', 50, 10), T('quad-stretch', 50, 10),
  T('wall-angel', 45, 10), T('child-pose', 60, 0),
]};

const REST_DAY = (day: number): DayPlan => ({
  day, title: 'Rest Day', focus: 'Recover — this is when the work pays off', kind: 'rest', blocks: [],
});
const RECOVERY_DAY = (day: number): DayPlan => ({
  day, title: 'Active Recovery', focus: 'Gentle mobility to loosen up', kind: 'recovery',
  blocks: [RECOVERY_FLOW],
});

/* ═══════════════════════════════════════════════════════════════════
   FOCUS PROGRAMME
   Beginner  → belly: maximum calorie burn + long core endurance blocks
   Intermediate → chest-led, with core kept as a supporting block
   Advanced  → abs and chest together, high volume
   Targeted fat loss over the belly is a small effect at best, so the
   beginner week leans on total burn (circuits) as much as on core work.
   ═══════════════════════════════════════════════════════════════════ */

const BEGINNER_FOCUS: DayPlan[] = [
  { day: 0, title: 'Belly Burn Circuit', focus: 'Raise the burn, then work the core', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Fat-Burn Circuit', items: [
      T('march-in-place', 45, 20), T('jumping-jacks', 30, 25),
      T('squat-thrust', 25, 25), T('butt-kicks', 30, 25),
      T('jumping-jacks', 30, 25), T('mountain-climber', 25, 30),
    ]},
    { name: 'Core Block', items: [
      R('crunch', 3, 12, 30), R('dead-bug', 3, 8, 30),
      T('forearm-plank', 20, 35), R('glute-bridge', 2, 12, 30),
    ]},
    COOL_CORE,
  ]},
  { day: 1, title: 'Core Endurance', focus: 'Longer, steady core work', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Core Endurance', items: [
      T('forearm-plank', 25, 30), R('crunch', 3, 15, 25),
      R('dead-bug', 3, 10, 30), T('flutter-kick', 25, 30),
      R('bird-dog', 3, 8, 25), R('glute-bridge', 3, 12, 25),
      T('plank', 25, 0),
    ]},
    COOL_CORE,
  ]},
  RECOVERY_DAY(2),
  { day: 3, title: 'Belly Burn + Legs', focus: 'Big muscles burn more calories', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Lower Body', items: [
      R('bodyweight-squat', 3, 12, 35), R('forward-lunge', 3, 8, 35),
      R('glute-bridge', 3, 12, 30), T('wall-sit', 25, 35),
    ]},
    { name: 'Core Finisher', items: [
      R('crunch', 2, 15, 25), T('mountain-climber', 25, 25), T('forearm-plank', 25, 0),
    ]},
    COOL_LOWER,
  ]},
  { day: 4, title: 'Core & Obliques', focus: 'Hit the waist from every angle', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Core', items: [
      R('crunch', 3, 15, 25), R('russian-twist', 3, 16, 30),
      T('side-plank', 20, 25), R('bicycle-crunch', 3, 16, 30),
      R('dead-bug', 2, 10, 25), T('forearm-plank', 25, 0),
    ]},
    COOL_CORE,
  ]},
  { day: 5, title: 'Fat-Burn Cardio', focus: 'The longest burn of the week', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Cardio Circuit', items: [
      T('jumping-jacks', 35, 20), T('march-in-place', 50, 15),
      T('butt-kicks', 30, 20), T('squat-thrust', 30, 25),
      T('jumping-jacks', 35, 20), T('inchworm', 40, 20),
      T('mountain-climber', 30, 20), T('march-in-place', 50, 0),
    ]},
    COOL_STD,
  ]},
  REST_DAY(6),
];

const INTERMEDIATE_FOCUS: DayPlan[] = [
  { day: 0, title: 'Chest & Triceps', focus: 'Pressing volume, the week’s main lift', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Chest', items: [
      R('pushup', 4, 10, 45), R('wide-pushup', 3, 10, 45),
      R('incline-pushup', 3, 12, 40), R('tricep-dip', 3, 12, 40),
      T('shoulder-tap-plank', 35, 30),
    ]},
    { name: 'Core', items: [ R('leg-raise', 3, 12, 30), T('forearm-plank', 40, 0) ]},
    COOL_UPPER,
  ]},
  { day: 1, title: 'Core Circuit', focus: 'Supporting core work, kept short', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Core', items: [
      R('bicycle-crunch', 3, 20, 30), R('leg-raise', 3, 12, 30),
      T('forearm-plank', 45, 30), R('russian-twist', 3, 20, 30),
      T('side-plank', 30, 25), T('flutter-kick', 30, 0),
    ]},
    COOL_CORE,
  ]},
  { day: 2, title: 'Chest & Shoulders', focus: 'Press overhead and across', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Push', items: [
      R('pushup', 4, 12, 45), R('pike-pushup', 4, 10, 45),
      R('wide-pushup', 3, 10, 40), R('tricep-dip', 3, 12, 40),
      R('prone-y-raise', 3, 12, 30),
    ]},
    COOL_UPPER,
  ]},
  { day: 3, title: 'HIIT Conditioning', focus: '40 on, 20 off — keep body fat down', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Intervals', items: [
      T('high-knees', 40, 20), T('squat-thrust', 40, 20), T('skater-hops', 40, 20),
      T('mountain-climber', 40, 20), T('jump-rope', 40, 20), T('burpee', 40, 20),
      T('butt-kicks', 40, 20), T('jumping-jacks', 40, 0),
    ]},
    COOL_STD,
  ]},
  { day: 4, title: 'Chest Volume & Back', focus: 'More pressing, balanced with pulling', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Push', items: [
      R('pushup', 4, 14, 45), R('diamond-pushup', 3, 8, 45), R('wide-pushup', 3, 12, 40),
    ]},
    { name: 'Pull & Balance', items: [
      R('doorway-row', 3, 12, 40), R('swimmer', 3, 14, 30), R('superman', 3, 12, 30),
    ]},
    COOL_UPPER,
  ]},
  { day: 5, title: 'Full Body Burn', focus: 'Circuit with short rest', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Circuit', items: [
      T('burpee', 35, 20), T('jump-squat', 35, 20), T('pushup', 35, 20),
      T('mountain-climber', 35, 20), T('inchworm', 40, 20), T('skater-hops', 35, 20),
      T('plank', 45, 20), T('high-knees', 35, 0),
    ]},
    COOL_STD,
  ]},
  RECOVERY_DAY(6),
];

const ADVANCED_FOCUS: DayPlan[] = [
  { day: 0, title: 'Chest Power', focus: 'Heavy pressing volume', kind: 'workout', blocks: [
    WARM_HARD,
    { name: 'Chest', items: [
      R('pushup', 5, 18, 45), R('archer-pushup', 3, 10, 45),
      R('diamond-pushup', 4, 12, 45), R('wide-pushup', 4, 14, 40),
      R('tricep-dip', 4, 15, 40),
    ]},
    { name: 'Core Finisher', items: [ T('hollow-hold', 45, 25), T('shoulder-tap-plank', 50, 0) ]},
    COOL_UPPER,
  ]},
  { day: 1, title: 'Abs Crusher', focus: 'High-tension midsection work', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Abs', items: [
      T('hollow-hold', 45, 30), R('leg-raise', 4, 15, 35),
      R('bicycle-crunch', 4, 24, 30), T('flutter-kick', 45, 25),
      R('situp', 3, 20, 30), T('forearm-plank', 60, 25),
      T('reverse-plank', 40, 0),
    ]},
    COOL_CORE,
  ]},
  { day: 2, title: 'Chest & Shoulders', focus: 'Press volume with overhead work', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Push', items: [
      R('pushup', 4, 20, 45), R('pike-pushup', 4, 12, 45),
      R('wide-pushup', 4, 15, 40), R('diamond-pushup', 3, 12, 45),
      R('doorway-row', 3, 12, 40),
    ]},
    COOL_UPPER,
  ]},
  { day: 3, title: 'Abs & Obliques', focus: 'Rotation, flexion and anti-rotation', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Abs', items: [
      R('russian-twist', 4, 24, 30), T('side-plank', 45, 20),
      R('bicycle-crunch', 4, 24, 30), R('leg-raise', 4, 15, 30),
      T('hollow-hold', 50, 25), T('shoulder-tap-plank', 50, 25),
      T('mountain-climber', 45, 0),
    ]},
    COOL_CORE,
  ]},
  { day: 4, title: 'Push + Core Superset', focus: 'Alternate pressing and abs, little rest', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Superset', items: [
      R('pushup', 4, 18, 20), R('leg-raise', 4, 15, 30),
      R('diamond-pushup', 3, 12, 20), T('hollow-hold', 45, 30),
      R('archer-pushup', 3, 10, 20), T('forearm-plank', 60, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 5, title: 'Conditioning + Abs', focus: 'Metabolic work, abs finisher', kind: 'workout', blocks: [
    WARM_HARD,
    { name: 'Conditioning', items: [
      T('burpee', 50, 10), T('jump-squat', 50, 10), T('pushup', 50, 10),
      T('mountain-climber', 50, 10), T('star-jump', 50, 10), T('bear-crawl', 50, 15),
    ]},
    { name: 'Abs Finisher', items: [
      T('hollow-hold', 50, 20), R('bicycle-crunch', 3, 24, 25), T('forearm-plank', 60, 0),
    ]},
    COOL_CORE,
  ]},
  RECOVERY_DAY(6),
];

/* ═══════════════════════════════════════════════════════════════════
   BODY-PART SPLIT
   One region per day, arranged so each major muscle group is trained
   about twice a week, which outperforms once-weekly for growth.
   ═══════════════════════════════════════════════════════════════════ */

const BEGINNER_SPLIT: DayPlan[] = [
  { day: 0, title: 'Chest & Triceps', focus: 'Pushing strength', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Chest & Triceps', items: [
      R('wall-pushup', 3, 10, 40), R('incline-pushup', 3, 8, 45),
      R('knee-pushup', 3, 8, 45), R('tricep-dip', 3, 8, 40),
      T('plank', 20, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 1, title: 'Legs & Glutes', focus: 'Quads, hamstrings and glutes', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Lower Body', items: [
      R('bodyweight-squat', 3, 12, 40), R('forward-lunge', 3, 8, 40),
      R('sumo-squat', 3, 10, 40), R('glute-bridge', 3, 12, 30),
      T('wall-sit', 25, 35), R('calf-raise', 3, 15, 0),
    ]},
    COOL_LOWER,
  ]},
  { day: 2, title: 'Abs & Core', focus: 'The whole midsection', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Core', items: [
      R('crunch', 3, 12, 30), R('dead-bug', 3, 8, 30),
      R('bird-dog', 3, 8, 25), T('forearm-plank', 20, 30),
      R('glute-bridge', 2, 12, 0),
    ]},
    COOL_CORE,
  ]},
  { day: 3, title: 'Back & Shoulders', focus: 'Pulling and posture', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Back & Shoulders', items: [
      R('doorway-row', 3, 10, 40), R('prone-y-raise', 3, 12, 30),
      R('superman', 3, 10, 30), R('swimmer', 3, 12, 30),
      T('wall-angel', 40, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 4, title: 'Full Body & Cardio', focus: 'Everything together', kind: 'workout', blocks: [
    WARM_EASY,
    { name: 'Circuit', items: [
      T('jumping-jacks', 30, 25), R('bodyweight-squat', 2, 12, 30),
      R('knee-pushup', 2, 8, 35), T('mountain-climber', 25, 25),
      R('crunch', 2, 12, 25), T('march-in-place', 45, 0),
    ]},
    COOL_STD,
  ]},
  RECOVERY_DAY(5),
  REST_DAY(6),
];

const INTERMEDIATE_SPLIT: DayPlan[] = [
  { day: 0, title: 'Chest & Triceps', focus: 'Pressing volume', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Chest & Triceps', items: [
      R('pushup', 4, 12, 45), R('wide-pushup', 3, 12, 40),
      R('incline-pushup', 3, 14, 40), R('diamond-pushup', 3, 8, 45),
      R('tricep-dip', 3, 12, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 1, title: 'Legs & Glutes', focus: 'Explosive lower body', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Lower Body', items: [
      R('jump-squat', 4, 12, 45), R('forward-lunge', 3, 14, 40),
      R('sumo-squat', 3, 15, 40), T('wall-sit', 45, 40),
      R('glute-kickback', 3, 12, 30), R('calf-raise', 3, 20, 0),
    ]},
    COOL_LOWER,
  ]},
  { day: 2, title: 'Back & Shoulders', focus: 'Pull hard, stand tall', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Back & Shoulders', items: [
      R('doorway-row', 4, 12, 40), R('pike-pushup', 3, 10, 45),
      R('prone-y-raise', 3, 14, 30), R('swimmer', 3, 16, 30),
      T('reverse-plank', 30, 25), T('wall-angel', 40, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 3, title: 'Abs & Conditioning', focus: 'Core work plus intervals', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Core', items: [
      R('bicycle-crunch', 3, 20, 30), R('leg-raise', 3, 12, 30),
      T('forearm-plank', 45, 30), R('russian-twist', 3, 20, 30),
      T('side-plank', 30, 25),
    ]},
    { name: 'Intervals', items: [
      T('high-knees', 40, 20), T('burpee', 40, 20), T('mountain-climber', 40, 0),
    ]},
    COOL_CORE,
  ]},
  { day: 4, title: 'Upper Body', focus: 'Second pass at chest, back and arms', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Upper Body', items: [
      R('pushup', 4, 14, 45), R('doorway-row', 3, 14, 40),
      R('pike-pushup', 3, 12, 45), R('tricep-dip', 3, 14, 40),
      R('prone-y-raise', 3, 14, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 5, title: 'Lower Body & Cardio', focus: 'Second pass at legs', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Lower & Burn', items: [
      R('bodyweight-squat', 4, 20, 35), R('jump-lunge', 3, 14, 40),
      R('glute-bridge', 3, 16, 30), T('skater-hops', 40, 20),
      T('jump-rope', 45, 20), R('calf-raise', 3, 22, 0),
    ]},
    COOL_LOWER,
  ]},
  RECOVERY_DAY(6),
];

const ADVANCED_SPLIT: DayPlan[] = [
  { day: 0, title: 'Chest & Triceps', focus: 'Maximum pressing volume', kind: 'workout', blocks: [
    WARM_HARD,
    { name: 'Chest & Triceps', items: [
      R('pushup', 5, 20, 40), R('archer-pushup', 4, 10, 45),
      R('diamond-pushup', 4, 12, 45), R('wide-pushup', 4, 15, 40),
      R('tricep-dip', 4, 15, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 1, title: 'Back & Biceps', focus: 'Pulling volume', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Back & Biceps', items: [
      R('doorway-row', 5, 15, 40), R('prone-y-raise', 4, 15, 30),
      R('swimmer', 4, 20, 30), R('superman', 4, 15, 30),
      T('reverse-plank', 45, 25), T('wall-angel', 40, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 2, title: 'Legs & Glutes', focus: 'Volume and time under tension', kind: 'workout', blocks: [
    WARM_HARD,
    { name: 'Lower Body', items: [
      R('jump-squat', 4, 20, 40), R('jump-lunge', 4, 20, 40),
      R('sumo-squat', 4, 20, 35), T('wall-sit', 60, 40),
      R('glute-kickback', 3, 15, 30), R('calf-raise', 4, 25, 0),
    ]},
    COOL_LOWER,
  ]},
  { day: 3, title: 'Abs & Core', focus: 'High-tension midsection', kind: 'workout', blocks: [
    WARM_STD,
    { name: 'Abs', items: [
      T('hollow-hold', 45, 30), R('leg-raise', 4, 15, 35),
      T('side-plank', 45, 20), R('bicycle-crunch', 4, 24, 30),
      T('shoulder-tap-plank', 50, 30), R('russian-twist', 3, 24, 30),
      T('forearm-plank', 60, 0),
    ]},
    COOL_CORE,
  ]},
  { day: 4, title: 'Push Day', focus: 'Chest, shoulders and triceps again', kind: 'workout', blocks: [
    WARM_PUSH,
    { name: 'Push', items: [
      R('pushup', 4, 18, 40), R('pike-pushup', 4, 12, 45),
      R('wide-pushup', 4, 15, 40), R('diamond-pushup', 3, 12, 45),
      T('bear-crawl', 45, 0),
    ]},
    COOL_UPPER,
  ]},
  { day: 5, title: 'Pull & Legs', focus: 'Second pass at back and legs', kind: 'workout', blocks: [
    WARM_HARD,
    { name: 'Pull & Legs', items: [
      R('doorway-row', 4, 15, 40), R('jump-squat', 4, 18, 40),
      R('swimmer', 3, 20, 30), R('forward-lunge', 3, 18, 35),
      T('reverse-plank', 45, 20), T('burpee', 45, 0),
    ]},
    COOL_LOWER,
  ]},
  RECOVERY_DAY(6),
];


/* ═══════════════════════════════════════════════════════════════════
   FAST RESULTS — best results in the least time (research-based)
   • Multi-joint moves only, paired as supersets (push ↔ legs, pull ↔
     hips): roughly halves session time for the same work
     (Iversen et al., Sports Med 2021).
   • Bodyweight is a light load, so sets go close to failure — push-ups
     taken near failure build chest and triceps like a low-load bench
     press (Kikuchi & Nakazato 2017).
   • Strength on 3 days a week covers the WHO minimum of 2.
   • A 3 × 20-second all-out finisher: in Gillen et al. (PLoS One 2016)
     this matched 45 minutes of steady cardio for VO₂ and insulin
     sensitivity, in a fifth of the time.
   • Core: anti-extension / anti-rotation holds (dead bug, bird dog,
     side plank) rather than long crunch sets.
   • Between strength days, a 10-minute "exercise snack" — short
     vigorous bouts still raise fitness (Jenkins et al. 2019).
   ═══════════════════════════════════════════════════════════════════ */

const S1 = (id: string, reps: number, rest: number): PlanItem => ({ id, mode: 'reps', sets: 1, reps, rest });
/** a superset: A then B, `rounds` times, short rest inside the pair, longer after it */
const SUPERSET = (a: string, ra: number, b: string, rb: number, rounds: number, inner = 15, after = 60): PlanItem[] =>
  Array.from({ length: rounds }, (_, i) => [S1(a, ra, inner), S1(b, rb, i === rounds - 1 ? 30 : after)]).flat();
/** all-out 20 s efforts with easy marching in between */
const SPRINTS = (id: string, easy = 60): Block => ({ name: 'All-out finisher', items: [
  T(id, 20, 0), T('march-in-place', easy, 0), T(id, 20, 0), T('march-in-place', easy, 0), T(id, 20, 0),
]});
const WARM_FAST: Block = { name: 'Warm-up', items: [
  T('jumping-jacks', 30, 8), T('arm-circles', 25, 8), T('inchworm', 35, 8), T('bodyweight-squat', 25, 10),
]};
const COOL_FAST: Block = { name: 'Cool-down', items: [
  T('hamstring-stretch', 35, 5), T('cobra', 30, 5), T('child-pose', 40, 0),
]};
const SNACK = (day: number, burst: string): DayPlan => ({
  day, title: 'Exercise Snack', focus: '10 minutes: short hard bursts to keep fitness climbing', kind: 'recovery', blocks: [
    { name: 'Snack', items: [
      T('march-in-place', 40, 5), T(burst, 30, 30), T('hip-circles', 30, 5), T(burst, 30, 30),
      T('cat-cow', 40, 5), T(burst, 30, 30), T('worlds-greatest', 50, 5), T('wall-angel', 40, 0),
    ]},
  ],
});

const BEGINNER_SMART: DayPlan[] = [
  { day: 0, title: 'Full Body A', focus: 'Supersets to near failure, then 3 all-out bursts', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('knee-pushup', 10, 'bodyweight-squat', 15, 3) },
    { name: 'Superset: pull + hips', items: SUPERSET('doorway-row', 12, 'glute-bridge', 15, 3) },
    { name: 'Core', items: [T('dead-bug', 35, 15), T('side-plank', 20, 10), T('bird-dog', 40, 20)] },
    SPRINTS('jumping-jacks', 75),
    COOL_FAST,
  ]},
  SNACK(1, 'march-in-place'),
  { day: 2, title: 'Full Body B', focus: 'Same idea, different angles', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('incline-pushup', 12, 'forward-lunge', 10, 3) },
    { name: 'Superset: pull + hips', items: SUPERSET('superman', 12, 'sumo-squat', 15, 3) },
    { name: 'Core', items: [T('forearm-plank', 30, 15), T('bird-dog', 40, 15), T('dead-bug', 35, 20)] },
    SPRINTS('squat-thrust', 75),
    COOL_FAST,
  ]},
  SNACK(3, 'jumping-jacks'),
  { day: 4, title: 'Full Body A', focus: 'Beat Monday by one rep per set', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('knee-pushup', 12, 'bodyweight-squat', 18, 3) },
    { name: 'Superset: pull + hips', items: SUPERSET('doorway-row', 14, 'glute-bridge', 18, 3) },
    { name: 'Core', items: [T('dead-bug', 40, 15), T('side-plank', 25, 10), T('bird-dog', 40, 20)] },
    SPRINTS('jumping-jacks', 75),
    COOL_FAST,
  ]},
  RECOVERY_DAY(5),
  REST_DAY(6),
];

const INTERMEDIATE_SMART: DayPlan[] = [
  { day: 0, title: 'Full Body A', focus: 'Supersets to near failure, then 3 all-out bursts', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('pushup', 15, 'forward-lunge', 12, 3) },
    { name: 'Superset: pull + hips', items: SUPERSET('doorway-row', 15, 'glute-bridge', 20, 3) },
    { name: 'Core', items: [T('plank', 45, 15), T('side-plank', 30, 10), T('dead-bug', 40, 20)] },
    SPRINTS('burpee', 60),
    COOL_FAST,
  ]},
  SNACK(1, 'high-knees'),
  { day: 2, title: 'Full Body B', focus: 'Same idea, different angles', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('pike-pushup', 10, 'bodyweight-squat', 25, 3) },
    { name: 'Superset: pull + hips', items: SUPERSET('prone-y-raise', 15, 'wide-pushup', 12, 3) },
    { name: 'Core', items: [T('shoulder-tap-plank', 40, 15), T('bird-dog', 40, 15), T('hollow-hold', 25, 20)] },
    SPRINTS('high-knees', 60),
    COOL_FAST,
  ]},
  SNACK(3, 'jumping-jacks'),
  { day: 4, title: 'Full Body A', focus: 'Beat Monday by one rep per set', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('pushup', 17, 'forward-lunge', 14, 3) },
    { name: 'Superset: pull + hips', items: SUPERSET('doorway-row', 17, 'glute-bridge', 22, 3) },
    { name: 'Core', items: [T('plank', 50, 15), T('side-plank', 35, 10), T('dead-bug', 45, 20)] },
    SPRINTS('burpee', 60),
    COOL_FAST,
  ]},
  RECOVERY_DAY(5),
  REST_DAY(6),
];

const ADVANCED_SMART: DayPlan[] = [
  { day: 0, title: 'Full Body A', focus: 'Supersets to near failure, then 3 all-out bursts', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('archer-pushup', 8, 'jump-lunge', 12, 3, 15, 75) },
    { name: 'Superset: pull + hips', items: SUPERSET('doorway-row', 20, 'jump-squat', 15, 3, 15, 75) },
    { name: 'Core', items: [T('hollow-hold', 40, 15), T('side-plank', 45, 10), T('swimmer', 40, 20)] },
    SPRINTS('burpee', 60),
    COOL_FAST,
  ]},
  SNACK(1, 'high-knees'),
  { day: 2, title: 'Full Body B', focus: 'Same idea, different angles', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('diamond-pushup', 15, 'forward-lunge', 16, 3, 15, 75) },
    { name: 'Superset: pull + hips', items: SUPERSET('pike-pushup', 14, 'glute-bridge', 25, 3, 15, 75) },
    { name: 'Core', items: [T('shoulder-tap-plank', 50, 15), T('reverse-plank', 40, 15), T('hollow-hold', 40, 20)] },
    SPRINTS('jump-squat', 60),
    COOL_FAST,
  ]},
  SNACK(3, 'skater-hops'),
  { day: 4, title: 'Full Body A', focus: 'Beat Monday by one rep per set', kind: 'workout', blocks: [
    WARM_FAST,
    { name: 'Superset: push + legs', items: SUPERSET('archer-pushup', 10, 'jump-lunge', 14, 3, 15, 75) },
    { name: 'Superset: pull + hips', items: SUPERSET('doorway-row', 22, 'jump-squat', 17, 3, 15, 75) },
    { name: 'Core', items: [T('hollow-hold', 45, 15), T('side-plank', 50, 10), T('swimmer', 45, 20)] },
    SPRINTS('burpee', 60),
    COOL_FAST,
  ]},
  RECOVERY_DAY(5),
  REST_DAY(6),
];

/** What the fast-results programme is, in one line each, with its sources. */
export const SMART_BLURB = {
  headline: 'Best results, less time',
  detail: '3 strength days of supersets taken close to failure, each ending with 3 all-out 20-second bursts, plus 10-minute exercise snacks between. About 20 minutes a session.',
  sources: [
    { label: 'Iversen et al. 2021 — time-efficient strength training (Sports Medicine)', url: 'https://pubmed.ncbi.nlm.nih.gov/34125411/' },
    { label: 'Gillen et al. 2016 — 1 minute of all-out work vs 45 minutes of cardio (PLoS One)', url: 'https://doaj.org/article/0d8f38860885479c87ee1ba61460002b' },
    { label: 'Kikuchi & Nakazato 2017 — push-ups build muscle like bench press', url: 'https://doaj.org/article/f70cce826f3348b5b4f3ace8cf8ac33e' },
    { label: 'WHO 2020 physical activity guidelines', url: 'https://www.acefitness.org/resources/pros/expert-articles/7751/who-releases-new-guidelines-on-physical-activity-and-sedentary-behavior/' },
    { label: 'Jenkins et al. 2019 — exercise snacks improve fitness', url: 'https://www.sciencedaily.com/releases/2019/01/190118110833.htm' },
  ],
};

/* ── public API ──────────────────────────────────────────────────── */

export const PLANS: Record<PlanStyle, Record<Level, DayPlan[]>> = {
  smart: {
    beginner: BEGINNER_SMART,
    intermediate: INTERMEDIATE_SMART,
    advanced: ADVANCED_SMART,
  },
  focus: {
    beginner: BEGINNER_FOCUS,
    intermediate: INTERMEDIATE_FOCUS,
    advanced: ADVANCED_FOCUS,
  },
  split: {
    beginner: BEGINNER_SPLIT,
    intermediate: INTERMEDIATE_SPLIT,
    advanced: ADVANCED_SPLIT,
  },
};

/** What each level's focus programme emphasises, shown in the UI. */
export const FOCUS_BLURB: Record<Level, { headline: string; detail: string }> = {
  beginner: {
    headline: 'Belly focus',
    detail: 'Calorie-burning circuits plus long core blocks — the combination that actually shifts waistline fat.',
  },
  intermediate: {
    headline: 'Chest focus',
    detail: 'Pressing volume leads the week, with core work kept as a shorter supporting block.',
  },
  advanced: {
    headline: 'Abs & chest focus',
    detail: 'High-volume pressing paired with high-tension ab work, supersetted on the hardest days.',
  },
};

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** JS getDay() is 0=Sun; the plans are 0=Mon. */
export const planDayIndex = (d: Date) => (d.getDay() + 6) % 7;

export const getWeek = (style: PlanStyle, level: Level): DayPlan[] => PLANS[style][level];

export const getDayPlan = (style: PlanStyle, level: Level, dayIdx: number): DayPlan =>
  PLANS[style][level][dayIdx] ?? PLANS[style][level][0];
