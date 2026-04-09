"""
generate_sample_data.py
-----------------------
Generates a realistic synthetic brain volume with an embedded tumor.
Outputs:
  - sample_data/volume.npy   (3D brain volume)
  - sample_data/mask.npy     (3D binary tumor mask)
  - app/static/tumor.obj     (pre-generated 3D mesh)

This allows the demo to work without a real ML model or real DICOM data.
The marching cubes mesh is REAL — generated from actual 3D data.
"""

import numpy as np
from scipy.ndimage import gaussian_filter
from skimage import measure
import os


def create_brain_volume(shape=(128, 128, 128)):
    """Create a synthetic brain-like 3D volume."""
    z, y, x = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]

    # Normalize coordinates to [-1, 1]
    zn = (z - shape[0] / 2) / (shape[0] / 2)
    yn = (y - shape[1] / 2) / (shape[1] / 2)
    xn = (x - shape[2] / 2) / (shape[2] / 2)

    # Brain shape: slightly elongated ellipsoid
    brain = (xn ** 2 / 0.7 + yn ** 2 / 0.85 + zn ** 2 / 0.75) < 1.0

    # Add internal structure (gray/white matter simulation)
    volume = brain.astype(np.float32)
    
    # Add some internal variation to make it look more realistic
    inner_shell = (xn ** 2 / 0.5 + yn ** 2 / 0.6 + zn ** 2 / 0.55) < 1.0
    volume[inner_shell] = 0.7
    
    core = (xn ** 2 / 0.25 + yn ** 2 / 0.3 + zn ** 2 / 0.28) < 1.0
    volume[core] = 0.4

    # Add noise and smooth for realism
    noise = np.random.normal(0, 0.05, shape).astype(np.float32)
    volume = volume + noise * brain
    volume = gaussian_filter(volume, sigma=1.5)
    volume = np.clip(volume, 0, 1)

    return volume


def create_tumor_mask(shape=(128, 128, 128)):
    """Create a realistic irregular tumor mask in the left temporal region."""
    z, y, x = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]

    # Tumor center: left temporal lobe area
    # Offset to the left and slightly posterior
    cx, cy, cz = shape[2] * 0.35, shape[1] * 0.55, shape[0] * 0.50

    # Base ellipsoid tumor shape
    dx = (x - cx) / 12.0
    dy = (y - cy) / 10.0
    dz = (z - cz) / 9.0
    base = dx ** 2 + dy ** 2 + dz ** 2

    # Add irregularity using noise
    np.random.seed(42)  # Reproducible
    noise_field = np.random.normal(0, 0.3, shape)
    noise_field = gaussian_filter(noise_field, sigma=4)

    # Create irregular tumor boundary
    tumor = (base + noise_field) < 1.0

    # Ensure tumor is inside the brain boundary
    brain = create_brain_boundary(shape)
    tumor = tumor & brain

    return tumor.astype(np.uint8)


def create_brain_boundary(shape=(128, 128, 128)):
    """Simple brain boundary for constraining the tumor."""
    z, y, x = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]
    zn = (z - shape[0] / 2) / (shape[0] / 2)
    yn = (y - shape[1] / 2) / (shape[1] / 2)
    xn = (x - shape[2] / 2) / (shape[2] / 2)
    return (xn ** 2 / 0.7 + yn ** 2 / 0.85 + zn ** 2 / 0.75) < 1.0


def generate_mesh_from_mask(mask, filename="tumor.obj"):
    """Convert binary mask to .obj mesh using marching cubes."""
    # Smooth the mask slightly for better mesh quality
    smooth_mask = gaussian_filter(mask.astype(np.float32), sigma=1.0)

    # Run marching cubes
    verts, faces, normals, values = measure.marching_cubes(smooth_mask, level=0.5)

    # Center the mesh
    center = np.array(mask.shape) / 2.0
    verts = verts - center

    # Scale to reasonable size
    verts = verts * 0.1

    # Write OBJ file
    with open(filename, "w") as f:
        f.write("# NeuroLens - Tumor Mesh\n")
        f.write(f"# Vertices: {len(verts)}, Faces: {len(faces)}\n\n")

        for v in verts:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")

        for n in normals:
            f.write(f"vn {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}\n")

        for face in faces:
            f.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")

    print(f"  Mesh saved: {filename}")
    print(f"  Vertices: {len(verts)}, Faces: {len(faces)}")
    return verts, faces


def generate_brain_mesh(volume, filename="brain.obj"):
    """Generate a brain surface mesh for anatomical context."""
    # Create brain boundary
    brain_boundary = (volume > 0.15).astype(np.float32)
    smooth_brain = gaussian_filter(brain_boundary, sigma=2.0)

    verts, faces, normals, values = measure.marching_cubes(smooth_brain, level=0.5)

    center = np.array(volume.shape) / 2.0
    verts = verts - center
    verts = verts * 0.1

    with open(filename, "w") as f:
        f.write("# NeuroLens - Brain Surface Mesh\n")
        f.write(f"# Vertices: {len(verts)}, Faces: {len(faces)}\n\n")

        for v in verts:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")

        for n in normals:
            f.write(f"vn {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}\n")

        for face in faces:
            f.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")

    print(f"  Brain mesh saved: {filename}")
    print(f"  Vertices: {len(verts)}, Faces: {len(faces)}")
    return verts, faces


if __name__ == "__main__":
    print("=" * 50)
    print("NeuroLens — Generating Sample Data")
    print("=" * 50)

    shape = (128, 128, 128)

    # Create directories
    os.makedirs("sample_data", exist_ok=True)
    os.makedirs("app/static", exist_ok=True)

    # Generate brain volume
    print("\n[1/4] Generating synthetic brain volume...")
    volume = create_brain_volume(shape)
    np.save("sample_data/volume.npy", volume)
    print(f"  Saved: sample_data/volume.npy — shape {volume.shape}")

    # Generate tumor mask
    print("\n[2/4] Generating tumor mask...")
    mask = create_tumor_mask(shape)
    np.save("sample_data/mask.npy", mask)
    tumor_voxels = np.sum(mask)
    print(f"  Saved: sample_data/mask.npy — shape {mask.shape}")
    print(f"  Tumor voxels: {tumor_voxels}")

    # Generate tumor mesh
    print("\n[3/4] Generating tumor mesh (marching cubes)...")
    generate_mesh_from_mask(mask, "app/static/tumor.obj")

    # Generate brain surface mesh
    print("\n[4/4] Generating brain surface mesh...")
    generate_brain_mesh(volume, "app/static/brain.obj")

    print("\n" + "=" * 50)
    print("Sample data generation complete!")
    print("=" * 50)
