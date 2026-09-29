import re

file_path = r"c:\Users\abhay\OneDrive\Desktop\drone\drone-map\src\data\parcels.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update names for main building and labs
content = content.replace('"main building"', '"BIAS main building"')
content = content.replace('"labs and workshop"', '"BIAS labs and workshop"')

parts = content.split("{\n    id: ")
new_parts = [parts[0]]

for part in parts[1:]:
    name_match = re.search(r'name:\s*"([^"]+)"', part)
    if name_match:
        name = name_match.group(1)
        
        # Determine Area
        if name == "BIAS new building": new_area = "280.0"
        elif name == "BIAS main building": new_area = "350.0"
        elif name == "BIAS old building": new_area = "200.0"
        elif name == "BIAS labs and workshop": new_area = "60.0"
        elif name == "factory bhimtal": new_area = "400.0"
        else: new_area = None
        
        if new_area:
            part = re.sub(r'areaSqM:\s*[\d\.]+', f'areaSqM: {new_area}', part)
            
        # Determine Owner
        if name == "factory bhimtal": 
            owner = "-"
        else: 
            owner = "BIAS"
            
        # If owner field already exists, replace it, else add it before type
        if 'owner:' in part:
            part = re.sub(r'owner:\s*"[^"]*"', f'owner: "{owner}"', part)
        else:
            part = part.replace('type: ', f'owner: "{owner}",\n    type: ')
            
    new_parts.append(part)

content = "{\n    id: ".join(new_parts)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated parcels with strict areas and owners")
