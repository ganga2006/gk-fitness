export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Group = 'cardio' | 'upper' | 'lower' | 'core' | 'fullbody' | 'mobility';

export type Exercise = {
  id: string;
  name: string;
  anim: string;
  /** Compendium-style metabolic equivalent, used for the calorie estimate. */
  met: number;
  group: Group;
  levels: Level[];
  muscles: string[];
  /** Seconds per rep — converts a sets x reps block into working minutes. */
  tempo: number;
  /** Short imperative cues. The voice coach speaks one mid-effort. */
  cues: string[];
  /** Common faults, shown on the detail sheet. */
  mistakes: string[];
  /** Progression / improvement suggestions, spoken after the set. */
  tips: string[];
  /** Easier and harder swaps, by exercise id. */
  easier?: string;
  harder?: string;
  unilateral?: boolean;
};

export const EXERCISES: Exercise[] = [
  /* ─────────────── cardio ─────────────── */
  {
    id: 'jumping-jacks', name: 'Jumping Jacks', anim: 'jumpingJacks', met: 8.0,
    group: 'cardio', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Full body', 'Calves', 'Shoulders'], tempo: 1.0,
    cues: ['Land softly through the toes', 'Full arm extension overhead', 'Keep a steady rhythm'],
    mistakes: ['Landing flat-footed and heavy', 'Half-raising the arms', 'Letting the knees collapse inward'],
    tips: ['Speed up slightly each round while keeping the landings quiet', 'Add a half-squat on each landing to raise the demand'],
    harder: 'star-jump',
  },
  {
    id: 'march-in-place', name: 'March in Place', anim: 'marchInPlace', met: 3.5,
    group: 'cardio', levels: ['beginner'],
    muscles: ['Hip flexors', 'Calves'], tempo: 1.0,
    cues: ['Drive the knee to hip height', 'Swing the opposite arm', 'Stay tall through the spine'],
    mistakes: ['Looking down at the floor', 'Barely lifting the knees'],
    tips: ['Lift the knees higher as you warm up', 'Progress to high knees when this feels easy'],
    harder: 'high-knees',
  },
  {
    id: 'high-knees', name: 'High Knees', anim: 'highKnees', met: 8.0,
    group: 'cardio', levels: ['intermediate', 'advanced'],
    muscles: ['Hip flexors', 'Quads', 'Core'], tempo: 0.5,
    cues: ['Knees above hip height', 'Stay on the balls of your feet', 'Punch the arms'],
    mistakes: ['Leaning back', 'Shuffling instead of driving the knees'],
    tips: ['Count your knee drives and beat that number next time', 'Keep the chest tall even as you fatigue'],
    easier: 'march-in-place',
  },
  {
    id: 'butt-kicks', name: 'Butt Kicks', anim: 'buttKicks', met: 7.5,
    group: 'cardio', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Hamstrings', 'Calves'], tempo: 0.5,
    cues: ['Heel to glute', 'Keep the knees pointing down', 'Light and quick'],
    mistakes: ['Swinging the knees forward', 'Leaning the torso forward'],
    tips: ['Increase turnover rather than stride length', 'Try to make the heel actually touch'],
  },
  {
    id: 'jump-rope', name: 'Invisible Jump Rope', anim: 'jumpRope', met: 8.8,
    group: 'cardio', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Calves', 'Shoulders', 'Forearms'], tempo: 0.5,
    cues: ['Small hops, barely leave the floor', 'Wrists do the turning, not the arms', 'Elbows close to the ribs'],
    mistakes: ['Jumping far too high', 'Swinging from the shoulders'],
    tips: ['Lower the hop height to last longer', 'Work toward 60 unbroken seconds'],
  },
  {
    id: 'skater-hops', name: 'Skater Hops', anim: 'skater', met: 7.0,
    group: 'cardio', levels: ['intermediate', 'advanced'],
    muscles: ['Glutes', 'Quads', 'Adductors'], tempo: 1.0,
    cues: ['Push off sideways', 'Land on one leg and absorb', 'Sweep the trailing leg behind'],
    mistakes: ['Landing stiff-legged', 'Letting the landing knee cave inward'],
    tips: ['Widen the bound once the landings feel controlled', 'Pause for a beat on each landing to build balance'],
  },
  {
    id: 'star-jump', name: 'Star Jumps', anim: 'starJump', met: 8.0,
    group: 'cardio', levels: ['intermediate', 'advanced'],
    muscles: ['Full body', 'Glutes', 'Shoulders'], tempo: 1.2,
    cues: ['Load into a quarter squat', 'Explode into a wide star', 'Land soft and reset'],
    mistakes: ['Not reaching full extension', 'Crashing the landing'],
    tips: ['Focus on height, not speed', 'Absorb each landing before the next jump'],
    easier: 'jumping-jacks',
  },

  /* ─────────────── lower body ─────────────── */
  {
    id: 'bodyweight-squat', name: 'Bodyweight Squat', anim: 'squat', met: 5.0,
    group: 'lower', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Quads', 'Glutes', 'Core'], tempo: 3.0,
    cues: ['Sit the hips back and down', 'Knees track over the toes', 'Chest proud, heels planted'],
    mistakes: ['Heels lifting off the floor', 'Knees collapsing inward', 'Rounding the lower back at the bottom'],
    tips: ['Pause two seconds at the bottom to build strength', 'Go a little deeper each week as mobility improves'],
    harder: 'jump-squat',
  },
  {
    id: 'sumo-squat', name: 'Sumo Squat', anim: 'sumoSquat', met: 5.0,
    group: 'lower', levels: ['beginner', 'intermediate'],
    muscles: ['Inner thighs', 'Glutes', 'Quads'], tempo: 3.0,
    cues: ['Feet wide, toes turned out', 'Drive the knees apart', 'Push the floor away through the heels'],
    mistakes: ['Knees drifting inward', 'Leaning too far forward'],
    tips: ['Hold the bottom position for three seconds', 'Rise onto the toes at the top to add calf work'],
  },
  {
    id: 'jump-squat', name: 'Jump Squat', anim: 'jumpSquat', met: 8.0,
    group: 'lower', levels: ['intermediate', 'advanced'],
    muscles: ['Quads', 'Glutes', 'Calves'], tempo: 2.0,
    cues: ['Squat, then explode up', 'Land toes first, then heels', 'Reset your depth every rep'],
    mistakes: ['Landing with locked knees', 'Losing squat depth as you tire'],
    tips: ['Quality over quantity — stop if landings get loud', 'Aim for the same height on the final rep as the first'],
    easier: 'bodyweight-squat',
  },
  {
    id: 'wall-sit', name: 'Wall Sit', anim: 'wallSit', met: 4.0,
    group: 'lower', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Quads', 'Glutes'], tempo: 1.0,
    cues: ['Thighs parallel to the floor', 'Back flat against the wall', 'Breathe steadily, do not hold your breath'],
    mistakes: ['Hips creeping upward', 'Resting the hands on the thighs'],
    tips: ['Add ten seconds each week', 'Lift one heel at a time to raise the challenge'],
  },
  {
    id: 'forward-lunge', name: 'Forward Lunge', anim: 'lunge', met: 4.0,
    group: 'lower', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Quads', 'Glutes', 'Hamstrings'], tempo: 3.0, unilateral: true,
    cues: ['Step out and drop straight down', 'Front shin close to vertical', 'Push through the front heel to stand'],
    mistakes: ['Front knee travelling far past the toes', 'Back knee slamming the floor', 'Torso tipping forward'],
    tips: ['Slow the lowering phase to three seconds', 'Pause at the bottom to train balance'],
    harder: 'jump-lunge',
  },
  {
    id: 'jump-lunge', name: 'Jump Lunge', anim: 'jumpLunge', met: 8.0,
    group: 'lower', levels: ['advanced'],
    muscles: ['Quads', 'Glutes', 'Calves'], tempo: 1.5, unilateral: true,
    cues: ['Switch legs mid-air', 'Land in a controlled lunge', 'Keep the torso upright'],
    mistakes: ['Shallow landings', 'Letting the back knee crash down'],
    tips: ['Build up from alternating step-back lunges', 'Stop the set when the landing stops being quiet'],
    easier: 'forward-lunge',
  },
  {
    id: 'glute-bridge', name: 'Glute Bridge', anim: 'gluteBridge', met: 3.8,
    group: 'lower', levels: ['beginner', 'intermediate'],
    muscles: ['Glutes', 'Hamstrings', 'Core'], tempo: 3.0,
    cues: ['Drive through the heels', 'Squeeze the glutes at the top', 'Ribs down, do not arch the back'],
    mistakes: ['Over-arching the lower back', 'Pushing through the toes'],
    tips: ['Hold the top for two seconds every rep', 'Progress to a single-leg bridge'],
  },
  {
    id: 'glute-kickback', name: 'Glute Kickback', anim: 'gluteKickback', met: 3.5,
    group: 'lower', levels: ['beginner', 'intermediate'],
    muscles: ['Glutes', 'Hamstrings'], tempo: 2.5, unilateral: true,
    cues: ['Press the heel toward the ceiling', 'Keep the hips square', 'Move from the hip, not the lower back'],
    mistakes: ['Rotating the hips open', 'Arching the lower back to go higher'],
    tips: ['Smaller range with better control beats a big swing', 'Add a two-second squeeze at the top'],
  },
  {
    id: 'side-leg-raise', name: 'Side Leg Raise', anim: 'sideLegRaise', met: 3.2,
    group: 'lower', levels: ['beginner'],
    muscles: ['Glute medius', 'Hip abductors'], tempo: 2.5, unilateral: true,
    cues: ['Stack the hips vertically', 'Lead with the heel', 'Lower slowly under control'],
    mistakes: ['Rolling the hips backward', 'Swinging the leg up with momentum'],
    tips: ['Pause at the top for two seconds', 'Keep the range small and the tension constant'],
  },
  {
    id: 'calf-raise', name: 'Calf Raise', anim: 'calfRaise', met: 3.0,
    group: 'lower', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Calves'], tempo: 2.0,
    cues: ['Rise as high as you can', 'Pause at the top', 'Lower slowly for three counts'],
    mistakes: ['Bouncing through the reps', 'Rolling onto the outside of the foot'],
    tips: ['Try single-leg raises once 20 reps feel easy', 'Let the heels drop below a step for more range'],
  },

  /* ─────────────── upper body ─────────────── */
  {
    id: 'wall-pushup', name: 'Wall Push-Up', anim: 'wallPushup', met: 3.5,
    group: 'upper', levels: ['beginner'],
    muscles: ['Chest', 'Triceps', 'Shoulders'], tempo: 3.0,
    cues: ['Hands at chest height on the wall', 'Body in one straight line', 'Elbows at about 45 degrees'],
    mistakes: ['Hips sagging toward the wall', 'Flaring the elbows straight out'],
    tips: ['Step the feet further back to make it harder', 'Progress to an incline push-up on a table'],
    harder: 'incline-pushup',
  },
  {
    id: 'incline-pushup', name: 'Incline Push-Up', anim: 'inclinePushup', met: 4.5,
    group: 'upper', levels: ['beginner'],
    muscles: ['Chest', 'Triceps', 'Core'], tempo: 3.0,
    cues: ['Hands on a sturdy surface', 'Lower the chest to the edge', 'Keep the body rigid from head to heels'],
    mistakes: ['Dropping the hips', 'Shortening the range of motion'],
    tips: ['Use a lower surface each week', 'Pause one second at the bottom'],
    easier: 'wall-pushup', harder: 'knee-pushup',
  },
  {
    id: 'knee-pushup', name: 'Knee Push-Up', anim: 'kneePushup', met: 3.8,
    group: 'upper', levels: ['beginner', 'intermediate'],
    muscles: ['Chest', 'Triceps', 'Shoulders'], tempo: 3.0,
    cues: ['Straight line from head to knees', 'Lower the chest, not the chin', 'Elbows back at 45 degrees'],
    mistakes: ['Hips piking up', 'Head dropping before the chest'],
    tips: ['Lower for three seconds on every rep', 'Try one full push-up at the start of each set'],
    harder: 'pushup',
  },
  {
    id: 'pushup', name: 'Push-Up', anim: 'pushup', met: 8.0,
    group: 'upper', levels: ['intermediate', 'advanced'],
    muscles: ['Chest', 'Triceps', 'Shoulders', 'Core'], tempo: 2.5,
    cues: ['Squeeze the glutes and brace the core', 'Chest to within a fist of the floor', 'Push the floor away'],
    mistakes: ['Hips sagging or piking', 'Elbows flaring to 90 degrees', 'Partial depth'],
    tips: ['Add a one-second pause at the bottom', 'Slow the lowering to three seconds for more stimulus'],
    easier: 'knee-pushup', harder: 'diamond-pushup',
  },
  {
    id: 'diamond-pushup', name: 'Diamond Push-Up', anim: 'diamondPushup', met: 8.0,
    group: 'upper', levels: ['advanced'],
    muscles: ['Triceps', 'Inner chest'], tempo: 3.0,
    cues: ['Index fingers and thumbs form a diamond', 'Elbows stay tucked to the ribs', 'Chest to the hands'],
    mistakes: ['Elbows flaring wide', 'Hands too far up toward the face'],
    tips: ['Drop to knees mid-set rather than losing form', 'Build up with close-grip push-ups first'],
    easier: 'pushup',
  },
  {
    id: 'pike-pushup', name: 'Pike Push-Up', anim: 'pikePushup', met: 6.0,
    group: 'upper', levels: ['intermediate', 'advanced'],
    muscles: ['Shoulders', 'Triceps', 'Upper back'], tempo: 3.0,
    cues: ['Hips high, body in an inverted V', 'Lower the crown of the head toward the floor', 'Elbows track back, not out'],
    mistakes: ['Hips dropping into a plank', 'Looking forward instead of down'],
    tips: ['Elevate the feet to shift more load to the shoulders', 'Pause just above the floor each rep'],
  },
  {
    id: 'tricep-dip', name: 'Tricep Dip', anim: 'tricepDip', met: 4.0,
    group: 'upper', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Triceps', 'Shoulders', 'Chest'], tempo: 3.0,
    cues: ['Hands on a chair behind you, fingers forward', 'Elbows point straight back', 'Lower until the elbows reach 90 degrees'],
    mistakes: ['Shrugging the shoulders to the ears', 'Letting the hips drift away from the chair'],
    tips: ['Walk the feet further out to increase the load', 'Pause one second at the bottom'],
  },
  {
    id: 'arm-circles', name: 'Arm Circles', anim: 'armCircles', met: 2.8,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Shoulders', 'Upper back'], tempo: 1.0,
    cues: ['Start small and grow the circles', 'Keep the ribs down', 'Reverse direction halfway'],
    mistakes: ['Shrugging the shoulders', 'Rushing through tiny circles'],
    tips: ['Use the biggest pain-free circle you can', 'Slow down to feel the full range'],
  },

  /* ─────────────── core ─────────────── */
  {
    id: 'plank', name: 'High Plank', anim: 'plank', met: 3.8,
    group: 'core', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Core', 'Shoulders', 'Glutes'], tempo: 1.0,
    cues: ['Straight line from head to heels', 'Squeeze the glutes', 'Breathe — do not hold your breath'],
    mistakes: ['Hips sagging toward the floor', 'Hips piking up', 'Holding the breath'],
    tips: ['Add ten seconds each week', 'Quality beats duration — stop when the hips drop'],
    harder: 'shoulder-tap-plank',
  },
  {
    id: 'forearm-plank', name: 'Forearm Plank', anim: 'forearmPlank', met: 3.8,
    group: 'core', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Core', 'Glutes'], tempo: 1.0,
    cues: ['Elbows under the shoulders', 'Tuck the ribs toward the hips', 'Push the forearms into the floor'],
    mistakes: ['Sagging low back', 'Shoulders drifting ahead of the elbows'],
    tips: ['Build to a two-minute hold before adding variations', 'Brace as if about to be poked in the stomach'],
  },
  {
    id: 'side-plank', name: 'Side Plank', anim: 'sidePlank', met: 3.8,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Obliques', 'Shoulders', 'Glute medius'], tempo: 1.0, unilateral: true,
    cues: ['Stack the shoulders, hips and feet', 'Lift the hips high', 'Reach the top arm to the ceiling'],
    mistakes: ['Hips sinking toward the floor', 'Shoulder collapsing into the joint'],
    tips: ['Drop to the bottom knee if the hips start to sag', 'Work both sides for equal time'],
  },
  {
    id: 'shoulder-tap-plank', name: 'Shoulder Tap Plank', anim: 'shoulderTapPlank', met: 4.0,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Core', 'Obliques', 'Shoulders'], tempo: 1.5,
    cues: ['Widen the feet for stability', 'Resist the hips rotating', 'Tap slowly and deliberately'],
    mistakes: ['Hips swinging side to side', 'Rushing the taps'],
    tips: ['Narrow the stance as you get stronger', 'Imagine balancing a glass of water on your lower back'],
    easier: 'plank',
  },
  {
    id: 'mountain-climber', name: 'Mountain Climbers', anim: 'mountainClimber', met: 8.0,
    group: 'core', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Core', 'Hip flexors', 'Shoulders'], tempo: 0.5,
    cues: ['Shoulders stacked over the wrists', 'Drive the knee toward the chest', 'Keep the hips low and level'],
    mistakes: ['Hips bouncing up and down', 'Feet landing heavily'],
    tips: ['Slow down and keep the hips still rather than racing', 'Hold the plank quality before adding speed'],
  },
  {
    id: 'crunch', name: 'Crunch', anim: 'crunch', met: 3.8,
    group: 'core', levels: ['beginner', 'intermediate'],
    muscles: ['Upper abs'], tempo: 2.5,
    cues: ['Curl the ribs toward the hips', 'Hands support the head, do not pull', 'Exhale as you lift'],
    mistakes: ['Yanking on the neck', 'Using momentum to bounce up'],
    tips: ['Pause one second at the top of every rep', 'Lower for three seconds to double the work'],
  },
  {
    id: 'situp', name: 'Sit-Up', anim: 'situp', met: 5.0,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Abs', 'Hip flexors'], tempo: 2.5,
    cues: ['Roll up one vertebra at a time', 'Keep the feet planted', 'Lower with control'],
    mistakes: ['Jerking up with the arms', 'Crashing back down'],
    tips: ['Cross the arms over the chest to reduce neck strain', 'Slow the descent to three seconds'],
    easier: 'crunch',
  },
  {
    id: 'bicycle-crunch', name: 'Bicycle Crunch', anim: 'bicycleCrunch', met: 4.5,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Obliques', 'Abs'], tempo: 1.5,
    cues: ['Opposite elbow toward opposite knee', 'Extend the far leg long', 'Rotate from the ribs, not the elbows'],
    mistakes: ['Pulling on the neck', 'Flicking the elbows instead of rotating'],
    tips: ['Slow right down — two seconds per side', 'Keep the lower back pressed into the floor'],
  },
  {
    id: 'leg-raise', name: 'Lying Leg Raise', anim: 'legRaise', met: 3.8,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Lower abs', 'Hip flexors'], tempo: 3.0,
    cues: ['Press the lower back into the floor', 'Lift the legs to vertical', 'Lower slowly without touching down'],
    mistakes: ['Lower back arching off the floor', 'Dropping the legs quickly'],
    tips: ['Bend the knees if the back lifts', 'Stop the set the moment the back arches'],
  },
  {
    id: 'flutter-kick', name: 'Flutter Kicks', anim: 'flutterKick', met: 4.0,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Lower abs', 'Hip flexors'], tempo: 0.5,
    cues: ['Small, quick alternating kicks', 'Lower back stays glued down', 'Hands under the hips if needed'],
    mistakes: ['Kicking too wide', 'Letting the back arch'],
    tips: ['Raise the legs higher to make it easier on the back', 'Build to 45 unbroken seconds'],
  },
  {
    id: 'hollow-hold', name: 'Hollow Hold', anim: 'hollowHold', met: 4.0,
    group: 'core', levels: ['advanced'],
    muscles: ['Abs', 'Hip flexors'], tempo: 1.0,
    cues: ['Press the lower back flat', 'Arms by the ears, legs long', 'Hold the banana shape'],
    mistakes: ['Lower back lifting off the floor', 'Holding the breath'],
    tips: ['Tuck the knees to shorten the lever if the back lifts', 'Add five seconds each session'],
  },
  {
    id: 'russian-twist', name: 'Russian Twist', anim: 'russianTwist', met: 4.0,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Obliques', 'Abs'], tempo: 1.5,
    cues: ['Lean back to about 45 degrees', 'Rotate from the ribcage', 'Keep the chest open'],
    mistakes: ['Only moving the arms', 'Rounding the back heavily'],
    tips: ['Lift the feet off the floor to progress', 'Slow the rotation and pause at each side'],
  },
  {
    id: 'dead-bug', name: 'Dead Bug', anim: 'deadBug', met: 3.5,
    group: 'core', levels: ['beginner', 'intermediate'],
    muscles: ['Deep core', 'Hip flexors'], tempo: 3.0,
    cues: ['Lower back stays pressed to the floor', 'Extend the opposite arm and leg', 'Move slowly and exhale on the reach'],
    mistakes: ['Back arching as the leg extends', 'Rushing the movement'],
    tips: ['Only extend as far as you can keep the back flat', 'Pause two seconds at full extension'],
  },
  {
    id: 'superman', name: 'Superman', anim: 'superman', met: 3.0,
    group: 'core', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Lower back', 'Glutes', 'Rear shoulders'], tempo: 2.5,
    cues: ['Lift the chest and thighs together', 'Reach long, do not crunch up', 'Look at the floor to keep the neck neutral'],
    mistakes: ['Cranking the neck up', 'Lifting with a jerk'],
    tips: ['Hold the top for two seconds', 'Think about length rather than height'],
  },
  {
    id: 'bird-dog', name: 'Bird Dog', anim: 'birdDog', met: 3.0,
    group: 'core', levels: ['beginner', 'intermediate'],
    muscles: ['Deep core', 'Glutes', 'Lower back'], tempo: 3.0, unilateral: true,
    cues: ['Opposite arm and leg reach long', 'Hips stay square to the floor', 'Move slowly, no wobble'],
    mistakes: ['Hips rotating open', 'Lifting the leg too high and arching'],
    tips: ['Pause three seconds at full extension', 'Balance a book on your lower back as a test'],
  },

  /* ─────────────── full body ─────────────── */
  {
    id: 'burpee', name: 'Burpee', anim: 'burpee', met: 8.0,
    group: 'fullbody', levels: ['intermediate', 'advanced'],
    muscles: ['Full body'], tempo: 3.5,
    cues: ['Hands down, jump the feet back', 'Chest to the floor', 'Explode up and reach overhead'],
    mistakes: ['Sagging hips in the plank', 'Skipping the jump at the top'],
    tips: ['Step back instead of jumping to pace yourself', 'Keep a steady rhythm rather than sprinting the first few'],
    easier: 'squat-thrust',
  },
  {
    id: 'squat-thrust', name: 'Squat Thrust', anim: 'squatThrust', met: 7.0,
    group: 'fullbody', levels: ['beginner', 'intermediate'],
    muscles: ['Full body', 'Core', 'Shoulders'], tempo: 2.5,
    cues: ['Hands planted shoulder-width', 'Jump or step the feet back to a plank', 'Return the feet under the hips'],
    mistakes: ['Hips rising first in the plank', 'Rounding the back on the way down'],
    tips: ['Add a push-up at the bottom when ready', 'Progress to a full burpee'],
    harder: 'burpee',
  },
  {
    id: 'bear-crawl', name: 'Bear Crawl', anim: 'bearCrawl', met: 7.0,
    group: 'fullbody', levels: ['intermediate', 'advanced'],
    muscles: ['Core', 'Shoulders', 'Quads'], tempo: 1.5,
    cues: ['Knees hover just off the floor', 'Move the opposite hand and foot together', 'Keep the hips low and level'],
    mistakes: ['Hips rocking side to side', 'Knees touching down'],
    tips: ['Slow down to keep the hips still', 'Crawl backward for a different challenge'],
  },
  {
    id: 'inchworm', name: 'Inchworm', anim: 'inchworm', met: 4.0,
    group: 'fullbody', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Hamstrings', 'Core', 'Shoulders'], tempo: 4.0,
    cues: ['Hinge at the hips and reach the floor', 'Walk the hands out to a plank', 'Walk the feet back to the hands'],
    mistakes: ['Bending the knees excessively', 'Letting the hips sag in the plank'],
    tips: ['Add a push-up at the plank position', 'Keep the legs as straight as your hamstrings allow'],
  },

  /* ─────────────── mobility & cool-down ─────────────── */
  {
    id: 'torso-twist', name: 'Standing Torso Twist', anim: 'torsoTwist', met: 2.8,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Obliques', 'Spine'], tempo: 1.5,
    cues: ['Rotate from the mid-back', 'Let the arms swing naturally', 'Keep the hips facing forward'],
    mistakes: ['Twisting from the lower back', 'Swinging too aggressively'],
    tips: ['Build range gradually', 'Exhale as you rotate'],
  },
  {
    id: 'hip-circles', name: 'Hip Circles', anim: 'hipCircle', met: 2.5,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Hips', 'Lower back'], tempo: 2.0,
    cues: ['Hands on the hips', 'Draw a big slow circle', 'Reverse direction halfway'],
    mistakes: ['Rushing the circles', 'Moving only the knees'],
    tips: ['Make the circles as large as comfort allows', 'Keep the feet planted'],
  },
  {
    id: 'toe-touch', name: 'Standing Toe Touch', anim: 'standingToeTouch', met: 2.3,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Hamstrings', 'Lower back'], tempo: 3.0,
    cues: ['Hinge at the hips', 'Let the head hang heavy', 'Soft bend in the knees'],
    mistakes: ['Bouncing at the bottom', 'Forcing past sharp discomfort'],
    tips: ['Hold for 20 to 30 seconds rather than bouncing', 'Breathe out to sink a little deeper'],
  },
  {
    id: 'cat-cow', name: 'Cat-Cow', anim: 'catCow', met: 2.3,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Spine', 'Core'], tempo: 3.5,
    cues: ['Inhale, drop the belly and lift the chest', 'Exhale, round the spine and tuck the chin', 'Move one vertebra at a time'],
    mistakes: ['Moving only from the neck', 'Rushing the transitions'],
    tips: ['Match the pace to your breath', 'Hold each end position for a breath'],
  },
  {
    id: 'child-pose', name: "Child's Pose", anim: 'childPose', met: 2.0,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Lower back', 'Hips', 'Lats'], tempo: 1.0,
    cues: ['Sit the hips back to the heels', 'Reach the arms long in front', 'Let the forehead rest down'],
    mistakes: ['Holding tension in the shoulders', 'Shallow breathing'],
    tips: ['Widen the knees for more hip opening', 'Stay for at least five slow breaths'],
  },
  {
    id: 'cobra', name: 'Cobra Stretch', anim: 'cobra', met: 2.3,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Abs', 'Chest', 'Hip flexors'], tempo: 1.0,
    cues: ['Press the hips into the floor', 'Lift the chest, not the chin', 'Shoulders down away from the ears'],
    mistakes: ['Cranking the neck back', 'Shrugging the shoulders'],
    tips: ['Only go as high as stays comfortable', 'Breathe into the front of the ribs'],
  },
  {
    id: 'downward-dog', name: 'Downward Dog', anim: 'downwardDog', met: 3.0,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Hamstrings', 'Calves', 'Shoulders'], tempo: 1.0,
    cues: ['Hips high, make an inverted V', 'Press the chest toward the thighs', 'Pedal the heels toward the floor'],
    mistakes: ['Rounding the upper back', 'Forcing the heels down with locked knees'],
    tips: ['Bend the knees to lengthen the spine first', 'Hold for five slow breaths'],
  },
  {
    id: 'hamstring-stretch', name: 'Hamstring Stretch', anim: 'hamstringStretch', met: 2.3,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Hamstrings'], tempo: 1.0,
    cues: ['Hinge forward with a long spine', 'Soft knees', 'Relax into the position'],
    mistakes: ['Rounding the back hard', 'Bouncing'],
    tips: ['Hold 30 seconds per side', 'Exhale slowly to release further'],
  },
  {
    id: 'quad-stretch', name: 'Standing Quad Stretch', anim: 'quadStretch', met: 2.3,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Quads', 'Hip flexors'], tempo: 1.0, unilateral: true,
    cues: ['Heel toward the glute', 'Knees stay side by side', 'Tuck the pelvis for more stretch'],
    mistakes: ['Letting the knee drift out', 'Arching the lower back'],
    tips: ['Hold a wall for balance', 'Squeeze the glute on the stretching side'],
  },
  {
    id: 'shoulder-stretch', name: 'Cross-Body Shoulder Stretch', anim: 'shoulderStretch', met: 2.3,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Shoulders', 'Upper back'], tempo: 1.0, unilateral: true,
    cues: ['Draw the arm across the chest', 'Keep the shoulder down', 'Breathe and relax the neck'],
    mistakes: ['Shrugging the shoulder up', 'Pulling at the elbow joint'],
    tips: ['Hold 30 seconds each side', 'Press gently above the elbow, not on it'],
  },
  {
    id: 'neck-roll', name: 'Neck Release', anim: 'neckRoll', met: 2.0,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Neck', 'Upper traps'], tempo: 2.0,
    cues: ['Move slowly through a comfortable range', 'Let the shoulders stay relaxed', 'Never force the neck'],
    mistakes: ['Rolling the head fully backward', 'Moving too quickly'],
    tips: ['Keep the range small and pain-free', 'Pair with slow breathing'],
  },
  {
    id: 'worlds-greatest', name: "World's Greatest Stretch", anim: 'worldsGreatest', met: 3.0,
    group: 'mobility', levels: ['intermediate', 'advanced'],
    muscles: ['Hips', 'Thoracic spine', 'Hamstrings'], tempo: 3.0, unilateral: true,
    cues: ['Deep lunge, hand inside the front foot', 'Rotate and reach the arm to the ceiling', 'Follow the hand with your eyes'],
    mistakes: ['Collapsing in the back hip', 'Rotating from the lower back'],
    tips: ['Pause at the top of the rotation for a breath', 'Drop the back knee if balance is hard'],
  },

  /* ─────────────── pull, chest variations and posture ─────────────── */
  {
    id: 'wide-pushup', name: 'Wide Push-Up', anim: 'widePushup', met: 8.0,
    group: 'upper', levels: ['intermediate', 'advanced'],
    muscles: ['Chest', 'Shoulders'], tempo: 2.5,
    cues: ['Hands wider than the shoulders', 'Lower until the chest is level with the elbows', 'Keep the body one rigid line'],
    mistakes: ['Hands so wide the shoulders feel pinched', 'Dropping the hips'],
    tips: ['Stay in the range where the shoulders feel comfortable', 'Pause one second at the bottom'],
    easier: 'knee-pushup', harder: 'archer-pushup',
  },
  {
    id: 'archer-pushup', name: 'Archer Push-Up', anim: 'archerPushup', met: 8.0,
    group: 'upper', levels: ['advanced'],
    muscles: ['Chest', 'Triceps', 'Core'], tempo: 3.5, unilateral: true,
    cues: ['Shift your weight over one arm', 'Keep the far arm straight', 'Alternate sides each rep'],
    mistakes: ['Bending the straight arm', 'Twisting the hips to cheat the press'],
    tips: ['A stepping stone toward the one-arm push-up', 'Reduce the shift if the shoulder complains'],
    easier: 'wide-pushup',
  },
  {
    id: 'doorway-row', name: 'Doorway Row', anim: 'doorwayRow', met: 5.0,
    group: 'upper', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Back', 'Lats', 'Biceps'], tempo: 3.0,
    cues: ['Grip both sides of a sturdy door frame', 'Lean back with straight arms, then pull your chest to the frame', 'Squeeze the shoulder blades together'],
    mistakes: ['Pulling with the arms only', 'Letting the hips sag behind the shoulders'],
    tips: ['Walk the feet further forward to make it harder', 'Pause for two seconds at the top of each pull'],
  },
  {
    id: 'prone-y-raise', name: 'Prone Y Raise', anim: 'proneYRaise', met: 3.0,
    group: 'upper', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Upper back', 'Rear shoulders'], tempo: 2.5,
    cues: ['Arms overhead in a wide Y', 'Lift the thumbs toward the ceiling', 'Keep the forehead down and the neck long'],
    mistakes: ['Shrugging the shoulders to the ears', 'Lifting the head instead of the arms'],
    tips: ['Height matters less than the squeeze between the shoulder blades', 'Hold the top for two seconds'],
  },
  {
    id: 'swimmer', name: 'Prone Swimmers', anim: 'swimmer', met: 3.5,
    group: 'upper', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Lower back', 'Upper back', 'Glutes'], tempo: 1.5,
    cues: ['Lift the opposite arm and leg', 'Keep both off the floor throughout', 'Move smoothly, no rushing'],
    mistakes: ['Letting everything drop between reps', 'Cranking the neck upward'],
    tips: ['Lift a little higher each set', 'Keep the hips pinned to the floor'],
  },
  {
    id: 'reverse-plank', name: 'Reverse Plank', anim: 'reversePlank', met: 4.0,
    group: 'core', levels: ['intermediate', 'advanced'],
    muscles: ['Lower back', 'Glutes', 'Hamstrings', 'Shoulders'], tempo: 1.0,
    cues: ['Hands under the shoulders, fingers forward', 'Drive the hips up to a straight line', 'Open the chest and look up'],
    mistakes: ['Hips sagging toward the floor', 'Shoulders shrugged to the ears'],
    tips: ['Bend the knees to shorten the lever if the hips drop', 'Build to a 45-second hold'],
  },
  {
    id: 'wall-angel', name: 'Wall Angel', anim: 'wallAngel', met: 2.5,
    group: 'mobility', levels: ['beginner', 'intermediate', 'advanced'],
    muscles: ['Shoulders', 'Upper back', 'Posture'], tempo: 3.0,
    cues: ['Back and arms flat against the wall', 'Slide the arms up and down slowly', 'Keep the wrists touching the wall'],
    mistakes: ['Lower back arching off the wall', 'Letting the elbows drift forward'],
    tips: ['Work in the range where contact is maintained', 'Excellent antidote to a day at a desk'],
  },
];

export const BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

export const ex = (id: string): Exercise => {
  const e = BY_ID[id];
  if (!e) throw new Error(`Unknown exercise: ${id}`);
  return e;
};

export const GROUP_LABEL: Record<Group, string> = {
  cardio: 'Cardio',
  upper: 'Upper Body',
  lower: 'Lower Body',
  core: 'Core',
  fullbody: 'Full Body',
  mobility: 'Mobility',
};
