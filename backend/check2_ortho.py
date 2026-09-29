"""
Check #2: POST /api/detect-footprints with orthophoto.tif
Reports: features count, area_sqm/perimeter_m for first 3 features,
         raster_crs, utm_crs, first feature coordinates sample, vertex count.
"""
import json
import urllib.request
import urllib.parse

RASTER = r"data\test_samples\orthophoto.tif"
URL    = "http://127.0.0.1:8000/api/detect-footprints"

# Minimal multipart/form-data builder
BOUNDARY = "----BhuMapTestBoundary"

with open(RASTER, "rb") as f:
    file_data = f.read()

body = (
    f"--{BOUNDARY}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="orthophoto.tif"\r\n'
    f"Content-Type: image/tiff\r\n\r\n"
).encode() + file_data + f"\r\n--{BOUNDARY}--\r\n".encode()

req = urllib.request.Request(
    URL,
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={BOUNDARY}"},
    method="POST",
)

print(f"Sending {len(file_data)/1024/1024:.1f} MB to {URL} ...")
try:
    resp = urllib.request.urlopen(req, timeout=300)
    raw = resp.read().decode()
except urllib.error.HTTPError as e:
    raw = e.read().decode()
    print("HTTP ERROR:", e.code, e.reason)
    print(raw)
    raise SystemExit(1)

data = json.loads(raw)

print("\n=== TOP-LEVEL RESPONSE FIELDS ===")
print(f"status              : {data.get('status')}")
print(f"georeferenced       : {data.get('georeferenced')}")
print(f"raster_crs          : {data.get('raster_crs')}")
print(f"utm_crs             : {data.get('utm_crs')}")
print(f"image_dimensions    : {data.get('image_dimensions')}")
print(f"footprints_detected : {data.get('footprints_detected')}")
print(f"objects_detected    : {data.get('objects_detected')}")
print(f"class_summary       : {data.get('class_summary')}")
print(f"postgis_saved       : {data.get('postgis_saved')}")

features = data.get("geojson", {}).get("features", [])
footprints = data.get("footprints", [])
print(f"\n=== GEOJSON FEATURES TOTAL ===")
print(f"geojson.features count: {len(features)}")

print("\n=== FIRST 3 FOOTPRINTS (area_sqm / perimeter_m) ===")
for i in range(min(3, len(footprints))):
    fp = footprints[i]
    print(
        f"  #{i+1:3d}  id={fp.get('id')}  "
        f"area_sqm={fp.get('area_sqm')}  perim_m={fp.get('perimeter_m')}  "
        f"conf={fp.get('confidence')}  cat={fp.get('category')}"
    )

if features:
    f0 = features[0]
    geom = f0.get("geometry", {})
    ring = geom.get("coordinates", [[]])[0]  # outer ring
    print(f"\n=== FIRST GEOJSON FEATURE ===")
    print(f"  type       : {geom.get('type')}")
    print(f"  vertices   : {len(ring)}")
    print(f"  first coord: {ring[0] if ring else 'N/A'}")
    print(f"  last coord : {ring[-1] if ring else 'N/A'}")
    props = f0.get("properties", {})
    print(f"  area_sqm   : {props.get('area_sqm')}")
    print(f"  perimeter_m: {props.get('perimeter_m')}")
    print(f"  crs        : {props.get('crs')}")
