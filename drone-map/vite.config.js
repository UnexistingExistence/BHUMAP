import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import dotenv from 'dotenv'

dotenv.config()
const BACKEND_PORT = process.env.PORT || 5000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/uploads': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true
      },
      '/tiles': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        bypass(req) {
          const filePath = path.join(process.cwd(), 'public', req.url.split('?')[0]);
          if (fs.existsSync(filePath)) {
            return req.url;
          }
        }
      },
      '/ws': {
        target: `ws://localhost:${BACKEND_PORT}`,
        ws: true
      }
    }
  }
})
