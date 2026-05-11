import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Heavy PDF/canvas libs into their own chunk — only loaded when a PDF is generated
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor'
            // Supabase + its dependencies
            if (id.includes('@supabase')) return 'supabase-vendor'
            // React core
            if (id.includes('react-dom') || id.includes('react-router-dom') || (id.includes('react') && !id.includes('react-')))
              return 'react-vendor'
            // Icons
            if (id.includes('lucide-react')) return 'icons-vendor'
            // Everything else
            return 'vendor'
          }
        },
      },
    },
  },
})
