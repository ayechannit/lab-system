import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IdhcBrandLockup } from '../components/common/IdhcBrandLockup'
import { HeaderLanguageMenu } from '../components/common/HeaderLanguageMenu'
import { HeaderThemeMenu } from '../components/common/HeaderThemeMenu'
import { NotificationBell } from '../components/common/NotificationBell'
import { MyProfileModal } from '../components/profile/MyProfileModal'
import { StaffAvatar } from '../components/staff/StaffAvatar'
import { useAuth } from '../hooks/AuthContext'
import { usePermissions } from '../hooks/PermissionsContext'
import { useToast } from '../hooks/ToastContext'
import { fetchStaffById } from '../services/staffService'
import type { SessionRole } from '../model/types'
import { roleLabel } from '../utils/roleLabels'
import './admin-layout.css'

const MOBILE_NAV_BREAKPOINT = 900
const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  const one = parts[0] ?? '?'
  return one.slice(0, 2).toUpperCase()
}

function roleDisplay(role: SessionRole | null, t: (key: string) => string): string {
  if (!role) return t('common.signedIn')
  return roleLabel(role)
}

type NavItem = {
  to: string
  labelKey: string
  /** Material Symbols ligature name (`material-symbols-outlined`). */
  icon: string
  end?: boolean
  /** Governs visibility via the admin-configurable role_permissions matrix (see PermissionsContext). */
  moduleKey?: string
  /** Hardcoded admin-only, bypassing the matrix entirely (only admin can view/edit permissions). */
  adminOnly?: boolean
}

const nav: NavItem[] = [
  { to: '/orders', labelKey: 'nav.orders', icon: 'receipt_long', moduleKey: 'orders' },
  { to: '/lab-tests', labelKey: 'nav.labTests', icon: 'science', moduleKey: 'lab-tests' },
  { to: '/staff', labelKey: 'nav.staff', icon: 'badge', moduleKey: 'staff' },
  { to: '/users', labelKey: 'nav.users', icon: 'group', moduleKey: 'users' },
  { to: '/collections', labelKey: 'nav.collections', icon: 'water_drop', moduleKey: 'collections' },
  { to: '/results', labelKey: 'nav.results', icon: 'assignment', moduleKey: 'results' },
  { to: '/ratings', labelKey: 'nav.ratings', icon: 'reviews', moduleKey: 'ratings' },
  { to: '/discounts', labelKey: 'nav.discounts', icon: 'sell', moduleKey: 'discounts' },
  { to: '/referral-fees', labelKey: 'nav.referralFees', icon: 'payments', moduleKey: 'referral-fees' },
  { to: '/service-geofences', labelKey: 'nav.serviceGeofences', icon: 'map', moduleKey: 'service-geofences' },
  { to: '/advertisements', labelKey: 'nav.advertisements', icon: 'campaign', moduleKey: 'advertisements' },
  { to: '/loyalty', labelKey: 'nav.loyalty', icon: 'card_giftcard', moduleKey: 'loyalty' },
  { to: '/system-settings', labelKey: 'nav.systemSettings', icon: 'settings', moduleKey: 'system-settings' },
  { to: '/reports', labelKey: 'nav.reports', icon: 'bar_chart', moduleKey: 'reports' },
  { to: '/permissions', labelKey: 'nav.permissions', icon: 'admin_panel_settings', adminOnly: true },
]

function headerTitleForPath(pathname: string, t: (key: string) => string): string {
  const path = pathname.replace(/\/$/, '') || '/'
  const match = nav.find((item) => item.to === path)
  if (match) return t(match.labelKey)
  if (path === '/') return t(nav[0].labelKey)
  return t('common.appTitle')
}

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

export function AdminLayout() {
  const { t } = useTranslation()
  const { showSuccess } = useToast()
  const { signOut, account, role, refreshAccount } = useAuth()
  const { loading: permissionsLoading, hasModule } = usePermissions()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const headerTitle = headerTitleForPath(pathname, t)
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

  const visibleNav = permissionsLoading
    ? []
    : nav.filter((item) => (item.adminOnly ? role === 'admin' : !item.moduleKey || hasModule(item.moduleKey)))

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
          aria-label={t('common.closeNav')}
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
          aria-label={
            isMobile
              ? t('common.closeNav')
              : sidebarCollapsed
                ? t('common.expandSidebar')
                : t('common.collapseSidebar')
          }
        >
          <IdhcBrandLockup compact={!isMobile && sidebarCollapsed} />
        </button>
        <nav className="admin-nav" aria-label={t('common.mainNav')}>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={!isMobile && sidebarCollapsed ? t(item.labelKey) : undefined}
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
              <span className="admin-nav-link__label">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <button
            type="button"
            className="admin-sidebar-logout"
            title={!isMobile && sidebarCollapsed ? t('common.logout') : undefined}
            onClick={() => {
              closeMobileDrawer()
              signOut()
              navigate('/login')
            }}
          >
            <span className="admin-sidebar-logout__icon" aria-hidden="true">
              <span className="material-symbols-outlined">logout</span>
            </span>
            <span className="admin-sidebar-logout__label">{t('common.logout')}</span>
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
                aria-label={t('common.openNav')}
                aria-controls="admin-sidebar"
                aria-expanded={false}
                onClick={() => setMobileDrawerOpen(true)}
              >
                <IdhcBrandLockup compact />
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
                  aria-label={t('common.accountMenuFor', { name: account.name })}
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
                    <span className="admin-profile__role">{roleDisplay(role, t)}</span>
                  </div>
                  <span className="admin-profile__chevron" aria-hidden="true">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </button>
                <HeaderLanguageMenu />
                <HeaderThemeMenu />
                <NotificationBell />
                <MyProfileModal
                  open={profileOpen}
                  account={account}
                  sessionRole={role}
                  onClose={() => setProfileOpen(false)}
                  onSuccess={() => {
                    void refreshAccount()
                    showSuccess(t('common.profileUpdated'))
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
