import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MockAuthProvider } from './hooks/MockAuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MockAuthProvider>
      <App />
    </MockAuthProvider>
  </StrictMode>,
)
