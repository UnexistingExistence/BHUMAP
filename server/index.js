import express from 'express';
import http from 'node:http';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

import { dbService } from './db.js';
import { extractExif, computeFlightGeometry } from './services/exifService.js';
import { createThumbnail } from './services/thumbnailService.js';
import { webodmService } from './services/webodmService.js';
import { runDemoStitch } from './services/demoStitchService.js';
import authRouter from './auth.js';
import { prisma } from './prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const THUMBNAILS_DIR = path.join(__dirname, 'thumbnails');
const SAMPLES_DIR = path.join(__dirname, 'sample_data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const TILES_DIR = path.join(PUBLIC_DIR, 'tiles');

// Ensure directories exist
for (const dir of [UPLOADS_DIR, THUMBNAILS_DIR, SAMPLES_DIR, PUBLIC_DIR, TILES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const app = express();
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(data) {
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  console.log('[WS] Client connected. Total clients:', wss.clients.size);
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to SIH Drone Pipeline WebSocket Server' }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected. Active clients:', wss.clients.size);
  });
});

app.use(cors());
app.use(express.json());
app.use('/api', authRouter);
app.use('/api/auth', authRouter);

// Static File Serving (Drone slippy tiles, vector GeoJSONs, metadata with fresh cache control)
app.use('/tiles', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, must-revalidate, max-age=0');
  next();
}, express.static(TILES_DIR));

app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json') || filePath.endsWith('.geojson')) {
      res.set('Cache-Control', 'no-cache, must-revalidate, max-age=0');
    }
  }
}));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `drone_${uniqueSuffix}${ext}`);
  }
});

// File filter: Accept JPEG/PNG only (skip GeoTIFF as per prompt requirements)
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || ['.jpg', '.jpeg', '.png'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG and PNG images are accepted for this prototype.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10 // Max 10 files per request
  }
});

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 0. Root & Health Check (for browser testing)
app.get(['/', '/api', '/api/'], (req, res) => {
  res.json({
    status: 'online',
    module: 'SIH Drone Image Processing and Stitching Pipeline',
    version: '1.0.0 (MVP 60% Prototype)',
    endpoints: {
      projects: '/api/projects',
      images: '/api/images',
      upload: 'POST /api/upload',
      process: 'POST /api/process',
      tasks: '/api/tasks/latest',
      sampleFlight: 'POST /api/demo/load-samples',
      webodmStatus: '/api/webodm/status',
      websocket: 'ws://localhost:5000/ws'
    }
  });
});

