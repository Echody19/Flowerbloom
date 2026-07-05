import os
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get("ECHOBLOOM_HUA_DAE", r"D:\桌面\HUA.dae"))
OUTPUT = ROOT / "public" / "models" / "hua.glb"
MAX_TEXTURE_SIZE = 1024


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def clamp_images():
    for image in bpy.data.images:
        if image.size[0] <= 0 or image.size[1] <= 0:
            continue

        width, height = image.size
        largest = max(width, height)
        if largest <= MAX_TEXTURE_SIZE:
            continue

        scale = MAX_TEXTURE_SIZE / largest
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))


def tune_materials():
    for material in bpy.data.materials:
        material.use_nodes = True
        material.blend_method = "CLIP"
        material.alpha_threshold = 0.08
        material.show_transparent_back = False

        principled = next(
            (node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"),
            None,
        )
        if principled:
            principled.inputs["Alpha"].default_value = 1


def export_glb():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        export_image_format="AUTO",
        export_materials="EXPORT",
        export_animations=False,
    )


clear_scene()
bpy.ops.wm.collada_import(filepath=str(SOURCE))
clamp_images()
tune_materials()
export_glb()
print(f"exported {OUTPUT}")
