import path from 'node:path';
import fs from 'node:fs';

let sharp = null;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch (e) {
  console.warn('[Thumbnail] Sharp not available, will use original file reference:', e.message);
}

/**
 * Generate a 300x300 thumbnail for an uploaded image
 * @param {string} sourcePath - Original image path
 * @param {string} outputDir - Directory to store thumbnail
 * @returns {Promise<string>} - Relative or absolute path of thumbnail
 */
export async function createThumbnail(sourcePath, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = path.basename(sourcePath);
  const thumbFilename = `thumb_${filename}`;
  const thumbPath = path.join(outputDir, thumbFilename);

  if (sharp) {
    try {
      await sharp(sourcePath)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
      return thumbPath;
    } catch (err) {
      console.warn(`[Thumbnail] Failed to resize with sharp for ${filename}, falling back:`, err.message);
    }
  }

  // Fallback: Copy original as thumbnail or return source path
  try {
    fs.copyFileSync(sourcePath, thumbPath);
    return thumbPath;
  } catch (e) {
    return sourcePath;
  }
}
