"""
GK Fitness — training briefs.

The shorts are built from the body's own surface: the hip-to-mid-thigh faces are
duplicated, pushed out along their normals and closed at the hem, so they drape
on the figure exactly and deform with the same skinning.
"""
import bpy, bmesh, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, 'mh_shaped.blend'))
body = bpy.data.objects['Body']

Z_TOP, Z_HEM = 6.80, 5.55          # waistband and hem heights (briefs)
src = bmesh.new()
src.from_mesh(body.data)
src.faces.ensure_lookup_table()

keep = [f for f in src.faces if all(Z_HEM <= v.co.z <= Z_TOP for v in f.verts)]
print('shorts faces:', len(keep))

sh = bmesh.new()
vmap = {}
for f in keep:
    vs = []
    for v in f.verts:
        if v.index not in vmap:
            # flare the leg openings so the hem hangs instead of gripping
            t = max(0.0, min(1.0, (Z_TOP - v.co.z) / (Z_TOP - Z_HEM)))
            out = 0.045 + 0.045 * t * t
            vmap[v.index] = sh.verts.new(v.co + v.normal * out)
        vs.append(vmap[v.index])
    try:
        sh.faces.new(vs)
    except ValueError:
        pass
sh.verts.index_update()

# close the waistband and hem so the shorts read as cloth, not a decal
bmesh.ops.holes_fill(sh, edges=[e for e in sh.edges if e.is_boundary], sides=8)
bmesh.ops.recalc_face_normals(sh, faces=sh.faces[:])
solid = bmesh.ops.solidify(sh, geom=sh.faces[:], thickness=-0.035)

mesh = bpy.data.meshes.new('ShortsMesh')
sh.to_mesh(mesh)
sh.free(); src.free()
shorts = bpy.data.objects.new('Shorts', mesh)
bpy.context.collection.objects.link(shorts)

mat = bpy.data.materials.new('shorts')
mat.use_nodes = True
b = mat.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.10, 0.12, 0.17, 1)
b.inputs['Roughness'].default_value = 0.88
mesh.materials.append(mat)

bpy.context.view_layer.objects.active = shorts
shorts.select_set(True)
sm = shorts.modifiers.new('Smooth', 'SMOOTH')
sm.factor = 0.5; sm.iterations = 3
bpy.ops.object.modifier_apply(modifier='Smooth')
bpy.ops.object.shade_smooth()
print('shorts verts:', len(mesh.vertices))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'mh_shaped.blend'))
print('saved mh_shaped.blend')
