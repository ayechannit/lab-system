import { useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { pointsRule as initialRule, userPoints } from '../mock-data/loyalty'
import '../components/common/ui.css'

const POINTS_RULE_KEY = 'lab_admin_points_rule_v1'

export function LoyaltyPointsManagementPage() {
  const [mmk, setMmk] = useState(() => {
    try {
      const raw = window.localStorage.getItem(POINTS_RULE_KEY)
      if (!raw) return initialRule.mmkSpend
      const parsed = JSON.parse(raw)
      return Number(parsed.mmkSpend) || initialRule.mmkSpend
    } catch {
      return initialRule.mmkSpend
    }
  })
  const [pts, setPts] = useState(() => {
    try {
      const raw = window.localStorage.getItem(POINTS_RULE_KEY)
      if (!raw) return initialRule.pointsEarned
      const parsed = JSON.parse(raw)
      return Number(parsed.pointsEarned) || initialRule.pointsEarned
    } catch {
      return initialRule.pointsEarned
    }
  })

  return (
    <div className="stack">
      <PageHeader
        title="Member loyalty points"
        description="Define how many points members earn per MMK spent, and audit balances per user (synced to the mobile app when backend exists)."
      />
      <div className="card">
        <h3 className="card-title">Earn rule (MMK → points)</h3>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          Example rule: <strong>{initialRule.mmkSpend.toLocaleString()} MMK = {initialRule.pointsEarned} points</strong>{' '}
          (adjust below for your program).
        </p>
        <div className="form-grid" style={{ marginTop: '1rem', maxWidth: 420 }}>
          <div className="field">
            <label htmlFor="mmk">MMK spend per batch</label>
            <input
              id="mmk"
              type="number"
              value={mmk}
              onChange={(e) => setMmk(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="pts">Points earned per batch</label>
            <input id="pts" type="number" value={pts} onChange={(e) => setPts(Number(e.target.value))} />
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => {
            try {
              window.localStorage.setItem(
                POINTS_RULE_KEY,
                JSON.stringify({ mmkSpend: mmk, pointsEarned: pts }),
              )
            } catch {
              /* ignore storage failures */
            }
            window.alert(`Saved earn rule (demo): ${mmk.toLocaleString()} MMK → ${pts} points`)
          }}
        >
          Save earn rule
        </button>
      </div>
      <div className="card">
        <h3 className="card-title">Points by user</h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
          See which account holds how many points for support and reconciliation.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Points balance</th>
              </tr>
            </thead>
            <tbody>
              {userPoints.map((u) => (
                <tr key={u.userId}>
                  <td>
                    <code>{u.userId}</code>
                  </td>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className="badge badge--success">{u.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
