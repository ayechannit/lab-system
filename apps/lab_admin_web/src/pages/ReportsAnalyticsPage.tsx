import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import {
  fetchCollectionReport,
  fetchDashboardKpis,
  fetchDiscountImpactAnalysis,
  fetchPendingResultsQueue,
  fetchRatingsSummary,
  fetchRevenueByChannel,
  fetchStaffActivityAudit,
  fetchTestCategoryDistribution,
  fetchTurnaroundTimeReport,
  fetchUserReportSummary,
  type CollectionReportRow,
  type DashboardKpis,
  type DiscountImpact,
  type PendingQueueRow,
  type RatingsSummaryResponse,
  type RevenueByChannelRow,
  type RevenueTrendRow,
  type StaffActivityRow,
  type TatReportRow,
  type TestCategoryRow,
  type UserReportResponse,
} from '../services/reportService'
import { themeChartColors } from '../theme/appThemes'
import '../components/common/ui.css'

type ReportRangeDays = 7 | 14 | 30

const RANGE_OPTIONS: { days: ReportRangeDays; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
]

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function reportDateRange(days: ReportRangeDays): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

function buildDailyOrdersSeries(
  trend: RevenueTrendRow[],
  days: ReportRangeDays,
): { date: string; orders: number }[] {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const counts = new Map<string, number>()
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    counts.set(dayKey(d), 0)
  }
  for (const row of trend) {
    if (counts.has(row.date)) counts.set(row.date, row.order_count)
  }
  return [...counts.entries()].map(([date, orders]) => ({ date, orders }))
}

function buildMonthlyRevenueSeries(trend: RevenueTrendRow[]): { month: string; mmk: number }[] {
  const sums = new Map<string, number>()
  for (const row of trend) {
    const d = new Date(row.date)
    if (!Number.isFinite(d.getTime())) continue
    const k = monthKey(d)
    sums.set(k, (sums.get(k) ?? 0) + row.revenue)
  }
  return [...sums.keys()].sort().map((month) => ({ month, mmk: sums.get(month) ?? 0 }))
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function fmtTatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m} min`
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`
}

function avgTatMinutes(rows: TatReportRow[]): number | null {
  if (rows.length === 0) return null
  const sum = rows.reduce((acc, r) => acc + r.tat_minutes, 0)
  return sum / rows.length
}

function ReportTableWrap({
  loading,
  empty,
  emptyLabel,
  children,
}: {
  loading: boolean
  empty: boolean
  emptyLabel: string
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className="reports-table-loading">
        <LoadingSpinner label="Loading report" />
      </div>
    )
  }
  if (empty) {
    return <p className="reports-empty">{emptyLabel}</p>
  }
  return <div className="table-wrap">{children}</div>
}

