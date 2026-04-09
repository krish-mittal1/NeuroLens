"""
dicom_loader.py
---------------
Handles loading medical imaging data:
- DICOM series (folder or zip)
- NIfTI files (.nii, .nii.gz)
- NumPy arrays (.npy)
"""

import os
import uuid
import zipfile

import numpy as np


def load_volume_from_npy(filepath: str) -> np.ndarray:
    """Load a pre-saved 3D volume from .npy file."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Volume file not found: {filepath}")

    volume = np.load(filepath)
    volume = _normalize_volume(volume)
    print(f"[DicomLoader] Loaded volume: shape={volume.shape}, dtype={volume.dtype}")
    return volume


def load_volume_from_input(path: str) -> dict:
    """
    Load a volume from a supported input path.

    Supported inputs:
    - .npy volume file
    - .nii / .nii.gz file
    - .zip archive containing a DICOM series or volume file
    - directory containing DICOM files
    """
    path = os.path.abspath(path)

    if os.path.isdir(path):
        volume, metadata = load_dicom_series(path)
        metadata["source_type"] = "dicom_series"
        return {"volume": volume, "metadata": metadata, "temp_dir": None}

    lower_name = os.path.basename(path).lower()

    if lower_name.endswith(".npy"):
        volume = load_volume_from_npy(path)
        return {
            "volume": volume,
            "metadata": {
                "source_type": "npy_volume",
                "slice_count": int(volume.shape[0]),
                "voxel_spacing": [1.0, 1.0, 1.0],
            },
            "temp_dir": None,
        }

    if lower_name.endswith(".nii") or lower_name.endswith(".nii.gz"):
        volume, metadata = load_nifti(path)
        metadata["source_type"] = "nifti_volume"
        return {"volume": volume, "metadata": metadata, "temp_dir": None}

    if lower_name.endswith(".zip"):
        return _load_from_zip(path)

    raise ValueError(f"Unsupported medical image input: {os.path.basename(path)}")


def load_dicom_series(folder: str):
    """
    Load a DICOM series from a folder.
    Requires pydicom. Sorts slices by z-position and stacks into 3D array.
    """
    try:
        import pydicom
    except ImportError:
        raise ImportError("pydicom is required for DICOM loading")

    dicom_paths = []
    for root, _, files in os.walk(folder):
        for name in files:
            if name.lower().endswith(".dcm"):
                dicom_paths.append(os.path.join(root, name))

    if not dicom_paths:
        raise ValueError(f"No .dcm files found in {folder}")

    slices = [pydicom.dcmread(path) for path in dicom_paths]
    slices.sort(key=_slice_sort_key)

    volume = np.stack([s.pixel_array.astype(np.float32) for s in slices])
    volume = _normalize_volume(volume)

    metadata = {
        "patient_id": str(getattr(slices[0], "PatientID", "Unknown")),
        "modality": str(getattr(slices[0], "Modality", "Unknown")),
        "slice_count": len(slices),
        "pixel_spacing": [float(x) for x in getattr(slices[0], "PixelSpacing", [1.0, 1.0])],
        "slice_thickness": float(getattr(slices[0], "SliceThickness", 1.0)),
        "voxel_spacing": _extract_voxel_spacing(slices[0]),
    }

    print(f"[DicomLoader] Loaded DICOM series: {len(slices)} slices, shape={volume.shape}")
    return volume, metadata


def load_nifti(filepath: str):
    """
    Load a NIfTI file (.nii or .nii.gz).
    Common format for research datasets like BraTS.
    """
    try:
        import nibabel as nib
    except ImportError:
        raise ImportError("nibabel is required for NIfTI loading")

    img = nib.load(filepath)
    volume = img.get_fdata().astype(np.float32)
    volume = _normalize_volume(volume)

    zooms = list(img.header.get_zooms()[:3]) if img.header.get_zooms() else [1.0, 1.0, 1.0]
    metadata = {
        "shape": list(volume.shape),
        "voxel_spacing": [float(v) for v in zooms],
        "slice_count": int(volume.shape[0]),
    }

    print(f"[DicomLoader] Loaded NIfTI: shape={volume.shape}")
    return volume, metadata


def _load_from_zip(filepath: str) -> dict:
    extraction_root = os.path.join(os.path.dirname(filepath), "_extracted")
    os.makedirs(extraction_root, exist_ok=True)
    temp_dir = os.path.join(extraction_root, f"neurolens_upload_{uuid.uuid4().hex[:8]}")
    os.makedirs(temp_dir, exist_ok=True)
    with zipfile.ZipFile(filepath, "r") as archive:
        archive.extractall(temp_dir)

    dicom_files = []
    npy_files = []
    nii_files = []
    mask_candidate = None

    for root, _, files in os.walk(temp_dir):
        for name in files:
            lower_name = name.lower()
            full_path = os.path.join(root, name)
            if ("mask" in lower_name or "seg" in lower_name) and mask_candidate is None:
                mask_candidate = full_path
            if lower_name.endswith(".dcm"):
                dicom_files.append(full_path)
            elif lower_name.endswith(".npy"):
                npy_files.append(full_path)
            elif lower_name.endswith(".nii") or lower_name.endswith(".nii.gz"):
                nii_files.append(full_path)

    if dicom_files:
        volume, metadata = load_dicom_series(temp_dir)
        metadata["source_type"] = "dicom_zip"
        result = {"volume": volume, "metadata": metadata, "temp_dir": temp_dir}
    elif nii_files:
        volume, metadata = load_nifti(nii_files[0])
        metadata["source_type"] = "nifti_zip"
        result = {"volume": volume, "metadata": metadata, "temp_dir": temp_dir}
    elif npy_files:
        volume = load_volume_from_npy(npy_files[0])
        result = {
            "volume": volume,
            "metadata": {
                "source_type": "npy_zip",
                "slice_count": int(volume.shape[0]),
                "voxel_spacing": [1.0, 1.0, 1.0],
            },
            "temp_dir": temp_dir,
        }
    else:
        raise ValueError("Zip archive did not contain supported DICOM/NIfTI/NumPy imaging data")

    if mask_candidate:
        result["mask_path"] = mask_candidate

    return result


def _normalize_volume(volume: np.ndarray) -> np.ndarray:
    volume = np.asarray(volume, dtype=np.float32)
    volume = _ensure_depth_first(volume)
    return (volume - volume.min()) / (volume.max() - volume.min() + 1e-8)


def _ensure_depth_first(volume: np.ndarray) -> np.ndarray:
    if volume.ndim != 3:
        raise ValueError(f"Expected 3D volume, got shape {volume.shape}")
    if volume.shape[0] <= min(volume.shape[1], volume.shape[2]):
        return volume
    return np.transpose(volume, (2, 0, 1))


def _slice_sort_key(dataset) -> float:
    image_position = getattr(dataset, "ImagePositionPatient", None)
    if image_position is not None and len(image_position) >= 3:
        return float(image_position[2])
    instance_number = getattr(dataset, "InstanceNumber", None)
    if instance_number is not None:
        return float(instance_number)
    return 0.0


def _extract_voxel_spacing(dataset) -> list:
    pixel_spacing = [float(x) for x in getattr(dataset, "PixelSpacing", [1.0, 1.0])]
    slice_thickness = float(getattr(dataset, "SliceThickness", 1.0))
    return [slice_thickness, pixel_spacing[0], pixel_spacing[1]]
