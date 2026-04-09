"""
brats_loader.py
---------------
Helpers for loading standard BraTS case folders with multi-modal NIfTI volumes.
"""

import os
from typing import Dict, List, Optional

from app.services.dicom_loader import load_nifti


BRA_TS_DATASET_ROOT = os.getenv(
    "NEUROLENS_BRATS_ROOT",
    r"C:\Users\Dell\Desktop\Python Projects\Facial recognition attendence system\faces\archive (1)\BraTS2020_TrainingData",
)

MODALITY_SUFFIXES = {
    "flair": ["_flair.nii.gz", "_flair.nii"],
    "t1": ["_t1.nii.gz", "_t1.nii"],
    "t1ce": ["_t1ce.nii.gz", "_t1ce.nii"],
    "t2": ["_t2.nii.gz", "_t2.nii"],
    "seg": ["_seg.nii.gz", "_seg.nii"],
}


def get_brats_root() -> str:
    root = os.path.abspath(BRA_TS_DATASET_ROOT)
    if not os.path.isdir(root):
        return root

    entries = [entry for entry in os.scandir(root) if entry.is_dir()]
    case_entries = [entry for entry in entries if entry.name.startswith("BraTS20_Training_")]
    if case_entries:
        return root

    if len(entries) == 1:
        nested_root = entries[0].path
        nested_entries = [entry for entry in os.scandir(nested_root) if entry.is_dir()]
        if any(entry.name.startswith("BraTS20_Training_") for entry in nested_entries):
            return nested_root

    return root


def list_brats_cases(limit: Optional[int] = None) -> List[Dict]:
    root = get_brats_root()
    if not os.path.isdir(root):
        raise FileNotFoundError(f"BraTS dataset root not found: {root}")

    case_dirs = [
        entry
        for entry in os.scandir(root)
        if entry.is_dir() and entry.name.startswith("BraTS20_Training_")
    ]
    case_dirs.sort(key=lambda entry: entry.name)

    cases = []
    for entry in case_dirs[:limit]:
        modality_paths = _collect_case_files(entry.path)
        cases.append(
            {
                "case_id": entry.name,
                "path": entry.path,
                "modalities": sorted(modality_paths.keys()),
                "has_segmentation": "seg" in modality_paths,
            }
        )
    return cases


def load_brats_case(case_id: str, preferred_modality: str = "flair") -> Dict:
    case_dir = os.path.join(get_brats_root(), case_id)
    if not os.path.isdir(case_dir):
        raise FileNotFoundError(f"BraTS case not found: {case_id}")

    modality_paths = _collect_case_files(case_dir)
    if preferred_modality not in modality_paths:
        fallback = next((name for name in ("flair", "t1ce", "t2", "t1") if name in modality_paths), None)
        if fallback is None:
            raise ValueError(f"No MRI modalities found for case {case_id}")
        preferred_modality = fallback

    volume, metadata = load_nifti(modality_paths[preferred_modality])
    modality_volumes = {}
    for modality_name, modality_path in modality_paths.items():
        if modality_name == "seg":
            continue
        modality_volume, _ = load_nifti(modality_path)
        modality_volumes[modality_name] = modality_volume

    metadata.update(
        {
            "source_type": "brats_case",
            "case_id": case_id,
            "modality": preferred_modality,
            "available_modalities": sorted(modality_paths.keys()),
        }
    )

    result = {
        "volume": volume,
        "modality_volumes": modality_volumes,
        "metadata": metadata,
        "mask_path": modality_paths.get("seg"),
        "case_id": case_id,
        "modalities": modality_paths,
    }
    return result


def _collect_case_files(case_dir: str) -> Dict[str, str]:
    files = {}
    for modality, suffixes in MODALITY_SUFFIXES.items():
        match = _find_matching_file(case_dir, suffixes)
        if match:
            files[modality] = match
    return files


def _find_matching_file(case_dir: str, suffixes: List[str]) -> Optional[str]:
    for name in os.listdir(case_dir):
        lower_name = name.lower()
        for suffix in suffixes:
            if lower_name.endswith(suffix):
                return os.path.join(case_dir, name)
    return None
