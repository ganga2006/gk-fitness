# Body model — Blender source

The 3D athlete, built on the **MakeHuman base mesh**, which is released under
**CC0** (no restrictions, no attribution required). Everything here is yours to
open and refine by hand.

Source: `makehumancommunity/makehuman`, `data/3dobjs/base.obj` — kept as
`base.obj` so the pipeline runs offline.

## Open these in Blender

| File | What it holds |
| --- | --- |
| `mh_base.blend` | The raw base mesh, converted to the app's axes and scale |
| `mh_shaped.blend` | Shaped to a male trainer build, briefs added |
| `mh_final.blend` | **The one to edit** — muscle material slots, flex shape keys, baked normal map |
| `body.glb` | What the app loads |
| `normal.png` | The baked 2K tangent-space normal map |

## Re-run the pipeline

Needs `pip install bpy` (Blender as a Python module). Run in order:

```bash
python mh_build.py       # import base.obj, convert axes, extract joint markers
python mh_shape.py       # male athletic build: V-taper, muscle masses
python mh_proportion.py  # measure and correct girths to classic ratios
python mh_shorts.py      # briefs, built from the body's own surface
python mh_finish.py      # muscle materials, flex shape keys, normal bake
python mh_rig.py         # 22-bone rig from the joint markers, export GLB
cp body.glb ../../public/model/body.glb
```

Preview renders: `render_mh.py <file.blend>` (fast) or `render_final.py` (Cycles).

## If you edit `mh_final.blend` by hand

Keep these three things and the app will pick up your changes:

1. **Material names** — one per muscle group, used for the red highlighting:
   `base head neck traps chest serratus abs obliques lats upperBack lowerBack
   shoulders biceps triceps forearms glutes quads hamstrings adductors calves
   tibialis hipFlexors`
2. **Bone names** — the app drives these directly:
   `hips · spine_01..03 · neck · head · clavicle_l/r · upperarm_l/r ·
   forearm_l/r · hand_l/r · thigh_l/r · shin_l/r · foot_l/r · toe_l/r`
3. **Shape keys** — muscle contraction: `flexArms flexChest flexAbs flexLegs`

Then re-export with `mh_rig.py`, or export GLB manually with skinning, morph
targets and materials enabled.

## Proportions

Girths are corrected to the classic "Grecian ideal" trainer build — fit, not a
heavy bodybuilder:

| Ratio | Target | Achieved |
| --- | --- | --- |
| Shoulder : waist (Adonis index) | 1.618 | 1.705 |
| Waist : chest | 0.70 | corrected |
| Neck, hips | ratio of chest | corrected |

Limb girth is set in `mh_shape.py` by radial profile and judged on the render:
a limb cross-section slab reliably catches neighbouring geometry at this mesh
density, so auto-correcting it produced worse numbers than it fixed.

Segment *lengths* come from the base mesh itself, which is a real human scan
topology, so they already match human anthropometry.
