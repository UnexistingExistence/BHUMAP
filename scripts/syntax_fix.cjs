const fs = require('fs');
let pi = fs.readFileSync('src/components/ParcelInspector.tsx', 'utf8');

// Remove the wrongly placed block
pi = pi.replace(/\s*const auditStatus =[\s\S]*?const variance = [\s\S]*?;/g, '');
// just to be thorough if it was inserted multiple times:
pi = pi.replace(/\s*const computedArea = [\s\S]*?;/g, '');
pi = pi.replace(/\s*const legalArea = [\s\S]*?;/g, '');

const newTopBlock = `
  const auditStatus = (parcel as any)?.auditStatus || ((parcel as any)?.properties?.auditStatus) || "MATCH";
  const computedArea = metrics?.area_m2 || 0;
  const legalArea = (parcel as any)?.legalAreaM2 || ((parcel as any)?.properties?.legalAreaM2) || 0;
  const variance = Math.abs(computedArea - legalArea);
`;

pi = pi.replace(/(}: ParcelInspectorProps\) \{)/, `$1\n${newTopBlock}`);
fs.writeFileSync('src/components/ParcelInspector.tsx', pi);

// Fix Map.tsx duplicate baseColor
let mapC = fs.readFileSync('src/components/Map.tsx', 'utf8');
const baseColorMatch = mapC.match(/const baseColor = \(parcel as any\)\.auditStatus === 'DISCREPANCY' \? '#f59e0b' : '#10b981';/g);
if (baseColorMatch && baseColorMatch.length > 1) {
    let bfirst = true;
    mapC = mapC.replace(/const baseColor = \(parcel as any\)\.auditStatus === 'DISCREPANCY' \? '#f59e0b' : '#10b981';/g, (match) => {
        if (bfirst) {
            bfirst = false;
            return match;
        }
        return '';
    });
}
fs.writeFileSync('src/components/Map.tsx', mapC);
console.log('Fixed syntax issues.');
