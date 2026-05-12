import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
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
  }, [hasApi])

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [rows],
  )

  return (
    <div className="stack">
      <PageHeader
        title="Ratings & feedback"
        description="Monitor star ratings and written remarks from patients and clinics after results are delivered."
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
                <td colSpan={colSpan} className="data-table__state">
                  Loading…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__state">
                  {hasApi ? 'No ratings yet.' : 'Configure the API to load ratings.'}
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
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
    </div>
  )
}
