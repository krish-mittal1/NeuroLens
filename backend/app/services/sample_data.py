"""
sample_data.py
--------------
Creates and caches synthetic demo data when bundled sample assets are missing.
This keeps the API usable in hackathon/demo mode without requiring a model file.
"""

import os

import numpy as np

from app.services.volume_ops import box_blur


def ensure_sample_dataset(base_dir: str) -> dict:
    """
    Ensure demo volume/mask assets exist on disk and return their paths.
    """
    os.makedirs(base_dir, exist_ok=True)

    volume_path = os.path.join(base_dir, "volume.npy")
    mask_path = os.path.join(base_dir, "mask.npy")

    if not os.path.exists(volume_path) or not os.path.exists(mask_path):
        volume, mask = _create_sample_dataset()
        np.save(volume_path, volume)
        np.save(mask_path, mask)

    return {
        "volume_path": volume_path,
        "mask_path": mask_path,
        "source": "generated_sample",
    }


def _create_sample_dataset(shape=(128, 128, 128)):
    volume = _create_brain_volume(shape)
    mask = _create_tumor_mask(shape)
    return volume, mask


def _create_brain_volume(shape):
    z, y, x = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]

    zn = (z - shape[0] / 2) / (shape[0] / 2)
    yn = (y - shape[1] / 2) / (shape[1] / 2)
    xn = (x - shape[2] / 2) / (shape[2] / 2)

    brain = (xn ** 2 / 0.7 + yn ** 2 / 0.85 + zn ** 2 / 0.75) < 1.0
    volume = brain.astype(np.float32)

    inner_shell = (xn ** 2 / 0.5 + yn ** 2 / 0.6 + zn ** 2 / 0.55) < 1.0
    volume[inner_shell] = 0.7

    core = (xn ** 2 / 0.25 + yn ** 2 / 0.3 + zn ** 2 / 0.28) < 1.0
    volume[core] = 0.4

    rng = np.random.default_rng(42)
    noise = rng.normal(0, 0.05, shape).astype(np.float32)
    volume = volume + noise * brain
    volume = box_blur(volume, passes=2)
    return np.clip(volume, 0, 1)


def _create_tumor_mask(shape):
    z, y, x = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]

    cx, cy, cz = shape[2] * 0.35, shape[1] * 0.55, shape[0] * 0.50
    dx = (x - cx) / 12.0
    dy = (y - cy) / 10.0
    dz = (z - cz) / 9.0
    base = dx ** 2 + dy ** 2 + dz ** 2

    rng = np.random.default_rng(123)
    noise_field = rng.normal(0, 0.3, shape)
    noise_field = box_blur(noise_field, passes=4)

    tumor = (base + noise_field) < 1.0
    tumor = tumor & _create_brain_boundary(shape)
    return tumor.astype(np.uint8)


def _create_brain_boundary(shape):
    z, y, x = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]
    zn = (z - shape[0] / 2) / (shape[0] / 2)
    yn = (y - shape[1] / 2) / (shape[1] / 2)
    xn = (x - shape[2] / 2) / (shape[2] / 2)
    return (xn ** 2 / 0.7 + yn ** 2 / 0.85 + zn ** 2 / 0.75) < 1.0
