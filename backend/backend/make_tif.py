# pyrefly: ignore [missing-import]
import rasterio 
# pyrefly: ignore [missing-import]
from rasterio.transform import from_bounds 
# pyrefly: ignore [missing-import]
from PIL import Image 
# pyrefly: ignore [missing-import]
import numpy as np

# Load your existing image
img_path = "1524.png"  # Make sure 261.jpg is in the same folder, or update the path
img = Image.open(img_path).convert("RGB")
width, height = img.size

# Give it dummy geographic coordinates (e.g., somewhere in Delhi/NCR)
west, south, east, north = 77.2000, 28.6000, 77.2010, 28.6010
transform = from_bounds(west, south, east, north, width, height)

# Format array for rasterio (Bands, Height, Width)
img_array = np.array(img)
img_array = np.moveaxis(img_array, -1, 0)

# Write out the georeferenced GeoTIFF
output_tif = "test_drone(1524).tif"
with rasterio.open(
    output_tif,
    "w",
    driver="GTiff",
    height=height,
    width=width,
    count=3,
    dtype="uint8",
    crs="EPSG:4326",
    transform=transform,
) as dst:
    dst.write(img_array)

print(f"Generated test GeoTIFF: {output_tif}")