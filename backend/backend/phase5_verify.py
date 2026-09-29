"""
Phase 5 -- Final verification suite with self-managed server lifecycle.
100% ASCII-safe for Windows cp1252 console compatibility.

Checks:
  1. GET  /                         -> health, api_version=2.0.0
  2. POST /api/detect-footprints    -> orthophoto.tif real-data test
  3. POST /predict                  -> 404 (deleted route)
  4. POST /predict-stitched         -> 404 (deleted route)
  5. POST /predict-geospatial       -> 404 (deleted route)
  6. pytest tests/test_geo_utils.py -> 12/12 passing
"""
import urllib.request
import urllib.error
import subprocess
import sys
import json
import os
import time

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE = "http://127.0.0.1:8000"
ORTHO = os.path.join(BACKEND_DIR, "data", "test_samples", "orthophoto.tif")
BOUNDARY = "----Phase5Boundary"
PASS = "PASS"
FAIL = "FAIL"

results = []

def check(label, passed, detail=""):
    tag = PASS if passed else FAIL
    print(f"  [{tag}] {label}")
    if detail:
        for line in detail.strip().splitlines():
            print(f"         {line}")
    results.append((label, passed))

def get(path):
    r = urllib.request.urlopen(f"{BASE}{path}", timeout=30)
    return json.loads(r.read().decode("utf-8")), r.status

def post_file(path, filepath):
    with open(filepath, "rb") as f:
        data = f.read()
    body = (
        f"--{BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; "
        f"filename=\"{os.path.basename(filepath)}\"\r\nContent-Type: image/tiff\r\n\r\n"
    ).encode("utf-8") + data + f"\r\n--{BOUNDARY}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={BOUNDARY}"},
        method="POST",
    )
    try:
        r = urllib.request.urlopen(req, timeout=300)
        return json.loads(r.read().decode("utf-8")), r.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode("utf-8")), e.code

def post_404(path):
    body = (
        f"--{BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; "
        f"filename=\"x.png\"\r\nContent-Type: image/png\r\n\r\n"
    ).encode("utf-8") + b"\x89PNG" + f"\r\n--{BOUNDARY}--\r\n".encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={BOUNDARY}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        return 200
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return -1

