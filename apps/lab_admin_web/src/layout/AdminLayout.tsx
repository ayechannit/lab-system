import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import type { SessionRole } from '../model/types'
import './admin-layout.css'

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
  { to: '/reports', label: 'Reports', icon: 'bar_chart' },
]

function headerTitleForPath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/'
  const match = nav.find((item) => item.to === path)
  if (match) return match.label
  if (path === '/') return nav[0].label
  return 'Healthcare lab admin'
}

export function AdminLayout() {
  const { signOut, account, role } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const headerTitle = headerTitleForPath(pathname)

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <span className="material-symbols-outlined">biotech</span>
          </span>
          <div>
            <div className="brand-title">MedLab Smart </div>
            <div className="brand-sub">Lab management</div>
          </div>
        </div>
        <nav className="admin-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? ' admin-nav-link--active' : ''}`
              }
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
            onClick={() => {
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
            <h1 className="page-title">{headerTitle}</h1>
          </div>
          <div className="admin-header-right">
            {account ? (
              <div
                className="admin-profile"
                title={`${account.name} · ${account.email}`}
              >
                <span className="admin-profile__avatar" aria-hidden="true">
                  {initialsFromName(account.name)}
                </span>
                <div className="admin-profile__meta">
                  <span className="admin-profile__name">{account.name}</span>
                  <span className="admin-profile__role">{roleDisplay(role)}</span>
                </div>
              </div>
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
