import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isApiMode } from '../services/apiBase'
import {
  DEFAULT_SYSTEM_SETTINGS,
  fetchSystemSettings,
  resolveLogoDisplayUrl,
} from '../services/systemSettingService'
import { useAuth } from './AuthContext'

type SystemBrandingContextValue = {
  labName: string
  logoDisplayUrl: string | null
  /** Apply branding in the shell immediately (e.g. after logo upload or save). */
  applyBranding: (patch: { labName?: string; logoUrl?: string | null }) => void
  refreshBranding: () => Promise<void>
}

const SystemBrandingContext = createContext<SystemBrandingContextValue | null>(null)

export function SystemBrandingProvider({ children }: { children: ReactNode }) {
  const { signedIn, initializing } = useAuth()
  const [labName, setLabName] = useState(DEFAULT_SYSTEM_SETTINGS.lab_name)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const applyBranding = useCallback((patch: { labName?: string; logoUrl?: string | null }) => {
    if (patch.labName !== undefined) {
      setLabName(patch.labName.trim() || DEFAULT_SYSTEM_SETTINGS.lab_name)
    }
    if (patch.logoUrl !== undefined) {
      setLogoUrl(patch.logoUrl)
    }
  }, [])

  const refreshBranding = useCallback(async () => {
    if (!isApiMode()) return
    try {
      const row = await fetchSystemSettings()
      applyBranding({ labName: row.lab_name, logoUrl: row.logo_url })
    } catch {
      /* keep last known branding */
    }
  }, [applyBranding])

  useEffect(() => {
    if (!signedIn || initializing || !isApiMode()) return
    void refreshBranding()
  }, [signedIn, initializing, refreshBranding])

  const logoDisplayUrl = useMemo(() => resolveLogoDisplayUrl(logoUrl), [logoUrl])

  const value = useMemo(
    () => ({ labName, logoDisplayUrl, applyBranding, refreshBranding }),
    [labName, logoDisplayUrl, applyBranding, refreshBranding],
  )

  return <SystemBrandingContext.Provider value={value}>{children}</SystemBrandingContext.Provider>
}

export function useSystemBranding(): SystemBrandingContextValue {
  const ctx = useContext(SystemBrandingContext)
  if (!ctx) {
    throw new Error('useSystemBranding must be used within SystemBrandingProvider')
  }
  return ctx
}
