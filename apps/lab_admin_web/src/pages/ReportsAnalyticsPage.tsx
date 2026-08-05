import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
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
  fetchStaffActivityAudit,
  fetchTestCategoryDistribution,
  fetchTurnaroundTimeReport,
  fetchUserReportSummary,
  type CollectionReportRow,
  type DashboardKpis,
  type DiscountImpact,
  type PendingQueueRow,
  type RatingsSummaryResponse,
  type RevenueTrendRow,
  type StaffActivityRow,
  type TatReportRow,
  type TestCategoryRow,
  type UserReportResponse,
} from '../services/reportService'
import { themeChartColors } from '../theme/appThemes'
import { getIntlLocale } from '../i18n'
import { formatIsoDatetimeShort } from '../utils/dateIntl'
import { orderPriorityLabel, orderStatusLabel } from '../utils/orderLabels'
import { roleLabel } from '../utils/roleLabels'
import '../components/common/ui.css'

type ReportRangeDays = 7 | 14 | 30

const RANGE_DAY_VALUES: ReportRangeDays[] = [7, 14, 30]

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

function fmtTatMinutes(
  minutes: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return t('reports.tat.minutes', { count: m })
  return m > 0
    ? t('reports.tat.hoursMinutes', { hours: h, minutes: m })
    : t('reports.tat.hoursOnly', { hours: h })
}

function fmtWhen(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return formatIsoDatetimeShort(iso, locale)
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
  loadingLabel,
  children,
}: {
  loading: boolean
  empty: boolean
  emptyLabel: string
  loadingLabel: string
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className="reports-table-loading">
        <LoadingSpinner label={loadingLabel} />
      </div>
    )
  }
  if (empty) {
    return <p className="reports-empty">{emptyLabel}</p>
  }
  return <div className="table-wrap">{children}</div>
}

