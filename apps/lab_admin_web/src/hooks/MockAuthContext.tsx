import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { StaffRole } from '../mock-data/types'

const AUTH_KEY = 'lab_admin_mock_signed_in'
const ROLE_KEY = 'lab_admin_mock_role'

const ROLES: StaffRole[] = ['admin', 'lab_technician', 'reception', 'manager']

function readStoredRole(): StaffRole {
  if (typeof window === 'undefined') return 'admin'
  const r = window.localStorage.getItem(ROLE_KEY) as StaffRole | null
  return r && ROLES.includes(r) ? r : 'admin'
}

function readStoredSignedIn(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(AUTH_KEY) === '1'
}

interface MockAuthValue {
  role: StaffRole
  setRole: (r: StaffRole) => void
  signedIn: boolean
  signIn: () => void
  signOut: () => void
}

const MockAuthContext = createContext<MockAuthValue | null>(null)

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<StaffRole>(readStoredRole)
  const [signedIn, setSignedIn] = useState(readStoredSignedIn)

  const setRole = useCallback((r: StaffRole) => {
    setRoleState(r)
    try {
      window.localStorage.setItem(ROLE_KEY, r)
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const signIn = useCallback(() => {
    setSignedIn(true)
    try {
      window.localStorage.setItem(AUTH_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  const signOut = useCallback(() => {
    setSignedIn(false)
    try {
      window.localStorage.removeItem(AUTH_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ role, setRole, signedIn, signIn, signOut }),
    [role, setRole, signedIn, signIn, signOut],
  )

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
}

export function useMockAuth() {
  const ctx = useContext(MockAuthContext)
  if (!ctx) throw new Error('useMockAuth requires MockAuthProvider')
  return ctx
}
