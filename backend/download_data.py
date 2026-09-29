import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# 1. Load Kaggle credentials from root .env
load_dotenv(dotenv_path="../.env")

import kaggle

# Available high-resolution aerial datasets
DATASETS = {
    # 1. Your original dataset: Pre-formatted YOLOv8 rooftop bounding boxes
    "airs_rooftop": {
        "slug": "chandru0503/airs-dataset-for-roof-top-detection-yolov8",
        "path": "datasets/aerial_mapping"
    },
    # 2. WHU Building Dataset: Premier benchmark for dense urban building boundaries
    "whu_rooftop": {
        "slug": "rameezakther/whu-building-rooftop-dataset",
        "path": "datasets/raw/whu_rooftop"
    }
}

def download_dataset(target_key="airs_rooftop"):
    if target_key not in DATASETS:
        print(f"[-] Invalid target key. Choose from: {list(DATASETS.keys())}")
        return

    info = DATASETS[target_key]
    out_dir = info["path"]
    os.makedirs(out_dir, exist_ok=True)
    
    print(f"[*] Downloading {info['slug']} into {out_dir}...")
    try:
        kaggle.api.dataset_download_cli(
            info["slug"],
            path=out_dir,
            unzip=True
        )
        print(f"[+] Download complete: {out_dir}")
    except Exception as e:
        print(f"[-] Failed to download: {e}")

if __name__ == "__main__":
    # 1. First priority: Re-download original dataset to restore deleted test images (1524.png, etc.)
    download_dataset("airs_rooftop")

    # 2. Uncomment to download WHU dataset for expanded training:
    # download_dataset("whu_rooftop")