from typing import Dict, Optional, Tuple
import os

import numpy as np

from app.services.volume_ops import box_blur, largest_connected_component


def segment_tumor(
    volume: np.ndarray,
    sample_mask_path: str = None,
    modality_volumes: Optional[Dict[str, np.ndarray]] = None,
) -> np.ndarray:
    mask, _ = segment_tumor_with_info(
        volume=volume,
        sample_mask_path=sample_mask_path,
        modality_volumes=modality_volumes,
    )
    return mask


def segment_tumor_with_info(
    volume: np.ndarray,
    sample_mask_path: str = None,
    modality_volumes: Optional[Dict[str, np.ndarray]] = None,
) -> Tuple[np.ndarray, str]:
    """
    Segment tumor from a 3D brain volume.
    
    Level 1: If sample_mask_path is provided, loads pre-computed mask.
    Level 2: Would run MONAI model inference here.
    """
    
    if sample_mask_path and os.path.exists(sample_mask_path):
        # Level 1: Use pre-segmented mask
        print("[Segmentor] Loading pre-computed segmentation mask...")
        mask = np.load(sample_mask_path)
        print(f"[Segmentor] Mask loaded: shape={mask.shape}, tumor voxels={np.sum(mask)}")
        return mask, "presegmented_mask"

    model_mask = _run_monai_inference(volume, modality_volumes=modality_volumes)
    if model_mask is not None:
        return model_mask, "model_inference"

    print("[Segmentor] Running heuristic fallback segmentation...")
    return _run_model_inference(volume), "heuristic_fallback"


def _run_model_inference(volume: np.ndarray) -> np.ndarray:
    """
    Placeholder for MONAI model inference.
    In production, this would load a pre-trained SwinUNETR or UNet
    and run inference on the volume.
    
    For now, returns a simple threshold-based pseudo-segmentation.
    """
    # Simple intensity-based pseudo-segmentation as fallback
    # This is NOT real segmentation — just a demo fallback
    # Find regions with high intensity variation (crude tumor approximation)
    smooth = box_blur(volume, passes=3)
    diff = np.abs(volume - smooth)
    threshold = np.percentile(diff[diff > 0], 95)
    
    mask = (diff > threshold).astype(np.uint8)
    
    # Keep only the largest connected component
    if np.sum(mask) > 0:
        mask = largest_connected_component(mask)
    
    print(f"[Segmentor] Pseudo-segmentation complete: tumor voxels={np.sum(mask)}")
    return mask


def _run_monai_inference(
    volume: np.ndarray,
    modality_volumes: Optional[Dict[str, np.ndarray]] = None,
) -> Optional[np.ndarray]:
    """
    Optional MONAI inference path.

    Activated only when `NEUROLENS_MODEL_PATH` points to a readable torch checkpoint
    and both torch and monai are installed.
    """
    model_path = os.getenv("NEUROLENS_MODEL_PATH")
    if not model_path or not os.path.exists(model_path):
        return None

    try:
        import torch
        from monai.networks.nets import SwinUNETR, UNet
    except ImportError:
        print("[Segmentor] MONAI/Torch not installed, skipping model inference")
        return None

    model_mode = os.getenv("NEUROLENS_MODEL_MODE", "single").lower()
    model_arch = os.getenv("NEUROLENS_MODEL_ARCH", "unet").lower()
    channel_order = ["flair", "t1", "t1ce", "t2"]

    if model_mode == "brats":
        in_channels = 4
        missing = [name for name in channel_order if not modality_volumes or name not in modality_volumes]
        if missing:
            print(f"[Segmentor] Missing BraTS modalities for MONAI inference: {missing}")
            return None
        input_array = np.stack([modality_volumes[name] for name in channel_order], axis=0)
    else:
        in_channels = 1
        input_array = np.expand_dims(volume, axis=0)

    print(f"[Segmentor] Running MONAI inference with model: {model_path} ({model_mode}, {model_arch})")

    if model_arch == "swinunetr":
        model = SwinUNETR(
            in_channels=in_channels,
            out_channels=1,
            feature_size=int(os.getenv("NEUROLENS_SWIN_FEATURE_SIZE", "24")),
            use_checkpoint=False,
            spatial_dims=3,
        )
    else:
        model = UNet(
            spatial_dims=3,
            in_channels=in_channels,
            out_channels=1,
            channels=(16, 32, 64, 128),
            strides=(2, 2, 2),
            num_res_units=2,
        )
    state_dict = torch.load(model_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    with torch.no_grad():
        input_tensor = torch.tensor(input_array).unsqueeze(0).float()
        logits = model(input_tensor)
        mask = (torch.sigmoid(logits) > 0.5).squeeze().cpu().numpy().astype(np.uint8)

    print(f"[Segmentor] MONAI inference complete: tumor voxels={np.sum(mask)}")
    return mask


def get_model_status() -> dict:
    model_path = os.getenv("NEUROLENS_MODEL_PATH")
    model_mode = os.getenv("NEUROLENS_MODEL_MODE", "single").lower()
    model_arch = os.getenv("NEUROLENS_MODEL_ARCH", "unet").lower()
    return {
        "configured": bool(model_path),
        "exists": bool(model_path and os.path.exists(model_path)),
        "path": model_path,
        "mode": model_mode,
        "arch": model_arch,
    }


def load_mask_from_path(mask_path: str) -> np.ndarray:
    """
    Load a segmentation mask from .npy or NIfTI for pre-segmented demo data.
    """
    if not mask_path or not os.path.exists(mask_path):
        raise FileNotFoundError(f"Mask file not found: {mask_path}")

    lower_name = os.path.basename(mask_path).lower()
    if lower_name.endswith(".npy"):
        mask = np.load(mask_path)
    elif lower_name.endswith(".nii") or lower_name.endswith(".nii.gz"):
        try:
            import nibabel as nib
        except ImportError:
            raise ImportError("nibabel is required for NIfTI mask loading")
        mask = nib.load(mask_path).get_fdata()
    else:
        raise ValueError(f"Unsupported mask format: {os.path.basename(mask_path)}")

    mask = np.asarray(mask)
    if mask.ndim != 3:
        raise ValueError(f"Expected 3D mask, got shape {mask.shape}")

    if mask.shape[0] > min(mask.shape[1], mask.shape[2]):
        mask = np.transpose(mask, (2, 0, 1))

    return (mask > 0.5).astype(np.uint8)
