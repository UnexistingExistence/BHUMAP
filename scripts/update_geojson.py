import json

parcels = [
  {
    "id": "PARCEL-104A",
    "khasraNo": "104/1A",
    "title": "Birla Institute of Applied Sciences",
    "subTitle": "Academic Complex & Main Blocks",
    "owner": "Birla Institute of Applied Sciences",
    "type": "Institutional",
    "status": "Verified Cadastral Record",
    "taxStatus": "Exempt / Clear",
    "coordinates": [
      [29.35758, 79.55162],
      [29.35782, 79.55198],
      [29.35742, 79.55225],
      [29.35678, 79.55192],
      [29.35690, 79.55168],
      [29.35732, 79.55188]
    ]
  },
  {
    "id": "PARCEL-104B",
    "khasraNo": "104/1B",
    "title": "Campus Multipurpose Hall & Workshop",
    "subTitle": "Facility Wing",
    "owner": "Estate & Operations Wing",
    "type": "Commercial / Facility",
    "status": "Survey Completed",
    "taxStatus": "Current",
    "coordinates": [
      [29.35675, 79.55082],
      [29.35665, 79.55142],
      [29.35625, 79.55135],
      [29.35635, 79.55075]
    ]
  },
  {
    "id": "PARCEL-104C",
    "khasraNo": "104/2",
    "title": "Staff Quarters & Residential Units",
    "subTitle": "Faculty Housing",
    "owner": "Campus Residential Society",
    "type": "Residential",
    "status": "Title Deed Verified",
    "taxStatus": "Clear",
    "coordinates": [
      [29.35575, 79.55295],
      [29.35598, 79.55355],
      [29.35548, 79.55372],
      [29.35525, 79.55312]
    ]
  },
  {
    "id": "PARCEL-104D",
    "khasraNo": "105/G",
    "title": "Central Athletic Grounds & Reserve",
    "subTitle": "State Land Registry / BIAS",
    "owner": "Institutional Land Reserve",
    "type": "Recreational / Green",
    "status": "Protected Open Land",
    "taxStatus": "Clear",
    "coordinates": [
      [29.35732, 79.55235],
      [29.35698, 79.55325],
      [29.35595, 79.55295],
      [29.35628, 79.55208]
    ]
  }
]

features = []
for p in parcels:
    # GeoJSON requires [lon, lat] and coordinates must be closed (first == last)
    coords = [[c[1], c[0]] for c in p["coordinates"]]
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    
    features.append({
        "type": "Feature",
        "id": p["id"],
        "geometry": {
            "type": "Polygon",
            "coordinates": [coords]
        },
        "properties": {
            "parcelId": p["id"],
            "khasraNo": p["khasraNo"],
            "title": p["title"],
            "subTitle": p["subTitle"],
            "ownerName": p["owner"],
            "landUse": p["type"],
            "status": p["status"],
            "taxStatus": p["taxStatus"],
            "owner": p["owner"],
            # Fallback properties from original
            "encroachment": False,
        }
    })

geojson = {
    "type": "FeatureCollection",
    "features": features
}

import os
with open('public/cadastral_parcels.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)

with open('cadastral_parcels.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)

print("Updated geojson files.")
