import os
import sys
from PIL import Image
import piexif

def deg_to_dms_rational(deg_float):
    deg_float = abs(deg_float)
    degrees = int(deg_float)
    minutes = int((deg_float - degrees) * 60)
    seconds = round(((deg_float - degrees) * 60 - minutes) * 60 * 1000)
    return ((degrees, 1), (minutes, 1), (seconds, 1000))

def build_exif(lat, lon, altitude_m=85.0):
    lat_ref = "N" if lat >= 0 else "S"
    lon_ref = "E" if lon >= 0 else "W"
    gps_ifd = {
        piexif.GPSIFD.GPSVersionID: (2, 2, 0, 0),
        piexif.GPSIFD.GPSLatitudeRef: lat_ref,
        piexif.GPSIFD.GPSLatitude: deg_to_dms_rational(lat),
        piexif.GPSIFD.GPSLongitudeRef: lon_ref,
        piexif.GPSIFD.GPSLongitude: deg_to_dms_rational(lon),
        piexif.GPSIFD.GPSAltitudeRef: 0,
        piexif.GPSIFD.GPSAltitude: (int(altitude_m * 100), 100),
    }
    zeroth_ifd = {
        piexif.ImageIFD.Make: "DJI",
        piexif.ImageIFD.Model: "FC330",
        piexif.ImageIFD.Software: "BhuMap Drone Simulator",
    }
    return piexif.dump({"0th": zeroth_ifd, "GPS": gps_ifd})

def generate_flight_dataset(
    source_img_path="public/sample_area.png",
    output_dir="./synthetic_drone_survey",
    center_lat=29.3595,
    center_lon=79.5505,
    crop_w=1280,
    crop_h=960,
    front_overlap=0.75,
    side_overlap=0.65
):
    os.makedirs(output_dir, exist_ok=True)
    if not os.path.exists(source_img_path):
        if os.path.exists(os.path.join("drone-map", source_img_path)):
            source_img_path = os.path.join("drone-map", source_img_path)
        else:
            print(f"Error: {source_img_path} not found.")
            return

    base_img = Image.open(source_img_path).convert("RGB")
    total_w, total_h = base_img.size

    if total_w < crop_w or total_h < crop_h:
        scale = max(crop_w / total_w, crop_h / total_h) * 2.0
        new_w = int(total_w * scale)
        new_h = int(total_h * scale)
        base_img = base_img.resize((new_w, new_h), Image.LANCZOS)
        total_w, total_h = base_img.size
        print(f"Source upscaled to {total_w}x{total_h} to accommodate {crop_w}x{crop_h} crop windows.")

    step_x = (total_w - crop_w) // 3
    step_y = (total_h - crop_h) // 9
    lat_span = 0.00180
    lon_span = 0.00200
    photo_idx = 1
    x_positions = list(range(0, total_w - crop_w, step_x))

    for col_idx, x in enumerate(x_positions):
        y_range = range(0, total_h - crop_h, step_y)
        if col_idx % 2 == 1:
            y_range = reversed(list(y_range))

        for y in y_range:
            box = (x, y, x + crop_w, y + crop_h)
            cropped_frame = base_img.crop(box)
            current_lat = center_lat + ((total_h / 2 - y) / total_h) * lat_span
            current_lon = center_lon + ((x - total_w / 2) / total_w) * lon_span
            exif_bytes = build_exif(current_lat, current_lon)
            filename = f"DJI_{photo_idx:04d}.JPG"
            cropped_frame.save(
                os.path.join(output_dir, filename),
                "JPEG",
                quality=95,
                exif=exif_bytes
            )
            photo_idx += 1

    print(f"Generated {photo_idx - 1} images in '{output_dir}'. Ready for WebODM upload.")

if __name__ == "__main__":
    target_img = sys.argv[1] if len(sys.argv) > 1 else "public/sample_area.png"
    target_out = sys.argv[2] if len(sys.argv) > 2 else "./synthetic_drone_survey"
    generate_flight_dataset(target_img, output_dir=target_out)
