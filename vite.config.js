import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget =
    (env.VITE_API_BASE_URL && env.VITE_API_BASE_URL.replace(/\/$/, '')) ||
    'http://localhost:4000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/public-files': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
