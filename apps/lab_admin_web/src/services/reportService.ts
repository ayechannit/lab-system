import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type ReportDateFilters = {
  startDate?: string
  endDate?: string
}

export type DashboardKpis = {
  total_revenue: number
  total_orders: number
  urgent_orders: number
  total_users: number
  ai_pass_count: number
  ai_issue_count: number
}

export type RevenueTrendRow = {
  date: string
  revenue: number
  order_count: number
}

export type DashboardKpisResponse = {
  kpis: DashboardKpis
  revenueTrend: RevenueTrendRow[]
}

export type TestCategoryRow = {
  category: string
  test_count: number
  total_revenue: number
}

export type TatReportRow = {
  order_id: string
  patient_name: string
  priority: string
  collection_time: string | null
  report_out_time: string | null
  tat_minutes: number
}

export type PendingQueueRow = {
  order_id: string
  patient_name: string
  status: string
  priority: string
  created_at: string
  hours_elapsed: number
}

export type PendingQueueFilters = {
  priority?: 'urgent' | 'elective'
  status?: string
}

export type StaffActivityRow = {
  staff_name: string
  staff_role: string
  actions_performed: number
  last_action_at: string | null
}

export type StaffActivityFilters = ReportDateFilters & {
  staffId?: string
}

export type CollectionReportRow = {
  staff_id: string
  staff_name: string
  collections_count: number
  avg_assignment_to_collection_minutes: number
}

export type DiscountImpact = {
  total_original_value: number
  total_final_revenue: number
  total_discount_given: number
  effective_discount_percent: number
}

export type DiscountImpactFilters = ReportDateFilters

export type TatReportFilters = ReportDateFilters & {
  priority?: 'urgent' | 'elective'
}

export type RatingsSummaryStats = {
  average_rating: number
  total_reviews: number
  positive_reviews: number
  negative_reviews: number
}

export type RatingsSummaryReview = {
  rating: number
  remark: string | null
  user_name: string
  created_at: string
}

export type RatingsSummaryResponse = {
  stats: RatingsSummaryStats
  latestReviews: RatingsSummaryReview[]
}

export type UserReportKpis = {
  total_spent: number
  total_orders: number
  completed_orders: number
  pending_orders: number
  loyalty_points: number
}

export type UserSpendTrendRow = {
  date: string
  spent: number
  order_count: number
}

export type UserTopTestRow = {
  test_name: string
  test_code: string
  category: string
  order_count: number
  total_spent: number
}

export type UserReportResponse = {
  kpis: UserReportKpis
  spendTrend: UserSpendTrendRow[]
  topTests: UserTopTestRow[]
}

function buildQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value)
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

function toQuery(params?: ReportDateFilters): string {
  return buildQuery({
    startDate: params?.startDate,
    endDate: params?.endDate,
  })
}

async function unwrapReport<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const body = (await res.json()) as { success?: boolean; data?: T }
  if (body.data === undefined) throw new Error('Invalid report response')
  return body.data
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return v != null ? String(v) : ''
}

function strOrNull(v: unknown): string | null {
  if (v == null || v === '') return null
  return String(v)
}

function normalizeKpis(raw: Record<string, unknown>): DashboardKpis {
  return {
    total_revenue: num(raw.total_revenue),
    total_orders: num(raw.total_orders),
    urgent_orders: num(raw.urgent_orders),
    total_users: num(raw.total_users),
    ai_pass_count: num(raw.ai_pass_count),
    ai_issue_count: num(raw.ai_issue_count),
  }
}

function normalizeTrendRow(raw: Record<string, unknown>): RevenueTrendRow {
  const dateRaw = raw.date
  const date =
    dateRaw instanceof Date
      ? dateRaw.toISOString().slice(0, 10)
      : String(dateRaw ?? '').slice(0, 10)
  return {
    date,
    revenue: num(raw.revenue),
    order_count: num(raw.order_count),
  }
}

function normalizeSpendTrendRow(raw: Record<string, unknown>): UserSpendTrendRow {
  const row = normalizeTrendRow(raw)
  return {
    date: row.date,
    spent: num(raw.spent ?? raw.revenue),
    order_count: row.order_count,
  }
}

export async function fetchDashboardKpis(filters?: ReportDateFilters): Promise<DashboardKpisResponse> {
  const data = await unwrapReport<Record<string, unknown>>(
    await apiFetch(`/api/reports/dashboard-kpis${toQuery(filters)}`),
  )
  const kpisRaw = (data.kpis ?? {}) as Record<string, unknown>
  const trendRaw = data.revenueTrend
  return {
    kpis: normalizeKpis(kpisRaw),
    revenueTrend: Array.isArray(trendRaw)
      ? trendRaw.map((row) => normalizeTrendRow(row as Record<string, unknown>))
      : [],
  }
}

export async function fetchTestCategoryDistribution(
  filters?: ReportDateFilters & { category?: string },
): Promise<TestCategoryRow[]> {
  const data = await unwrapReport<Record<string, unknown>[]>(
    await apiFetch(
      `/api/reports/test-categories${buildQuery({
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        category: filters?.category,
      })}`,
    ),
  )
  if (!Array.isArray(data)) return []
  return data.map((raw) => ({
    category: String(raw.category ?? 'Unknown'),
    test_count: num(raw.test_count),
    total_revenue: num(raw.total_revenue),
  }))
}

