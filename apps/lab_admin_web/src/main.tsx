import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme/theme-tokens.css'
import './components/common/ui.css'
import './i18n'
import App from './App.tsx'
import { applyAppTheme, readStoredAdminTheme } from './theme/appThemes'
import { AuthProvider } from './hooks/AuthContext'
import { PermissionsProvider } from './hooks/PermissionsContext'
import { SystemBrandingProvider } from './hooks/SystemBrandingContext'
import { ToastProvider } from './hooks/ToastContext'

applyAppTheme(readStoredAdminTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <PermissionsProvider>
          <SystemBrandingProvider>
            <App />
          </SystemBrandingProvider>
        </PermissionsProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
