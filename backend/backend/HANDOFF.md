# BhuMap Backend — SAHI Drone Tiling Handoff Guide

## Overview
This FastAPI backend has been upgraded with **Slicing Aided Hyper Inference (`sahi`)** to process high-resolution aerial and drone imagery without running out of GPU memory.

- **Standard Endpoint:** `POST /predict` — Standard single-pass YOLOv8 prediction (best for small images).
- **High-Res Tiling Endpoint:** `POST /predict-stitched` — SAHI sliced inference with **640x640 slice windows** and **15% overlap**, stitching detections across tile boundaries back into global image coordinates.
- **Geospatial Endpoint:** `POST /predict-geospatial` — Accepts a georeferenced GeoTIFF (`.tif`), runs SAHI tiled inference, and converts pixel bounding boxes into true GPS/GeoJSON polygons using `rasterio` and affine transformation matrices.

---

## Hardware & Memory Notice (NVIDIA RTX 2050 4GB VRAM)
- Standard inference on massive multi-megapixel drone images easily crashes 4GB VRAM GPUs with CUDA Out-Of-Memory (OOM) errors.
- SAHI processes high-resolution imagery slice-by-slice (640x640).
- Memory hygiene: `torch.inference_mode()` and `torch.cuda.empty_cache()` are explicitly called in `tiling_engine.py` after every run to prevent VRAM fragmentation.

---

## 1. Environment Setup

### Activate Virtual Environment
Open PowerShell in the `backend/` directory:

```powershell
# From BhuMap/backend/
.\venv\Scripts\Activate.ps1
```

*(If activating via Command Prompt: `venv\Scripts\activate.bat`)*

### Install Dependencies
Verify and install required packages:

```powershell
pip install -r requirements.txt
```

Core packages include:
- `fastapi`
- `uvicorn`
- `ultralytics`
- `sahi`
- `python-multipart`
- `torch` & `torchvision`
- `pillow`

---

## 2. Model Weights & Setup
**IMPORTANT:** The AI model weights are too large for GitHub and are not included in the repository.

1. Download the `best.pt` file from our shared drive: [Google Drive Link](https://drive.google.com/drive/folders/1TMQFkfndDPQtUZQcHPFXHSbJNpykCCce?usp=sharing)
2. Create the following folder structure inside the `backend` directory if it does not exist:
   `runs/detect/training_runs/sih26012_aerial_model/weights/`
3. Place the downloaded `best.pt` file inside that `weights/` folder.

The server will automatically resolve the path. If CUDA is available, it automatically loads onto `cuda:0`. If not, it falls back gracefully to `cpu`.

---

## 3. Starting the Server

Run Uvicorn with auto-reload:

```powershell
# Option A: Direct Uvicorn CLI
uvicorn api_server:app --reload --host 0.0.0.0 --port 8000

# Option B: Run via Python entry point
python api_server.py
```

The server will listen at: `http://127.0.0.1:8000`

---

## 4. Testing via Swagger UI

1. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000/docs
   ```
2. In the Swagger UI interactive documentation, expand the **`POST /predict-stitched`** endpoint.
3. Click **"Try it out"**.
4. Click **"Choose File"** and upload a drone image:
   - Sample images are available in: `backend/datasets/aerial_mapping/dataset/dataset/test/images/` (e.g., `1386.png` or `test_drone_img.jpg`).
5. Click **"Execute"**.

### Sample JSON Response
```json
{
  "status": "success",
  "roofs_detected": 4,
  "data": [
    {
      "coordinates": [0.0, 0.0, 504.51, 292.14],
      "confidence": 0.89,
      "category_name": "roof",
      "category_id": 0
    },
    {
      "coordinates": [465.21, 0.69, 879.26, 289.29],
      "confidence": 0.87,
      "category_name": "roof",
      "category_id": 0
    }
  ]
}
```

*Note: The `coordinates` array represents `[xmin, ymin, xmax, ymax]` in global image pixel coordinates.*

---

## 5. Standalone Module Verification
To verify the engine directly from Python without launching the HTTP server:

```powershell
python tiling_engine.py
```
