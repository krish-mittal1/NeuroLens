# NeuroLens 🧠

> Turn a brain MRI scan into an interactive 3D surgical planning view — with separate interfaces for patients and doctors.

NeuroLens takes multi-modal MRI data (FLAIR, T1, T1CE, T2), runs it through a pre-trained **SwinUNETR** segmentation model, and produces:

- A 3D mesh of the detected tumor overlaid on the brain surface
- Quantified clinical metrics (volume, depth, laterality, region mapping)
- A step-by-step clinical reasoning trace
- Two distinct report views — one simplified for patients, one detailed for clinicians

![3D Viewer](https://img.shields.io/badge/3D_Viewer-Three.js-blue?style=flat-square)
![Model](https://img.shields.io/badge/Model-SwinUNETR-orange?style=flat-square)
![Dice](https://img.shields.io/badge/Dice_Score-0.9211-brightgreen?style=flat-square)
![Dataset](https://img.shields.io/badge/Dataset-BraTS2020-yellow?style=flat-square)

---

## Why NeuroLens?

Most tumor segmentation tools stop at the mask — they give you a numpy array and call it a day. NeuroLens goes further:

- **Patients** shouldn't have to stare at raw medical imaging. They get a clear, reassuring summary of what was found and what happens next.
- **Doctors** need the technical details — exact volume in cm³, distance from midline, depth from cortical surface, risk factors, and the reasoning behind each conclusion.
- **Both** can rotate a 3D brain model and visually inspect the tumor's location and extent.

---

## Features

### Upload & Analyze
- Upload a DICOM zip, NIfTI file, or a BraTS-format multi-modal zip
- Auto-detects BraTS-style modalities (flair/t1/t1ce/t2) inside zip archives
- Falls back to single-channel replication for regular scans
- Browse and analyze any of the 369 BraTS2020 training cases directly

### Segmentation
- **SwinUNETR** (62M parameters) trained on BraTS2020 with 4-channel input
- Sliding window inference (96³ ROI) with automatic padding
- Handles multi-GPU checkpoints (strips `module.` prefix automatically)
- GPU inference ~14 seconds on a T4, CPU fallback available
- Heuristic intensity-based fallback when no model is configured

### 3D Visualization
- Full brain surface mesh + tumor mesh rendered with Three.js
- Orbit controls — rotate, zoom, pan
- Proper depth rendering (tumor always visible through transparent brain)

### Clinical Output
- **Region mapping** — maps tumor centroid to brain region (frontal, temporal, parietal, etc.)
- **Volume estimation** — in cm³ using voxel spacing
- **Risk assessment** — based on volume, depth, and proximity to critical structures
- **Reasoning trace** — 6-step chain showing how each conclusion was derived
- **Dual-view reports** — patient-friendly vs. clinician-grade

### Evaluation
- Built-in ground truth comparison for BraTS cases
- Dice coefficient and IoU metrics
- Validated at **0.9211 Dice** on BraTS20_Training_001

---

## Architecture

```
NeuroLens/
├── backend/                    # FastAPI server
│   ├── app/
│   │   ├── main.py             # CORS, static files, app setup
│   │   ├── routes/
│   │   │   └── analyze.py      # /api/analyze, /api/brats-analysis, /api/model-status
│   │   └── services/
│   │       ├── segmentor.py    # MONAI model loading + sliding window inference
│   │       ├── brats_loader.py # Multi-modal NIfTI loading for BraTS cases
│   │       ├── dicom_loader.py # DICOM/NIfTI/NPY loading + BraTS auto-detection
│   │       ├── mesh_builder.py # Marching cubes → OBJ mesh generation
│   │       ├── metrics.py      # Volume, region, depth, risk extraction
│   │       ├── explainer.py    # Clinical reasoning chain builder
│   │       ├── postprocessor.py # Morphological cleanup of raw masks
│   │       ├── evaluator.py    # Dice/IoU against ground truth
│   │       └── volume_ops.py   # Padding, normalization, axis alignment
│   └── requirements.txt
│
└── frontend/                   # React + Vite
    ├── index.html
    └── src/
        ├── App.jsx             # All views (Upload, 3D Viewer, Patient, Doctor)
        ├── styles.css          # Full design system
        └── main.jsx            # Entry point
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- (Optional) NVIDIA GPU with CUDA for fast inference

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://127.0.0.1:5173`.

### Model Setup

The `model.pt` checkpoint is **not included in the repository** (model weights are too large for Git).
The app works in three modes — pick whichever fits your situation:

#### Mode 1 — No model (demo / quick start)
Skip this step entirely. The app uses a **heuristic intensity-based fallback** segmentation and the built-in synthetic sample data. All UI features work. This is the default when no model is configured.

#### Mode 2 — Local model file (if you already have `model.pt`)
```bash
# Create your .env from the template
cp backend/.env.example backend/.env

# Edit .env and set your model path
NEUROLENS_MODEL_PATH=/absolute/path/to/model.pt
```

#### Mode 3 — Download from GitHub Releases (for repo forks)

**Step 1 — The repo owner uploads the model once:**
1. Go to the repo → **Releases** → **Draft a new release**
2. Tag it `v1.0-model`, title it `SwinUNETR Model Checkpoint`
3. Attach `model.pt` as a release asset
4. Publish the release
5. Copy the asset download URL (looks like: `https://github.com/krish-mittal1/NeuroLens/releases/download/v1.0-model/model.pt`)
6. Set it as the default in `download_model.py` (line ~18): `DEFAULT_MODEL_URL = "<your URL here>"`

**Step 2 — Anyone who forks the repo runs:**
```bash
cd backend
python download_model.py
# Model is saved to backend/models/model.pt
# Add NEUROLENS_MODEL_PATH=./models/model.pt to backend/.env
```

Or pass a URL directly:
```bash
python download_model.py --url https://github.com/krish-mittal1/NeuroLens/releases/download/v1.0-model/model.pt
```

> **Note:** The `backend/models/` directory and all `*.pt` files are already in `.gitignore` — the model will never be accidentally committed.

### BraTS Dataset (optional)

```bash
# Point to a local BraTS2020 dataset (contains BraTS20_Training_XXX folders)
NEUROLENS_BRATS_ROOT=/path/to/MICCAI_BraTS2020_TrainingData
```

## Running on Google Colab

If you don't have an NVIDIA GPU locally, you can validate the model on Colab:

1. Upload `model.pt` and one BraTS case folder to Google Drive
2. Use a T4 GPU runtime
3. Install dependencies: `pip install monai nibabel matplotlib`
4. Load all 4 modalities, run sliding window inference
5. We validated **0.9211 Dice** in 14.3 seconds on a T4

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Three.js |
| Backend | FastAPI, Uvicorn |
| Model | MONAI SwinUNETR (PyTorch) |
| 3D Rendering | Three.js + OBJ meshes |
| Mesh Generation | scikit-image marching cubes → Trimesh |
| Medical Imaging | NiBabel, PyDICOM |
| Dataset | BraTS2020 (369 training cases) |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEUROLENS_MODEL_PATH` | (auto-search) | Path to model.pt checkpoint |
| `NEUROLENS_MODEL_MODE` | `brats` | `brats` (4-ch) or `single` |
| `NEUROLENS_MODEL_ARCH` | `swinunetr` | `swinunetr` or `unet` |
| `NEUROLENS_BRATS_ROOT` | (auto-search) | Path to BraTS2020 training data |
| `NEUROLENS_SWIN_FEATURE_SIZE` | `48` | SwinUNETR feature dimension |
| `NEUROLENS_INFER_ROI_Z/Y/X` | `96` | Sliding window ROI size |

---

## API Endpoints

| Method | Route | What it does |
|---|---|---|
| `POST` | `/api/analyze` | Upload & analyze a scan file |
| `GET` | `/api/sample-analysis` | Run analysis on built-in sample data |
| `GET` | `/api/brats-analysis/{case_id}` | Analyze a local BraTS training case |
| `GET` | `/api/brats-cases` | List available BraTS cases |
| `GET` | `/api/model-status` | Check if model is loaded and ready |

---

## Acknowledgments

- [MONAI](https://monai.io/) for the SwinUNETR architecture and medical imaging utilities
- [BraTS Challenge](https://www.med.upenn.edu/cbica/brats2020/) for the training dataset
- [Three.js](https://threejs.org/) for 3D rendering in the browser

---

## License

This project was built for a hackathon. Feel free to use, modify, and build on top of it.
