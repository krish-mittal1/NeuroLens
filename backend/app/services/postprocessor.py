"""
postprocessor.py
----------------
Cleans up raw segmentation masks:
- Threshold to binary
- Remove small noise regions
- Keep largest connected component
- Morphological smoothing
"""

import numpy as np

from app.services.volume_ops import binary_closing, fill_holes, largest_connected_component


def postprocess_mask(mask: np.ndarray) -> np.ndarray:
    """
    Clean a raw segmentation mask for mesh generation.
    
    Steps:
    1. Threshold to binary
    2. Remove small disconnected regions
    3. Fill internal holes
    4. Morphological closing for smooth boundaries
    """
    print("[PostProcessor] Cleaning segmentation mask...")
    
    # Step 1: Threshold
    binary_mask = (mask > 0.5).astype(np.uint8)
    initial_voxels = np.sum(binary_mask)
    print(f"  Initial tumor voxels: {initial_voxels}")
    
    if initial_voxels == 0:
        print("  WARNING: Empty mask after thresholding!")
        return binary_mask
    
    # Step 2: Connected component analysis — keep largest
    cleaned_mask = largest_connected_component(binary_mask)
    removed = initial_voxels - np.sum(cleaned_mask)
    binary_mask = cleaned_mask.astype(np.uint8)
    num_features = 1 if np.sum(binary_mask) > 0 else 0
    print(f"  Connected components found: {num_features}")

    if removed > 0:
        removed = initial_voxels - np.sum(binary_mask)
        print(f"  Removed {removed} noise voxels")
    
    # Step 3: Fill internal holes
    binary_mask = fill_holes(binary_mask).astype(np.uint8)
    
    # Step 4: Morphological closing (smooth boundaries)
    binary_mask = binary_closing(binary_mask, iterations=1).astype(np.uint8)
    
    final_voxels = np.sum(binary_mask)
    print(f"  Final tumor voxels: {final_voxels}")
    print("[PostProcessor] Mask cleanup complete.")
    
    return binary_mask
