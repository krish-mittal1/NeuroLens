"""
slice_server.py
---------------
Serves 2D slice images from the most recent analysis volume.
Keeps the volume + mask in memory and renders slices as PNG on demand.
"""

import io
import numpy as np
from PIL import Image

# In-memory store for the last analyzed volume and mask
_current_data = {
    "volume": None,
    "mask": None,
}


def store_slice_data(volume: np.ndarray, mask: np.ndarray):
    """Store volume and mask from the latest analysis for slice serving."""
    _current_data["volume"] = volume.copy()
    _current_data["mask"] = mask.copy()
    print(f"[SliceServer] Stored volume {volume.shape} and mask {mask.shape} for slice viewing")


def get_slice_info():
    """Return dimensions of the stored volume."""
    vol = _current_data["volume"]
    if vol is None:
        return None
    return {
        "axial": vol.shape[0],
        "coronal": vol.shape[1],
        "sagittal": vol.shape[2],
    }


def render_slice(axis: str, index: int) -> bytes:
    """
    Render a single 2D slice as PNG bytes.
    The MRI is shown in grayscale with the tumor mask overlaid in red.
    """
    vol = _current_data["volume"]
    mask = _current_data["mask"]

    if vol is None:
        raise ValueError("No volume data available. Run an analysis first.")

    # Extract the 2D slice
    if axis == "axial":
        if index < 0 or index >= vol.shape[0]:
            raise ValueError(f"Axial index {index} out of range [0, {vol.shape[0]-1}]")
        vol_slice = vol[index, :, :]
        mask_slice = mask[index, :, :] if mask is not None else None
    elif axis == "coronal":
        if index < 0 or index >= vol.shape[1]:
            raise ValueError(f"Coronal index {index} out of range [0, {vol.shape[1]-1}]")
        vol_slice = vol[:, index, :]
        mask_slice = mask[:, index, :] if mask is not None else None
    elif axis == "sagittal":
        if index < 0 or index >= vol.shape[2]:
            raise ValueError(f"Sagittal index {index} out of range [0, {vol.shape[2]-1}]")
        vol_slice = vol[:, :, index]
        mask_slice = mask[:, :, index] if mask is not None else None
    else:
        raise ValueError(f"Unknown axis: {axis}")

    # Normalize volume slice to 0-255 grayscale
    vol_slice = vol_slice.astype(np.float32)
    vmin, vmax = np.percentile(vol_slice, [1, 99])
    if vmax > vmin:
        vol_slice = np.clip((vol_slice - vmin) / (vmax - vmin), 0, 1)
    else:
        vol_slice = np.zeros_like(vol_slice)

    # Build RGB image: grayscale base
    gray = (vol_slice * 255).astype(np.uint8)
    rgb = np.stack([gray, gray, gray], axis=-1)

    # Overlay mask in semi-transparent red
    if mask_slice is not None and mask_slice.any():
        tumor_pixels = mask_slice > 0
        # Blend: 60% red overlay on tumor regions
        rgb[tumor_pixels, 0] = np.clip(rgb[tumor_pixels, 0] * 0.4 + 255 * 0.6, 0, 255).astype(np.uint8)
        rgb[tumor_pixels, 1] = (rgb[tumor_pixels, 1] * 0.3).astype(np.uint8)
        rgb[tumor_pixels, 2] = (rgb[tumor_pixels, 2] * 0.3).astype(np.uint8)

    # Flip vertically for correct orientation
    rgb = np.flipud(rgb)

    # Encode as PNG
    img = Image.fromarray(rgb)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf.getvalue()
