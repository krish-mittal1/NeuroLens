"""
volume_ops.py
-------------
Small pure-NumPy helpers for 3D volume processing.
These avoid the SciPy dependency so the demo can run in constrained environments.
"""

from collections import deque

import numpy as np


NEIGHBOR_OFFSETS = (
    (-1, 0, 0),
    (1, 0, 0),
    (0, -1, 0),
    (0, 1, 0),
    (0, 0, -1),
    (0, 0, 1),
)


def box_blur(volume: np.ndarray, passes: int = 1) -> np.ndarray:
    """
    Apply a lightweight 3D box blur using only NumPy operations.
    """
    result = np.asarray(volume, dtype=np.float32)
    for _ in range(max(1, passes)):
        padded = np.pad(result, 1, mode="edge")
        accum = np.zeros_like(result, dtype=np.float32)
        for dz in range(3):
            for dy in range(3):
                for dx in range(3):
                    accum += padded[
                        dz : dz + result.shape[0],
                        dy : dy + result.shape[1],
                        dx : dx + result.shape[2],
                    ]
        result = accum / 27.0
    return result


def binary_dilation(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    result = mask.astype(bool)
    for _ in range(max(0, iterations)):
        padded = np.pad(result, 1, mode="constant", constant_values=False)
        expanded = np.zeros_like(result, dtype=bool)
        for dz in range(3):
            for dy in range(3):
                for dx in range(3):
                    expanded |= padded[
                        dz : dz + result.shape[0],
                        dy : dy + result.shape[1],
                        dx : dx + result.shape[2],
                    ]
        result = expanded
    return result.astype(np.uint8)


def binary_erosion(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    result = mask.astype(bool)
    for _ in range(max(0, iterations)):
        padded = np.pad(result, 1, mode="constant", constant_values=True)
        shrunk = np.ones_like(result, dtype=bool)
        for dz in range(3):
            for dy in range(3):
                for dx in range(3):
                    shrunk &= padded[
                        dz : dz + result.shape[0],
                        dy : dy + result.shape[1],
                        dx : dx + result.shape[2],
                    ]
        result = shrunk
    return result.astype(np.uint8)


def binary_closing(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    dilated = binary_dilation(mask, iterations=iterations)
    return binary_erosion(dilated, iterations=iterations)


def fill_holes(mask: np.ndarray) -> np.ndarray:
    """
    Fill enclosed zero-regions by flood-filling from the volume boundary.
    """
    solid = mask.astype(bool)
    padded_shape = tuple(dim + 2 for dim in solid.shape)
    visited = np.zeros(padded_shape, dtype=bool)
    padded = np.pad(solid, 1, mode="constant", constant_values=False)

    queue = deque([(0, 0, 0)])
    visited[0, 0, 0] = True

    while queue:
        z, y, x = queue.popleft()
        for dz, dy, dx in NEIGHBOR_OFFSETS:
            nz, ny, nx = z + dz, y + dy, x + dx
            if not (0 <= nz < padded_shape[0] and 0 <= ny < padded_shape[1] and 0 <= nx < padded_shape[2]):
                continue
            if visited[nz, ny, nx] or padded[nz, ny, nx]:
                continue
            visited[nz, ny, nx] = True
            queue.append((nz, ny, nx))

    holes = (~visited[1:-1, 1:-1, 1:-1]) & (~solid)
    return (solid | holes).astype(np.uint8)


def largest_connected_component(mask: np.ndarray) -> np.ndarray:
    """
    Keep only the largest 6-connected component in a binary volume.
    """
    solid = mask.astype(bool)
    visited = np.zeros_like(solid, dtype=bool)
    best_component = []

    coords = np.argwhere(solid)
    for start in coords:
        sz, sy, sx = map(int, start)
        if visited[sz, sy, sx]:
            continue

        component = []
        queue = deque([(sz, sy, sx)])
        visited[sz, sy, sx] = True

        while queue:
            z, y, x = queue.popleft()
            component.append((z, y, x))
            for dz, dy, dx in NEIGHBOR_OFFSETS:
                nz, ny, nx = z + dz, y + dy, x + dx
                if not (0 <= nz < solid.shape[0] and 0 <= ny < solid.shape[1] and 0 <= nx < solid.shape[2]):
                    continue
                if visited[nz, ny, nx] or not solid[nz, ny, nx]:
                    continue
                visited[nz, ny, nx] = True
                queue.append((nz, ny, nx))

        if len(component) > len(best_component):
            best_component = component

    result = np.zeros_like(solid, dtype=np.uint8)
    for z, y, x in best_component:
        result[z, y, x] = 1
    return result
