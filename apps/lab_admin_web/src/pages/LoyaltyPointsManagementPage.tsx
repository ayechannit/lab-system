import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { PointSettingFormModal } from '../components/loyalty/PointSettingFormModal'
import type { EndUserRole, UserListRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  deletePointSetting,
  type PointSettingRow,
  fetchPointSettings,
} from '../services/pointSettingService'
import { fetchUserList } from '../services/userService'
import '../components/common/ui.css'

function roleLabel(r: EndUserRole): string {
  const map: Record<EndUserRole, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
  }
  return map[r]
}

function formatRulePeriod(start: string | null, end: string | null): string {
  if (!start && !end) return 'Any time'
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  if (start && end) return `${fmt(start)} → ${fmt(end)}`
  if (start) return `From ${fmt(start)}`
  return `Until ${fmt(end!)}`
}

const rulesColSpan = 6
const usersColSpan = 4

export function LoyaltyPointsManagementPage() {
  const hasApi = isApiMode()
  const [rules, setRules] = useState<PointSettingRow[]>([])
  const [users, setUsers] = useState<UserListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [userSearch, setUserSearch] = useState('')
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const [rulesPage, setRulesPage] = useState(1)
  const [rulesPageSize, setRulesPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [usersPage, setUsersPage] = useState(1)
  const [usersPageSize, setUsersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formNonce, setFormNonce] = useState(0)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editRule, setEditRule] = useState<PointSettingRow | null>(null)
  const [ruleMenuId, setRuleMenuId] = useState<string | null>(null)
  const [deleteRule, setDeleteRule] = useState<PointSettingRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loyaltyTab, setLoyaltyTab] = useState<'rules' | 'users'>('rules')

  useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 6000)
    return () => window.clearTimeout(t)
  }, [banner])

  useEffect(() => {
    if (!hasApi) {
      setLoading(false)
      setRules([])
      setUsers([])
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const [r, u] = await Promise.all([fetchPointSettings(), fetchUserList()])
        if (!cancelled) {
          setRules(r)
          setUsers(u.filter((row) => !row.is_deleted))
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load loyalty data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick])

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => b.spend_amount_mmk - a.spend_amount_mmk),
    [rules],
  )

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    const list = [...users].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return list
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }, [users, userSearch])

  useEffect(() => {
    queueMicrotask(() => setRulesPage(1))
  }, [refreshTick, rules.length])

  useEffect(() => {
    queueMicrotask(() => setUsersPage(1))
  }, [userSearch])

  const pagedRules = useMemo(() => {
    const start = (rulesPage - 1) * rulesPageSize
    return sortedRules.slice(start, start + rulesPageSize)
  }, [sortedRules, rulesPage, rulesPageSize])

  const pagedUsers = useMemo(() => {
    const start = (usersPage - 1) * usersPageSize
    return filteredUsers.slice(start, start + usersPageSize)
  }, [filteredUsers, usersPage, usersPageSize])

  function openCreateRule() {
    setFormMode('create')
    setEditRule(null)
    setFormNonce((n) => n + 1)
    setFormOpen(true)
  }

  function openEditRule(row: PointSettingRow) {
    setFormMode('edit')
    setEditRule(row)
    setFormNonce((n) => n + 1)
    setFormOpen(true)
    setRuleMenuId(null)
  }

  async function confirmDeleteRule() {
    if (!deleteRule) return
    setDeleting(true)
    try {
      await deletePointSetting(deleteRule.id)
      setBanner({ kind: 'ok', text: 'Earn rule removed.' })
      setRefreshTick((x) => x + 1)
    } catch (e) {
      setBanner({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Could not delete rule',
      })
    } finally {
      setDeleting(false)
      setDeleteRule(null)
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Loyalty points"
        description="Control how members earn points from spending, manage active promotions, and check point balances for your customers."
      />

      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Loyalty rules and balances load
            from the backend.
          </p>
        </div>
      ) : null}

      {banner ? (
        <div
          className="card"
          style={{
            borderColor: banner.kind === 'ok' ? '#b6e2c9' : '#f0c4c4',
            background: banner.kind === 'ok' ? '#f3fcf6' : '#fff8f8',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: banner.kind === 'ok' ? '#1b5e2a' : '#ba1a1a',
            }}
          >
            {banner.text}
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="card" style={{ borderColor: '#f0c4c4', background: '#fff8f8' }}>
          <p style={{ margin: 0, color: '#ba1a1a', fontSize: '0.9rem' }}>{loadError}</p>
        </div>
      ) : (
        <div
          className="card"
          style={{
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            border: '1px solid var(--border, #e8ecf4)',
          }}
        >
          <div className="segment-tabs" role="tablist" aria-label="Loyalty sections">
            <button
              type="button"
              className={`segment-tabs__tab${loyaltyTab === 'rules' ? ' segment-tabs__tab--active' : ''}`}
              role="tab"
              aria-selected={loyaltyTab === 'rules'}
              id="loyalty-tab-earn-rules"
              aria-controls="loyalty-panel-earn-rules"
              onClick={() => setLoyaltyTab('rules')}
            >
              Earn rules
            </button>
            <button
              type="button"
              className={`segment-tabs__tab${loyaltyTab === 'users' ? ' segment-tabs__tab--active' : ''}`}
              role="tab"
              aria-selected={loyaltyTab === 'users'}
              id="loyalty-tab-points-by-user"
              aria-controls="loyalty-panel-points-by-user"
              onClick={() => setLoyaltyTab('users')}
            >
              Points by user
            </button>
          </div>

          <div
            id="loyalty-panel-earn-rules"
            role="tabpanel"
            aria-labelledby="loyalty-tab-earn-rules"
            hidden={loyaltyTab !== 'rules'}
          >
            <h3 className="card-title" style={{ margin: '0 0 0.35rem' }}>
              Earn rules (MMK → points)
            </h3>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem', maxWidth: 520 }}>
              Each rule defines how many points are granted when spend reaches the MMK threshold. Optional start and
              end dates limit seasonal campaigns. Inactive rules are listed here but do not award points until you
              turn them on again.
            </p>
            <div className="list-tools-row">
              <div className="list-filters-bar" aria-label="Earn rules" />
              <div className="list-tools-row__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRefreshTick((t) => t + 1)}
                  disabled={loading || !hasApi}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openCreateRule}
                  disabled={loading || !hasApi}
                >
                  Add rule
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>MMK per batch</th>
                    <th>Points</th>
                    <th>Active</th>
                    <th>Schedule</th>
                    <th className="action-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={rulesColSpan} className="data-table__state data-table__state--loading">
                        <LoadingSpinner label="Loading earn rules" />
                      </td>
                    </tr>
                  ) : !hasApi ? (
                    <tr>
                      <td colSpan={rulesColSpan} className="data-table__state">
                        Connect the API to manage earn rules.
                      </td>
                    </tr>
                  ) : sortedRules.length === 0 ? (
                    <tr>
                      <td colSpan={rulesColSpan} className="data-table__state">
                        No earn rules yet. Add one to start awarding points on paid orders.
                      </td>
                    </tr>
                  ) : (
                    pagedRules.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.spend_amount_mmk.toLocaleString()} MMK</td>
                        <td>{row.points_reward.toLocaleString()}</td>
                        <td>
                          {row.is_active ? (
                            <span className="badge badge--success">Active</span>
                          ) : (
                            <span className="badge" style={{ background: '#eef1f6', color: '#5c6478' }}>
                              Off
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--muted)', maxWidth: 280 }}>
                          {formatRulePeriod(row.start_date, row.end_date)}
                        </td>
                        <td className="action-cell">
                          <TableActionMenu
                            open={ruleMenuId === row.id}
                            onOpenChange={(next) => setRuleMenuId(next ? row.id : null)}
                            items={[
                              { label: 'Edit', onSelect: () => openEditRule(row) },
                              {
                                label: 'Delete',
                                onSelect: () => {
                                  setDeleteRule(row)
                                  setRuleMenuId(null)
                                },
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && hasApi && sortedRules.length > 0 ? (
              <TablePagination
                mode="client"
                page={rulesPage}
                pageSize={rulesPageSize}
                totalItems={sortedRules.length}
                itemsOnPage={pagedRules.length}
                onPageChange={setRulesPage}
                onPageSizeChange={(n) => {
                  setRulesPageSize(n)
                  setRulesPage(1)
                }}
              />
            ) : null}
          </div>

          <div
            id="loyalty-panel-points-by-user"
            role="tabpanel"
            aria-labelledby="loyalty-tab-points-by-user"
            hidden={loyaltyTab !== 'users'}
          >
            <h3 className="card-title" style={{ margin: '0 0 0.35rem' }}>
              Points by user
            </h3>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
              Live <code>total_points</code> from each account for support and reconciliation.
            </p>
            <div className="list-tools-row">
              <div className="list-filters-bar" aria-label="User points search">
                <ListFilterSearchField
                  id="user-search"
                  label="User"
                  placeholder={listFilterSearchPlaceholder('User', 'name, email, role')}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  disabled={!hasApi || loading}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm list-filters-bar__clear"
                  onClick={() => {
                    setUserSearch('')
                    setUsersPage(1)
                  }}
                  disabled={!hasApi || loading || userSearch.trim() === ''}
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
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Points balance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={usersColSpan} className="data-table__state data-table__state--loading">
                        <LoadingSpinner label="Loading point balances" />
                      </td>
                    </tr>
                  ) : !hasApi ? (
                    <tr>
                      <td colSpan={usersColSpan} className="data-table__state">
                        Connect the API to load user point balances.
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={usersColSpan} className="data-table__state">
                        {users.length === 0
                          ? 'No users in the system yet.'
                          : 'No users match your search.'}
                      </td>
                    </tr>
                  ) : (
                    pagedUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <code style={{ fontSize: '0.8rem' }} title={u.id}>
                            {u.id.length > 12 ? `${u.id.slice(0, 10)}…` : u.id}
                          </code>
                        </td>
                        <td>{u.name}</td>
                        <td>{roleLabel(u.role)}</td>
                        <td>
                          <span className="badge badge--success">{u.total_points.toLocaleString()}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && hasApi && filteredUsers.length > 0 ? (
              <TablePagination
                mode="client"
                page={usersPage}
                pageSize={usersPageSize}
                totalItems={filteredUsers.length}
                itemsOnPage={pagedUsers.length}
                onPageChange={setUsersPage}
                onPageSizeChange={(n) => {
                  setUsersPageSize(n)
                  setUsersPage(1)
                }}
              />
            ) : null}
          </div>
        </div>
      )}

      <PointSettingFormModal
        key={formNonce}
        open={formOpen}
        mode={formMode}
        initial={editRule}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setLoyaltyTab('rules')
          setBanner({
            kind: 'ok',
            text: formMode === 'edit' ? 'Earn rule updated.' : 'Earn rule created.',
          })
          setRefreshTick((x) => x + 1)
        }}
      />

      <ConfirmDialog
        open={deleteRule != null}
        title="Delete earn rule?"
        message={
          deleteRule
            ? `Delete “${deleteRule.name}” (${deleteRule.spend_amount_mmk.toLocaleString()} MMK → ${deleteRule.points_reward} pts)? This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        danger
        onConfirm={() => void confirmDeleteRule()}
        onCancel={() => !deleting && setDeleteRule(null)}
      />
    </div>
  )
}
