import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const API_TARGET = 'https://myticket-api.kat-jr.com'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['framer-motion', '@phosphor-icons/react', 'laravel-echo', 'pusher-js'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/v1/main': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
      },
      '/broadcasting': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
