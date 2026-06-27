import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { EndUserRole, SessionRole } from '../model/types'
import {
  clearSession,
  getStoredAccessToken,
  isRememberedSession,
  setSession,
  type StoredAccount,
} from '../services/authSession'
import { fetchSessionAccount, loginStaff } from '../services/authService'

type AuthContextValue = {
  signedIn: boolean
  initializing: boolean
  role: SessionRole | null
  account: StoredAccount | null
  /** Signs in via `POST /api/auth/login/staff` (admin, lab technician, reception, manager). */
  signInWithStaffCredentials: (email: string, password: string, remember: boolean) => Promise<void>
  /** Re-fetches `/api/auth/me` and updates stored session (preserves remember-me storage). */
  refreshAccount: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isSessionRole(r: string): r is SessionRole {
  return (
    r === 'admin' ||
    r === 'lab_technician' ||
    r === 'reception' ||
    r === 'manager' ||
    r === 'collector' ||
    r === 'clinic' ||
    r === 'doctor' ||
    r === 'patient'
  )
}

function isEndUserRole(r: string): r is EndUserRole {
  return r === 'clinic' || r === 'doctor' || r === 'patient'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [account, setAccount] = useState<StoredAccount | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const token = getStoredAccessToken()
      if (!token) {
        if (!cancelled) {
          setSignedIn(false)
          setAccount(null)
          setInitializing(false)
        }
        return
      }
      try {
        const me = await fetchSessionAccount()
        // Old sessions used `POST /api/auth/login/user`; admin web is staff-only — drop end-user JWTs.
        if (isEndUserRole(me.role)) {
          clearSession()
          if (!cancelled) {
            setAccount(null)
            setSignedIn(false)
          }
          return
        }
        if (!cancelled) {
          setAccount(me)
          setSignedIn(true)
        }
      } catch {
        clearSession()
        if (!cancelled) {
          setAccount(null)
          setSignedIn(false)
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signInWithStaffCredentials = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const { token, staff } = await loginStaff(email.trim(), password, remember)
      const acc: StoredAccount = {
        type: 'staff',
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      }
      setSession(token, acc, remember)
      setAccount(acc)
      setSignedIn(true)
    },
    [],
  )

  const signOut = useCallback(() => {
    clearSession()
    setAccount(null)
    setSignedIn(false)
  }, [])

  const refreshAccount = useCallback(async () => {
    const token = getStoredAccessToken()
    if (!token) return
    const me = await fetchSessionAccount()
    if (isEndUserRole(me.role)) {
      clearSession()
      setAccount(null)
      setSignedIn(false)
      return
    }
    setSession(token, me, isRememberedSession())
    setAccount(me)
  }, [])

  const role: SessionRole | null =
    account && isSessionRole(account.role) ? account.role : account ? (account.role as SessionRole) : null

  const value = useMemo(
    () => ({
      signedIn,
      initializing,
      role,
      account,
      signInWithStaffCredentials,
      refreshAccount,
      signOut,
    }),
    [signedIn, initializing, role, account, signInWithStaffCredentials, refreshAccount, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
