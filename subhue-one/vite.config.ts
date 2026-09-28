import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The build must work both from a web host and when index.html is opened
// straight from disk (file://). Chrome blocks module scripts and CORS-mode
// requests on file://, so ship one classic, deferred script and drop the
// crossorigin attributes Vite adds.
function openFromDisk(): Plugin {
  return {
    name: 'open-from-disk',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html
          .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
          .replace(/ crossorigin(?=[\s>])/g, ''),
    },
  }
}

// SUBHUE_STANDALONE=1 (scripts/standalone.mjs) builds for the single-file
// page / HTML widget: fonts are embedded and the CSS is emitted as one file
// so the script can scope it to #subhue-root.
const standalone = process.env.SUBHUE_STANDALONE === '1'

export default defineConfig({
  // Relative base so the build works from any sub-path, static host or disk.
  base: './',
  plugins: [react(), openFromDisk()],
  build: {
    target: 'es2020',
    modulePreload: false,
    assetsInlineLimit: standalone ? 50_000_000 : 4096,
    cssCodeSplit: !standalone,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/site-[hash].js',
      },
    },
  },
})
