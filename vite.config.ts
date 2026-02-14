import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

function readTauriMetadata(): { productName: string; version: string } {
  try {
    const confPath = resolve(__dirname, 'src-tauri', 'tauri.conf.json')
    const raw = fs.readFileSync(confPath, 'utf-8')
    const parsed = JSON.parse(raw) as { productName?: unknown; version?: unknown }
    return {
      productName: typeof parsed.productName === 'string' ? parsed.productName : 'Codex Desktop',
      version: typeof parsed.version === 'string' ? parsed.version : '0.0.0',
    }
  } catch {
    return { productName: 'Codex Desktop', version: '0.0.0' }
  }
}

const tauriMeta = readTauriMetadata()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_NAME__: JSON.stringify(tauriMeta.productName),
    __APP_VERSION__: JSON.stringify(tauriMeta.version),
  },

  // Path alias resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    // Build optimization options
    target: 'ES2022',
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,

    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'markdown': ['react-markdown', 'remark-gfm'],
          'syntax-highlighter': ['react-syntax-highlighter'],
          'xterm': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
          'cmdk': ['cmdk'],
          'lucide': ['lucide-react'],
        },
      },
    },

    // Chunk size warning limit (in KB)
    chunkSizeWarningLimit: 1000,
  },

  // Development server optimization
  server: {
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx'],
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-markdown'],
  },
})
