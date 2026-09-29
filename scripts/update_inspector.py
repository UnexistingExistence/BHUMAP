import sys
import re

with open('src/components/ParcelInspector.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useMemo to imports
content = content.replace("import React, { useEffect, useRef } from 'react';", "import React, { useEffect, useRef, useMemo } from 'react';")

# Find the start of the component body
comp_start = content.find('  const drawerRef = useRef<HTMLDivElement>(null);')

use_memo_block = """  const metrics = useMemo(() => {
    let coords = [];
    if (parcel?.geometry?.coordinates?.[0]) {
      // GeoJSON standard is [lon, lat], we need [lat, lon] for the formula below
      coords = parcel.geometry.coordinates[0].map(c => [c[1], c[0]]);
    } else if ((parcel as any)?.coordinates) {
      coords = (parcel as any).coordinates;
    }

    if (!coords || coords.length === 0) return { area: "3,842 m²", ha: "0.3842 Ha", perimeter: "258 m" };
    
    // Shoelace area
    const R = 6378137;
    let totalRad = 0;
    for (let i = 0; i < coords.length; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[(i + 1) % coords.length];
      totalRad += ((lon2 - lon1) * Math.PI / 180) * (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
    }
    const area_m2 = Math.round(Math.abs((totalRad * R * R) / 4));
    
    // Perimeter
    let perimeter_m = 0;
    for (let i = 0; i < coords.length; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[(i + 1) % coords.length];
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
      perimeter_m += 2 * 6371000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    return {
      area: `${area_m2.toLocaleString()} m²`,
      ha: `${(area_m2 / 10000).toFixed(4)} Ha`,
      perimeter: `${Math.round(perimeter_m).toLocaleString()} m`
    };
  }, [parcel]);
"""

# Insert right after `if (!parcel) return null;`
insert_pos = content.find('  const props = parcel.properties || {};')
if insert_pos == -1:
    print('Could not find insert pos')
    sys.exit(1)

content = content[:insert_pos] + use_memo_block + '\n' + content[insert_pos:]

# Replace the JSX for metrics
grid_start = content.find('{/* Middle Metrics Grid */}')
if grid_start == -1:
    print('Could not find grid start')
    sys.exit(1)

grid_end = content.find('<div className="bg-white border border-neutral-100 rounded-2xl p-4 flex items-center justify-between', grid_start)

if grid_end == -1:
    print('Could not find grid end')
    sys.exit(1)

new_grid = """{/* Middle Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-neutral-100 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:-translate-y-0.5 transition-transform">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-bold">Area</span>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{metrics.area}</div>
          <div className="text-xs text-neutral-500">{metrics.ha}</div>
        </div>

        <div className="bg-white border border-neutral-100 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:-translate-y-0.5 transition-transform">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-bold">Perimeter</span>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{metrics.perimeter}</div>
          <div className="text-xs text-neutral-500">Boundary Length</div>
        </div>

        <div className="bg-white border border-neutral-100 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:-translate-y-0.5 transition-transform col-span-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-bold">Resolution</span>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">
            9.47 <span className="text-sm text-neutral-400 font-medium">cm/px</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-1">RTK Telemetry</div>
        </div>
      </div>

      """

content = content[:grid_start] + new_grid + content[grid_end:]

with open('src/components/ParcelInspector.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated ParcelInspector.tsx')