def main():
    print("=" * 60)
    print("PHASE 5: FINAL VERIFICATION SUITE")
    print("=" * 60)

    # 1. Start server as a background subprocess
    print("\nStarting backend server (api_server.py) on 127.0.0.1:8000...")
    log_path = os.path.join(BACKEND_DIR, "server_phase5.log")
    log_file = open(log_path, "w", encoding="utf-8")
    
    server_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api_server:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=log_file,
        stderr=subprocess.STDOUT
    )

    try:
        # 2. Poll GET / until 200 with 15s timeout
        print("Polling GET / until server responds (max 15s)...")
        ready = False
        start_time = time.time()
        while time.time() - start_time < 15:
            try:
                r = urllib.request.urlopen(f"{BASE}/", timeout=2)
                if r.status == 200:
                    ready = True
                    break
            except Exception:
                time.sleep(0.5)

        if not ready:
            print("ERROR: Server failed to start within 15 seconds.")
            log_file.flush()
            if os.path.exists(log_path):
                with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                    print("--- Server log ---")
                    print(f.read())
            sys.exit(1)

        print(f"Server is up and responding (took {time.time() - start_time:.2f}s)!\n")

        # -- Check 1: Health -------------------------------------------
        print("CHECK 1: GET /")
        try:
            data, status = get("/")
            check("HTTP 200", status == 200)
            check("status=online", data.get("status") == "online")
            check("api_version=2.0.0", data.get("api_version") == "2.0.0")
            check("model_is_custom=True", data.get("model_is_custom") is True)
            check("postgis_available=False (Docker offline, graceful)", data.get("postgis_available") is False)
            print(f"  Full response: {json.dumps(data, indent=2)}\n")
        except Exception as e:
            check("GET / reachable", False, str(e))

        # -- Check 2: Real-data orthophoto detection -------------------
        print("CHECK 2: POST /api/detect-footprints (orthophoto.tif, 18.8 MB)")
        try:
            t0 = time.time()
            data, status = post_file("/api/detect-footprints", ORTHO)
            elapsed = time.time() - t0
            print(f"  (Inference completed in {elapsed:.2f}s)")
            
            ok_status = data.get("status") == "success"
            ok_geo = data.get("georeferenced") is True
            ok_crs = data.get("raster_crs") == "EPSG:32617"
            ok_utm = data.get("utm_crs") == "EPSG:32617"
            features = data.get("geojson", {}).get("features", [])
            footprints = data.get("footprints", [])
            fp0 = footprints[0] if footprints else {}
            area_ok = isinstance(fp0.get("area_sqm"), float) and fp0["area_sqm"] > 0
            perim_ok = isinstance(fp0.get("perimeter_m"), float) and fp0["perimeter_m"] > 0
            coords = features[0]["geometry"]["coordinates"][0] if features else []
            coord_ok = len(coords) >= 4
            epsg4326_ok = features[0]["properties"].get("crs") == "EPSG:4326" if features else False

            check("HTTP 200", status == 200)
            check("status=success", ok_status)
            check("georeferenced=True", ok_geo)
            check("raster_crs=EPSG:32617", ok_crs, f"got: {data.get('raster_crs')}")
            check("utm_crs=EPSG:32617 (auto-selected)", ok_utm, f"got: {data.get('utm_crs')}")
            check(f"footprints_detected={data.get('footprints_detected')} (>=1)", data.get("footprints_detected", 0) >= 1)
            check(f"area_sqm={fp0.get('area_sqm')} m^2 (non-null, >0)", area_ok)
            check(f"perimeter_m={fp0.get('perimeter_m')} m (non-null, >0)", perim_ok)
            check(f"geojson.features[0] has >=4 vertices ({len(coords)})", coord_ok)
            check("geojson coordinates in EPSG:4326", epsg4326_ok)
            check("postgis_saved=0 (no Docker, graceful)", data.get("postgis_saved") == 0)

            print("\n  -- Detection details (first 3 features) --")
            print(f"  Total features detected: {len(footprints)}")
            for idx, fp in enumerate(footprints[:3]):
                print(f"  Feature #{idx + 1}:")
                print(f"    id         : {fp.get('id')}")
                print(f"    confidence : {fp.get('confidence')}")
                print(f"    area_sqm   : {fp.get('area_sqm')} m^2")
                print(f"    perimeter_m: {fp.get('perimeter_m')} m")
                print(f"    vertices   : {len(fp.get('coordinates', []))}")
                print(f"    bbox       : {fp.get('bbox')}")

            if features:
                ring = features[0]["geometry"]["coordinates"][0]
                print(f"\n  -- GeoJSON Feature[0] geometry --")
                print(f"  type         : {features[0]['geometry']['type']}")
                print(f"  vertex count : {len(ring)}")
                print(f"  sample coord : {ring[0]}")
                print(f"  raw_crs/raster_crs: {data.get('raster_crs')}")
                print(f"  utm_crs      : {data.get('utm_crs')}")
            print()
        except Exception as e:
            check("POST /api/detect-footprints", False, str(e))

        # -- Check 3: Deleted route /predict ---------------------------
        print("CHECK 3: POST /predict (must return 404)")
        code = post_404("/predict")
        check(f"HTTP {code} (expect 404)", code == 404)

        # -- Check 4: Deleted route /predict-stitched -------------------
        print("\nCHECK 4: POST /predict-stitched (must return 404)")
        code = post_404("/predict-stitched")
        check(f"HTTP {code} (expect 404)", code == 404)

        # -- Check 5: Deleted route /predict-geospatial -----------------
        print("\nCHECK 5: POST /predict-geospatial (must return 404)")
        code = post_404("/predict-geospatial")
        check(f"HTTP {code} (expect 404)", code == 404)

    finally:
        # Clean server shutdown
        print("\nShutting down backend server...")
        try:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(server_proc.pid)], capture_output=True)
            else:
                server_proc.terminate()
            server_proc.wait(timeout=5)
        except Exception:
            pass
        log_file.close()
        print("Backend server stopped.")

    # -- Check 6: Pytest geo_utils ----------------------------------
    print("\nCHECK 6: pytest tests/test_geo_utils.py")
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_geo_utils.py", "-v", "--tb=short"],
        capture_output=True, text=True,
        cwd=BACKEND_DIR
    )
    passed_12 = "12 passed" in proc.stdout
    check("12/12 tests passing", passed_12)
    for line in proc.stdout.splitlines():
        if "passed" in line or "failed" in line or "error" in line:
            print(f"  pytest: {line.strip()}")

    # -- Summary ----------------------------------------------------
    print("\n" + "=" * 60)
    total = len(results)
    passed = sum(1 for _, ok in results if ok)
    print(f"RESULT: {passed}/{total} checks passed")
    if passed == total:
        print("ALL CHECKS PASSED [OK]")
    else:
        print("FAILURES:")
        for label, ok in results:
            if not ok:
                print(f"  [FAIL] {label}")
    print("=" * 60)
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()
