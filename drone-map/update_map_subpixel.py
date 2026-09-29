import re

with open('src/components/Map.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_parcels = """const hardcodedParcelsBase = [
  {
    id: "PARCEL-104A",
    khasraNo: "104/1A",
    title: "Birla Institute of Applied Sciences",
    subTitle: "Academic Complex & Main Blocks",
    owner: "Birla Institute of Applied Sciences",
    guardian: "Founding Educational Trust",
    type: "Institutional",
    status: "Verified Cadastral Record",
    taxStatus: "Exempt / Clear",
    // Snapped precisely along the orange roof ridges and courtyard of the main complex
    coordinates: [
      [29.35785, 79.55142],
      [29.35796, 79.55178],
      [29.35760, 79.55198],
      [29.35712, 79.55168],
      [29.35722, 79.55140],
      [29.35752, 79.55156]
    ] as [number, number][]
  },
  {
    id: "PARCEL-104B",
    khasraNo: "104/1B",
    title: "Campus Multipurpose Hall & Workshop",
    subTitle: "Facility Wing",
    owner: "Estate & Operations Wing",
    guardian: "Estate Officer, BIAS",
    type: "Commercial / Facility",
    status: "Survey Completed",
    taxStatus: "Current",
    // Locked tight to the 4 corners of the blue/grey utility shed
    coordinates: [
      [29.35682, 79.55070],
      [29.35674, 79.55130],
      [29.35635, 79.55122],
      [29.35644, 79.55062]
    ] as [number, number][]
  },
  {
    id: "PARCEL-104C",
    khasraNo: "104/2",
    title: "Staff Quarters & Residential Units",
    subTitle: "Faculty Housing",
    owner: "Campus Residential Society",
    guardian: "Campus Maintenance Board",
    type: "Residential",
    status: "Title Deed Verified",
    taxStatus: "Clear",
    // Shifted directly North-West to wrap over the cluster of red residential roofs
    coordinates: [
      [29.35582, 79.55285],
      [29.35602, 79.55345],
      [29.35555, 79.55362],
      [29.35535, 79.55302]
    ] as [number, number][]
  },
  {
    id: "PARCEL-104D",
    khasraNo: "105/G",
    title: "Central Athletic Grounds & Reserve",
    subTitle: "State Land Registry / BIAS",
    owner: "Institutional Land Reserve",
    guardian: "Department of Higher Education",
    type: "Recreational / Green",
    status: "Protected Open Land",
    taxStatus: "Clear",
    // Aligned to the open turf boundary clearing without touching roof structures
    coordinates: [
      [29.35748, 79.55205],
      [29.35712, 79.55302],
      [29.35608, 79.55272],
      [29.35642, 79.55178]
    ] as [number, number][]
  }
];"""

content = re.sub(
    r'const hardcodedParcelsBase = \[.*?\n\];',
    new_parcels,
    content,
    flags=re.DOTALL
)

# Render settings replacement
old_render = """pathOptions={{
                      color: isSelected ? '#ffffff' : '#00f2fe',
                      weight: isSelected ? 3.5 : 2.5,
                      fillColor: '#00c6ff',
                      fillOpacity: isSelected ? 0.45 : 0.25,
                      dashArray: isSelected ? undefined : '4, 4'
                    }}"""

new_render = """pathOptions={{
                      color: isSelected ? '#ffffff' : '#00f2fe',
                      weight: isSelected ? 3.5 : 2.5,
                      fillColor: isSelected ? '#38bdf8' : '#00c6ff',
                      fillOpacity: isSelected ? 0.45 : 0.28,
                      dashArray: isSelected ? undefined : '3, 4'
                    }}"""

content = content.replace(old_render, new_render)

with open('src/components/Map.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Map.tsx coordinates and styling updated successfully.')
