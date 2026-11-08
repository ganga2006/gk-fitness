# GK Fitness — Animation realism report (4 Nov 2026)

## What was wrong before
The app's 63 exercise animations were hand-typed 2D angles applied to the 3D trainer by rotating every bone around one sideways axis.
That caused real faults:
- elbows and knees bending backwards (jump rope −150°, glute bridge −150°, lunges −70° …);
- push-ups, planks, cobra, superman and bird-dog drawn **face-up** (a reverse plank) and the burpee rolling backwards into its plank — the "wrong flips";
- jumping jacks, side leg raise, twists and wall angels impossible (no sideways or twisting motion existed), arms stuck in the model's A-pose;
- feet and hands sliding up to 1.6 m, sinking or floating, and a floor-offset bug that pushed every frame but one under the floor;
- joint speeds up to 7,700°/s (forearm spinning around the elbow).

## What it is now
- `src/anim/kin.ts` — 3D kinematics on the **real skeleton of body.glb** (joint centres, bone frames and skin surface measured from the model).
  Elbows/knees are one-way hinges; arms/legs can swing out to the side and rotate; trunk can twist, side-bend and roll; spine curves between pelvis and chest.
- Contacts: feet, toes, knees, palms and forearms are **held by IK every frame** on their floor/wall/bench spots; the floor is found from the actual skinned mesh surface, so nothing sinks or floats.
- Bodies lying on the floor rest on their real lowest surface (back, glutes, belly); a floor guard stops any free hand/foot passing through the floor.
- Weight shifts: the pelvis moves over the standing foot before every step, the body moves forward over the toes in calf raises, the back heel only rises after the front foot lands.
- Smooth motion: monotone-cubic interpolation (continuous speed, no overshoot); angles always take the short way (no 360° flips).
- `tools/fit.ts` solves keys marked `fit` so every hand/foot can really reach its spot (results in `src/anim/fitted.ts`).
- Props: bench (incline push-up, triceps dip), wall (wall push-up, wall sit, wall angel) and door frame (doorway row) are drawn in the 3D view, thumbnails and 2D figure.
- The 2D figure is now a true side projection of the same 3D motion.

## Mesh-level audit (tools/qa/audit.html — skinned mesh, 61 samples per loop)
Checks: any vertex below the floor, held contact off its spot / sliding, elbow or knee past straight or beyond range, ankle range, hip extension, joint speed > 1000°/s, centre of mass (Dempster segment masses) outside the soles for slow standing moves.

