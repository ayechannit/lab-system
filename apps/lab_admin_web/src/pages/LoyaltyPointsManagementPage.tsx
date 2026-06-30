import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { PointSettingFormModal } from '../components/loyalty/PointSettingFormModal'
import type { UserListRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  deletePointSetting,
  type PointSettingRow,
  fetchPointSettings,
} from '../services/pointSettingService'
import { fetchUserList } from '../services/userService'
import { getIntlLocale } from '../i18n'
import { roleLabel } from '../utils/roleLabels'
import { formatIsoDatetime } from '../utils/dateIntl'
import '../components/common/ui.css'

function formatRulePeriod(
  start: string | null,
  end: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string,
): string {
  if (!start && !end) return t('loyalty.schedule.anyTime')
  const fmt = (iso: string) => formatIsoDatetime(iso, locale)
  if (start && end) return `${fmt(start)} → ${fmt(end)}`
  if (start) return t('loyalty.schedule.from', { date: fmt(start) })
  return t('loyalty.schedule.until', { date: fmt(end!) })
}

function ruleDisplayName(name: string, t: (key: string) => string): string {
  if (name.trim().toLowerCase() === 'default tier') return t('loyalty.form.defaultTierName')
  return name
}

const rulesColSpan = 6
const usersColSpan = 4

export function LoyaltyPointsManagementPage() {
  const { t } = useTranslation()
  const intlLocale = getIntlLocale()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rules, setRules] = useState<PointSettingRow[]>([])
  const [users, setUsers] = useState<UserListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [userSearch, setUserSearch] = useState('')

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

  useErrorToast(loadError)

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
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('loyalty.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, t])

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
      showSuccess(t('loyalty.delete.success'))
      setRefreshTick((x) => x + 1)
    } catch (e) {
      showError(e instanceof Error ? e.message : t('loyalty.delete.failed'))
    } finally {
      setDeleting(false)
      setDeleteRule(null)
    }
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.loyalty.title')} description={t('pages.loyalty.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div
        className="card"
        style={{
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
          border: '1px solid var(--border, #e8ecf4)',
        }}
      >
          <div className="segment-tabs" role="tablist" aria-label={t('loyalty.tabsAria')}>
            <button
              type="button"
              className={`segment-tabs__tab${loyaltyTab === 'rules' ? ' segment-tabs__tab--active' : ''}`}
              role="tab"
              aria-selected={loyaltyTab === 'rules'}
              id="loyalty-tab-earn-rules"
              aria-controls="loyalty-panel-earn-rules"
              onClick={() => setLoyaltyTab('rules')}
            >
              {t('loyalty.tabRules')}
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
              {t('loyalty.tabUsers')}
            </button>
          </div>

          <div
            id="loyalty-panel-earn-rules"
            role="tabpanel"
            aria-labelledby="loyalty-tab-earn-rules"
            hidden={loyaltyTab !== 'rules'}
          >
            <h3 className="card-title" style={{ margin: '0 0 0.35rem' }}>
              {t('loyalty.rulesTitle')}
            </h3>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem', maxWidth: 520 }}>
              {t('loyalty.rulesHint')}
            </p>
            <div className="list-tools-row">
              <div className="list-filters-bar" aria-label={t('loyalty.tabRules')} />
              <div className="list-tools-row__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRefreshTick((tick) => tick + 1)}
                  disabled={loading || !hasApi}
                >
                  {loading ? t('common.refreshing') : t('common.refresh')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openCreateRule}
                  disabled={loading || !hasApi}
                >
                  {t('loyalty.addRule')}
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('loyalty.table.mmkPerBatch')}</th>
                    <th>{t('loyalty.table.points')}</th>
                    <th>{t('common.active')}</th>
                    <th>{t('common.schedule')}</th>
                    <th className="action-col">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={rulesColSpan} className="data-table__state data-table__state--loading">
                        <LoadingSpinner label={t('loyalty.loadingRules')} />
                      </td>
                    </tr>
                  ) : !hasApi ? (
                    <tr>
                      <td colSpan={rulesColSpan} className="data-table__state">
                        {t('loyalty.noApiRules')}
                      </td>
                    </tr>
                  ) : sortedRules.length === 0 ? (
                    <tr>
                      <td colSpan={rulesColSpan} className="data-table__state">
                        {t('loyalty.emptyRules')}
                      </td>
                    </tr>
                  ) : (
                    pagedRules.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{ruleDisplayName(row.name, t)}</td>
                        <td>
                          {row.spend_amount_mmk.toLocaleString()} {t('orders.currency')}
                        </td>
                        <td>{row.points_reward.toLocaleString()}</td>
                        <td>
                          {row.is_active ? (
                            <span className="badge badge--success">{t('common.active')}</span>
                          ) : (
                            <span className="badge" style={{ background: '#eef1f6', color: '#5c6478' }}>
                              {t('common.off')}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--muted)', maxWidth: 280 }}>
                          {formatRulePeriod(row.start_date, row.end_date, t, intlLocale)}
                        </td>
                        <td className="action-cell">
                          <TableActionMenu
                            open={ruleMenuId === row.id}
                            onOpenChange={(next) => setRuleMenuId(next ? row.id : null)}
                            items={[
                              { label: t('common.edit'), onSelect: () => openEditRule(row) },
                              {
                                label: t('common.delete'),
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
              {t('loyalty.usersTitle')}
            </h3>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
              {t('loyalty.usersHint')}
            </p>
            <div className="list-tools-row">
              <div className="list-filters-bar" aria-label={t('loyalty.filters.usersAria')}>
                <ListFilterSearchField
                  id="user-search"
                  label={t('common.user')}
                  placeholder={listFilterSearchPlaceholder(
                    t('common.user'),
                    t('loyalty.filters.searchDetail'),
                  )}
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
                  {t('filters.clearFilters')}
                </button>
              </div>
              <div className="list-tools-row__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRefreshTick((t) => t + 1)}
                  disabled={!hasApi || loading}
                >
                  {loading ? t('common.refreshing') : t('common.refresh')}
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('loyalty.table.userId')}</th>
                    <th>{t('common.name')}</th>
                    <th>{t('common.role')}</th>
                    <th>{t('loyalty.table.pointsBalance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={usersColSpan} className="data-table__state data-table__state--loading">
                        <LoadingSpinner label={t('loyalty.loadingUsers')} />
                      </td>
                    </tr>
                  ) : !hasApi ? (
                    <tr>
                      <td colSpan={usersColSpan} className="data-table__state">
                        {t('loyalty.noApiUsers')}
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={usersColSpan} className="data-table__state">
                        {users.length === 0 ? t('loyalty.emptyUsers') : t('loyalty.noUserMatch')}
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

      <PointSettingFormModal
        key={formNonce}
        open={formOpen}
        mode={formMode}
        initial={editRule}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setLoyaltyTab('rules')
          showSuccess(formMode === 'edit' ? t('loyalty.toast.updated') : t('loyalty.toast.created'))
          setRefreshTick((x) => x + 1)
        }}
      />

      <ConfirmDialog
        open={deleteRule != null}
        title={t('loyalty.delete.title')}
        message={deleteRule ? t('loyalty.delete.message', { name: deleteRule.name }) : ''}
        confirmLabel={deleting ? t('common.saving') : t('common.delete')}
        danger
        onConfirm={() => void confirmDeleteRule()}
        onCancel={() => !deleting && setDeleteRule(null)}
      />
    </div>
  )
}