export function ReportsAnalyticsPage() {
  const hasApi = isApiMode()
  const chartColors = themeChartColors()
  const [rangeDays, setRangeDays] = useState<ReportRangeDays>(14)
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendRow[]>([])
  const [revenueByChannel, setRevenueByChannel] = useState<RevenueByChannelRow[]>([])
  const [testCategories, setTestCategories] = useState<TestCategoryRow[]>([])
  const [ratings, setRatings] = useState<RatingsSummaryResponse | null>(null)
  const [tatRows, setTatRows] = useState<TatReportRow[] | null>(null)
  const [pendingQueue, setPendingQueue] = useState<PendingQueueRow[] | null>(null)
  const [staffActivity, setStaffActivity] = useState<StaffActivityRow[] | null>(null)
  const [collectionReport, setCollectionReport] = useState<CollectionReportRow[] | null>(null)
  const [discountImpact, setDiscountImpact] = useState<DiscountImpact | null>(null)
  const [userReport, setUserReport] = useState<UserReportResponse | null>(null)
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)

  useErrorToast(loadError)

  const loadReports = useCallback(async (days: ReportRangeDays, cancelled: () => boolean) => {
    const range = reportDateRange(days)
    const results = await Promise.allSettled([
      fetchDashboardKpis(range),
      fetchRevenueByChannel(range),
      fetchTestCategoryDistribution(range),
      fetchRatingsSummary(range),
      fetchTurnaroundTimeReport(range),
      fetchPendingResultsQueue(),
      fetchStaffActivityAudit(range),
      fetchCollectionReport(range),
      fetchDiscountImpactAnalysis(range),
      fetchUserReportSummary(range),
    ])

    if (cancelled()) return

    const dashboard = results[0].status === 'fulfilled' ? results[0].value : null
    if (!dashboard && results[0].status === 'rejected') {
      const err = results[0].reason
      setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard KPIs')
    } else {
      setLoadError(null)
    }

    setKpis(dashboard?.kpis ?? null)
    setRevenueTrend(dashboard?.revenueTrend ?? [])
    setRevenueByChannel(results[1].status === 'fulfilled' ? results[1].value : [])
    setTestCategories(results[2].status === 'fulfilled' ? results[2].value : [])
    setRatings(results[3].status === 'fulfilled' ? results[3].value : null)
    setTatRows(results[4].status === 'fulfilled' ? results[4].value : null)
    setPendingQueue(results[5].status === 'fulfilled' ? results[5].value : null)
    setStaffActivity(results[6].status === 'fulfilled' ? results[6].value : null)
    setCollectionReport(results[7].status === 'fulfilled' ? results[7].value : null)
    setDiscountImpact(results[8].status === 'fulfilled' ? results[8].value : null)
    setUserReport(results[9].status === 'fulfilled' ? results[9].value : null)
  }, [])

  useEffect(() => {
    if (!hasApi) {
      setKpis(null)
      setRevenueTrend([])
      setRevenueByChannel([])
      setTestCategories([])
      setRatings(null)
      setTatRows(null)
      setPendingQueue(null)
      setStaffActivity(null)
      setCollectionReport(null)
      setDiscountImpact(null)
      setUserReport(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void loadReports(rangeDays, () => cancelled).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [hasApi, rangeDays, loadReports])

  const dailyOrdersSeries = useMemo(
    () => buildDailyOrdersSeries(revenueTrend, rangeDays),
    [revenueTrend, rangeDays],
  )
  const monthlyRevenueSeries = useMemo(() => buildMonthlyRevenueSeries(revenueTrend), [revenueTrend])
  const tatAverage = useMemo(() => avgTatMinutes(tatRows ?? []), [tatRows])

  const ratingsTrend = useMemo(() => {
    if (!ratings) return []
    const { stats } = ratings
    return [
      { label: 'Positive (4–5★)', count: stats.positive_reviews },
      {
        label: 'Neutral (3★)',
        count: Math.max(0, stats.total_reviews - stats.positive_reviews - stats.negative_reviews),
      },
      { label: 'Negative (1–2★)', count: stats.negative_reviews },
    ]
  }, [ratings])

  return (
    <div className="stack">
      <PageHeader
        title="Reports & analytics"
        description="Dashboard KPIs, operational queues, staff performance, and financial summaries from the reporting API."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> and sign in to load reporting data.
          </p>
        </div>
      ) : null}

      {hasApi ? (
        <div className="reports-range-bar card">
          <span className="reports-range-bar__label">Reporting period</span>
          <div className="reports-range-bar__options" role="group" aria-label="Reporting period">
            {RANGE_OPTIONS.map(({ days, label }) => (
              <button
                key={days}
                type="button"
                className={['btn', rangeDays === days ? 'btn-primary' : 'btn-secondary'].join(' ')}
                onClick={() => setRangeDays(days)}
                disabled={loading}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card">
        <h3 className="card-title">Snapshot</h3>
        {loading ? (
          <div className="reports-snapshot-loading">
            <LoadingSpinner label="Loading snapshot" />
          </div>
        ) : kpis ? (
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            <strong>{kpis.total_orders}</strong> orders · delivered revenue:{' '}
            <strong>{kpis.total_revenue.toLocaleString()} MMK</strong> ·{' '}
            <strong>{kpis.urgent_orders}</strong> urgent · <strong>{kpis.total_users}</strong> users · AI checks:{' '}
            <strong>{kpis.ai_pass_count}</strong> pass / <strong>{kpis.ai_issue_count}</strong> issues
            {ratings ? (
              <>
                {' '}
                · avg rating <strong>{ratings.stats.average_rating.toFixed(1)}</strong> (
                {ratings.stats.total_reviews} reviews)
              </>
            ) : null}
          </p>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>No snapshot data available.</p>
        )}
      </div>

      {discountImpact ? (
        <div className="card">
          <h3 className="card-title">Discount impact</h3>
          <div className="reports-metric-grid">
            <div className="reports-metric">
              <span className="reports-metric__label">Original value</span>
              <span className="reports-metric__value">
                {discountImpact.total_original_value.toLocaleString()} MMK
              </span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">Final revenue</span>
              <span className="reports-metric__value">
                {discountImpact.total_final_revenue.toLocaleString()} MMK
              </span>
            </div>
            <div className="reports-metric reports-metric--warn">
              <span className="reports-metric__label">Discount given</span>
              <span className="reports-metric__value">
                {discountImpact.total_discount_given.toLocaleString()} MMK
              </span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">Effective discount</span>
              <span className="reports-metric__value">
                {discountImpact.effective_discount_percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid-2">
        <div className="card chart-card">
          <h3 className="card-title">Daily orders (last {rangeDays} days)</h3>
          <div style={{ width: '100%', height: 240 }}>
            {loading ? (
              <LoadingSpinner label="Loading chart" />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={dailyOrdersSeries}>
                  <defs>
                    <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="orders" stroke={chartColors.primary} fill="url(#gOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="card chart-card">
          <h3 className="card-title">Monthly revenue (MMK)</h3>
          <div style={{ width: '100%', height: 240 }}>
            {loading ? (
              <LoadingSpinner label="Loading chart" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={monthlyRevenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} MMK`, 'Revenue']} />
                  <Bar dataKey="mmk" fill="#0d8a5b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card chart-card">
          <h3 className="card-title">Revenue by channel</h3>
          <div style={{ width: '100%', height: 240 }}>
            {loading ? (
              <LoadingSpinner label="Loading chart" />
            ) : (
              <ResponsiveContainer>
                <BarChart
                  data={revenueByChannel.map((r) => ({ ...r, roleLabel: formatRole(r.role) }))}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                  <YAxis dataKey="roleLabel" type="category" width={88} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} MMK`, 'Revenue']} />
                  <Bar dataKey="revenue" fill={chartColors.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="card chart-card">
          <h3 className="card-title">Tests by category</h3>
          <div style={{ width: '100%', height: 240 }}>
            {loading ? (
              <LoadingSpinner label="Loading chart" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={testCategories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="test_count" name="Tests" fill={chartColors.primaryLight} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="reports-section-head">
          <h3 className="card-title">Pending results queue</h3>
          <span className="reports-section-head__meta">
            {pendingQueue ? `${pendingQueue.length} open orders` : ''}
          </span>
        </div>
        <ReportTableWrap
          loading={loading}
          empty={pendingQueue != null && pendingQueue.length === 0}
          emptyLabel="No pending orders in the queue."
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Hours waiting</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {(pendingQueue ?? []).slice(0, 15).map((row) => (
                <tr key={row.order_id}>
                  <td>{row.patient_name}</td>
                  <td>{row.status}</td>
                  <td>{row.priority}</td>
                  <td>{row.hours_elapsed}</td>
                  <td>{fmtWhen(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportTableWrap>
      </div>

      {tatRows != null ? (
        <div className="card">
          <div className="reports-section-head">
            <h3 className="card-title">Turnaround time (TAT)</h3>
            <span className="reports-section-head__meta">
              {tatRows.length} completed reports
              {tatAverage != null ? ` · avg ${fmtTatMinutes(tatAverage)}` : ''}
            </span>
          </div>
          <ReportTableWrap
            loading={loading}
            empty={tatRows.length === 0}
            emptyLabel="No TAT data for orders with report-out times in this period."
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Priority</th>
                  <th>Collected</th>
                  <th>Report out</th>
                  <th>TAT</th>
                </tr>
              </thead>
              <tbody>
                {tatRows.slice(0, 15).map((row) => (
                  <tr key={row.order_id}>
                    <td>{row.patient_name}</td>
                    <td>{row.priority}</td>
                    <td>{fmtWhen(row.collection_time)}</td>
                    <td>{fmtWhen(row.report_out_time)}</td>
                    <td>{fmtTatMinutes(row.tat_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportTableWrap>
        </div>
      ) : null}

      {staffActivity != null ? (
        <div className="card">
          <div className="reports-section-head">
            <h3 className="card-title">Staff activity</h3>
            <span className="reports-section-head__meta">{staffActivity.length} staff tracked</span>
          </div>
          <ReportTableWrap
            loading={loading}
            empty={staffActivity.length === 0}
            emptyLabel="No staff activity logged in this period."
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Actions</th>
                  <th>Last action</th>
                </tr>
              </thead>
              <tbody>
                {staffActivity.slice(0, 15).map((row) => (
                  <tr key={`${row.staff_name}-${row.staff_role}`}>
                    <td>{row.staff_name}</td>
                    <td>{formatRole(row.staff_role)}</td>
                    <td>{row.actions_performed}</td>
                    <td>{fmtWhen(row.last_action_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportTableWrap>
        </div>
      ) : null}

      {collectionReport != null ? (
        <div className="card">
          <div className="reports-section-head">
            <h3 className="card-title">Sample collection performance</h3>
            <span className="reports-section-head__meta">{collectionReport.length} collectors</span>
          </div>
          <ReportTableWrap
            loading={loading}
            empty={collectionReport.length === 0}
            emptyLabel="No collection activity in this period."
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Collector</th>
                  <th>Collections</th>
                  <th>Avg time to collect</th>
                </tr>
              </thead>
              <tbody>
                {collectionReport.map((row) => (
                  <tr key={row.staff_id}>
                    <td>{row.staff_name}</td>
                    <td>{row.collections_count}</td>
                    <td>{fmtTatMinutes(row.avg_assignment_to_collection_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportTableWrap>
        </div>
      ) : null}

      {ratings && ratings.stats.total_reviews > 0 ? (
        <div className="grid-2">
          <div className="card chart-card">
            <h3 className="card-title">Customer ratings breakdown</h3>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={ratingsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke={chartColors.primaryLight} strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h3 className="card-title">Latest reviews</h3>
            {ratings.latestReviews.length === 0 ? (
              <p className="reports-empty">No reviews in this period.</p>
            ) : (
              <ul className="reports-review-list">
                {ratings.latestReviews.map((review, i) => (
                  <li key={`${review.created_at}-${i}`} className="reports-review-list__item">
                    <div className="reports-review-list__head">
                      <strong>{review.user_name || 'Anonymous'}</strong>
                      <span>{'★'.repeat(Math.min(5, Math.max(0, review.rating)))}</span>
                    </div>
                    {review.remark ? (
                      <p className="reports-review-list__remark">{review.remark}</p>
                    ) : null}
                    <span className="reports-review-list__when">{fmtWhen(review.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {userReport ? (
        <div className="card">
          <h3 className="card-title">Your account summary</h3>
          <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
            Personalized metrics for the signed-in account (from user-summary API).
          </p>
          <div className="reports-metric-grid">
            <div className="reports-metric">
              <span className="reports-metric__label">Total spent</span>
              <span className="reports-metric__value">{userReport.kpis.total_spent.toLocaleString()} MMK</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">Orders</span>
              <span className="reports-metric__value">{userReport.kpis.total_orders}</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">Completed</span>
              <span className="reports-metric__value">{userReport.kpis.completed_orders}</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">Pending</span>
              <span className="reports-metric__value">{userReport.kpis.pending_orders}</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">Loyalty points</span>
              <span className="reports-metric__value">{userReport.kpis.loyalty_points}</span>
            </div>
          </div>
          {userReport.topTests.length > 0 ? (
            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Top tests</th>
                    <th>Category</th>
                    <th>Orders</th>
                    <th>Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {userReport.topTests.map((t) => (
                    <tr key={t.test_code}>
                      <td>
                        {t.test_name}
                        <code style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)' }}>
                          {t.test_code}
                        </code>
                      </td>
                      <td>{t.category}</td>
                      <td>{t.order_count}</td>
                      <td>{t.total_spent.toLocaleString()} MMK</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
