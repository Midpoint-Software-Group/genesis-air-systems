import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep these two isolated — they're large and truly independent
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
