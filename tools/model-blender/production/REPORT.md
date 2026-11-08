# GK Fitness Trainer — Production Report

## Files
| File | What it is |
|---|---|
| `GKFitness_Trainer_Production.blend` | Final rigged, animated trainer (Blender 5.2 LTS). Open this. |
| `GKFitness_Trainer_Anatomy_Reference.blend` | The fitted real skeleton (219 bones) and muscle layer (172 muscles) the body is built on — use as an X-ray sculpting guide. |
| `gkfitness_body.fbx` | Same character + all 12 actions, for other tools. |
| `body.glb` | App model (lighter hair strand set). |
| `gkfitness_body_RIGGED_ORIGINAL_BACKUP.blend` | Untouched backup of the original project. |
| `skin_albedo.png` | Baked skin colour texture (used by the app). |
| `scripts/` | Every pipeline script; `rebuild_all.sh` rebuilds everything in order. |
| `renders/` | Validation and inspection renders. |

## How the body is built (skeleton first, then muscle, then skin)
1. **Skeleton** — 219 real bones from BodyParts3D (adult male scan) fitted to the trainer: trunk by a measured warp (ribcage 10 % wider for an athletic frame, pelvis fitted to 17.6 cm hip-joint spacing), each limb bone placed joint-to-joint, forearm pronation spread elbow→wrist like the real radius.
2. **Muscle** — 172 real muscles mapped the same way and thickened for a trainer's build (outer face only, so borders stay anatomical): pecs, deltoids, lats, traps, rotator cuff, erectors, abs, biceps/triceps/forearm groups, quads, hamstrings, calves.
3. **Skin** — the MakeHuman (CC0) body mesh is laid onto the fused muscle surface with a thin, region-dependent skin layer; armpits, groin and wrists are bridged smoothly.
4. **Face** — the real skull, jaw and facial muscles fitted to the eyes/chin/crown, skin laid on at lean-athlete tissue depths (forensic facial-reconstruction tables); then 42 artist-made CC0 MakeHuman face morphs for a handsome male face (straight nose, defined lips, chin, cheekbones, positive canthal tilt). Face proportions use the measured ratios from your photo; no pixels of the photo are used.
5. **Hair** — ~11,000 strand ribbons combed into a short pompadour over a dark base, clipper-fade sides; 920 eyebrow hairs; 340 eyelashes.
6. **Skin shader** — warmth on cheeks/nose/ears, natural lip colour (lip regions taken from MakeHuman's own lip topology), clean-shave shadow, pores, T-zone sheen, subsurface scattering. Baked to `skin_albedo.png` for the app.

## Measured result (178 cm, 7.7 heads tall)
| | Measured | Athletic 178 cm target |
|---|---|---|
| Upper arm (shoulder→elbow joint) | 30.9 cm | ~30.5 |
| Forearm (elbow→wrist) | 26.4 cm | ~26 |
| Thigh / shin | 45.3 / 41.1 cm | 44 / 41 |
| Hip-joint spacing | 17.6 cm | 17–18 (male) |
| Waist girth | 78 cm | 76–80 |
| Thigh girth | 65 cm | 58–65 |
| Biceps (relaxed) | 39 cm | 36–39 |
| Calf | 44 cm | 38–42 |
| Forearm | 28.5 cm | ~30 |
| Left/right symmetry | 2.5 mm (99th pct) | — |
Mesh: 53,514 verts, 0 non-manifold edges, 0 loose verts. Briefs clear the skin in rest and in every tested pose (76 rim verts touch, none pass through). 0 torn edges in Idle, Warmup, Squat, Fold and Lunge.

## Rig
53 bones: root, hips, spine ×3, neck, head, clavicles, upper/forearms, hands, 15 finger bones per hand, thighs, shins, feet, toes. Spine and neck pivots sit on the real vertebral column. Hair, brows, lashes and eyes ride rigidly on the head.

## Actions (30 fps, keyed, tested)
Idle_Neutral, Warmup_Arms, Overhead_Stretch, Triceps_Stretch, Cross_Body_Shoulder_Stretch, Side_Bend_Stretch (true lateral flexion), Torso_Rotation (true thoracic twist), Forward_Fold, Bodyweight_Squat, Forward_Lunge, Calf_Stretch, Return_To_Neutral.

## Tested
- **Animation realism (4 Nov):** see `ANIMATION_QA.md` — all 12 Blender actions and all 63 app exercises checked on the skinned mesh.
- All 12 Actions rendered from side and front at their held frame (`renders/actions_sheet.png`); feet stay on the floor (lowest point −0.06 units ≈ 9 mm, sole contact).
- Stretched/torn edge check on Body and briefs in 5 poses: 0.
- App: new `body.glb` loads with no console errors; skin texture, hair, brows, lashes visible; worked muscles tint red during the workout player.

## Known limitations (honest list)
1. **No IK/FK switching controls inside Blender.** The 12 Blender actions are baked from computed IK (feet planted), but the rig has no IK handles for hand-animating. The app solves IK itself every frame.
2. **Skin weights are automatic** (bone heat) plus scripted clean-up, not hand-painted; no corrective shape keys for deep elbow/knee/shoulder bends yet.
3. **Small surface flaws left:** a soft shelf at the back of each armpit, a slight lower-flank bulge, calves flaring a little at the knee, 33 vertices flagged as slightly spiky (sub-millimetre).
4. **Face** is sculpted from anatomy + CC0 morphs to an attractive-trainer ideal using your measured ratios; it is *not* a likeness. Lip edges and fine facial detail would benefit from a short hand-sculpt pass.
5. **Hair** strands are ribbon meshes; the app uses every third strand (performance). The hair base's stubble-fade shader is Blender-only; the app sets a matching dark colour.
6. **Cross_Body_Shoulder_Stretch** is approximated with the arm horizontal rather than fully across the chest; lunge knee shapes are approximate.
7. **App model size:** 13 MB, ~136k vertices — fine on mid/high-end phones, heavy on low-end ones.
8. The quick Workbench preview renders show dark streaks on the neck — a cavity-shading artefact of that preview mode only (not in material/Cycles renders).

## Credits
- BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan. Mitsuhashi N. et al., Nucleic Acids Res. 2009;37:D782-5.
- MakeHuman base mesh and targets — CC0.
