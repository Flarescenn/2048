import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupCSRF } from './api/csrf'

// Render the app immediately to prevent blank screen
createRoot(document.getElementById('root')).render(
    <App />
)

// Initialize CSRF protection in background
setupCSRF().catch(error => {
  console.warn('CSRF setup error:', error);
  console.log('Frontend will continue to work, but CSRF protection might not be active.');
})
