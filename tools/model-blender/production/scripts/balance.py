"""Centre of mass from Dempster/Winter segment masses along the posed bones vs the feet's support area."""
import bpy, json, numpy as np
bpy.ops.wm.open_mainfile(filepath='/home/claude/mh/GKFitness_Trainer_Production.blend')
rig = bpy.data.objects['Rig']; sc = bpy.context.scene; P = rig.pose.bones
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'ARMATURE': m.show_viewport = False
H = json.load(open('/home/claude/mh/held_frames.json'))
SEG = [  # (bone head, bone tail-or-next, mass fraction, COM fraction from head)
 ('head', 'head', 0.081, 0.5), ('spine_03', 'neck', 0.216, 0.5), ('spine_02', 'spine_03', 0.139, 0.5), ('hips', 'spine_01', 0.142, 0.4),
 ('upperarm_l', 'forearm_l', 0.028, 0.436), ('upperarm_r', 'forearm_r', 0.028, 0.436), ('forearm_l', 'hand_l', 0.016, 0.43), ('forearm_r', 'hand_r', 0.016, 0.43),
 ('hand_l', 'hand_l', 0.006, 0.5), ('hand_r', 'hand_r', 0.006, 0.5), ('thigh_l', 'shin_l', 0.100, 0.433), ('thigh_r', 'shin_r', 0.100, 0.433),
 ('shin_l', 'foot_l', 0.0465, 0.433), ('shin_r', 'foot_r', 0.0465, 0.433), ('foot_l', 'toe_l', 0.0145, 0.5), ('foot_r', 'toe_r', 0.0145, 0.5)]
def pt(n, which):
    pb = P[n]; return np.array(rig.matrix_world @ (pb.head if which == 'h' else pb.tail))
res = {}
for n, f in H.items():
    a = bpy.data.actions[n]; rig.animation_data.action = a; rig.animation_data.action_slot = a.slots[0]
    worst = 0.0; worst_f = f
    f0, f1 = map(int, a.frame_range)
    for fr in range(f0, f1 + 1, 2):
        sc.frame_set(fr)
        com = np.zeros(3); mt = 0
        for b, e, m, c in SEG:
            p0 = pt(b, 'h'); p1 = pt(e, 'h') if e != b else pt(b, 't')
            com += m * (p0 + (p1 - p0) * c); mt += m
        com /= mt
        # support polygon (convex hull of heels and toe tips of feet on the floor)
        pts = []
        for s in 'lr':
            heel = pt(f'foot_{s}', 'h') - np.array([0.45, 0, 0]); toe = pt(f'toe_{s}', 't')
            if min(heel[2], toe[2]) < 0.6:           # foot on the floor
                pts += [heel[:2] + [0, 0.18], heel[:2] - [0, 0.18], toe[:2] + [0, 0.2], toe[:2] - [0, 0.2]]
        pts = np.array(pts)
        # distance outside the convex hull (2D)
        from scipy.spatial import ConvexHull, Delaunay
        hull = Delaunay(pts); inside = hull.find_simplex(com[:2]) >= 0
        if not inside:
            d = min(np.linalg.norm(pts - com[:2], axis=1))
            if d > worst: worst, worst_f = d, fr
    res[n] = (round(worst, 3), worst_f)
    print(f'{n:28s} worst distance of COM outside the feet: {worst * 147.4:5.1f} mm  (frame {worst_f})')
