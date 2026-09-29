import re
import os

# 1. Update ParcelInspector to accept metrics
inspector_path = 'src/components/ParcelInspector.tsx'
with open(inspector_path, 'r', encoding='utf-8') as f:
    insp = f.read()

insp = insp.replace('export interface ParcelInspectorProps {', 'export interface ParcelInspectorProps {\n  metrics?: any;')
insp = insp.replace('onZoomTo = () => {}', 'onZoomTo = () => {},\n  metrics = null')

use_memo_def = 'const metrics = useMemo(() => {'
new_use_memo = """const internalMetrics = useMemo(() => {
    if (metrics) return metrics;
    let coords = [];
"""
insp = insp.replace(use_memo_def + '\n    let coords = [];', new_use_memo)
insp = insp.replace('>{metrics.area}<', '>{internalMetrics.area || internalMetrics.area_m2 + " m²"}<')
insp = insp.replace('>{metrics.ha}<', '>{internalMetrics.ha || internalMetrics.area_ha + " Ha"}<')
insp = insp.replace('>{metrics.perimeter}<', '>{internalMetrics.perimeter || internalMetrics.perimeter_m + " m"}<')

with open(inspector_path, 'w', encoding='utf-8') as f:
    f.write(insp)


# 2. Update Map.tsx
map_path = 'src/components/Map.tsx'
with open(map_path, 'r', encoding='utf-8') as f:
    map_code = f.read()

# Add import
if 'import ParcelInspector' not in map_code:
    map_code = map_code.replace('import { calculatePerimeter, calculateArea } from "../utils/geo";',
    'import { calculatePerimeter, calculateArea } from "../utils/geo";\nimport ParcelDetailDrawer from "./ParcelInspector";')

# Inject state and handler
map_start = map_code.find('export default function Map({')
insert_pos = map_code.find('const mapRef', map_start)

handler_code = """
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [parcelMetrics, setParcelMetrics] = useState<{ area_m2: number; perimeter_m: number; area_ha: string } | null>(null);

  const calculateGeodesicMetrics = (coords: any) => {
    return {
      area_m2: calculateArea(coords),
      perimeter_m: calculatePerimeter(coords),
      area_ha: (calculateArea(coords) / 10000).toFixed(4)
    };
  };

  const handleSelectParcel = async (parcel: any) => {
    setSelectedParcel(parcel);
    try {
      const res = await fetch('http://localhost:8000/api/parcel-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: parcel.coordinates })
      });
      if (res.ok) {
        const data = await res.json();
        setParcelMetrics(data);
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn("Backend metrics failed, calculating locally:", err);
      const fallback = calculateGeodesicMetrics(parcel.coordinates);
      setParcelMetrics(fallback as any);
    }
  };
  
"""
map_code = map_code[:insert_pos] + handler_code + map_code[insert_pos:]

# Replace click handler
map_code = map_code.replace('''click: () => {
                      onSelectParcel({
                        type: "Feature",
                        id: parcel.id,
                        properties: {
                          parcelId: parcel.id,
                          ownerName: parcel.owner,
                          khasra: parcel.khasraNo,
                          area: parcel.area,
                          areaValue: parcel.areaValue,
                          areaSqM: parcel.areaValue,
                          perimeter: parcel.perimeter,
                          perimeterValue: parcel.perimeterValue,
                          perimeterM: parcel.perimeterValue,
                        },
                        geometry: { type: "Polygon", coordinates: [parcel.coordinates.map(c => [c[1], c[0]])] }
                      } as any);
                    }''', 'click: () => handleSelectParcel(parcel)')

# Inject Drawer JSX
return_pos = map_code.rfind('</MapContainer>')
drawer_jsx = """
        {selectedParcel && (
          <ParcelDetailDrawer 
            metrics={parcelMetrics} 
            onClose={() => setSelectedParcel(null)} 
            parcel={selectedParcel} 
          />
        )}
"""
map_code = map_code[:return_pos] + drawer_jsx + map_code[return_pos:]

with open(map_path, 'w', encoding='utf-8') as f:
    f.write(map_code)

print("Patching complete.")
