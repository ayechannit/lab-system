import { useEffect, useMemo, useState } from 'react'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useErrorToast } from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { isApiMode } from '../services/apiBase'
import type { ApiOrderStatus } from '../services/orderService'
import {
  fetchAllRatings,
  formatRatingContact,
  formatRatingSubmittedDate,
  formatRatingTests,
  formatShortOrderId,
  type RatingListRow,
} from '../services/ratingService'
import '../components/common/ui.css'

const RATING_SCORE_FILTER_OPTIONS: { value: '' | '1' | '2' | '3' | '4' | '5'; label: string }[] = [
  { value: '', label: 'All ratings' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
]

function endUserRoleLabel(role: string | undefined): string {
  if (!role) return '—'
  const map: Record<string, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
    phlebotomist: 'Phlebotomist',
  }
  return map[role] ?? role
}

function orderStatusBadgeClass(status: ApiOrderStatus | undefined): string {
  if (!status) return 'badge badge--neutral'
  const map: Record<ApiOrderStatus, string> = {
    pending: 'badge badge--warn',
    scheduled: 'badge badge--neutral',
    collecting: 'badge badge--neutral',
    running: 'badge badge--neutral',
    completed: 'badge badge--success',
    delivered: 'badge badge--success',
  }
  return map[status] ?? 'badge badge--neutral'
}

function priorityBadgeClass(priority: string | undefined): string {
  return priority === 'urgent' ? 'badge badge--warn' : 'badge badge--neutral'
}

function RatingStarsDisplay({ value }: { value: number }) {
  const score = Math.min(5, Math.max(0, Math.round(value)))
  return (
    <span className="rating-stars" aria-label={`${score} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`rating-stars__star${star <= score ? ' rating-stars__star--filled' : ''}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
      <span className="visually-hidden">{score} out of 5</span>
    </span>
  )
}

const colSpan = 9

export function RatingsFeedbackPage() {
  const hasApi = isApiMode()
  const [rows, setRows] = useState<RatingListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)

  useErrorToast(loadError)

  const [ratingFilterInput, setRatingFilterInput] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [ratingScoreFilter, setRatingScoreFilter] = useState<'' | '1' | '2' | '3' | '4' | '5'>('')
  const [ratingPage, setRatingPage] = useState(1)
  const [ratingPageSize, setRatingPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!hasApi) {
      setLoading(false)
      setRows([])
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const list = await fetchAllRatings()
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load ratings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick])

  useEffect(() => {
    const id = window.setTimeout(() => setRatingFilter(ratingFilterInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [ratingFilterInput])

  useEffect(() => {
    queueMicrotask(() => setRatingPage(1))
  }, [ratingFilter, ratingScoreFilter])

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [rows],
  )

  const filteredRatings = useMemo(() => {
    const q = ratingFilter
    const scoreFilter = ratingScoreFilter ? Number(ratingScoreFilter) : null
    return sorted.filter((r) => {
      if (scoreFilter != null && r.rating !== scoreFilter) return false
      if (!q) return true
      const blob = [
        r.patient_name,
        r.patient_age != null ? String(r.patient_age) : '',
        r.user_name,
        r.user_role,
        formatRatingContact(r),
        formatShortOrderId(r.order_id),
        r.order_id,
        r.order_status,
        r.priority,
        formatRatingTests(r.order_tests),
        r.final_price_mmk != null ? String(r.final_price_mmk) : '',
        String(r.rating),
        r.remark,
        formatRatingSubmittedDate(r.created_at),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [sorted, ratingFilter, ratingScoreFilter])

  const pagedRatings = useMemo(() => {
    const start = (ratingPage - 1) * ratingPageSize
    return filteredRatings.slice(start, start + ratingPageSize)
  }, [filteredRatings, ratingPage, ratingPageSize])

  const hasActiveFilters = ratingFilterInput.trim() !== '' || ratingScoreFilter !== ''

  return (
    <div className="stack">
      <PageHeader
        title="Ratings & feedback"
        description="Review patient and partner ratings with order context — patient, tests, status, and contact details."
      />
      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Data is loaded only from the
            backend.
          </p>
        </div>
      ) : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label="Filter ratings">
          <ListFilterSearchField
            id="rating-filter-search"
            label="Feedback"
            placeholder={listFilterSearchPlaceholder(
              'Feedback',
              'patient, user, order, tests, status, stars, remark',
            )}
            value={ratingFilterInput}
            onChange={(e) => setRatingFilterInput(e.target.value)}
            disabled={!hasApi}
          />
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="rating-score-filter">
              Rating
            </label>
            <select
              id="rating-score-filter"
              className="list-filters-bar__select"
              value={ratingScoreFilter}
              onChange={(e) => setRatingScoreFilter(e.target.value as '' | '1' | '2' | '3' | '4' | '5')}
              disabled={!hasApi}
            >
              {RATING_SCORE_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={() => {
              setRatingFilterInput('')
              setRatingFilter('')
              setRatingScoreFilter('')
              setRatingPage(1)
            }}
            disabled={!hasApi || !hasActiveFilters}
          >
            Clear filters
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={!hasApi}
            aria-busy={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Submitted by</th>
              <th>Contact</th>
              <th>Order</th>
              <th>Tests</th>
              <th>Amount</th>
              <th>Rating</th>
              <th>Remark</th>
              <th>Rated on</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                  <LoadingSpinner label="Loading ratings" />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__state">
                  {hasApi ? 'No ratings yet.' : 'Configure the API to load ratings.'}
                </td>
              </tr>
            ) : filteredRatings.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__state">
                  No ratings match this search.
                </td>
              </tr>
            ) : (
              pagedRatings.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span>{r.patient_name?.trim() || '—'}</span>
                    {r.patient_age != null ? (
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Age {r.patient_age}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span>{r.user_name?.trim() || '—'}</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {endUserRoleLabel(r.user_role)}
                    </span>
                  </td>
                  <td>{formatRatingContact(r)}</td>
                  <td>
                    <code style={{ fontSize: '0.72rem' }} title={r.order_id}>
                      {formatShortOrderId(r.order_id)}
                    </code>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {r.order_status ? (
                        <span className={orderStatusBadgeClass(r.order_status)}>{r.order_status}</span>
                      ) : null}
                      {r.priority ? (
                        <span className={priorityBadgeClass(r.priority)}>{r.priority}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatRatingTests(r.order_tests)}</td>
                  <td className="col-num">
                    {r.final_price_mmk != null ? `${r.final_price_mmk.toLocaleString()} MMK` : '—'}
                  </td>
                  <td>
                    <RatingStarsDisplay value={r.rating} />
                  </td>
                  <td>{r.remark?.trim() || '—'}</td>
                  <td>{formatRatingSubmittedDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hasApi && filteredRatings.length > 0 ? (
        <TablePagination
          mode="client"
          page={ratingPage}
          pageSize={ratingPageSize}
          totalItems={filteredRatings.length}
          itemsOnPage={pagedRatings.length}
          onPageChange={setRatingPage}
          onPageSizeChange={(n) => {
            setRatingPageSize(n)
            setRatingPage(1)
          }}
        />
      ) : null}
    </div>
  )
}
