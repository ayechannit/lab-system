import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { isApiMode } from '../services/apiBase'
import {
  fetchAllRatings,
  formatRatingSubmittedDate,
  type RatingListRow,
} from '../services/ratingService'
import '../components/common/ui.css'

function endUserRoleLabel(role: string | undefined): string {
  if (!role) return '—'
  const map: Record<string, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
  }
  return map[role] ?? role
}

const colSpan = 5

export function RatingsFeedbackPage() {
  const hasApi = isApiMode()
  const [rows, setRows] = useState<RatingListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ratingFilterInput, setRatingFilterInput] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
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
  }, [ratingFilter])

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [rows],
  )

  const filteredRatings = useMemo(() => {
    const q = ratingFilter
    if (!q) return sorted
    return sorted.filter((r) => {
      const blob = [
        r.user_name,
        r.user_role,
        String(r.rating),
        r.remark,
        formatRatingSubmittedDate(r.created_at),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [sorted, ratingFilter])

  const pagedRatings = useMemo(() => {
    const start = (ratingPage - 1) * ratingPageSize
    return filteredRatings.slice(start, start + ratingPageSize)
  }, [filteredRatings, ratingPage, ratingPageSize])

  return (
    <div className="stack">
      <PageHeader
        title="Ratings & feedback"
        description="Read star ratings and comments from patients and partners after they receive care or results."
      />
      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Data is loaded only from the
            backend.
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="card" style={{ borderColor: '#f0c4c4', background: '#fff8f8' }}>
          <p style={{ margin: 0, color: '#ba1a1a', fontSize: '0.9rem' }}>{loadError}</p>
        </div>
      ) : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label="Filter ratings">
          <div className="list-filters-bar__group list-filters-bar__group--text">
            <label className="list-filters-bar__label" htmlFor="rating-filter-search">
              Search
            </label>
            <input
              id="rating-filter-search"
              className="list-filters-bar__input"
              placeholder="User, role, stars, remark…"
              value={ratingFilterInput}
              onChange={(e) => setRatingFilterInput(e.target.value)}
              disabled={!hasApi || loading}
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={() => {
              setRatingFilterInput('')
              setRatingFilter('')
              setRatingPage(1)
            }}
            disabled={!hasApi || loading || ratingFilterInput.trim() === ''}
          >
            Clear filters
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={!hasApi || loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Rating</th>
              <th>Remark</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
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
                  <td>{r.user_name?.trim() || '—'}</td>
                  <td>{endUserRoleLabel(r.user_role)}</td>
                  <td>{r.rating} ★</td>
                  <td>{r.remark?.trim() || '—'}</td>
                  <td>{formatRatingSubmittedDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && hasApi && filteredRatings.length > 0 ? (
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