// 1. Projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = dbService.getAllProjects();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1b. AI Cadastral Parcels (Person 3 Teammate API)
app.get('/api/parcels', (req, res) => {
  try {
    const generatedPath = path.join(PUBLIC_DIR, 'cadastral_parcels.geojson');
    const parcelsPath = path.join(SAMPLES_DIR, 'parcels.json');
    const targetPath = fs.existsSync(generatedPath) ? generatedPath : parcelsPath;
    if (fs.existsSync(targetPath)) {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'Parcels data not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/parcels/:id', (req, res) => {
  try {
    const generatedPath = path.join(PUBLIC_DIR, 'cadastral_parcels.geojson');
    const parcelsPath = path.join(SAMPLES_DIR, 'parcels.json');
    const targetPath = fs.existsSync(generatedPath) ? generatedPath : parcelsPath;
    if (fs.existsSync(targetPath)) {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const parcel = data.features.find((f) => f.id === req.params.id || f.properties?.id === req.params.id || f.properties?.parcelId === req.params.id);
      if (parcel) {
        res.json(parcel);
      } else {
        res.status(404).json({ error: 'Parcel not found' });
      }
    } else {
      res.status(404).json({ error: 'Parcels data not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1c. Cadastral Parcels GeoJSON explicit download / fetch
app.get(['/api/cadastral_parcels.geojson', '/cadastral_parcels.geojson'], (req, res) => {
  res.set('Cache-Control', 'no-cache, must-revalidate, max-age=0');
  const geoPath = path.join(PUBLIC_DIR, 'cadastral_parcels.geojson');
  if (fs.existsSync(geoPath)) {
    return res.sendFile(path.resolve(geoPath));
  }
  const fallbackPath = path.join(SAMPLES_DIR, 'parcels.json');
  if (fs.existsSync(fallbackPath)) {
    return res.sendFile(path.resolve(fallbackPath));
  }
  res.status(404).json({ error: 'Cadastral parcels GeoJSON not found' });
});

// 1d. Orthomosaic & Tiles Metadata
app.get(['/api/metadata', '/metadata.json', '/tiles/metadata.json'], (req, res) => {
  res.set('Cache-Control', 'no-cache, must-revalidate, max-age=0');
  const tileMetaPath = path.join(PUBLIC_DIR, 'tiles', 'metadata.json');
  const metaPath = path.join(PUBLIC_DIR, 'metadata.json');
  const targetMeta = fs.existsSync(tileMetaPath) ? tileMetaPath : metaPath;
  if (fs.existsSync(targetMeta)) {
    return res.sendFile(path.resolve(targetMeta));
  }
  res.json({
    dataset: "AeroStitch Local Drone Orthomosaic",
    center: { lat: 41.2263541, lng: -81.7045815 },
    bounds: [[41.225738, -81.7053382], [41.2269703, -81.7038248]],
    zoom: { min: 17, max: 20, default: 18 },
    tileUrl: "/tiles/{z}/{x}/{y}.png",
    tileUrlAbsolute: "http://localhost:5000/tiles/{z}/{x}/{y}.png"
  });
});

app.post('/api/projects', (req, res) => {
  try {
    const { name, description } = req.body;
    const project = dbService.createProject(name || 'Drone Flight Mission', description);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Upload Images (Limit to 10 images per project as required by prompt)
app.post('/api/upload', upload.array('images', 10), async (req, res) => {
  try {
    const defaultProj = dbService.getDefaultProject();
    const projectId = req.body.projectId ? parseInt(req.body.projectId) : defaultProj.id;

    const currentCount = dbService.getImageCount(projectId);
    const newFiles = req.files || [];

    if (newFiles.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    if (currentCount + newFiles.length > 10) {
      // Remove uploaded files to enforce limit
      for (const file of newFiles) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        error: `Project limit reached. Current: ${currentCount}, tried to add: ${newFiles.length}. Maximum limit is 10 images for this demo.`
      });
    }

    const insertedImages = [];

    for (const file of newFiles) {
      // Extract GPS telemetry from EXIF
      const exif = await extractExif(file.path);

      let lat = exif.latitude;
      let lon = exif.longitude;
      let alt = exif.altitude;

      // If no GPS is present and autoGeotag was requested
      const shouldAutoGeotag = req.body.autoGeotag === 'true' || req.query.autoGeotag === 'true';
      if ((lat === null || lon === null) && shouldAutoGeotag) {
        const step = currentCount + insertedImages.length;
        const row = Math.floor(step / 3);
        const col = step % 3;
        lat = Number((27.1755 + row * 0.0006 + (Math.random() * 0.0001 - 0.00005)).toFixed(7));
        lon = Number((78.0068 + col * 0.0007 + (Math.random() * 0.0001 - 0.00005)).toFixed(7));
        alt = 43.0;
      }

      // Create thumbnail
      const thumbPath = await createThumbnail(file.path, THUMBNAILS_DIR);

      // Store in SQLite
      const record = dbService.insertImage({
        projectId,
        originalName: file.originalname,
        filename: file.filename,
        filePath: file.path,
        thumbnailPath: thumbPath,
        size: file.size,
        mimeType: file.mimetype,
        latitude: lat,
        longitude: lon,
        altitude: alt,
        capturedAt: exif.capturedAt
      });

      insertedImages.push(record);
    }

    const allImages = dbService.getImagesByProject(projectId);
    const geometry = computeFlightGeometry(allImages);

    broadcast({
      type: 'IMAGES_UPLOADED',
      projectId,
      count: insertedImages.length,
      totalCount: allImages.length,
      geometry
    });

    res.json({
      message: `Successfully uploaded ${insertedImages.length} images.`,
      uploaded: insertedImages,
      totalImages: allImages.length,
      geometry
    });
  } catch (err) {
    console.error('[Upload] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. List Images
app.get('/api/images', (req, res) => {
  try {
    const defaultProj = dbService.getDefaultProject();
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : defaultProj.id;
    const images = dbService.getImagesByProject(projectId);
    const geometry = computeFlightGeometry(images);

    res.json({
      projectId,
      images,
      count: images.length,
      geometry
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get single image
app.get('/api/images/:id', (req, res) => {
  try {
    const img = dbService.getImageById(req.params.id);
    if (!img) return res.status(404).json({ error: 'Image not found' });
    res.json(img);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Serve Image File
app.get('/api/images/:id/file', (req, res) => {
  try {
    const img = dbService.getImageById(req.params.id);
    if (!img || !fs.existsSync(img.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    res.sendFile(path.resolve(img.file_path));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Serve Thumbnail
app.get('/api/images/:id/thumbnail', (req, res) => {
  try {
    const img = dbService.getImageById(req.params.id);
    if (!img) return res.status(404).json({ error: 'Image not found' });

    const thumb = img.thumbnail_path && fs.existsSync(img.thumbnail_path) ? img.thumbnail_path : img.file_path;
    if (!fs.existsSync(thumb)) return res.status(404).json({ error: 'Thumbnail not found' });

    res.sendFile(path.resolve(thumb));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6b. Auto-Geotag any non-GPS images in the project
app.post('/api/images/auto-geotag', (req, res) => {
  try {
    const defaultProj = dbService.getDefaultProject();
    const projectId = req.body.projectId ? parseInt(req.body.projectId) : defaultProj.id;
    const allImages = dbService.getImagesByProject(projectId);

    // Find valid images with GPS
    const valid = allImages.filter((img) => img.latitude !== null && img.longitude !== null);

    let baseLat = 27.1755;
    let baseLon = 78.0068;
    let baseAlt = 42.5;

    if (valid.length > 0) {
      const last = valid[valid.length - 1];
      baseLat = last.latitude;
      baseLon = last.longitude;
      baseAlt = last.altitude || 42.5;
    }

    let updatedCount = 0;
    allImages.forEach((img) => {
      if (img.latitude === null || img.longitude === null) {
        const step = updatedCount + 1;
        const row = Math.floor(step / 3);
        const col = step % 3;
        const lat = Number((baseLat + row * 0.0006 + (Math.random() * 0.0001 - 0.00005)).toFixed(7));
        const lon = Number((baseLon + col * 0.0007 + (Math.random() * 0.0001 - 0.00005)).toFixed(7));
        const alt = Number((baseAlt + (Math.random() * 1.5 - 0.7)).toFixed(1));

        dbService.updateImageGps(img.id, lat, lon, alt);
        updatedCount++;
      }
    });

    const refreshedImages = dbService.getImagesByProject(projectId);
    const geometry = computeFlightGeometry(refreshedImages);

    broadcast({
      type: 'IMAGES_UPLOADED',
      projectId,
      totalCount: refreshedImages.length,
      geometry
    });

    res.json({
      message: `Successfully auto-geotagged ${updatedCount} image(s) with flight coordinates.`,
      updatedCount,
      images: refreshedImages,
      geometry
    });
  } catch (err) {
    console.error('[AutoGeotag] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6c. Custom geotag single image
app.post('/api/images/:id/geotag', (req, res) => {
  try {
    const { latitude, longitude, altitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and Longitude are required' });
    }
    const updated = dbService.updateImageGps(
      req.params.id,
      parseFloat(latitude),
      parseFloat(longitude),
      altitude ? parseFloat(altitude) : 43.0
    );

    const allImages = dbService.getImagesByProject(updated.project_id);
    const geometry = computeFlightGeometry(allImages);

    broadcast({
      type: 'IMAGES_UPLOADED',
      projectId: updated.project_id,
      totalCount: allImages.length,
      geometry
    });

    res.json({ message: 'GPS coordinates updated', image: updated, geometry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Clear Images
app.delete('/api/images/clear', (req, res) => {
  try {
    const defaultProj = dbService.getDefaultProject();
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : defaultProj.id;
    dbService.clearImagesForProject(projectId);
    broadcast({ type: 'IMAGES_CLEARED', projectId });
    res.json({ message: 'Project images cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Start Stitching Pipeline (WebODM or Demo Mode)
app.post('/api/process', async (req, res) => {
  try {
    const defaultProj = dbService.getDefaultProject();
    const projectId = req.body.projectId ? parseInt(req.body.projectId) : defaultProj.id;
    const mode = req.body.mode || 'demo'; // 'demo' or 'webodm'

    const images = dbService.getImagesByProject(projectId);
    if (images.length === 0) {
      return res.status(400).json({ error: 'Cannot process: No images uploaded for this project yet.' });
    }

    const task = dbService.createTask(projectId, mode);

    broadcast({
      type: 'TASK_STARTED',
      taskId: task.id,
      projectId,
      mode,
      message: `Starting ${mode === 'webodm' ? 'WebODM' : 'Fast Demo'} stitching pipeline with ${images.length} images.`
    });

    if (mode === 'demo') {
      // Run asynchronous demo photogrammetry simulation
      runDemoStitch(task.id, projectId, broadcast);
    } else {
      // Run WebODM Integration
      (async () => {
        try {
          dbService.updateTaskProgress(task.id, 10, 'WebODM Connecting', 'Connecting to WebODM API at ' + webodmService.baseUrl);
          broadcast({ type: 'TASK_PROGRESS', taskId: task.id, progress: 10, stage: 'WebODM Connecting' });

          const webodmProj = await webodmService.createProject(`SIH Survey #${projectId}`);
          const imagePaths = images.map(img => img.file_path);

          dbService.updateTaskProgress(task.id, 25, 'Uploading to WebODM', `Uploading ${imagePaths.length} images to WebODM worker...`);
          broadcast({ type: 'TASK_PROGRESS', taskId: task.id, progress: 25, stage: 'Uploading to WebODM' });

          const webodmTask = await webodmService.createTask(webodmProj.id, imagePaths);

          // Update task with WebODM ID
          const db = dbService.getDb();
          db.prepare('UPDATE tasks SET webodm_task_id = ? WHERE id = ?').run(String(webodmTask.id), task.id);

          // Polling WebODM status
          let isComplete = false;
          while (!isComplete) {
            await new Promise(r => setTimeout(r, 4000));
            const statusInfo = await webodmService.getTask(webodmProj.id, webodmTask.id);
            const progress = Math.min(Math.max(statusInfo.progress || 30, 25), 98);

            let stageDesc = 'Processing in WebODM';
            if (statusInfo.status && statusInfo.status.code === 40) {
              isComplete = true;
              break;
            } else if (statusInfo.status && statusInfo.status.code === 30) {
              throw new Error('WebODM processing failed: ' + JSON.stringify(statusInfo.status));
            }

            dbService.updateTaskProgress(task.id, progress, stageDesc, `WebODM progress: ${progress}%`);
            broadcast({ type: 'TASK_PROGRESS', taskId: task.id, progress, stage: stageDesc });
          }

          // Complete WebODM Task
          const bounds = await webodmService.getOrthophotoBounds(webodmProj.id, webodmTask.id);
          const tileUrl = webodmService.getTileUrl(webodmProj.id, webodmTask.id);
          const flightGeo = computeFlightGeometry(images);
          const finalBounds = bounds || flightGeo.bounds;

          dbService.completeTask(task.id, tileUrl, finalBounds);
          broadcast({
            type: 'TASK_COMPLETED',
            taskId: task.id,
            projectId,
            progress: 100,
            orthophotoUrl: tileUrl,
            bounds: finalBounds
          });
        } catch (webodmErr) {
          console.warn('[WebODM] Fallback triggered due to error:', webodmErr.message);
          dbService.updateTaskProgress(task.id, 50, 'Fallback to Demo Mode', `WebODM connection error (${webodmErr.message}). Switching to local fast demo pipeline...`);
          // Fall back gracefully to demo stitch so pitch never fails!
          await runDemoStitch(task.id, projectId, broadcast);
        }
      })();
    }

    res.json({
      message: 'Stitching task started.',
      taskId: task.id,
      mode
    });
  } catch (err) {
    console.error('[Process] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Get Latest Task
app.get('/api/tasks/latest', (req, res) => {
  try {
    const defaultProj = dbService.getDefaultProject();
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : defaultProj.id;
    const task = dbService.getLatestTask(projectId);

    if (!task) return res.json(null);

    res.json({
      ...task,
      logs: task.logs_json ? JSON.parse(task.logs_json) : [],
      bounds: task.bounds_json ? JSON.parse(task.bounds_json) : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Get Task Status by ID
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = dbService.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    res.json({
      ...task,
      logs: task.logs_json ? JSON.parse(task.logs_json) : [],
      bounds: task.bounds_json ? JSON.parse(task.bounds_json) : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. One-Click Load Sample Drone Flight (8 real images with EXIF GPS)
app.post('/api/demo/load-samples', async (req, res) => {
  try {
    const defaultProj = dbService.getDefaultProject();
    const projectId = req.body.projectId ? parseInt(req.body.projectId) : defaultProj.id;

    // Clear existing
    dbService.clearImagesForProject(projectId);

    const sampleFiles = [
      'DJI_0101.JPG', 'DJI_0102.JPG', 'DJI_0103.JPG', 'DJI_0104.JPG',
      'DJI_0105.JPG', 'DJI_0106.JPG', 'DJI_0107.JPG', 'DJI_0108.JPG'
    ];

    const inserted = [];
    for (const file of sampleFiles) {
      const src = path.join(SAMPLES_DIR, file);
      if (!fs.existsSync(src)) continue;

      const destFilename = `sample_${Date.now()}_${file}`;
      const destPath = path.join(UPLOADS_DIR, destFilename);
      fs.copyFileSync(src, destPath);

      const exif = await extractExif(destPath);
      const thumbPath = await createThumbnail(destPath, THUMBNAILS_DIR);

      const record = dbService.insertImage({
        projectId,
        originalName: file,
        filename: destFilename,
        filePath: destPath,
        thumbnailPath: thumbPath,
        size: fs.statSync(destPath).size,
        mimeType: 'image/jpeg',
        latitude: exif.latitude,
        longitude: exif.longitude,
        altitude: exif.altitude,
        capturedAt: exif.capturedAt
      });
      inserted.push(record);
    }

    const geometry = computeFlightGeometry(inserted);

    broadcast({
      type: 'SAMPLE_DATA_LOADED',
      projectId,
      count: inserted.length,
      geometry
    });

    res.json({
      message: `Loaded ${inserted.length} sample drone survey images with GPS telemetry.`,
      images: inserted,
      geometry
    });
  } catch (err) {
    console.error('[LoadSamples] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 12. Serve Stitched Orthophoto Image
app.get('/api/demo/orthophoto.png', (req, res) => {
  const orthoPath = path.join(SAMPLES_DIR, 'sample_orthophoto.png');
  if (fs.existsSync(orthoPath)) {
    res.sendFile(path.resolve(orthoPath));
  } else {
    res.status(404).json({ error: 'Sample orthophoto not found' });
  }
});

// 13. WebODM Connectivity Status & Config
app.get('/api/webodm/status', async (req, res) => {
  const status = await webodmService.checkConnection();
  res.json(status);
});

app.post('/api/webodm/config', (req, res) => {
  const { url, username, password } = req.body;
  webodmService.setCredentials(url, username, password);
  res.json({ message: 'WebODM configuration updated', url: webodmService.baseUrl });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`SIH Drone Mapping & Stitching Module Backend Running`);
  console.log(`REST API:      http://localhost:${PORT}/api/`);
  console.log(`WebSocket:     ws://localhost:${PORT}/ws`);
  console.log(`SQLite DB:     ${path.join(UPLOADS_DIR, '..', 'data', 'drone_map.db')}`);
  console.log(`====================================================`);

  prisma.$connect()
    .then(() => console.log("✅ Successfully connected to PostgreSQL Database: BhumiMap"))
    .catch((err) => console.error("❌ Database connection failed:", err.message || err));
});
