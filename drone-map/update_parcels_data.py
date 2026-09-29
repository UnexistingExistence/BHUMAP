import json

file_path = r"c:\Users\abhay\OneDrive\Desktop\drone\drone-map\src\data\parcels.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add owner to interface
if "owner?: string;" not in content:
    content = content.replace("areaSqM: number;", "areaSqM: number;\n  owner?: string;")

# Replace "new building" -> "BIAS new building"
content = content.replace('"new building"', '"BIAS new building"')

# Replace "old building" -> "BIAS old building"
content = content.replace('"old building"', '"BIAS old building"')

# Add owner: "-" to factory bhimtal
if 'owner: "-"' not in content:
    content = content.replace('"factory bhimtal",\n    type: "ground"', '"factory bhimtal",\n    owner: "-",\n    type: "ground"')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated parcels.ts")
