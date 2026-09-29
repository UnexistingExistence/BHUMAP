import fs from 'node:fs';
import path from 'node:path';

class WebODMClient {
  constructor(baseUrl = process.env.WEBODM_URL || 'http://localhost:8000', username = 'admin', password = 'admin') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.token = null;
  }

  setCredentials(url, username, password) {
    if (url) this.baseUrl = url.replace(/\/$/, '');
    if (username) this.username = username;
    if (password) this.password = password;
    this.token = null;
  }

  /**
   * Check if WebODM or NodeODM is reachable
   */
  async checkConnection() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(`${this.baseUrl}/api/`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok || res.status === 401 || res.status === 403) {
        return { online: true, url: this.baseUrl, status: 'connected' };
      }
      return { online: false, url: this.baseUrl, error: `HTTP ${res.status}` };
    } catch (err) {
      return { online: false, url: this.baseUrl, error: err.message };
    }
  }

  /**
   * Authenticate and obtain JWT token
   */
  async authenticate() {
    if (this.token) return this.token;

    try {
      const res = await fetch(`${this.baseUrl}/api/token-auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.password
        })
      });

      if (!res.ok) {
        throw new Error(`WebODM Auth Failed (${res.status}): ${await res.text()}`);
      }

      const data = await res.json();
      this.token = data.token;
      return this.token;
    } catch (err) {
      console.warn('[WebODM] Auth failed:', err.message);
      throw err;
    }
  }

  getHeaders() {
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `JWT ${this.token}`;
    }
    return headers;
  }

  /**
   * Create a project in WebODM
   */
  async createProject(name = 'SIH Drone Flight') {
    await this.authenticate();
    const res = await fetch(`${this.baseUrl}/api/projects/`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description: 'Created by SIH Drone Mapping Module' })
    });

    if (!res.ok) {
      throw new Error(`Failed to create WebODM project: ${await res.text()}`);
    }

    return await res.json();
  }

  /**
   * Create and start a task with uploaded images
   * @param {number|string} projectId 
   * @param {Array<string>} imagePaths 
   * @param {Array<object>} options 
   */
  async createTask(projectId, imagePaths, options = [{ name: 'orthophoto-resolution', value: 5 }]) {
    await this.authenticate();

    const formData = new FormData();
    formData.append('options', JSON.stringify(options));

    for (const imgPath of imagePaths) {
      if (fs.existsSync(imgPath)) {
        const fileBuffer = fs.readFileSync(imgPath);
        const filename = path.basename(imgPath);
        const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
        formData.append('images', blob, filename);
      }
    }

    const res = await fetch(`${this.baseUrl}/api/projects/${projectId}/tasks/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData
    });

    if (!res.ok) {
      throw new Error(`Failed to create WebODM task: ${await res.text()}`);
    }

    return await res.json();
  }

  /**
   * Get task status and progress
   */
  async getTask(projectId, taskId) {
    await this.authenticate();
    const res = await fetch(`${this.baseUrl}/api/projects/${projectId}/tasks/${taskId}/`, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      throw new Error(`Failed to get WebODM task status: ${await res.text()}`);
    }

    return await res.json();
  }

  /**
   * Get Orthophoto bounds GeoJSON or bbox
   */
  async getOrthophotoBounds(projectId, taskId) {
    await this.authenticate();
    const res = await fetch(`${this.baseUrl}/api/projects/${projectId}/tasks/${taskId}/orthophoto/bounds`, {
      headers: this.getHeaders()
    });

    if (!res.ok) return null;
    return await res.json();
  }

  /**
   * Get orthophoto tile URL template
   */
  getTileUrl(projectId, taskId) {
    return `${this.baseUrl}/api/projects/${projectId}/tasks/${taskId}/orthophoto/tiles/{z}/{x}/{y}.png`;
  }
}

export const webodmService = new WebODMClient();