export function ReportsAnalyticsPage() {
  const { t } = useTranslation()
  const intlLocale = getIntlLocale()
  const hasApi = isApiMode()
  const chartColors = themeChartColors()
  const [rangeDays, setRangeDays] = useState<ReportRangeDays>(14)
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendRow[]>([])
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
      setLoadError(err instanceof Error ? err.message : t('reports.loadFailed'))
    } else {
      setLoadError(null)
    }

    setKpis(dashboard?.kpis ?? null)
    setRevenueTrend(dashboard?.revenueTrend ?? [])
    setTestCategories(results[1].status === 'fulfilled' ? results[1].value : [])
    setRatings(results[2].status === 'fulfilled' ? results[2].value : null)
    setTatRows(results[3].status === 'fulfilled' ? results[3].value : null)
    setPendingQueue(results[4].status === 'fulfilled' ? results[4].value : null)
    setStaffActivity(results[5].status === 'fulfilled' ? results[5].value : null)
    setCollectionReport(results[6].status === 'fulfilled' ? results[6].value : null)
    setDiscountImpact(results[7].status === 'fulfilled' ? results[7].value : null)
    setUserReport(results[8].status === 'fulfilled' ? results[8].value : null)
  }, [t])

  useEffect(() => {
    if (!hasApi) {
      queueMicrotask(() => {
        setKpis(null)
        setRevenueTrend([])
        setTestCategories([])
        setRatings(null)
        setTatRows(null)
        setPendingQueue(null)
        setStaffActivity(null)
        setCollectionReport(null)
        setDiscountImpact(null)
        setUserReport(null)
        setLoading(false)
      })
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      setLoading(true)
      setLoadError(null)
    })
    void (async () => {
      try {
        await loadReports(rangeDays, () => cancelled)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, rangeDays, loadReports])

  const rangeOptions = useMemo(
    () =>
      RANGE_DAY_VALUES.map((days) => ({
        days,
        label: t('reports.rangeDays', { count: days }),
      })),
    [t],
  )

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
      { label: t('reports.ratings.positive'), count: stats.positive_reviews },
      {
        label: t('reports.ratings.neutral'),
        count: Math.max(0, stats.total_reviews - stats.positive_reviews - stats.negative_reviews),
      },
      { label: t('reports.ratings.negative'), count: stats.negative_reviews },
    ]
  }, [ratings, t])

  return (
    <div className="stack">
      <PageHeader title={t('pages.reports.title')} description={t('pages.reports.description')} />

      {!hasApi ? <ApiConfigBanner variant="reports" /> : null}

      {hasApi ? (
        <div className="reports-range-bar card">
          <span className="reports-range-bar__label">{t('reports.reportingPeriod')}</span>
          <div className="reports-range-bar__options" role="group" aria-label={t('reports.reportingPeriod')}>
            {rangeOptions.map(({ days, label }) => (
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
        <h3 className="card-title">{t('reports.snapshot')}</h3>
        {loading ? (
          <div className="reports-snapshot-loading">
            <LoadingSpinner label={t('reports.loadingSnapshot')} />
          </div>
        ) : kpis ? (
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            {t('reports.snapshotLine', {
              orders: kpis.total_orders,
              revenue: kpis.total_revenue.toLocaleString(),
              urgent: kpis.urgent_orders,
              users: kpis.total_users,
              pass: kpis.ai_pass_count,
              issues: kpis.ai_issue_count,
              rating: ratings ? ratings.stats.average_rating.toFixed(1) : '—',
              reviews: ratings ? ratings.stats.total_reviews : 0,
            })}
          </p>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>{t('reports.noSnapshot')}</p>
        )}
      </div>

      {discountImpact ? (
        <div className="card">
          <h3 className="card-title">{t('reports.discountImpact')}</h3>
          <div className="reports-metric-grid">
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.originalValue')}</span>
              <span className="reports-metric__value">
                {discountImpact.total_original_value.toLocaleString()} MMK
              </span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.finalRevenue')}</span>
              <span className="reports-metric__value">
                {discountImpact.total_final_revenue.toLocaleString()} MMK
              </span>
            </div>
            <div className="reports-metric reports-metric--warn">
              <span className="reports-metric__label">{t('reports.metrics.discountGiven')}</span>
              <span className="reports-metric__value">
                {discountImpact.total_discount_given.toLocaleString()} MMK
              </span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.effectiveDiscount')}</span>
              <span className="reports-metric__value">
                {discountImpact.effective_discount_percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid-2">
        <div className="card chart-card">
          <h3 className="card-title">{t('reports.charts.dailyOrders', { days: rangeDays })}</h3>
          <div style={{ width: '100%', height: 240 }}>
            {loading ? (
              <LoadingSpinner label={t('reports.loadingChart')} />
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
                  <Tooltip formatter={(value: number) => [value, t('reports.charts.orders')]} />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name={t('reports.charts.orders')}
                    stroke={chartColors.primary}
                    fill="url(#gOrders)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="card chart-card">
          <h3 className="card-title">{t('reports.charts.monthlyRevenue')}</h3>
          <div style={{ width: '100%', height: 240 }}>
            {loading ? (
              <LoadingSpinner label={t('reports.loadingChart')} />
            ) : (
              <ResponsiveContainer>
                <BarChart data={monthlyRevenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} MMK`, t('reports.charts.revenue')]} />
                  <Bar dataKey="mmk" name={t('reports.charts.revenue')} fill={chartColors.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <h3 className="card-title">{t('reports.charts.testsByCategory')}</h3>
        <div style={{ width: '100%', height: 240 }}>
          {loading ? (
            <LoadingSpinner label={t('reports.loadingChart')} />
          ) : (
            <ResponsiveContainer>
              <BarChart data={testCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="test_count" name={t('reports.charts.tests')} fill={chartColors.primaryLight} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="reports-section-head">
          <h3 className="card-title">{t('reports.pendingQueue.title')}</h3>
          <span className="reports-section-head__meta">
            {pendingQueue ? t('reports.pendingQueue.openOrders', { count: pendingQueue.length }) : ''}
          </span>
        </div>
        <ReportTableWrap
          loading={loading}
          empty={pendingQueue != null && pendingQueue.length === 0}
          emptyLabel={t('reports.pendingQueue.empty')}
          loadingLabel={t('reports.loadingReport')}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.patient')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.priority')}</th>
                <th>{t('reports.pendingQueue.hoursWaiting')}</th>
                <th>{t('common.created')}</th>
              </tr>
            </thead>
            <tbody>
              {(pendingQueue ?? []).slice(0, 15).map((row) => (
                <tr key={row.order_id}>
                  <td>{row.patient_name}</td>
                  <td>{orderStatusLabel(row.status)}</td>
                  <td>{orderPriorityLabel(row.priority)}</td>
                  <td>{row.hours_elapsed}</td>
                  <td>{fmtWhen(row.created_at, intlLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportTableWrap>
      </div>

      {tatRows != null ? (
        <div className="card">
          <div className="reports-section-head">
            <h3 className="card-title">{t('reports.tat.title')}</h3>
            <span className="reports-section-head__meta">
              {t('reports.tat.completedReports', { count: tatRows.length })}
              {tatAverage != null ? ` · ${t('reports.tat.avg', { time: fmtTatMinutes(tatAverage, t) })}` : ''}
            </span>
          </div>
          <ReportTableWrap
            loading={loading}
            empty={tatRows.length === 0}
            emptyLabel={t('reports.tat.empty')}
            loadingLabel={t('reports.loadingReport')}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.patient')}</th>
                  <th>{t('common.priority')}</th>
                  <th>{t('reports.tat.collected')}</th>
                  <th>{t('reports.tat.reportOut')}</th>
                  <th>{t('reports.tat.column')}</th>
                </tr>
              </thead>
              <tbody>
                {tatRows.slice(0, 15).map((row) => (
                  <tr key={row.order_id}>
                    <td>{row.patient_name}</td>
                    <td>{orderPriorityLabel(row.priority)}</td>
                    <td>{fmtWhen(row.collection_time, intlLocale)}</td>
                    <td>{fmtWhen(row.report_out_time, intlLocale)}</td>
                    <td>{fmtTatMinutes(row.tat_minutes, t)}</td>
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
            <h3 className="card-title">{t('reports.staffActivity.title')}</h3>
            <span className="reports-section-head__meta">
              {t('reports.staffActivity.tracked', { count: staffActivity.length })}
            </span>
          </div>
          <ReportTableWrap
            loading={loading}
            empty={staffActivity.length === 0}
            emptyLabel={t('reports.staffActivity.empty')}
            loadingLabel={t('reports.loadingReport')}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('reports.staffActivity.staff')}</th>
                  <th>{t('common.role')}</th>
                  <th>{t('reports.staffActivity.actions')}</th>
                  <th>{t('reports.staffActivity.lastAction')}</th>
                </tr>
              </thead>
              <tbody>
                {staffActivity.slice(0, 15).map((row) => (
                  <tr key={`${row.staff_name}-${row.staff_role}`}>
                    <td>{row.staff_name}</td>
                    <td>{roleLabel(row.staff_role)}</td>
                    <td>{row.actions_performed}</td>
                    <td>{fmtWhen(row.last_action_at, intlLocale)}</td>
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
            <h3 className="card-title">{t('reports.collection.title')}</h3>
            <span className="reports-section-head__meta">
              {t('reports.collection.collectors', { count: collectionReport.length })}
            </span>
          </div>
          <ReportTableWrap
            loading={loading}
            empty={collectionReport.length === 0}
            emptyLabel={t('reports.collection.empty')}
            loadingLabel={t('reports.loadingReport')}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('collections.collector')}</th>
                  <th>{t('reports.collection.collections')}</th>
                  <th>{t('reports.collection.avgTime')}</th>
                </tr>
              </thead>
              <tbody>
                {collectionReport.map((row) => (
                  <tr key={row.staff_id}>
                    <td>{row.staff_name}</td>
                    <td>{row.collections_count}</td>
                    <td>{fmtTatMinutes(row.avg_assignment_to_collection_minutes, t)}</td>
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
            <h3 className="card-title">{t('reports.charts.ratingsBreakdown')}</h3>
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
            <h3 className="card-title">{t('reports.ratings.latest')}</h3>
            {ratings.latestReviews.length === 0 ? (
              <p className="reports-empty">{t('reports.ratings.empty')}</p>
            ) : (
              <ul className="reports-review-list">
                {ratings.latestReviews.map((review, i) => (
                  <li key={`${review.created_at}-${i}`} className="reports-review-list__item">
                    <div className="reports-review-list__head">
                      <strong>{review.user_name || t('reports.ratings.anonymous')}</strong>
                      <span>{'★'.repeat(Math.min(5, Math.max(0, review.rating)))}</span>
                    </div>
                    {review.remark ? (
                      <p className="reports-review-list__remark">{review.remark}</p>
                    ) : null}
                    <span className="reports-review-list__when">{fmtWhen(review.created_at, intlLocale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {userReport ? (
        <div className="card">
          <h3 className="card-title">{t('reports.userSummary.title')}</h3>
          <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
            {t('reports.userSummary.hint')}
          </p>
          <div className="reports-metric-grid">
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.totalSpent')}</span>
              <span className="reports-metric__value">{userReport.kpis.total_spent.toLocaleString()} MMK</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.orders')}</span>
              <span className="reports-metric__value">{userReport.kpis.total_orders}</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.completed')}</span>
              <span className="reports-metric__value">{userReport.kpis.completed_orders}</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.pending')}</span>
              <span className="reports-metric__value">{userReport.kpis.pending_orders}</span>
            </div>
            <div className="reports-metric">
              <span className="reports-metric__label">{t('reports.metrics.loyaltyPoints')}</span>
              <span className="reports-metric__value">{userReport.kpis.loyalty_points}</span>
            </div>
          </div>
          {userReport.topTests.length > 0 ? (
            <div className="table-wrap" style={{ marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('reports.userSummary.topTests')}</th>
                    <th>{t('reports.userSummary.category')}</th>
                    <th>{t('reports.metrics.orders')}</th>
                    <th>{t('reports.userSummary.spent')}</th>
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
