const fs = require('fs');
let code = fs.readFileSync('src/components/Map.tsx', 'utf8');

// 1. Alias import
code = code.replace(/import \{ PARCELS_DATA, Parcel \} from \"\.\.\/data\/parcels\";/, 'import { PARCELS_DATA as campusParcels, Parcel } from "../data/parcels";');

// 2. Add console.log to Map component
code = code.replace(/const \[selectedParcel, setSelectedParcel\] = useState\<any\>\(null\);/, 
  'console.log("Rendering parcels:", campusParcels);\n  const [selectedParcel, setSelectedParcel] = useState<any>(null);');

// 3. Update effective bounds code to use campusParcels instead of PARCELS_DATA
code = code.replace(/PARCELS_DATA/g, 'campusParcels');

// 4. Update pane creation in MapBoundsController or an effect. Let's add it right after useEffect for propSelectedParcel.
const paneEffect = `
  const map = useMapEvents({});
  useEffect(() => {
    if (!map.getPane('parcelsPane')) {
      map.createPane('parcelsPane');
      map.getPane('parcelsPane').style.zIndex = "650";
    }
  }, [map]);
`;
// Let's just insert it cleanly
code = code.replace(/const geoJsonRef = useRef\<L\.GeoJSON \| null\>\(null\);/, paneEffect + '\n  const geoJsonRef = useRef<L.GeoJSON | null>(null);');

// 5. Modify the rendering structure: remove `<Pane name="vector-parcels">` and add `pane="parcelsPane"` to Polygon
// First, replace the start of the Pane block
code = code.replace(/<Pane\s+name=\"vector-parcels\"\s+style=\{\{ zIndex: 600 \}\}\s+key=\"parcels-recalibrated\"\s*>/, '<>');
// Then replace the closing Pane
code = code.replace(/<\/Pane>/, '</>');

// Then add `pane="parcelsPane"` to the Polygon
code = code.replace(/<Polygon\s+key=\{parcel\.id\}\s+positions=\{parcel\.coordinates as \[number\, number\]\[\]\}/g, 
  '<Polygon\n                  key={parcel.id}\n                  positions={parcel.coordinates as [number, number][]}\n                  pane="parcelsPane"');

// Fix styling logic to match exactly what the user asked
const oldStyling = /\/\* Base styling \*\/[\s\S]*?\} else if \(isGround\) \{[\s\S]*?\}/;
// Actually I mapped it using isGround and isHovered. Let's just replace the whole mapping block to match exactly what they want (with some hover flair if we can keep it).
const oldMappingBlockRegex = /\{campusParcels\.map\(\(parcel\) => \{[\s\S]*?\}\)\}\s*<\/\>/;

const newMappingBlock = `{showParcels && campusParcels.map((parcel) => (
       <Polygon
         key={parcel.id}
         positions={parcel.coordinates}
         pane="parcelsPane"
         pathOptions={{
           color: parcel.status === 'Verified' ? '#10b981' : '#f59e0b',
           fillColor: parcel.type === 'ground' ? '#10b981' : '#3b82f6',
           fillOpacity: 0.5,
           weight: 2,
         }}
       >
         <Popup>
           <div className="text-black p-1">
             <p className="font-bold">{parcel.name}</p>
             <p className="text-xs">{parcel.id} • {parcel.status}</p>
           </div>
         </Popup>
       </Polygon>
     ))}</>`;

code = code.replace(/\{campusParcels\.map\(\(parcel\) => \{[\s\S]*?\}\)\}\s*<\/\>/, newMappingBlock);

fs.writeFileSync('src/components/Map.tsx', code);
console.log('Fixed Map.tsx for visibility and logging');
