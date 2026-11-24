import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    sourcemap: false,
    // Vite 8 uses oxc by default; esbuild is a fallback
    minify: 'oxc',
  },
  server: {
    port: 5173,
  },
})
