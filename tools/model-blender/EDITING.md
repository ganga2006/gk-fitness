# Editing the body model

**Open `gkfitness_body_RIGGED.blend`.** It has everything: the body mesh, the
briefs, the 22-bone rig, 22 muscle material slots, 4 flex shape keys, and the
normal map packed inside the file.

When you are done, hand the file back and I will re-export it into the app.

---

## What is in the file

| Object | What it is |
| --- | --- |
| `Body` | 13,380 verts · 13,378 quads · 22 material slots · 4 shape keys · bound to `Rig` |
| `Shorts` | The briefs, 742 quads, bound to the same rig |
| `Rig` | 22-bone humanoid armature |

The body is the **MakeHuman base mesh** (CC0 — public domain), reshaped into a
male trainer build. Scale: the figure is **12 Blender units tall**, standing on
Z = 0, facing **+X**, with **+Y** to its left.

---

## The three things to keep

Change anything you like about the shape. Only these three contracts matter,
because the app reads them by name:

### 1. Material names — these drive the red muscle highlighting

```
base      head      neck        traps     chest     serratus
abs       obliques  lats        upperBack lowerBack shoulders
biceps    triceps   forearms    glutes    quads     hamstrings
adductors calves    tibialis    hipFlexors
```

Assign faces to whichever slot is anatomically right. If you rename a slot the
app simply will not light that muscle; nothing breaks.

### 2. Bone names — the app poses these directly

```
hips  spine_01  spine_02  spine_03  neck  head
clavicle_l/r  upperarm_l/r  forearm_l/r  hand_l/r
thigh_l/r     shin_l/r      foot_l/r     toe_l/r
```

Keep the names and the parenting. You can move bone *positions* freely to match
your edits — the app reads each bone's rest direction from the file, so it
adapts automatically.

### 3. Shape key names — muscle contraction

```
flexArms   flexChest   flexAbs   flexLegs
```

Each one should show those muscles **contracted** (swollen, slightly shortened).
The app blends them in on the effort phase of every rep. Sculpt them as hard or
as subtle as you want.

---

## Useful things to know

- **Re-sculpt freely.** Sculpt mode, proportional edit, shrink/fatten — all fine.
  Just do it on the `Basis` shape key, or your changes will land in a flex key.
- **The normal map carries the fine detail.** Abs separations, the linea alba,
  the pectoral border and the biceps/triceps split are in `normal` (packed, 2K).
  If you change the silhouette a lot, that map will no longer line up — tell me
  and I will re-bake it from your edit.
- **Weights are auto-generated then smoothed.** If a joint pinches when posed,
  fixing weights in Weight Paint is the highest-value thing you can do.
- **The face** is MakeHuman's neutral base. It is the weakest part of the model
  and the most worth your time.
- **Don't apply the Armature modifier** — the app needs the mesh in rest pose
  with live skinning.

---

## Handing it back

Send me `gkfitness_body_RIGGED.blend` (or an FBX / GLB export). I will run it
through `mh_rig.py` to produce `body.glb` and drop it into `public/model/`.

If you would rather export yourself, use **glTF 2.0 (.glb)** with:
Include ▸ Selected Objects · Data ▸ Mesh ▸ **Normals + Tangents** ·
Data ▸ **Shape Keys** · Data ▸ **Skinning** · Material ▸ Export.
Then replace `public/model/body.glb`.

A bad or missing model never breaks the app — it falls back to the procedural
figure and the workout still runs.

---

## Other files here

| File | Use |
| --- | --- |
| `gkfitness_body.fbx` | Same model as FBX, if you prefer another tool |
| `body.glb` | What the app currently loads |
| `mh_final.blend` | Pre-rig stage, with the high-poly copy for re-baking |
| `mh_shaped.blend` | Before materials and shape keys |
| `mh_base.blend` | The untouched CC0 base mesh |
| `normal.png` | The baked 2K normal map |
| `*.py` | The pipeline, to regenerate from scratch |
