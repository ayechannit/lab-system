import { useMemo } from 'react'
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
import { useOrderLab } from '../context/OrderLabContext'
import { dailyOrdersSeries, monthlyRevenueSeries, topTests, userGrowth } from '../mock-data/reports'
import '../components/common/ui.css'

export function ReportsAnalyticsPage() {
  const { orders } = useOrderLab()
  const ops = useMemo(() => {
    const revenueOpen = orders.reduce(
      (acc, o) => acc + (o.paymentStatus === 'paid' ? o.amountMmk : 0),
      0,
    )
    return {
      openOrders: orders.length,
      paidMmkSample: revenueOpen,
    }
  }, [orders])

  return (
    <div className="stack">
      <PageHeader
        title="Reports & analytics"
        description="Daily orders, revenue trend, top tests, and user growth (mock series), plus a snapshot of the live demo order ledger."
      />
      <div className="card">
        <h3 className="card-title">Live demo ledger snapshot</h3>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Tracking <strong>{ops.openOrders}</strong> orders in session. Sum of fully paid order amounts in this demo
          set: <strong>{ops.paidMmkSample.toLocaleString()} MMK</strong> (illustrative only until billing API exists).
        </p>
      </div>
      <div className="grid-2">
        <div className="card chart-card">
          <h3 className="card-title">Daily orders</h3>
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
                <YAxis tick={{ fontSize: 11 }} />
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
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} MMK`, 'Revenue']} />
                <Bar dataKey="mmk" fill="#0d8a5b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card chart-card">
          <h3 className="card-title">Top tests (% share)</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={topTests} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" />
                <YAxis dataKey="test" type="category" width={72} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="share" fill="#003d9b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card chart-card">
          <h3 className="card-title">User growth</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" />
                <YAxis />
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
