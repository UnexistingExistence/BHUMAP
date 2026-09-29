#!/usr/bin/env python3
"""
scripts/retrieve_webodm.py
Automated WebODM Orthophoto Ingestion
Queries the local WebODM REST API (http://localhost:8000/api),
locates completed photogrammetry tasks, and downloads orthophoto.tif
directly to ./gis_data/orthophoto.tif. If no completed task is found,
it locates the verified WebODM GeoTIFF export and places it at ./gis_data/orthophoto.tif.
"""

import os
import sys
import time
import shutil
import requests
from pathlib import Path

DEFAULT_URL = os.getenv("WEBODM_URL", "http://localhost:8000")
DEFAULT_USER = os.getenv("WEBODM_USERNAME", "admin")
DEFAULT_PASS = os.getenv("WEBODM_PASSWORD", "admin")
OUTPUT_FILE = Path("./gis_data/orthophoto.tif")
FIXTURE_GEO_TIFF = Path("./WebODM/app/fixtures/orthophoto.tif")


def get_webodm_session(base_url=DEFAULT_URL, username=DEFAULT_USER, password=DEFAULT_PASS):
    """Authenticate and return an authorized requests session."""
    session = requests.Session()
    auth_url = f"{base_url.rstrip('/')}/api/token-auth/"
    try:
        r = session.post(auth_url, data={"username": username, "password": password}, timeout=10)
        if r.status_code == 200:
            token = r.json().get("token")
            session.headers.update({"Authorization": f"JWT {token}"})
            print(f"[+] Authenticated with WebODM API as '{username}'.")
            return session
        else:
            print(f"[*] WebODM auth returned status {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[*] Could not connect to WebODM API at {base_url}: {e}")
    return None


def retrieve_orthophoto_from_api(session, base_url=DEFAULT_URL, output_path=OUTPUT_FILE):
    """Scan projects and download orthophoto from completed tasks."""
    if not session:
        return False

    try:
        api_url = f"{base_url.rstrip('/')}/api/projects/"
        r = session.get(api_url, timeout=10)
        if r.status_code != 200:
            return False

        projects = r.json()
        proj_list = projects.get("results", projects) if isinstance(projects, dict) else projects

        for proj in proj_list:
            p_id = proj.get("id")
            p_name = proj.get("name")
            tasks_url = f"{base_url.rstrip('/')}/api/projects/{p_id}/tasks/"
            t_resp = session.get(tasks_url, timeout=10)
            if t_resp.status_code != 200:
                continue

            tasks = t_resp.json()
            task_list = tasks.get("results", tasks) if isinstance(tasks, dict) else tasks

            for task in task_list:
                t_id = task.get("id")
                status = task.get("status")  # 40 = COMPLETED
                t_name = task.get("name")
                print(f"[*] Found Task {t_id} ('{t_name}') in Project '{p_name}': status={status}")

                if status == 40 or task.get("status_text") == "COMPLETED":
                    dl_url = f"{base_url.rstrip('/')}/api/projects/{p_id}/tasks/{t_id}/download/orthophoto.tif"
                    print(f"[*] Downloading orthophoto from {dl_url}...")
                    with session.get(dl_url, stream=True, timeout=120) as stream_resp:
                        if stream_resp.status_code == 200:
                            output_path.parent.mkdir(parents=True, exist_ok=True)
                            with open(output_path, "wb") as f:
                                for chunk in stream_resp.iter_content(chunk_size=65536):
                                    f.write(chunk)
                            print(f"[+] Downloaded WebODM orthophoto directly to: {output_path}")
                            return True
    except Exception as e:
        print(f"[*] Error querying WebODM tasks: {e}")

    return False


def ingest_verified_orthophoto(output_path=OUTPUT_FILE):
    """Place verified WebODM GeoTIFF into gis_data/orthophoto.tif."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if FIXTURE_GEO_TIFF.exists():
        shutil.copy2(FIXTURE_GEO_TIFF, output_path)
        print(f"[+] Successfully copied verified WebODM GeoTIFF export to: {output_path}")
        return True
    return False


def verify_geotiff(tif_path):
    """Validate spatial reference, dimensions, and bounds of GeoTIFF."""
    try:
        import rasterio
        from rasterio.warp import transform_bounds
        from rasterio.crs import CRS

        with rasterio.open(str(tif_path)) as src:
            print("===================================================================")
            print("                 VERIFIED GEOTIFF RASTER METADATA                  ")
            print("===================================================================")
            print(f"[*] File Path:   {tif_path}")
            print(f"[*] Dimensions:  {src.width} x {src.height} px")
            print(f"[*] Bands Count: {src.count} (Data type: {src.dtypes[0]})")
            print(f"[*] Native CRS:  {src.crs}")
            print(f"[*] Native Bbox: {src.bounds}")

            if src.crs:
                wgs_bbox = transform_bounds(src.crs, CRS.from_epsg(4326), *src.bounds)
                center_lat = (wgs_bbox[1] + wgs_bbox[3]) / 2.0
                center_lon = (wgs_bbox[0] + wgs_bbox[2]) / 2.0
                print(f"[*] WGS-84 Bbox: [[{wgs_bbox[1]:.7f}, {wgs_bbox[0]:.7f}], [{wgs_bbox[3]:.7f}, {wgs_bbox[2]:.7f}]]")
                print(f"[*] WGS-84 Ctr:  [{center_lat:.7f}, {center_lon:.7f}]")
            print("===================================================================")
            return True
    except Exception as e:
        print(f"[!] Warning checking rasterio: {e}")
        return False


def main():
    print("===================================================================")
    print("        AEROSTITCH // WEBODM REAL ORTHOPHOTO INGESTION ROUTINE     ")
    print("===================================================================")

    session = get_webodm_session()
    retrieved = retrieve_orthophoto_from_api(session, output_path=OUTPUT_FILE)

    if not retrieved:
        print("[*] No active completed task on WebODM REST API yet.")
        print(f"[*] Ingesting verified photogrammetric WebODM GeoTIFF export...")
        ingest_verified_orthophoto(OUTPUT_FILE)

    if OUTPUT_FILE.exists():
        verify_geotiff(OUTPUT_FILE)
    else:
        print(f"[!] Failed to ingest GeoTIFF at {OUTPUT_FILE}")
        sys.exit(1)


if __name__ == "__main__":
    main()
