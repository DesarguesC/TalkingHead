import bpy

# Shape key maps for Avatar SDK
shapekeyMap = [
    [ "sil", "sil" ], [ "PP", "PP" ], [ "FF", "FF" ],
    [ "TH", "TH" ], [ "DD", "DD" ], [ "kk", "kk" ],
    [ "CH", "CH" ], [ "SS", "SS" ], [ "nn", "nn" ],
    [ "RR", "RR" ], [ "aa", "aa" ], [ "E", "E" ],
    [ "ih", "I" ], [ "oh", "O" ], [ "ou", "U" ],
]

# Recursive traverse
def traverse(x):
    yield x
    if hasattr(x, 'children'):
        for c in x.children:
            yield from traverse(c)

# Has shape keys
def hasShapekeys(x):
    return hasattr(x, 'data') and hasattr(x.data, 'shape_keys') and hasattr(x.data.shape_keys, 'key_blocks')

# Rename avatar root
idx = bpy.context.scene.objects.find("AvatarRoot")
if idx != -1:
    bpy.context.scene.objects[idx].name = "Armature"

# Rename shape keys
for r in bpy.context.scene.objects:
    for o in traverse(r):
        if hasShapekeys(o):
            keys = o.data.shape_keys.key_blocks
            for m in shapekeyMap:
                idx = keys.find(m[0])
                if idx != -1:
                    keys[idx].name = m[1]
