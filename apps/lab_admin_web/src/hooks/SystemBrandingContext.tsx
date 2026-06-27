import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { FIXED_LAB_NAME } from '../services/systemSettingService'

type SystemBrandingContextValue = {
  labName: string
  logoDisplayUrl: string | null
}

const SystemBrandingContext = createContext<SystemBrandingContextValue | null>(null)

/** IDHC branding is fixed — lab name and logo are not loaded from system settings. */
export function SystemBrandingProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      labName: FIXED_LAB_NAME,
      logoDisplayUrl: null,
    }),
    [],
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
