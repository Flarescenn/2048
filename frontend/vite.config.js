// vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // You need this for React

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), // <-- Keep your React plugin here
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})