import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMyPermissions } from '../services/permissionService'
import { useAuth } from './AuthContext'

type PermissionsContextValue = {
  /** True until the first permissions fetch after sign-in resolves. Modules are hidden while loading to avoid a flash of content the role can't access. */
  loading: boolean
  hasModule: (moduleKey: string) => boolean
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { signedIn } = useAuth()
  const [modules, setModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!signedIn) {
      setModules(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const allowed = await fetchMyPermissions()
      setModules(new Set(allowed))
    } catch {
      setModules(new Set())
    } finally {
      setLoading(false)
    }
  }, [signedIn])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo(
    () => ({
      loading,
      hasModule: (moduleKey: string) => modules.has(moduleKey),
      refresh: load,
    }),
    [loading, modules, load],
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext)
  if (!ctx) throw new Error('usePermissions requires PermissionsProvider')
  return ctx
}
