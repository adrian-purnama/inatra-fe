import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget =
    (env.VITE_API_BASE_URL && env.VITE_API_BASE_URL.replace(/\/$/, '')) ||
    'http://localhost:4000'

  return {
    plugins: [react(), tailwindcss()],

    // DEV
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/public-files': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },

    // ✅ MUST BE HERE (top-level)
    preview: {
      host: '0.0.0.0',
      port: 4173,
      allowedHosts: ['uat-inatra.amfphub.com'],
    },
  }
})