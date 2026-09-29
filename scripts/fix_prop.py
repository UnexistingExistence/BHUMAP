import re
with open('src/components/Map.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Rename the prop selectedParcel to propSelectedParcel
content = content.replace('selectedParcel = null,', 'selectedParcel: propSelectedParcel = null,', 1)

# 2. Add syncing to the parent when selected inside handleSelectParcel
old_handler = """  const handleSelectParcel = async (parcel: any) => {
    setSelectedParcel(parcel);"""
new_handler = """  const handleSelectParcel = async (parcel: any) => {
    setSelectedParcel(parcel);
    if (onSelectParcel) onSelectParcel(parcel); // Sync with Sidebar"""
content = content.replace(old_handler, new_handler)

# 3. Add syncing to parent when closed
old_close = 'onClose={() => setSelectedParcel(null)}'
new_close = 'onClose={() => { setSelectedParcel(null); if (onSelectParcel) onSelectParcel(null); }}'
content = content.replace(old_close, new_close)

# 4. In case the prop changes (e.g. from Sidebar), we should sync local state
# But the user's requirement was strict on using local state. Let's just fix the redeclaration error for now.
# Wait, if Sidebar is clicked, it calls setSelectedParcel on the Workspace level. Workspace passes selectedParcel prop.
# If Map ignores the prop, Sidebar click won't open the Drawer inside Map.
# We should probably use `useEffect` to sync the prop to the local state!
sync_effect = """  useEffect(() => {
    if (propSelectedParcel) {
      setSelectedParcel(propSelectedParcel);
    } else {
      setSelectedParcel(null);
    }
  }, [propSelectedParcel]);
  
  const [selectedParcel, setSelectedParcel] = useState<any>(null);"""
content = content.replace('const [selectedParcel, setSelectedParcel] = useState<any>(null);', sync_effect)

with open('src/components/Map.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed redeclaration and added prop syncing')
