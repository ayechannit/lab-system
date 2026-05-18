import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/common/ui.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/AuthContext'
import { ToastProvider } from './hooks/ToastContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
