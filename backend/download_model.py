"""
download_model.py
-----------------
Downloads the pre-trained SwinUNETR checkpoint from a GitHub Release.

Usage:
    python download_model.py
    python download_model.py --url <direct-download-url> --out models/model.pt

The downloaded model.pt path should then be set in your .env file:
    NEUROLENS_MODEL_PATH=./models/model.pt
"""

import argparse
import os
import sys
import urllib.request

# ── Default model download URL ────────────────────────────────────────────────
# Update this URL after uploading model.pt to a GitHub Release:
#   https://github.com/krish-mittal1/NeuroLens/releases
#
# To upload:
#   1. Go to your repo → Releases → Draft a new release
#   2. Attach model.pt as a release asset
#   3. Copy the asset download URL and paste it below
DEFAULT_MODEL_URL = os.getenv("NEUROLENS_MODEL_URL", "")

DEFAULT_OUT_PATH = os.path.join(os.path.dirname(__file__), "models", "model.pt")


def download_with_progress(url: str, dest: str):
    os.makedirs(os.path.dirname(dest), exist_ok=True)

    print(f"Downloading model from:\n  {url}")
    print(f"Saving to:\n  {dest}\n")

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
        print(f"\n\n✓ Model saved to: {dest}")
        print("\nNext step — add this to your backend/.env file:")
        print(f"  NEUROLENS_MODEL_PATH={os.path.abspath(dest)}\n")
    except Exception as exc:
        print(f"\n✗ Download failed: {exc}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Download NeuroLens model checkpoint")
    parser.add_argument(
        "--url",
        default=DEFAULT_MODEL_URL,
        help="Direct download URL for model.pt (default: NEUROLENS_MODEL_URL env var)",
    )
    parser.add_argument(
        "--out",
        default=DEFAULT_OUT_PATH,
        help=f"Output path for the downloaded model (default: {DEFAULT_OUT_PATH})",
    )
    args = parser.parse_args()

    if not args.url:
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║  NeuroLens — Model Download                                  ║")
        print("╠══════════════════════════════════════════════════════════════╣")
        print("║  No download URL configured.                                 ║")
        print("║                                                              ║")
        print("║  Option 1 — GitHub Releases (recommended):                  ║")
        print("║    1. Upload your model.pt to a GitHub Release asset        ║")
        print("║    2. Re-run with: python download_model.py --url <URL>     ║")
        print("║                                                              ║")
        print("║  Option 2 — Local model:                                     ║")
        print("║    Set NEUROLENS_MODEL_PATH=/path/to/model.pt in .env       ║")
        print("║                                                              ║")
        print("║  Option 3 — No model (demo mode):                           ║")
        print("║    Skip this step. The app uses a heuristic fallback        ║")
        print("║    segmentation and still works fully for demos.            ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        sys.exit(0)

    if os.path.exists(args.out):
        print(f"Model already exists at: {args.out}")
        print("Delete it first if you want to re-download.")
        sys.exit(0)

    download_with_progress(args.url, args.out)


if __name__ == "__main__":
    main()
