import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { KeyboardProvider } from './contexts/KeyboardContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </StrictMode>,
)
