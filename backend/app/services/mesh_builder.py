"""
mesh_builder.py
---------------
Converts a 3D binary mask into a mesh file using marching cubes.
Exports to .obj format for Three.js consumption.
"""

import numpy as np
from skimage import measure
import os
import uuid

from app.services.volume_ops import box_blur


def build_mesh(mask: np.ndarray, output_dir: str = "app/static", voxel_spacing=(1.0, 1.0, 1.0)) -> dict:
    """
    Convert a binary 3D mask into a .obj mesh file.
    
    Pipeline:
    1. Smooth the mask slightly for better mesh quality
    2. Run marching cubes algorithm
    3. Center and scale the mesh
    4. Export as .obj
    
    Returns dict with mesh info (filename, vertex count, face count).
    """
    print("[MeshBuilder] Generating 3D mesh from segmentation mask...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Smooth mask for nicer mesh surface
    smooth_mask = box_blur(mask.astype(np.float32), passes=1)
    
    # Marching cubes — the core algorithm
    try:
        verts, faces, normals, values = measure.marching_cubes(
            smooth_mask,
            level=0.5,
            spacing=tuple(float(v) for v in voxel_spacing),
        )
    except ValueError as e:
        print(f"  ERROR: Marching cubes failed — {e}")
        return None
    
    print(f"  Raw mesh — Vertices: {len(verts)}, Faces: {len(faces)}")
    
    # Center the mesh at origin
    center = (np.array(mask.shape) * np.array(voxel_spacing)) / 2.0
    verts = verts - center
    
    # Generate unique filename
    mesh_id = str(uuid.uuid4())[:8]
    tumor_filename = f"tumor_{mesh_id}.obj"
    tumor_filepath = os.path.join(output_dir, tumor_filename)
    
    # Write OBJ file
    _write_obj(verts, faces, normals, tumor_filepath, "Tumor Mesh")
    
    print(f"  Mesh saved: {tumor_filepath}")
    
    return {
        "filename": tumor_filename,
        "filepath": tumor_filepath,
        "vertex_count": len(verts),
        "face_count": len(faces),
        "mesh_id": mesh_id,
    }


def build_brain_mesh(volume: np.ndarray, output_dir: str = "app/static", voxel_spacing=(1.0, 1.0, 1.0)) -> dict:
    """
    Generate a brain surface mesh from the volume for anatomical context.
    """
    print("[MeshBuilder] Generating brain surface mesh...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Create brain boundary
    brain_boundary = (volume > 0.15).astype(np.float32)
    smooth_brain = box_blur(brain_boundary, passes=2)
    
    try:
        verts, faces, normals, values = measure.marching_cubes(
            smooth_brain,
            level=0.5,
            spacing=tuple(float(v) for v in voxel_spacing),
        )
    except ValueError:
        print("  WARNING: Brain mesh generation failed")
        return None
    
    center = (np.array(volume.shape) * np.array(voxel_spacing)) / 2.0
    verts = verts - center
    
    brain_filename = "brain.obj"
    brain_filepath = os.path.join(output_dir, brain_filename)
    
    _write_obj(verts, faces, normals, brain_filepath, "Brain Surface")
    
    print(f"  Brain mesh saved: {brain_filepath}")
    
    return {
        "filename": brain_filename,
        "filepath": brain_filepath,
        "vertex_count": len(verts),
        "face_count": len(faces),
    }


def _write_obj(verts, faces, normals, filepath, label="Mesh"):
    """Write vertices, normals and faces to .obj format."""
    with open(filepath, "w") as f:
        f.write(f"# NeuroLens — {label}\n")
        f.write(f"# Vertices: {len(verts)}, Faces: {len(faces)}\n\n")
        
        for v in verts:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        
        f.write("\n")
        
        for n in normals:
            f.write(f"vn {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}\n")
        
        f.write("\n")
        
        for face in faces:
            f.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")
