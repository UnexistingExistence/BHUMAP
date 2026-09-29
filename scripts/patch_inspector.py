import sys
import json

with open('src/components/ParcelInspector.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

grid_start = content.find('{/* Middle Metrics Grid */}')
grid_end = content.find('<div className="bg-white border border-neutral-100 rounded-2xl p-4 flex items-center justify-between', grid_start)

new_grid = """{/* Middle Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-neutral-100 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:-translate-y-0.5 transition-transform">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-bold">Area</span>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">
            {props.area || (props.areaValue ? `${props.areaValue} m²` : '— m²')}
          </div>
          <div className="text-xs text-neutral-400 mt-1 font-medium">{areaHa ? `${areaHa} Ha` : '—'}</div>
        </div>

        <div className="bg-white border border-neutral-100 rounded-2xl p-4 flex flex-col justify-center shadow-sm hover:-translate-y-0.5 transition-transform">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1 font-bold">Perimeter</span>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">
            {props.perimeter || (props.perimeterValue ? `${props.perimeterValue} m` : '— m')}
          </div>
          <div className="text-xs text-neutral-400 mt-1 font-medium">Boundary Length</div>
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

new_content = content[:grid_start] + new_grid + content[grid_end:]
with open('src/components/ParcelInspector.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
