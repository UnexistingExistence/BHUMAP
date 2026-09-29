#!/usr/bin/env python3
"""
WebODM Automated Processing Pipeline
Automates authentication, project creation, image uploading, task monitoring,
and orthophoto downloading via the WebODM REST API.
"""

import os
import sys
import time
import json
import argparse
import requests
from pathlib import Path

DEFAULT_URL = os.getenv("WEBODM_URL", "http://localhost:8000")
DEFAULT_USER = os.getenv("WEBODM_USERNAME", "admin")
DEFAULT_PASS = os.getenv("WEBODM_PASSWORD", "admin")
DEFAULT_PROJECT = "Cadastral_Mapping"
DEFAULT_IMAGES_DIR = "./dataset/images"
DEFAULT_OUTPUT_DIR = "./gis_data"

STATUS_CODES = {
    10: "QUEUED",
    20: "RUNNING",
    30: "FAILED",
    40: "COMPLETED",
    50: "CANCELED"
}


class WebODMClient:
    def __init__(self, base_url=DEFAULT_URL, username=DEFAULT_USER, password=DEFAULT_PASS):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.token = None
        self.session = requests.Session()

    def authenticate(self):
        """Authenticate with WebODM API and obtain a session token."""
        auth_url = f"{self.base_url}/api/token-auth/"
        print(f"[*] Authenticating with WebODM at {auth_url}...")
        try:
            resp = self.session.post(
                auth_url,
                data={"username": self.username, "password": self.password},
                timeout=15
            )
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Authentication failed (Status {resp.status_code}): {resp.text}\n"
                    f"Check your credentials (default is admin/admin) or WebODM server status."
                )
            self.token = resp.json().get("token")
            self.session.headers.update({"Authorization": f"JWT {self.token}"})
            print("[+] Successfully authenticated. JWT Token acquired.")
            return True
        except requests.exceptions.ConnectionError:
            raise ConnectionError(
                f"Could not connect to WebODM at {self.base_url}.\n"
                f"Ensure WebODM is running on Docker: `cd ./WebODM && ./webodm.sh start`\n"
                f"Or check that port 8000 is forwarded properly."
            )

    def get_or_create_project(self, project_name=DEFAULT_PROJECT):
        """Find existing project by name or create a new one."""
        projects_url = f"{self.base_url}/api/projects/"
        print(f"[*] Checking for existing project '{project_name}'...")
        resp = self.session.get(projects_url)
        resp.raise_for_status()
        projects = resp.json()

        # WebODM returns list or paginated dict with results
        results = projects.get("results", projects) if isinstance(projects, dict) else projects
        for p in results:
            if p.get("name") == project_name:
                print(f"[+] Found existing project ID: {p['id']} ('{project_name}')")
                return p["id"]

        print(f"[*] Creating new project: '{project_name}'...")
        resp = self.session.post(
            projects_url,
            data={"name": project_name, "description": "Automated Drone Cadastral Mapping Project"}
        )
        resp.raise_for_status()
        new_project = resp.json()
        print(f"[+] Project created successfully. ID: {new_project['id']}")
        return new_project["id"]

    def upload_and_start_task(self, project_id, images_dir, resolution=5, dsm=True):
        """Upload drone images and initiate photogrammetry task."""
        images_path = Path(images_dir)
        if not images_path.exists():
            raise FileNotFoundError(f"Images directory not found: {images_dir}")

        image_files = [
            p for p in images_path.iterdir()
            if p.suffix.lower() in [".jpg", ".jpeg", ".png", ".tif", ".tiff"]
        ]

        if not image_files:
            raise FileNotFoundError(f"No valid image files found in {images_dir}")

        print(f"[*] Found {len(image_files)} drone images to process.")

        options = [
            {"name": "dsm", "value": dsm},
            {"name": "orthophoto-resolution", "value": resolution}
        ]

        tasks_url = f"{self.base_url}/api/projects/{project_id}/tasks/"
        print(f"[*] Uploading images and starting task on WebODM (Resolution: {resolution}cm/px)...")

        files_payload = []
        open_handles = []
        try:
            for idx, img_path in enumerate(image_files):
                f = open(img_path, "rb")
                open_handles.append(f)
                files_payload.append(("images", (img_path.name, f, "image/jpeg")))

            data_payload = {
                "name": f"Flight_Survey_{int(time.time())}",
                "options": json.dumps(options)
            }

            resp = self.session.post(tasks_url, files=files_payload, data=data_payload)
            resp.raise_for_status()
            task_data = resp.json()
            task_id = task_data["id"]
            print(f"[+] Task initiated successfully. Task ID: {task_id}")
            return task_id
        finally:
            for handle in open_handles:
                handle.close()

    def wait_for_completion(self, project_id, task_id, poll_interval=5):
        """Poll task status until completed or failed."""
        status_url = f"{self.base_url}/api/projects/{project_id}/tasks/{task_id}/"
        print(f"[*] Monitoring task {task_id} execution...")

        last_status = None
        start_time = time.time()

        while True:
            resp = self.session.get(status_url)
            resp.raise_for_status()
            task_info = resp.json()

            status_obj = task_info.get("status", {})
            status_code = status_obj.get("code") if isinstance(status_obj, dict) else status_obj
            status_text = STATUS_CODES.get(status_code, f"UNKNOWN ({status_code})")
            progress = task_info.get("progress", 0)

            elapsed = int(time.time() - start_time)
            msg = f"\r[~] Status: {status_text} | Progress: {progress}% | Elapsed: {elapsed}s"
            sys.stdout.write(msg)
            sys.stdout.flush()

            if status_code == 40:  # COMPLETED
                sys.stdout.write("\n")
                print(f"[+] Photogrammetry task completed successfully in {elapsed}s!")
                return True
            elif status_code in [30, 50]:  # FAILED or CANCELED
                sys.stdout.write("\n")
                error_msg = task_info.get("console_output", "Unknown error")
                raise RuntimeError(f"Task failed with status: {status_text}.\nLog snippet:\n{error_msg[-800:]}")

            time.sleep(poll_interval)

    def download_orthophoto(self, project_id, task_id, output_dir=DEFAULT_OUTPUT_DIR):
        """Download generated orthophoto.tif directly into output directory."""
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        dest_file = out_path / "orthophoto.tif"

        download_url = f"{self.base_url}/api/projects/{project_id}/tasks/{task_id}/download/orthophoto.tif"
        print(f"[*] Downloading orthophoto from {download_url}...")

        with self.session.get(download_url, stream=True) as r:
            r.raise_for_status()
            total_bytes = 0
            with open(dest_file, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        f.write(chunk)
                        total_bytes += len(chunk)

        size_mb = total_bytes / (1024 * 1024)
        print(f"[+] Download complete: {dest_file} ({size_mb:.2f} MB)")
        return str(dest_file)


def run_pipeline(args):
    images_dir = Path(args.images_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Check images directory
    if not images_dir.exists():
        # Fallback check for Bellus dataset in Downloads
        bellus_downloads = Path.home() / "Downloads" / "odm_data_bellus-master" / "odm_data_bellus-master" / "images"
        if bellus_downloads.exists():
            print(f"[*] Detected downloaded Bellus dataset at: {bellus_downloads}")
            print(f"[*] Creating local link/copy at {images_dir}...")
            images_dir.mkdir(parents=True, exist_ok=True)
            import shutil
            for f in bellus_downloads.glob("*.jpg"):
                shutil.copy(f, images_dir / f.name)
        else:
            images_dir.mkdir(parents=True, exist_ok=True)

    client = WebODMClient(
        base_url=args.url,
        username=args.username,
        password=args.password
    )

    try:
        client.authenticate()
        project_id = client.get_or_create_project(args.project_name)
        task_id = client.upload_and_start_task(
            project_id=project_id,
            images_dir=str(images_dir),
            resolution=args.resolution,
            dsm=not args.no_dsm
        )
        client.wait_for_completion(project_id, task_id, poll_interval=args.poll_interval)
        ortho_path = client.download_orthophoto(project_id, task_id, str(output_dir))
        print(f"\n[+] Pipeline finished successfully.")
        print(f"[+] Generated Orthophoto: {ortho_path}")
        return ortho_path

    except (ConnectionError, RuntimeError) as e:
        print(f"\n[!] WebODM Connection / Execution Notice:\n{e}")
        if args.fallback_sample:
            print("\n[*] --fallback-sample is enabled. Synthesizing/copying reference sample orthophoto...")
            sample_src = Path("./server/sample_data/sample_orthophoto.png")
            target_tif = output_dir / "orthophoto.tif"
            if sample_src.exists():
                from PIL import Image
                img = Image.open(sample_src)
                img.save(target_tif, format="TIFF")
                print(f"[+] Fallback reference orthophoto created at: {target_tif}")
                return str(target_tif)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="WebODM Automated Flight Processing CLI")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"WebODM URL (default: {DEFAULT_URL})")
    parser.add_argument("--username", default=DEFAULT_USER, help=f"Username (default: {DEFAULT_USER})")
    parser.add_argument("--password", default=DEFAULT_PASS, help=f"Password (default: {DEFAULT_PASS})")
    parser.add_argument("--project-name", default=DEFAULT_PROJECT, help=f"Project name (default: {DEFAULT_PROJECT})")
    parser.add_argument("--images-dir", default=DEFAULT_IMAGES_DIR, help=f"Directory with drone images (default: {DEFAULT_IMAGES_DIR})")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR, help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})")
    parser.add_argument("--resolution", type=float, default=5.0, help="Orthophoto target GSD resolution in cm/px (default: 5.0)")
    parser.add_argument("--no-dsm", action="store_true", help="Disable DSM generation")
    parser.add_argument("--poll-interval", type=int, default=5, help="Status polling interval in seconds (default: 5)")
    parser.add_argument("--fallback-sample", action="store_true", help="Fallback to sample orthophoto if WebODM Docker is offline")

    args = parser.parse_args()
    run_pipeline(args)


if __name__ == "__main__":
    main()
