import re

with open('src/components/Map.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new hardcodedParcelsBase
new_parcels = """const hardcodedParcelsBase = [
  {
    id: "PARCEL-104A",
    khasraNo: "104/1A",
    title: "Birla Institute of Applied Sciences",
    subTitle: "Academic Complex & Main Blocks",
    owner: "Birla Institute of Applied Sciences",
    type: "Institutional",
    status: "Verified Cadastral Record",
    taxStatus: "Exempt / Clear",
    // Calibrated directly onto the L-shaped orange-roof campus building
    coordinates: [
      [29.35758, 79.55162],
      [29.35782, 79.55198],
      [29.35742, 79.55225],
      [29.35678, 79.55192],
      [29.35690, 79.55168],
      [29.35732, 79.55188]
    ] as [number, number][]
  },
  {
    id: "PARCEL-104B",
    khasraNo: "104/1B",
    title: "Campus Multipurpose Hall & Workshop",
    subTitle: "Facility Wing",
    owner: "Estate & Operations Wing",
    type: "Commercial / Facility",
    status: "Survey Completed",
    taxStatus: "Current",
    // Calibrated directly onto the rectangular grey/blue workshop roof
    coordinates: [
      [29.35675, 79.55082],
      [29.35665, 79.55142],
      [29.35625, 79.55135],
      [29.35635, 79.55075]
    ] as [number, number][]
  },
  {
    id: "PARCEL-104C",
    khasraNo: "104/2",
    title: "Staff Quarters & Residential Units",
    subTitle: "Faculty Housing",
    owner: "Campus Residential Society",
    type: "Residential",
    status: "Title Deed Verified",
    taxStatus: "Clear",
    // Shifted directly onto the cluster of red residential roofs
    coordinates: [
      [29.35575, 79.55295],
      [29.35598, 79.55355],
      [29.35548, 79.55372],
      [29.35525, 79.55312]
    ] as [number, number][]
  },
  {
    id: "PARCEL-104D",
    khasraNo: "105/G",
    title: "Central Athletic Grounds & Reserve",
    subTitle: "State Land Registry / BIAS",
    owner: "Institutional Land Reserve",
    type: "Recreational / Green",
    status: "Protected Open Land",
    taxStatus: "Clear",
    // Snapped clean to the open field boundary without touching roof edges
    coordinates: [
      [29.35732, 79.55235],
      [29.35698, 79.55325],
      [29.35595, 79.55295],
      [29.35628, 79.55208]
    ] as [number, number][]
  }
];"""

# Replace in content
pattern = re.compile(
    r'const hardcodedParcelsBase = \[.*?\n  \];',
    re.DOTALL
)

new_content = pattern.sub(new_parcels, content)

with open('src/components/Map.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patched parcels correctly.")
