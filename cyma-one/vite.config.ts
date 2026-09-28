import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works from any sub-path or static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    // three.js arrives in its own chunk via the dynamic import of the engine.
    chunkSizeWarningLimit: 900,
  },
})
