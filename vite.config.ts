import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    outDir: 'dist',
    target: 'es2019',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // three.js is big and changes rarely — give it its own cacheable chunk.
        manualChunks: { three: ['three'] },
      },
    },
  },
})