export async function fetchTurnaroundTimeReport(filters?: TatReportFilters): Promise<TatReportRow[]> {
  const data = await unwrapReport<Record<string, unknown>[]>(
    await apiFetch(
      `/api/reports/tat${buildQuery({
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        priority: filters?.priority,
      })}`,
    ),
  )
  if (!Array.isArray(data)) return []
  return data.map((raw) => ({
    order_id: str(raw.order_id),
    patient_name: str(raw.patient_name),
    priority: str(raw.priority),
    collection_time: strOrNull(raw.collection_time),
    report_out_time: strOrNull(raw.report_out_time),
    tat_minutes: num(raw.tat_minutes),
  }))
}

export async function fetchPendingResultsQueue(
  filters?: PendingQueueFilters,
): Promise<PendingQueueRow[]> {
  const data = await unwrapReport<Record<string, unknown>[]>(
    await apiFetch(
      `/api/reports/pending-queue${buildQuery({
        priority: filters?.priority,
        status: filters?.status,
      })}`,
    ),
  )
  if (!Array.isArray(data)) return []
  return data.map((raw) => ({
    order_id: str(raw.order_id),
    patient_name: str(raw.patient_name),
    status: str(raw.status),
    priority: str(raw.priority),
    created_at: str(raw.created_at),
    hours_elapsed: num(raw.hours_elapsed),
  }))
}

export async function fetchStaffActivityAudit(
  filters?: StaffActivityFilters,
): Promise<StaffActivityRow[]> {
  const data = await unwrapReport<Record<string, unknown>[]>(
    await apiFetch(
      `/api/reports/staff-activity${buildQuery({
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        staffId: filters?.staffId,
      })}`,
    ),
  )
  if (!Array.isArray(data)) return []
  return data.map((raw) => ({
    staff_name: str(raw.staff_name),
    staff_role: str(raw.staff_role),
    actions_performed: num(raw.actions_performed),
    last_action_at: strOrNull(raw.last_action_at),
  }))
}

export async function fetchCollectionReport(
  filters?: ReportDateFilters,
): Promise<CollectionReportRow[]> {
  const data = await unwrapReport<Record<string, unknown>[]>(
    await apiFetch(`/api/reports/collection-report${toQuery(filters)}`),
  )
  if (!Array.isArray(data)) return []
  return data.map((raw) => ({
    staff_id: str(raw.staff_id),
    staff_name: str(raw.staff_name),
    collections_count: num(raw.collections_count),
    avg_assignment_to_collection_minutes: num(raw.avg_assignment_to_collection_minutes),
  }))
}

export async function fetchDiscountImpactAnalysis(
  filters?: DiscountImpactFilters,
): Promise<DiscountImpact> {
  const data = await unwrapReport<Record<string, unknown>>(
    await apiFetch(
      `/api/reports/discount-impact${buildQuery({
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      })}`,
    ),
  )
  return {
    total_original_value: num(data.total_original_value),
    total_final_revenue: num(data.total_final_revenue),
    total_discount_given: num(data.total_discount_given),
    effective_discount_percent: num(data.effective_discount_percent),
  }
}

export async function fetchRatingsSummary(filters?: ReportDateFilters): Promise<RatingsSummaryResponse> {
  const data = await unwrapReport<Record<string, unknown>>(
    await apiFetch(`/api/reports/ratings-summary${toQuery(filters)}`),
  )
  const statsRaw = (data.stats ?? {}) as Record<string, unknown>
  const reviewsRaw = data.latestReviews
  return {
    stats: {
      average_rating: num(statsRaw.average_rating),
      total_reviews: num(statsRaw.total_reviews),
      positive_reviews: num(statsRaw.positive_reviews),
      negative_reviews: num(statsRaw.negative_reviews),
    },
    latestReviews: Array.isArray(reviewsRaw)
      ? reviewsRaw.map((raw) => {
          const r = raw as Record<string, unknown>
          return {
            rating: num(r.rating),
            remark: r.remark != null ? String(r.remark) : null,
            user_name: String(r.user_name ?? ''),
            created_at: String(r.created_at ?? ''),
          }
        })
      : [],
  }
}

export async function fetchUserReportSummary(
  filters?: ReportDateFilters,
): Promise<UserReportResponse> {
  const data = await unwrapReport<Record<string, unknown>>(
    await apiFetch(`/api/reports/user-summary${toQuery(filters)}`),
  )
  const kpisRaw = (data.kpis ?? {}) as Record<string, unknown>
  const trendRaw = data.spendTrend
  const testsRaw = data.topTests
  return {
    kpis: {
      total_spent: num(kpisRaw.total_spent),
      total_orders: num(kpisRaw.total_orders),
      completed_orders: num(kpisRaw.completed_orders),
      pending_orders: num(kpisRaw.pending_orders),
      loyalty_points: num(kpisRaw.loyalty_points),
    },
    spendTrend: Array.isArray(trendRaw)
      ? trendRaw.map((row) => normalizeSpendTrendRow(row as Record<string, unknown>))
      : [],
    topTests: Array.isArray(testsRaw)
      ? testsRaw.map((raw) => {
          const r = raw as Record<string, unknown>
          return {
            test_name: str(r.test_name),
            test_code: str(r.test_code),
            category: str(r.category),
            order_count: num(r.order_count),
            total_spent: num(r.total_spent),
          }
        })
      : [],
  }
}