**47 of 63 exercises pass every check.** Remaining small findings (all ≤ a few cm, listed honestly):
```
ok  jumpingJacks       
ok  starJump           
ok  marchInPlace       
ok  highKnees          
ok  buttKicks          
ok  jumpRope           
ok  skater             
ok  torsoTwist         
ok  armCircles         
FIX hipCircle          OFF-BALANCE 3.6cm@0.50
ok  standingToeTouch   
ok  squat              
ok  sumoSquat          
ok  jumpSquat          
ok  wallSit            
FIX lunge              ANKLE F 53@0.65 | OFF-BALANCE 5.3cm@0.78
ok  jumpLunge          
FIX calfRaise          OFF-BALANCE 1.7cm@0.18
FIX gluteBridge        SINK 1.5cm upperarm_l@0.00 | SLIDE 2.7cm palmB@0.38 | KEY-MISS k1@0.38[palmF:2.7,palmB:2.7] k2@0.58[palmF:2.7,palmB:2.7]
FIX gluteKickback      CONTACT-OFF 0.8cm kneeF@1.00 | SLIDE 1.4cm kneeF@1.00
ok  sideLegRaise       
ok  pushup             
ok  kneePushup         
ok  inclinePushup      
ok  wallPushup         
ok  diamondPushup      
ok  pikePushup         
ok  tricepDip          
ok  plank              
ok  forearmPlank       
ok  sidePlank          
ok  shoulderTapPlank   
FIX mountainClimber    CONTACT-OFF 2.5cm palmB@0.25 | KEY-MISS k1@0.25[palmF:2.5,palmB:2.5] k3@0.75[palmF:2.5,palmB:2.5]
ok  bearCrawl          
ok  crunch             
ok  situp              
FIX bicycleCrunch      SINK 0.6cm forearm_l@0.50
FIX legRaise           SINK 0.8cm upperarm_l@0.00
ok  flutterKick        
ok  hollowHold         
ok  russianTwist       
ok  deadBug            
ok  superman           
ok  birdDog            
FIX burpee             CONTACT-OFF 1.3cm tipF@0.37
FIX squatThrust        OFF-BALANCE 2.6cm@0.23
FIX inchworm           SINK 0.6cm middle_1_r@0.48 | CONTACT-OFF 0.5cm palmF@0.87 | SLIDE 1.0cm palmF@0.87 | ANKLE F 59@0.32 | KEY-MISS k2@0.13[palmF:0.4,palmB:0.4] k3@0.161[palmB:0.7] k5@0.224[palmF:0.7] k10@0.38[palmF:0.3,palmB:0.3] k13@0.474[ballF:0.6,ballB:0.6] k14@0.505[ballF:0.8,ballB:0.8] k15@0.535[ballF:0.8,ballB:0.8] k16@0.551[ballF:0.8,ballB:0.8] k18@0.599[palmF:0.3] k19@0.63[palmF:0.3,palmB:0.3] k21@0.693[palmF:0.3] k22@0.724[palmF:0.4] k27@0.88[palmF:0.4,palmB:0.4]
ok  catCow             
ok  childPose          
ok  cobra              
ok  downwardDog        
FIX hamstringStretch   OFF-BALANCE 1.6cm@0.92
FIX quadStretch        CONTACT-OFF 0.6cm palmF(hold)@0.47 | OFF-BALANCE 2.7cm@0.90
FIX shoulderStretch    CONTACT-OFF 4.2cm palmB(hold)@0.45
ok  neckRoll           
FIX worldsGreatest     SINK 0.6cm shin_l@0.73 | ANKLE B 56@0.13 | OFF-BALANCE 3.7cm@0.85
ok  widePushup         
ok  archerPushup       
ok  proneYRaise        
ok  swimmer            
ok  reversePlank       
FIX doorwayRow         SLIDE 0.5cm palmF@0.43
ok  wallAngel          

```
How to read the remaining ones:
- 0.5–1.5 cm contact/sink values are skin-level (the thickness of a finger or the side of a knee) and not visible.
- Glute bridge: at the top the palms lift ~2.7 cm off the floor.
- Shoulder stretch: the holding hand sits ~4 cm from the stretched arm.
- Lunge: during the very short single-leg step the centre of mass is ~5 cm outside the foot (normal for a moving step) and the front ankle reaches 53° dorsiflexion at the bottom.
- Inchworm: ankle dorsiflexion reaches ~59° while the hands walk back (needs flexible calves).

Motion strips: `renders/app_motion_strips_0..7.png` (6 frames per exercise, every exercise), `renders/app_2d_figures.png`.

## Blender actions (GKFitness_Trainer_Production.blend) — 12 actions
Rebuilt with `scripts/pose_system.py` (hinge-aware FK, two-bone leg IK, per-frame bake, quaternion continuity, tempo scaling).

| Action | jumps>12°/f | hyper-ext | side-bent hinge | twist | planted slide | worst per-frame |
|---|---|---|---|---|---|---|
| Bodyweight_Squat | 0 | 0 | 0 | 0 | 0.0 | 5.3°/frame |
| Calf_Stretch | 0 | 0 | 0 | 0 | 0.046 | 6.2°/frame |
| Cross_Body_Shoulder_Stretch | 0 | 0 | 0 | 0 | 0.0 | 6.0°/frame |
| Forward_Fold | 0 | 0 | 0 | 0 | 0.0 | 4.8°/frame |
| Forward_Lunge | 0 | 0 | 0 | 0 | 0.09 | 3.4°/frame |
| Idle_Neutral | 0 | 0 | 0 | 0 | 0.0 | 0.1°/frame |
| Overhead_Stretch | 0 | 0 | 0 | 0 | 0.0 | 6.2°/frame |
| Return_To_Neutral | 0 | 0 | 0 | 0 | 0.013 | 3.3°/frame |
| Side_Bend_Stretch | 0 | 0 | 0 | 0 | 0.0 | 6.2°/frame |
| Torso_Rotation | 0 | 0 | 0 | 0 | 0.0 | 5.8°/frame |
| Triceps_Stretch | 0 | 0 | 0 | 0 | 0.0 | 7.6°/frame |
| Warmup_Arms | 0 | 0 | 0 | 0 | 0.0 | 5.7°/frame |

Balance (`scripts/balance.py`): every held pose has the centre of mass inside the support (0 mm outside). Strips: `renders/blender_motion_strips_0/1.png`.

## How to edit an exercise
Open `src/anim/poses.ts`; each key lists only what changes (`pin` = contacts held, `anchor` = what the body rests on).
After editing a key marked `fit`, run:
`npx esbuild tools/fit.ts --bundle --platform=node --outfile=fit.cjs && node fit.cjs`
Check with `npm run dev` then open `/tools/qa/audit.html` (report) and `/tools/qa/index.html?anims=squat&ts=0,0.25,0.5` (renders).
