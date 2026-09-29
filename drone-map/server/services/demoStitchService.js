import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dbService } from '../db.js';
import { computeFlightGeometry } from './exifService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sleep helper
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run realistic fast photogrammetry stitching simulation for SIH live pitch
 * @param {number} taskId - Task ID in SQLite
 * @param {number} projectId - Project ID in SQLite
 * @param {Function} broadcastFn - Function to send WebSocket message to clients
 */
export async function runDemoStitch(taskId, projectId, broadcastFn) {
  try {
    const images = dbService.getImagesByProject(projectId);
    const flightGeo = computeFlightGeometry(images);
    const imgCount = images.length || 6;

    const emit = (progress, stage, message) => {
      dbService.updateTaskProgress(taskId, progress, stage, message);
      if (broadcastFn) {
        broadcastFn({
          type: 'TASK_PROGRESS',
          taskId,
          projectId,
          progress,
          stage,
          message,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Stage 1: EXIF & Geometry (0 -> 20%)
    emit(5, 'Telemetry Validation', `Analyzing ${imgCount} drone survey images. Reading EXIF GPS tags...`);
    await delay(1200);

    if (flightGeo.hasGps) {
      emit(15, 'Flight Telemetry', `Extracted GPS coordinates for ${flightGeo.gpsCount} images. Bounding survey area: ${flightGeo.bounds[0][0].toFixed(4)}N, ${flightGeo.bounds[0][1].toFixed(4)}E`);
    } else {
      emit(15, 'Flight Telemetry', `Simulating GPS lock at center: 27.1767° N, 78.0081° E. Estimated GSD: 2.3 cm/pixel.`);
    }
    await delay(1400);

    // Stage 2: SIFT / ORB Feature Matching (20 -> 45%)
    emit(25, 'Feature Extraction', `Detecting keypoints via Scale-Invariant Feature Transform (SIFT)...`);
    await delay(1500);

    const totalKeypoints = imgCount * 1840;
    emit(35, 'Feature Matching', `Found ${totalKeypoints} feature points. Running nearest-neighbor stereo matching with RANSAC outlier filtering...`);
    await delay(1800);

    // Stage 3: Structure-from-Motion (SfM) Bundle Adjustment (45 -> 65%)
    emit(45, 'SfM Calibration', `Optimizing camera intrinsic parameters (focal length, radial distortion k1, k2)...`);
    await delay(1500);

    emit(55, 'Bundle Adjustment', `Bundle adjustment converged. 100% of camera positions recovered. Mean reprojection error: 0.38 px.`);
    await delay(1800);

    // Stage 4: Multi-View Stereo Dense Reconstruction (65 -> 85%)
    emit(70, 'Dense Point Cloud', `Computing stereo depth maps across overlapping baselines...`);
    await delay(1600);

    emit(80, 'MVS Reconstruction', `Generated 1,420,800 dense 3D points. Point cloud filtered and classified.`);
    await delay(1600);

    // Stage 5: DSM & Orthomosaic Georeferencing (85 -> 100%)
    emit(90, 'Orthomosaic Blending', `Generating Digital Surface Model (DSM). Blending radiometric color seams across flight strips...`);
    await delay(1800);

    // Final result
    const tilesDir = path.join(__dirname, '..', 'public', 'tiles');
    const metaPath = path.join(__dirname, '..', 'public', 'metadata.json');
    let finalOrthoUrl = '/api/demo/orthophoto.png';
    let finalBounds = flightGeo.bounds;
    let finalCenter = flightGeo.center;

    if (fs.existsSync(tilesDir)) {
      finalOrthoUrl = '/tiles/{z}/{x}/{y}.png';
    }
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.bounds) finalBounds = meta.bounds;
        if (meta.center) finalCenter = [meta.center.lat, meta.center.lng];
      } catch (err) {
        console.warn('Could not parse metadata.json in demo stitch:', err);
      }
    }

    dbService.completeTask(taskId, finalOrthoUrl, finalBounds);

    if (broadcastFn) {
      broadcastFn({
        type: 'TASK_COMPLETED',
        taskId,
        projectId,
        progress: 100,
        stage: 'Completed',
        message: 'Orthomosaic processing completed successfully. Georeferenced map published!',
        orthophotoUrl: finalOrthoUrl,
        bounds: finalBounds,
        center: finalCenter,
        flightPath: flightGeo.flightPath,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error(`[DemoStitch] Error in task ${taskId}:`, error);
    dbService.failTask(taskId, error.message);
    if (broadcastFn) {
      broadcastFn({
        type: 'TASK_FAILED',
        taskId,
        projectId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}
