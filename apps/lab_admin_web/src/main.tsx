import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme/theme-tokens.css'
import './components/common/ui.css'
import App from './App.tsx'
import { applyAppTheme } from './theme/appThemes'
import { AuthProvider } from './hooks/AuthContext'
import { SystemBrandingProvider } from './hooks/SystemBrandingContext'
import { ToastProvider } from './hooks/ToastContext'

applyAppTheme('light')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <SystemBrandingProvider>
          <App />
        </SystemBrandingProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
