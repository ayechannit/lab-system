const TOKEN_KEY = 'lab_admin_access_token'
const ACCOUNT_KEY = 'lab_admin_account'
const REMEMBER_PREF_KEY = 'lab_admin_remember_me'
const SAVED_EMAIL_KEY = 'lab_admin_saved_email'

export type StoredAccount = {
  type: 'staff' | 'user'
  id: string
  name: string
  email: string
  role: string
}

function storage(persist: boolean): Storage {
  return persist ? window.localStorage : window.sessionStorage
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY)
}

/** `true` when the access token lives in localStorage (remember-me), not sessionStorage. */
export function isRememberedSession(): boolean {
  if (typeof window === 'undefined') return false
  if (window.sessionStorage.getItem(TOKEN_KEY) != null) return false
  return window.localStorage.getItem(TOKEN_KEY) != null
}

export function getStoredAccount(): StoredAccount | null {
  if (typeof window === 'undefined') return null
  const raw =
    window.sessionStorage.getItem(ACCOUNT_KEY) ?? window.localStorage.getItem(ACCOUNT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAccount
  } catch {
    return null
  }
}

/** Last “keep me signed in” choice on the login form (defaults to true). */
export function getRememberPreference(): boolean {
  if (typeof window === 'undefined') return true
  const v = window.localStorage.getItem(REMEMBER_PREF_KEY)
  if (v === '0') return false
  if (v === '1') return true
  return true
}

export function setRememberPreference(remember: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(REMEMBER_PREF_KEY, remember ? '1' : '0')
}

export function getSavedLoginEmail(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(SAVED_EMAIL_KEY) ?? ''
}

export function setSavedLoginEmail(email: string | null): void {
  if (typeof window === 'undefined') return
  const trimmed = (email ?? '').trim()
  if (!trimmed) {
    window.localStorage.removeItem(SAVED_EMAIL_KEY)
    return
  }
  window.localStorage.setItem(SAVED_EMAIL_KEY, trimmed)
}

export function setSession(accessToken: string, account: StoredAccount, remember: boolean): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(ACCOUNT_KEY)
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(ACCOUNT_KEY)
  const s = storage(remember)
  s.setItem(TOKEN_KEY, accessToken)
  s.setItem(ACCOUNT_KEY, JSON.stringify(account))
  setRememberPreference(remember)
  if (remember) {
    setSavedLoginEmail(account.email)
  } else {
    setSavedLoginEmail(null)
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(ACCOUNT_KEY)
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(ACCOUNT_KEY)
}
