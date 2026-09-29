import re

lat_offset = 0.00020
lng_offset = -0.00020

# 1. Update Map.tsx
map_file = r"c:\Users\abhay\OneDrive\Desktop\drone\drone-map\src\components\Map.tsx"
with open(map_file, "r", encoding="utf-8") as f:
    map_content = f.read()

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

# Extract new DRONE_SURVEY_BOUNDS for output
new_bounds = re.search(r'(export const DRONE_SURVEY_BOUNDS.*?\];)', map_content, flags=re.DOTALL).group(1)

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

print(new_bounds)
print("---")
# We just need to grab the array block
array_start = parcels_content.find("export const PARCELS_DATA")
print(parcels_content[array_start:])
