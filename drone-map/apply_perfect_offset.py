import re

lat_offset = 0.00045
lng_offset = -0.00060

# 1. Update Map.tsx
map_file = r"c:\Users\abhay\OneDrive\Desktop\drone\drone-map\src\components\Map.tsx"
with open(map_file, "r", encoding="utf-8") as f:
    map_content = f.read()

def replacer_map(match):
    lat = float(match.group(1))
    lng = float(match.group(2))
    return f"[{lat + lat_offset:.6f}, {lng + lng_offset:.6f}]"

# Find DRONE_SURVEY_BOUNDS and replace its coordinates
# export const DRONE_SURVEY_BOUNDS: [[number, number], [number, number]] = [
#   [29.355490, 79.551930], // [minLat, minLng] South-West
#   [29.357290, 79.553930], // [maxLat, maxLng] North-East
# ];
pattern_bounds = r"export const DRONE_SURVEY_BOUNDS:[^\]]+\]\]\s*=\s*\[\s*(\[\d+\.\d+,\s*\d+\.\d+\])[^\]]+(\[\d+\.\d+,\s*\d+\.\d+\])"
# It's easier to just do a direct regex for the lines inside DRONE_SURVEY_BOUNDS
def replace_bounds_coords(match):
    coords = match.group(0)
    def rep_single(m):
        lat = float(m.group(1))
        lng = float(m.group(2))
        return f"[{lat + lat_offset:.6f}, {lng + lng_offset:.6f}]"
    return re.sub(r'\[(\d+\.\d+),\s*(\d+\.\d+)\]', rep_single, coords)

map_content = re.sub(r'(export const DRONE_SURVEY_BOUNDS.*?\];)', replace_bounds_coords, map_content, flags=re.DOTALL)

with open(map_file, "w", encoding="utf-8") as f:
    f.write(map_content)

# 2. Update parcels.ts
parcels_file = r"c:\Users\abhay\OneDrive\Desktop\drone\drone-map\src\data\parcels.ts"
with open(parcels_file, "r", encoding="utf-8") as f:
    parcels_content = f.read()

def replacer_parcels(match):
    lat = float(match.group(1))
    lng = float(match.group(2))
    return f"[{lat + lat_offset:.6f}, {lng + lng_offset:.6f}]"

parcels_content = re.sub(r"\[(\d+\.\d+),\s*(\d+\.\d+)\]", replacer_parcels, parcels_content)

with open(parcels_file, "w", encoding="utf-8") as f:
    f.write(parcels_content)

print("Coordinates successfully shifted by lat +0.00045, lng -0.00060")
