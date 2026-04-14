# NeuroLens 🧠

> Turn a brain MRI scan into an interactive 3D surgical planning view — with separate interfaces for patients and doctors.

NeuroLens takes multi-modal MRI data (FLAIR, T1, T1CE, T2), runs it through a 4-level segmentation pipeline (prioritizing a pre-trained **3D Attention-UNet** or **SwinUNETR**), and produces:

- A 3D mesh of the detected tumor overlaid on the brain surface
- Quantified clinical metrics (volume, depth, laterality, region mapping)
- A step-by-step clinical reasoning trace
- Two distinct report views — one simplified for patients, one detailed for clinicians

![3D Viewer](https://img.shields.io/badge/3D_Viewer-Three.js-blue?style=flat-square)
![Model](https://img.shields.io/badge/Model-Keras%2FTensorFlow-orange?style=flat-square)
![Dice](https://img.shields.io/badge/Dice_Score-0.9562-brightgreen?style=flat-square)
![Dataset](https://img.shields.io/badge/Dataset-BraTS2021-yellow?style=flat-square)

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

### Segmentation Pipeline
The platform uses a progressive 4-level inference system to guarantee results in any environment:
- **Level 1 (Pre-segmented Masks):** Instantly loads `.npy` masks if provided.
- **Level 2 (3D Attention-UNet):** Uses a TensorFlow/Keras model achieving **0.9562 Dice** on BraTS 2021. Requires a 69MB download.
- **Level 3 (SwinUNETR):** PyTorch/MONAI fallback (62M parameters, 0.9211 Dice).
- **Level 4 (Heuristic):** Intensity-based thresholding fallback when no ML models are available.

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

NeuroLens uses a flexible multi-level inference system. By default, it runs an intensity-based **heuristic fallback**, which means it works instantly out-of-the-box for hackathon demos.

However, to use the high-accuracy deep learning models, follow these steps:

#### Mode 1 — Keras 3D Attention-UNet (Recommended)
This model achieves a 0.9562 Dice score and only requires TensorFlow. We've included a script to grab the 69MB weights directly from HuggingFace.

```bash
cd backend
python download_model.py
```
This automatically downloads and extracts the model. It will print an environment variable like:
`NEUROLENS_KERAS_MODEL_PATH=C:/.../backend/models/3d_attention_unet`
Add that exact line to your `backend/.env` file.

#### Mode 2 — MONAI SwinUNETR (PyTorch Alternative)
If you prefer PyTorch and have a `.pt` SwinUNETR checkpoint:
1. Place the weights somewhere on your disk.
2. Edit `backend/.env` and set:
```bash
NEUROLENS_MODEL_PATH=/absolute/path/to/swinunetr.pt
```

#### Mode 3 — No Model (Zero Setup)
Skip all the above. If no environment variables are found, NeuroLens silently falls back to **Level 4 Heuristic Inference** — a fast, algorithmic approximation so the UI and 3D viewer still work perfectly for live demonstrations.

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
| Deep Learning | TensorFlow / Keras / PyTorch (MONAI) |
| 3D Rendering | Three.js + ACESFilmicToneMapping + Glass shaders |
| Mesh Generation | scikit-image marching cubes → PyWavefront OBJ |
| Dataset | BraTS 2021 / 2020 |

---

| Variable | Default | Description |
|---|---|---|
| `NEUROLENS_KERAS_MODEL_PATH` | (empty) | Path to extracted 3D Attention-UNet folder |
| `NEUROLENS_MODEL_PATH` | (empty) | Path to SwinUNETR model.pt checkpoint |
| `NEUROLENS_BRATS_ROOT` | (empty) | Path to BraTS training data |

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
