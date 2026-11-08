# Body model pipeline

The 3D athlete in the app is generated here, headlessly, with Blender as a
Python module. Nothing is downloaded and no third-party asset is used, so the
model carries no licence obligations.

```bash
pip install bpy          # Blender as a Python module
python gen_body.py       # 1. anatomy: muscle masses -> fused sculpt -> creases
python retopo_bake.py    # 2. retopology (Quadriflow) + UVs + normal-map bake
python rig_and_export.py # 3. humanoid rig, weights, export body.glb
cp body.glb ../../public/model/body.glb
```

## Stages

1. **`gen_body.py`** places each superficial muscle as an oriented ellipsoid at
   its anatomical position, fuses them with a voxel remesh, and carves the
   linea alba, tendinous intersections, sternum, pectoral insertion and spinal
   furrow so the bellies read as forms under skin.
2. **`retopo_bake.py`** rebuilds the voxel soup as ~6.5k even quads (deformable
   topology), unwraps UVs, assigns one material slot per muscle group by nearest
   anatomical mass, and bakes the high-poly detail into a 2k normal map.
3. **`rig_and_export.py`** builds a 22-bone humanoid skeleton, binds with
   automatic weights, smooths them, and exports GLB with the normal map.

Previews: `render_preview.py` (high-poly turnaround), `render_low.py` (the
shipped low-poly under its normal map).

## Proportions

Landmarks follow standard anthropometry (Winter; Drillis & Contini) as
fractions of stature H, with H = 12 units — the same scale the app's pose data
uses, so the rig and the keyframes agree:

| Landmark | Fraction of H |
| --- | --- |
| Shoulder (acromion) | 0.818 |
| Hip (greater trochanter) | 0.530 |
| Elbow | 0.630 |
| Wrist | 0.485 |
| Knee | 0.285 |
| Ankle | 0.039 |
| Upper arm / forearm | 0.186 / 0.146 |
| Thigh / shank | 0.245 / 0.246 |
| Head height | 0.130 |

## Using a different model

`AnatomyModel.tsx` drives bones by name, so any rigged humanoid GLB works if it
uses these bone names and the same unit scale:

```
hips · spine_01..03 · neck · head
clavicle_l/r · upperarm_l/r · forearm_l/r · hand_l/r
thigh_l/r · shin_l/r · foot_l/r · toe_l/r
```

For red muscle highlighting the mesh needs one material per region, named:
`base head neck traps chest serratus abs obliques lats upperBack lowerBack
shoulders biceps triceps forearms glutes quads hamstrings adductors calves
tibialis hipFlexors`.

Drop the file at `public/model/body.glb`. If it fails to load the app falls back
to the procedural figure, so a bad file never breaks the workout.
