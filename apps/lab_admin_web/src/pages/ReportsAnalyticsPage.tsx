import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/common/PageHeader'
import { useErrorToast } from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { isApiMode } from '../services/apiBase'
import { fetchOrders, type ApiOrderListRow } from '../services/orderService'
import type { UserListRow } from '../model/types'
import { fetchUserList } from '../services/userService'
import '../components/common/ui.css'

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function ReportsAnalyticsPage() {
  const hasApi = isApiMode()
  const [orders, setOrders] = useState<ApiOrderListRow[]>([])
  const [users, setUsers] = useState<UserListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)

  useErrorToast(loadError)

  useEffect(() => {
    if (!hasApi) {
      setOrders([])
      setUsers([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const [o, u] = await Promise.all([fetchOrders(), fetchUserList()])
        if (!cancelled) {
          setOrders(o)
          setUsers(u.filter((x) => !x.is_deleted))
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load analytics data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi])

  const paidTotalMmk = useMemo(
    () => orders.reduce((acc, o) => acc + (Number.isFinite(o.final_price_mmk) ? o.final_price_mmk : 0), 0),
    [orders],
  )

  const dailyOrdersSeries = useMemo(() => {
    const days = 14
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - (days - 1))
    const counts = new Map<string, number>()
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      counts.set(dayKey(d), 0)
    }
    for (const o of orders) {
      const d = new Date(o.created_at)
      if (!Number.isFinite(d.getTime())) continue
      const k = dayKey(d)
      if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.entries()].map(([date, ordersCount]) => ({ date, orders: ordersCount }))
  }, [orders])

  const monthlyRevenueSeries = useMemo(() => {
    const sums = new Map<string, number>()
    for (const o of orders) {
      const d = new Date(o.created_at)
      if (!Number.isFinite(d.getTime())) continue
      const k = monthKey(d)
      const v = Number.isFinite(o.final_price_mmk) ? o.final_price_mmk : 0
      sums.set(k, (sums.get(k) ?? 0) + v)
    }
    const keys = [...sums.keys()].sort()
    return keys.map((month) => ({ month, mmk: sums.get(month) ?? 0 }))
  }, [orders])

  const ordersByStatus = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of orders) {
      m.set(o.status, (m.get(o.status) ?? 0) + 1)
    }
    return [...m.entries()].map(([status, count]) => ({ status, count }))
  }, [orders])

  const userGrowth = useMemo(() => {
    const byMonth = new Map<string, number>()
    for (const u of users) {
      const d = new Date(u.created_at)
      if (!Number.isFinite(d.getTime())) continue
      const k = monthKey(d)
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1)
    }
    const keys = [...byMonth.keys()].sort()
    let acc = 0
    return keys.map((month) => {
      acc += byMonth.get(month) ?? 0
      return { month, users: acc }
    })
  }, [users])

  return (
    <div className="stack">
      <PageHeader
        title="Reports & analytics"
        description="See trends in orders and customers at a glance—counts and summaries update from your latest data."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> and sign in to load reporting data.
          </p>
        </div>
      ) : null}

      <div className="card">
        <h3 className="card-title">Snapshot</h3>
        {loading ? (
          <div className="reports-snapshot-loading">
            <LoadingSpinner label="Loading snapshot" />
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            <strong>{orders.length}</strong> orders loaded · sum of order totals (final price):{' '}
            <strong>{paidTotalMmk.toLocaleString()} MMK</strong> · <strong>{users.length}</strong> active user accounts.
          </p>
        )}
      </div>

      <div className="grid-2">
        <div className="card chart-card">
          <h3 className="card-title">Daily orders (last 14 days)</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={dailyOrdersSeries}>
                <defs>
                  <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#003d9b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#003d9b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="orders" stroke="#003d9b" fill="url(#gOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card chart-card">
          <h3 className="card-title">Monthly revenue (MMK)</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyRevenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} MMK`, 'Revenue']} />
                <Bar dataKey="mmk" fill="#0d8a5b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card chart-card">
          <h3 className="card-title">Orders by status</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={ordersByStatus} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="status" type="category" width={88} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#003d9b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card chart-card">
          <h3 className="card-title">User accounts (cumulative by signup month)</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#0052cc" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
