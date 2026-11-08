"""Animation QA with the rig's real hinge axes: flexion sign, off-plane bend, limb twist, per-frame jumps, planted-foot slide."""
import bpy, math, json, numpy as np
from mathutils import Vector, Matrix
bpy.ops.wm.open_mainfile(filepath='/home/claude/mh/GKFitness_Trainer_Production.blend')
rig = bpy.data.objects['Rig']; arm = rig.data; sc = bpy.context.scene; P = rig.pose.bones; B = arm.bones
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'ARMATURE': m.show_viewport = False
def rest_dir(a, b): return (B[b].head_local - B[a].head_local).normalized()
CH = {'upperarm': 'forearm', 'forearm': 'hand', 'thigh': 'shin', 'shin': 'foot'}
HINGE = {}
for s in 'lr':
    HINGE['arm' + s] = rest_dir(f'upperarm_{s}', f'forearm_{s}').cross(rest_dir(f'forearm_{s}', f'hand_{s}')).normalized()
    HINGE['leg' + s] = rest_dir(f'thigh_{s}', f'shin_{s}').cross(rest_dir(f'shin_{s}', f'foot_{s}')).normalized()
def Rap(n): return P[n].matrix.to_3x3() @ B[n].matrix_local.to_3x3().inverted()
def joint(up, lo, nxt, hk):
    Ru, Rl = Rap(up), Rap(lo)
    u = (Ru @ rest_dir(up, lo)).normalized(); f = (Rl @ rest_dir(lo, nxt)).normalized()
    hu = Ru @ HINGE[hk]; hu = (hu - u * hu.dot(u)).normalized()
    hl = Rl @ HINGE[hk]; hl = (hl - f * hl.dot(f)).normalized()
    flex = math.degrees(math.atan2(u.cross(f).dot(hu), u.dot(f)))
    off = math.degrees(math.asin(max(-1, min(1, abs(f.dot(hu))))))
    tw = math.degrees(math.acos(max(-1, min(1, hu.dot(hl)))))
    return flex, off, tw
REST_FLEX = {}
for p in P: p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0)
bpy.context.view_layer.update()
for s in 'lr':
    REST_FLEX['arm' + s] = joint(f'upperarm_{s}', f'forearm_{s}', f'hand_{s}', 'arm' + s)[0]
    REST_FLEX['leg' + s] = joint(f'thigh_{s}', f'shin_{s}', f'foot_{s}', 'leg' + s)[0]
out = {}
for act in bpy.data.actions:
    rig.animation_data.action = act
    if act.slots: rig.animation_data.action_slot = act.slots[0]
    f0, f1 = map(int, act.frame_range); prev = {}; W = {'jump': 0, 'hyper': 0, 'offplane': 0, 'twist': 0}
    worst = {'jump': (0, ''), 'flex_min': (999, ''), 'off': (0, ''), 'tw': (0, '')}
    feet = []
    for fr in range(f0, f1 + 1):
        sc.frame_set(fr)
        for p in P:
            if p.name.startswith(('thumb', 'index', 'middle', 'ring', 'pinky')): continue
            q = p.matrix.to_quaternion()
            if p.name in prev:
                d = math.degrees(prev[p.name].rotation_difference(q).angle); d = min(d, 360 - d)
                if d > worst['jump'][0]: worst['jump'] = (d, f'{p.name}@{fr}')
                if d > 12: W['jump'] += 1
            prev[p.name] = q
        for s in 'lr':
            for nm, (a, b, c), hk in (('elbow', (f'upperarm_{s}', f'forearm_{s}', f'hand_{s}'), 'arm' + s), ('knee', (f'thigh_{s}', f'shin_{s}', f'foot_{s}'), 'leg' + s)):
                fl, off, tw = joint(a, b, c, hk)
                if fl < worst['flex_min'][0]: worst['flex_min'] = (fl, f'{nm}_{s}@{fr}')
                if off > worst['off'][0]: worst['off'] = (off, f'{nm}_{s}@{fr}')
                if tw > worst['tw'][0]: worst['tw'] = (tw, f'{nm}_{s}@{fr}')
                if fl < -5: W['hyper'] += 1
                if off > 12: W['offplane'] += 1
                if tw > 25: W['twist'] += 1
        mw = rig.matrix_world
        feet.append([tuple(mw @ P[f'toe_{s}'].head) for s in 'lr'])
    F = np.array(feet)          # frames x 2 x 3 (ball of each foot)
    slide = []
    for k in range(2):
        z = F[:, k, 2]; planted = z < z.min() + 0.03
        runs, cur = [], []
        for i, pl in enumerate(planted):
            if pl: cur.append(i)
            elif cur: runs.append(cur); cur = []
        if cur: runs.append(cur)
        for r in runs:
            if len(r) > 3:
                xy = F[r, k, :2]; slide.append(float(np.linalg.norm(xy - xy[0], axis=1).max()))
    out[act.name] = dict(W=W, worst={k: (round(v[0], 1), v[1]) for k, v in worst.items()}, planted_slide_max=round(max(slide) if slide else 0, 3),
                         lowest_ball=round(float(F[:, :, 2].min()), 3))
print('rest flexion (deg):', {k: round(v, 1) for k, v in REST_FLEX.items()})
for k, v in out.items():
    print(f"== {k}: frames-with jump>12deg {v['W']['jump']}, hyperext {v['W']['hyper']}, side-bent hinge {v['W']['offplane']}, twisted {v['W']['twist']} | worst {v['worst']} | planted slide {v['planted_slide_max']} | lowest ball z {v['lowest_ball']}")
json.dump(out, open('/home/claude/mh/inspect/anim_report2.json', 'w'), indent=1)
