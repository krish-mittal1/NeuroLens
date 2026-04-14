"""
download_model.py
-----------------
Downloads the 3D Attention-UNet brain tumor segmentation model from Hugging Face.

Model: maryann-gitonga/brain-tumor-segmentation-3d-attention-unet
Dice Score: 0.9562 | Framework: TensorFlow/Keras | Modalities: T1CE, T2, FLAIR
Source: https://huggingface.co/maryann-gitonga/brain-tumor-segmentation-3d-attention-unet

Usage:
    python download_model.py               # download + extract to ./models/
    python download_model.py --out custom/ # download to a custom folder

After downloading, add this to backend/.env:
    NEUROLENS_KERAS_MODEL_PATH=./models/3d_attention_unet
"""

import argparse
import os
import sys
import urllib.request
import zipfile

# Direct download URL from Hugging Face (69.2 MB zip)
DEFAULT_MODEL_URL = (
    "https://huggingface.co/maryann-gitonga/brain-tumor-segmentation-3d-attention-unet"
    "/resolve/main/3d_attention_unet.zip?download=true"
)

DEFAULT_OUT_DIR = os.path.join(os.path.dirname(__file__), "models")


def download_with_progress(url: str, dest: str):
    print("Downloading 3D Attention-UNet model...")
    print(f"  Source : {url.split('?')[0]}")
    print(f"  Saving : {dest}\n")

    def _progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            pct = min(downloaded / total_size * 100, 100)
            bar = "█" * int(pct // 2) + "░" * (50 - int(pct // 2))
            mb_done = downloaded / 1024 / 1024
            mb_total = total_size / 1024 / 1024
            print(f"\r  [{bar}] {pct:5.1f}%  {mb_done:.1f}/{mb_total:.1f} MB", end="", flush=True)

    try:
        urllib.request.urlretrieve(url, dest, reporthook=_progress)
        print("\n")
    except Exception as exc:
        print(f"\n✗ Download failed: {exc}", file=sys.stderr)
        sys.exit(1)


def extract_zip(zip_path: str, out_dir: str) -> str:
    print(f"  Extracting {os.path.basename(zip_path)}...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(out_dir)
    os.remove(zip_path)
    # Return the first extracted subdirectory
    for name in os.listdir(out_dir):
        full = os.path.join(out_dir, name)
        if os.path.isdir(full):
            return full
    return out_dir


def _print_next_steps(model_dir: str):
    abs_path = os.path.abspath(model_dir)
    print("\n─────────────────────────────────────────────")
    print("  Next: add this to backend/.env")
    print(f"    NEUROLENS_KERAS_MODEL_PATH={abs_path}")
    print("─────────────────────────────────────────────")
    print("  Model info:")
    print("    Architecture : 3D Attention-UNet (TensorFlow/Keras)")
    print("    Dice score   : 0.9562")
    print("    Modalities   : T1CE + T2 + FLAIR (3-channel input)")
    print("    Dataset      : BraTS 2021 (1400 scans)")
    print("─────────────────────────────────────────────\n")


def main():
    parser = argparse.ArgumentParser(
        description="Download the 3D Attention-UNet brain tumor segmentation model"
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_MODEL_URL,
        help="Direct download URL (default: Hugging Face model)",
    )
    parser.add_argument(
        "--out",
        default=DEFAULT_OUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUT_DIR})",
    )
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    model_dir = os.path.join(args.out, "3d_attention_unet")

    if os.path.exists(model_dir):
        print(f"✓ Model already exists at: {model_dir}")
        print("  Delete the folder to re-download.")
        _print_next_steps(model_dir)
        sys.exit(0)

    zip_dest = os.path.join(args.out, "3d_attention_unet.zip")
    download_with_progress(args.url, zip_dest)
    extracted = extract_zip(zip_dest, args.out)

    print(f"✓ Model saved to: {extracted}")
    _print_next_steps(extracted)


if __name__ == "__main__":
    main()
