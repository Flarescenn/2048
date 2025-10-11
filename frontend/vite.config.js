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
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})