import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMockAuth } from '../hooks/MockAuthContext'
import './admin-layout.css'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

const nav: NavItem[] = [
  { to: '/orders', label: 'Orders' },
  { to: '/collections', label: 'Collection' },
  { to: '/results', label: 'Lab results' },
  { to: '/ratings', label: 'Ratings & feedback' },
  { to: '/discounts', label: 'Discounts' },
  { to: '/loyalty', label: 'Loyalty points' },
  { to: '/reports', label: 'Reports' },
]

export function AdminLayout() {
  const { signOut } = useMockAuth()
  const navigate = useNavigate()

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
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="page-title">Healthcare lab admin</h1>
          </div>
          <div className="admin-header-right">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                signOut()
                navigate('/login')
              }}
            >
              Logout
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
