from typing import Dict, Optional, Tuple
import os

import numpy as np

from app.services.volume_ops import box_blur, largest_connected_component

DEFAULT_MODEL_CANDIDATES = [
    r"C:\Users\Dell\Desktop\Python Projects\Facial recognition attendence system\faces\fold1_f48_ep300_4gpu_dice0_9059\fold1_f48_ep300_4gpu_dice0_9059\model.pt",
]


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
    # This is NOT real segmentation â€” just a demo fallback
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
    model_path = _resolve_model_path()
    if not model_path:
        return None

    try:
        import torch
        from monai.inferers import sliding_window_inference
        from monai.networks.nets import SwinUNETR, UNet
    except ImportError:
        print("[Segmentor] MONAI/Torch not installed, skipping model inference")
        return None

    model_mode = _resolve_model_mode()
    model_arch = _resolve_model_arch()
    channel_order = ["flair", "t1", "t1ce", "t2"]

    if model_mode == "brats":
        in_channels = 4
        missing = [name for name in channel_order if not modality_volumes or name not in modality_volumes]
        if missing and len(missing) < 4 and modality_volumes:
            # Some modalities available but not all — skip model
            print(f"[Segmentor] Missing BraTS modalities for MONAI inference: {missing}")
            return None
        elif missing:
            # No multi-modal data at all — replicate single channel to 4
            print(f"[Segmentor] Single-channel input detected — replicating to 4 channels for SwinUNETR")
            print(f"  NOTE: Results may be less accurate than with proper multi-modal (FLAIR/T1/T1CE/T2) data")
            single = np.expand_dims(volume, axis=0)
            input_array = np.repeat(single, 4, axis=0)
            input_array = _normalize_brats_channels(input_array)
        else:
            input_array = np.stack([modality_volumes[name] for name in channel_order], axis=0)
            input_array = _normalize_brats_channels(input_array)
    else:
        in_channels = 1
        input_array = np.expand_dims(volume, axis=0)

    input_array, pad_widths = _pad_channels_to_multiple(input_array, multiple=32)

    print(f"[Segmentor] Running MONAI inference with model: {model_path} ({model_mode}, {model_arch})")

    if model_arch == "swinunetr":
        model = SwinUNETR(
            in_channels=in_channels,
            out_channels=int(os.getenv("NEUROLENS_MODEL_OUT_CHANNELS", "3")),
            feature_size=int(os.getenv("NEUROLENS_SWIN_FEATURE_SIZE", "48")),
            use_checkpoint=os.getenv("NEUROLENS_SWIN_USE_CHECKPOINT", "false").lower() == "true",
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
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Segmentor] Using device: {device}")

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    state_dict = checkpoint.get("state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint

    # Strip "module." prefix from multi-GPU (DataParallel/DDP) checkpoints
    if any(k.startswith("module.") for k in state_dict):
        print("[Segmentor] Stripping 'module.' prefix from state_dict (multi-GPU checkpoint)")
        state_dict = {k.replace("module.", "", 1): v for k, v in state_dict.items()}

    model.load_state_dict(state_dict)
    model = model.to(device)
    model.eval()

    with torch.no_grad():
        input_tensor = torch.tensor(input_array).unsqueeze(0).float().to(device)
        if model_arch == "swinunetr" and model_mode == "brats":
            roi_size = (
                int(os.getenv("NEUROLENS_INFER_ROI_Z", "96")),
                int(os.getenv("NEUROLENS_INFER_ROI_Y", "96")),
                int(os.getenv("NEUROLENS_INFER_ROI_X", "96")),
            )
            logits = sliding_window_inference(
                inputs=input_tensor,
                roi_size=roi_size,
                sw_batch_size=1,
                predictor=model,
                overlap=0.25,
            )
        else:
            logits = model(input_tensor)
        if logits.shape[1] > 1:
            probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()
            channels = (probs > 0.5).astype(np.uint8)
            if model_mode == "brats" and channels.shape[0] >= 2:
                # BraTS multi-label channel order is TC, WT, ET. WT is the cleanest
                # binary tumor target for our mesh/reasoning pipeline.
                mask = channels[1]
            else:
                mask = np.any(channels > 0, axis=0).astype(np.uint8)
        else:
            mask = (torch.sigmoid(logits) > 0.5).squeeze().cpu().numpy().astype(np.uint8)

    mask = _remove_padding(mask, pad_widths)

    print(f"[Segmentor] MONAI inference complete: tumor voxels={np.sum(mask)}")
    return mask


def get_model_status() -> dict:
    model_path = _resolve_model_path()
    model_mode = _resolve_model_mode()
    model_arch = _resolve_model_arch()
    return {
        "configured": bool(model_path),
        "exists": bool(model_path),
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


def _pad_channels_to_multiple(array: np.ndarray, multiple: int):
    spatial_shape = array.shape[1:]
    pad_widths = []
    for size in spatial_shape:
        remainder = size % multiple
        total_pad = 0 if remainder == 0 else multiple - remainder
        before = total_pad // 2
        after = total_pad - before
        pad_widths.append((before, after))

    padded = np.pad(
        array,
        ((0, 0), pad_widths[0], pad_widths[1], pad_widths[2]),
        mode="constant",
        constant_values=0,
    )
    return padded, pad_widths


def _remove_padding(mask: np.ndarray, pad_widths):
    z_slice = slice(pad_widths[0][0], mask.shape[0] - pad_widths[0][1] if pad_widths[0][1] else None)
    y_slice = slice(pad_widths[1][0], mask.shape[1] - pad_widths[1][1] if pad_widths[1][1] else None)
    x_slice = slice(pad_widths[2][0], mask.shape[2] - pad_widths[2][1] if pad_widths[2][1] else None)
    return mask[z_slice, y_slice, x_slice]


def _normalize_brats_channels(array: np.ndarray) -> np.ndarray:
    normalized = array.astype(np.float32, copy=True)
    for channel_index in range(normalized.shape[0]):
        channel = normalized[channel_index]
        foreground = channel != 0
        if not np.any(foreground):
            continue
        values = channel[foreground]
        mean = float(values.mean())
        std = float(values.std())
        if std > 0:
            channel[foreground] = (values - mean) / std
        else:
            channel[foreground] = values - mean
        normalized[channel_index] = channel
    return normalized


def _resolve_model_path() -> Optional[str]:
    env_path = os.getenv("NEUROLENS_MODEL_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    for candidate in DEFAULT_MODEL_CANDIDATES:
        if os.path.exists(candidate):
            return candidate

    return None


def _resolve_model_mode() -> str:
    return os.getenv("NEUROLENS_MODEL_MODE", "brats").lower()


def _resolve_model_arch() -> str:
    return os.getenv("NEUROLENS_MODEL_ARCH", "swinunetr").lower()
