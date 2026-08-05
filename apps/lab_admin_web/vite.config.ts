import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTrim = (env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
  let apiProxyTarget = 'http://localhost:3000'
  if (apiTrim.startsWith('http://') || apiTrim.startsWith('https://')) {
    try {
      apiProxyTarget = new URL(apiTrim).origin
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
      // Same-origin `/api` + `/uploads` in dev avoids browser CORS when the
      // admin UI is on :5173 and the API is on :3000.
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
        '/uploads': { target: apiProxyTarget, changeOrigin: true },
      },
    },
  }
})
