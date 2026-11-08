import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Android build: one self-contained index.html (no module requests over file://),
// with the 3D model copied beside it into the APK's assets.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-apk',
    target: 'es2019',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 5000,
  },
})
