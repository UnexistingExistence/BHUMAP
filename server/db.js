import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'drone_map.db');
const db = new DatabaseSync(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    size INTEGER,
    mime_type TEXT,
    latitude REAL,
    longitude REAL,
    altitude REAL,
    captured_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    mode TEXT DEFAULT 'demo',
    webodm_task_id TEXT,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    stage TEXT DEFAULT 'Initialized',
    logs_json TEXT DEFAULT '[]',
    orthophoto_url TEXT,
    bounds_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );
`);

// Insert default demo project if none exists
const countProjectsStmt = db.prepare('SELECT COUNT(*) as count FROM projects');
const { count } = countProjectsStmt.get();
if (count === 0) {
  const insertProjectStmt = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)');
  insertProjectStmt.run('SIH Demo Survey Mission', 'Smart India Hackathon drone flight survey over target area');
}

export const dbService = {
  getDb: () => db,

  // Projects
  getDefaultProject: () => {
    const stmt = db.prepare('SELECT * FROM projects ORDER BY id ASC LIMIT 1');
    return stmt.get();
  },

  getAllProjects: () => {
    const stmt = db.prepare('SELECT * FROM projects ORDER BY id DESC');
    return stmt.all();
  },

  createProject: (name, description = '') => {
    const stmt = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)');
    const result = stmt.run(name, description);
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  },

  // Images
  insertImage: (img) => {
    const stmt = db.prepare(`
      INSERT INTO images (
        project_id, original_name, filename, file_path, thumbnail_path, 
        size, mime_type, latitude, longitude, altitude, captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      img.projectId,
      img.originalName,
      img.filename,
      img.filePath,
      img.thumbnailPath || null,
      img.size || 0,
      img.mimeType || 'image/jpeg',
      img.latitude !== undefined ? img.latitude : null,
      img.longitude !== undefined ? img.longitude : null,
      img.altitude !== undefined ? img.altitude : null,
      img.capturedAt || null
    );
    return db.prepare('SELECT * FROM images WHERE id = ?').get(result.lastInsertRowid);
  },

  getImagesByProject: (projectId) => {
    const stmt = db.prepare('SELECT * FROM images WHERE project_id = ? ORDER BY id ASC');
    return stmt.all(projectId);
  },

  getImageById: (id) => {
    const stmt = db.prepare('SELECT * FROM images WHERE id = ?');
    return stmt.get(id);
  },

  getImageCount: (projectId) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM images WHERE project_id = ?');
    const res = stmt.get(projectId);
    return res ? res.count : 0;
  },

  clearImagesForProject: (projectId) => {
    const stmt = db.prepare('DELETE FROM images WHERE project_id = ?');
    return stmt.run(projectId);
  },

  updateImageGps: (id, latitude, longitude, altitude = 43.0) => {
    const stmt = db.prepare(`
      UPDATE images 
      SET latitude = ?, longitude = ?, altitude = ? 
      WHERE id = ?
    `);
    stmt.run(latitude, longitude, altitude, id);
    return db.prepare('SELECT * FROM images WHERE id = ?').get(id);
  },

  // Tasks
  createTask: (projectId, mode = 'demo', webodmTaskId = null) => {
    const initialLogs = JSON.stringify([
      `[${new Date().toLocaleTimeString()}] Task registered. Initializing photogrammetry pipeline...`
    ]);
    const stmt = db.prepare(`
      INSERT INTO tasks (project_id, mode, webodm_task_id, status, progress, stage, logs_json)
      VALUES (?, ?, ?, 'processing', 0, 'Initializing', ?)
    `);
    const result = stmt.run(projectId, mode, webodmTaskId, initialLogs);
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  },

  updateTaskProgress: (taskId, progress, stage, newLog = null) => {
    const current = db.prepare('SELECT logs_json FROM tasks WHERE id = ?').get(taskId);
    let logs = [];
    try {
      logs = current?.logs_json ? JSON.parse(current.logs_json) : [];
    } catch {
      logs = [];
    }
    if (newLog) {
      logs.push(`[${new Date().toLocaleTimeString()}] ${newLog}`);
    }

    const stmt = db.prepare(`
      UPDATE tasks 
      SET progress = ?, stage = ?, logs_json = ? 
      WHERE id = ?
    `);
    stmt.run(progress, stage, JSON.stringify(logs), taskId);
  },

  completeTask: (taskId, orthophotoUrl, bounds) => {
    const current = db.prepare('SELECT logs_json FROM tasks WHERE id = ?').get(taskId);
    let logs = [];
    try {
      logs = current?.logs_json ? JSON.parse(current.logs_json) : [];
    } catch {
      logs = [];
    }
    logs.push(`[${new Date().toLocaleTimeString()}] Orthomosaic generated successfully. Georeferenced map ready.`);

    const stmt = db.prepare(`
      UPDATE tasks 
      SET status = 'completed', progress = 100, stage = 'Completed', 
          orthophoto_url = ?, bounds_json = ?, logs_json = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(orthophotoUrl, JSON.stringify(bounds), JSON.stringify(logs), taskId);
  },

  failTask: (taskId, errorMessage) => {
    const current = db.prepare('SELECT logs_json FROM tasks WHERE id = ?').get(taskId);
    let logs = [];
    try {
      logs = current?.logs_json ? JSON.parse(current.logs_json) : [];
    } catch {
      logs = [];
    }
    logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${errorMessage}`);

    const stmt = db.prepare(`
      UPDATE tasks 
      SET status = 'failed', stage = 'Failed', logs_json = ? 
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(logs), taskId);
  },

  getTaskById: (id) => {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id);
  },

  getLatestTask: (projectId) => {
    const stmt = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY id DESC LIMIT 1');
    return stmt.get(projectId);
  }
};
