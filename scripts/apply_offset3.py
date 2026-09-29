import re

lat_offset = 0.00045
lng_offset = -0.00050

file_path = r"c:\Users\abhay\OneDrive\Desktop\drone\drone-map\src\data\parcels.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def replacer(match):
    lat = float(match.group(1))
    lng = float(match.group(2))
    return f"[{lat + lat_offset:.6f}, {lng + lng_offset:.6f}]"

new_content = re.sub(r"\[(\d+\.\d+),\s*(\d+\.\d+)\]", replacer, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated parcels.ts")
