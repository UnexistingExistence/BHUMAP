import sys

with open('src/components/Map.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The code that I mistakenly added
bad_block = """  const [selectedParcel, setSelectedParcel] = useState<any>(null);
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

content = content.replace(bad_block, "")

# Now find the correct insertion point
# We'll look for `const geoJsonRef = useRef<L.GeoJSON | null>(null);`
# which is right at the top of Map
insert_point = content.find('const geoJsonRef = useRef<L.GeoJSON | null>(null);')
if insert_point == -1:
    print('Could not find insert point')
    sys.exit(1)

content = content[:insert_point] + bad_block + '\n  ' + content[insert_point:]

with open('src/components/Map.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed Map.tsx')
