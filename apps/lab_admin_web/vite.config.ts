import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTrim = (env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
  let uploadsProxyTarget = 'http://localhost:3000'
  if (apiTrim.startsWith('http://') || apiTrim.startsWith('https://')) {
    try {
      uploadsProxyTarget = new URL(apiTrim).origin
    } catch {
      /* keep default */
    }
  }

  return {
    plugins: [react(), viteSingleFile()],
    build: {
      assetsInlineLimit: 100000000,
    },
    server: {
      // Prescription PDFs use `/uploads/...` on the API host; embedding `localhost:3000` in an
      // iframe from the Vite app (`localhost:5174`) often triggers Chrome’s “Failed to load PDF”.
      // Same-origin `/uploads/...` + proxy avoids that in local dev.
      proxy: {
        '/uploads': { target: uploadsProxyTarget, changeOrigin: true },
      },
    },
  }
})
