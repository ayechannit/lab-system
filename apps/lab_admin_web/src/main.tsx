import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/common/ui.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
