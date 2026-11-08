# Editing the GK Fitness trainer in Blender 5.2

1. Open `GKFitness_Trainer_Production.blend`.
2. **Body** = skin mesh (21 muscle-region materials, all using the realistic skin); **Shorts**, **Hair** (base), **HairStrands**, **BrowHairs**, **Lashes**, **Eyes** ride on **Rig**.
3. **Actions**: Dope Sheet → Action Editor → pick any of the 12 actions. 30 fps.
4. **Muscle flex**: Body → Object Data → Shape Keys `flexArms / flexChest / flexAbs / flexLegs` (keep at 0 for rest).
5. **Sculpting**: select Body → Sculpt Mode. Append `GKFitness_Trainer_Anatomy_Reference.blend` (collections *Skeleton*, *Muscles*, *Skull*, *FaceMuscles*) and set them to X-ray / wire to sculpt over the real anatomy.
6. **Weights**: Weight Paint mode on Body; bones are named root, hips, spine_01-03, neck, head, clavicle/upperarm/forearm/hand_l/_r, thumb/index/middle/ring/pinky_1-3_l/_r, thigh/shin/foot/toe_l/_r.
7. **Rebuild from scratch**: the `scripts/` folder; `rebuild_all.sh` runs every stage in order (needs the BodyParts3D dataset and the MakeHuman base.obj + targets).
8. When you finish editing, save and tell me — I'll export your edited version to the app.
