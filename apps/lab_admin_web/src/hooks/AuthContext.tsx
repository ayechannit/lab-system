import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SessionRole } from '../model/types'
import { clearSession, getStoredAccessToken, setSession, type StoredAccount } from '../services/authSession'
import { fetchSessionAccount, loginUser } from '../services/authService'

type AuthContextValue = {
  signedIn: boolean
  initializing: boolean
  role: SessionRole | null
  account: StoredAccount | null
  /** Signs in via `POST /api/auth/login/user` (clinic / doctor / patient accounts). */
  signInWithUserCredentials: (email: string, password: string, remember: boolean) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isSessionRole(r: string): r is SessionRole {
  return (
    r === 'admin' ||
    r === 'lab_technician' ||
    r === 'reception' ||
    r === 'manager' ||
    r === 'clinic' ||
    r === 'doctor' ||
    r === 'patient'
  )
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

  const signInWithUserCredentials = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const { token, user } = await loginUser(email.trim(), password)
      const acc: StoredAccount = {
        type: 'user',
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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

  const role: SessionRole | null =
    account && isSessionRole(account.role) ? account.role : account ? (account.role as SessionRole) : null

  const value = useMemo(
    () => ({
      signedIn,
      initializing,
      role,
      account,
      signInWithUserCredentials,
      signOut,
    }),
    [signedIn, initializing, role, account, signInWithUserCredentials, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
