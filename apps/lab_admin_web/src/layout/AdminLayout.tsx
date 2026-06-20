import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/common/BrandMark'
import { NotificationBell } from '../components/common/NotificationBell'
import { MyProfileModal } from '../components/profile/MyProfileModal'
import { StaffAvatar } from '../components/staff/StaffAvatar'
import { useAuth } from '../hooks/AuthContext'
import { useSystemBranding } from '../hooks/SystemBrandingContext'
import { useToast } from '../hooks/ToastContext'
import { fetchStaffById } from '../services/staffService'
import type { SessionRole } from '../model/types'
import './admin-layout.css'

const MOBILE_NAV_BREAKPOINT = 900
const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  const one = parts[0] ?? '?'
  return one.slice(0, 2).toUpperCase()
}

function roleDisplay(role: SessionRole | null): string {
  if (!role) return 'Signed in'
  const map: Record<SessionRole, string> = {
    admin: 'Admin',
    lab_technician: 'Lab technician',
    reception: 'Reception',
    manager: 'Manager',
    collector: 'Collector',
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
  }
  return map[role] ?? role
}

type NavItem = {
  to: string
  label: string
  /** Material Symbols ligature name (`material-symbols-outlined`). */
  icon: string
  end?: boolean
}

const nav: NavItem[] = [
  { to: '/orders', label: 'Orders', icon: 'receipt_long' },
  { to: '/lab-tests', label: 'Lab tests', icon: 'science' },
  { to: '/staff', label: 'Staff', icon: 'badge' },
  { to: '/users', label: 'Users', icon: 'group' },
  { to: '/collections', label: 'Collection', icon: 'water_drop' },
  { to: '/results', label: 'Lab results', icon: 'assignment' },
  { to: '/ratings', label: 'Ratings & feedback', icon: 'reviews' },
  { to: '/discounts', label: 'Discounts', icon: 'sell' },
  { to: '/loyalty', label: 'Loyalty points', icon: 'card_giftcard' },
  { to: '/system-settings', label: 'System settings', icon: 'settings' },
  { to: '/reports', label: 'Reports', icon: 'bar_chart' },
]

function headerTitleForPath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/'
  const match = nav.find((item) => item.to === path)
  if (match) return match.label
  if (path === '/') return nav[0].label
  return 'Healthcare lab admin'
}

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

export function AdminLayout() {
  const { showSuccess } = useToast()
  const { signOut, account, role, refreshAccount } = useAuth()
  const { labName, logoDisplayUrl } = useSystemBranding()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const headerTitle = headerTitleForPath(pathname)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!account || account.type !== 'staff') {
      setProfileImageUrl(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const row = await fetchStaffById(account.id)
        if (!cancelled) setProfileImageUrl(row.profile_image_url)
      } catch {
        if (!cancelled) setProfileImageUrl(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [account, profileOpen])

  const isStaffAccount = account?.type === 'staff'

  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${MOBILE_NAV_BREAKPOINT}px)`).matches,
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_NAV_BREAKPOINT}px)`)
    const sync = () => {
      setIsMobile(mq.matches)
      if (!mq.matches) setMobileDrawerOpen(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!isMobile || !mobileDrawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isMobile, mobileDrawerOpen])

  useEffect(() => {
    if (!mobileDrawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileDrawerOpen])

  const closeMobileDrawer = () => setMobileDrawerOpen(false)

  function handleSidebarBrandClick() {
    if (isMobile) {
      closeMobileDrawer()
      return
    }
    setSidebarCollapsed((c) => !c)
  }

  const shellClass = [
    'admin-shell',
    isMobile ? 'admin-shell--layout-mobile' : '',
    !isMobile && sidebarCollapsed ? 'admin-shell--sidebar-collapsed' : '',
    isMobile && mobileDrawerOpen ? 'admin-shell--mobile-drawer-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      {isMobile && mobileDrawerOpen ? (
        <button
          type="button"
          className="admin-drawer-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobileDrawer}
        />
      ) : null}
      <aside
        className="admin-sidebar"
        id="admin-sidebar"
        inert={isMobile && !mobileDrawerOpen ? true : undefined}
      >
        <button
          type="button"
          className="brand admin-brand-trigger"
          onClick={handleSidebarBrandClick}
          aria-expanded={isMobile ? mobileDrawerOpen : !sidebarCollapsed}
          aria-controls="admin-sidebar"
          title={!isMobile ? 'Click logo to widen or narrow the sidebar' : undefined}
          aria-label={
            isMobile ? 'Close navigation menu' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar to icons'
          }
        >
          <BrandMark logoUrl={logoDisplayUrl} />
          <div className="brand-copy">
            <div className="brand-title">{labName}</div>
            <div className="brand-sub">Lab management</div>
          </div>
        </button>
        <nav className="admin-nav" aria-label="Main navigation">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={!isMobile && sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? ' admin-nav-link--active' : ''}`
              }
              onClick={() => {
                if (isMobile) closeMobileDrawer()
              }}
            >
              <span className="admin-nav-link__icon" aria-hidden="true">
                <span className="material-symbols-outlined">{item.icon}</span>
              </span>
              <span className="admin-nav-link__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <button
            type="button"
            className="admin-sidebar-logout"
            title={!isMobile && sidebarCollapsed ? 'Logout' : undefined}
            onClick={() => {
              closeMobileDrawer()
              signOut()
              navigate('/login')
            }}
          >
            <span className="admin-sidebar-logout__icon" aria-hidden="true">
              <span className="material-symbols-outlined">logout</span>
            </span>
            <span className="admin-sidebar-logout__label">Logout</span>
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            {isMobile && !mobileDrawerOpen ? (
              <button
                type="button"
                className="admin-header-logo-btn"
                aria-label="Open navigation menu"
                aria-controls="admin-sidebar"
                aria-expanded={false}
                onClick={() => setMobileDrawerOpen(true)}
              >
                <BrandMark logoUrl={logoDisplayUrl} />
              </button>
            ) : null}
            <h1 className="page-title">{headerTitle}</h1>
          </div>
          <div className="admin-header-right">
            {account ? (
              <>
                <button
                  type="button"
                  className="admin-profile"
                  title={`${account.name} · ${account.email}`}
                  aria-label={`Account menu for ${account.name}. Edit profile and settings.`}
                  aria-haspopup="dialog"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen(true)}
                >
                  {isStaffAccount ? (
                    <StaffAvatar
                      name={account.name}
                      profileImageUrl={profileImageUrl}
                      className="admin-profile__avatar"
                    />
                  ) : (
                    <span className="admin-profile__avatar" aria-hidden="true">
                      {initialsFromName(account.name)}
                    </span>
                  )}
                  <div className="admin-profile__meta">
                    <span className="admin-profile__name">{account.name}</span>
                    <span className="admin-profile__role">{roleDisplay(role)}</span>
                  </div>
                  <span className="admin-profile__chevron" aria-hidden="true">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </button>
                <NotificationBell />
                <MyProfileModal
                  open={profileOpen}
                  account={account}
                  sessionRole={role}
                  onClose={() => setProfileOpen(false)}
                  onSuccess={() => {
                    void refreshAccount()
                    showSuccess('Profile updated.')
                  }}
                />
              </>
            ) : null}
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
