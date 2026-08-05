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
import {
  fetchPointRedemptionSetting,
  updatePointRedemptionSetting,
  type PointRedemptionSetting,
} from '../services/pointRedemptionSettingService'
import { fetchUserList } from '../services/userService'
import {
  fetchPointTransactions,
  type PointTransactionRow,
  type PointTransactionType,
} from '../services/pointTransactionService'
import { getIntlLocale } from '../i18n'
import { formatIsoDatetime } from '../utils/dateIntl'
import { membershipTierLabel } from '../utils/membershipTierLabels'
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

function transactionTypeLabel(type: string, t: (key: string) => string): string {
  if (type === 'earn') return t('loyalty.records.typeEarn')
  if (type === 'redeem') return t('loyalty.records.typeRedeem')
  if (type === 'adjustment') return t('loyalty.records.typeAdjustment')
  return type
}

const rulesColSpan = 6
const usersColSpan = 4
const recordsColSpan = 4

const RECORDS_TYPE_FILTER_VALUES: ('' | PointTransactionType)[] = ['', 'earn', 'redeem', 'adjustment']

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
  const [loyaltyTab, setLoyaltyTab] = useState<'rules' | 'users' | 'redeem' | 'records'>('rules')

  const [redemptionSetting, setRedemptionSetting] = useState<PointRedemptionSetting | null>(null)
  const [redeemRateInput, setRedeemRateInput] = useState<number | ''>('')
  const [redeemSaving, setRedeemSaving] = useState(false)

  const [records, setRecords] = useState<PointTransactionRow[]>([])
  const [recordsLoading, setRecordsLoading] = useState(hasApi)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [recordsTypeFilter, setRecordsTypeFilter] = useState<'' | PointTransactionType>('redeem')
  const [recordsSearch, setRecordsSearch] = useState('')
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  useErrorToast(loadError)
  useErrorToast(recordsError)

  useEffect(() => {
    if (!hasApi) {
      queueMicrotask(() => {
        setRecordsLoading(false)
        setRecords([])
      })
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      setRecordsLoading(true)
      setRecordsError(null)
    })
    void (async () => {
      try {
        const rows = await fetchPointTransactions(
          recordsTypeFilter ? { transaction_type: recordsTypeFilter } : undefined,
        )
        if (!cancelled) setRecords(rows)
      } catch (e) {
        if (!cancelled) setRecordsError(e instanceof Error ? e.message : t('loyalty.records.loadFailed'))
      } finally {
        if (!cancelled) setRecordsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, recordsTypeFilter, t])

  useEffect(() => {
    if (!hasApi) {
      queueMicrotask(() => {
        setLoading(false)
        setRules([])
        setUsers([])
        setRedemptionSetting(null)
        setRedeemRateInput('')
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
        const [r, u, redemption] = await Promise.all([
          fetchPointSettings(),
          fetchUserList(),
          fetchPointRedemptionSetting(),
        ])
        if (!cancelled) {
          setRules(r)
          setUsers(u.filter((row) => !row.is_deleted))
          setRedemptionSetting(redemption)
          setRedeemRateInput(redemption.mmk_per_point)
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

  async function handleSaveRedeemRate() {
    if (!hasApi) return
    const rate = typeof redeemRateInput === 'number' ? redeemRateInput : Number.parseFloat(String(redeemRateInput))
    if (!Number.isFinite(rate) || rate < 0) {
      showError(t('loyalty.redeem.errorInvalid'))
      return
    }
    setRedeemSaving(true)
    try {
      const rounded = Math.round(rate * 100) / 100
      const next = await updatePointRedemptionSetting(rounded)
      setRedemptionSetting(next)
      setRedeemRateInput(next.mmk_per_point)
      showSuccess(t('loyalty.redeem.toastSuccess'))
    } catch (e) {
      showError(e instanceof Error ? e.message : t('loyalty.redeem.toastError'))
    } finally {
      setRedeemSaving(false)
    }
  }

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => b.spend_amount_mmk - a.spend_amount_mmk),
    [rules],
  )

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    const list = [...users].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return list
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q),
    )
  }, [users, userSearch])

  useEffect(() => {
    queueMicrotask(() => setRulesPage(1))
  }, [refreshTick, rules.length])

  useEffect(() => {
    queueMicrotask(() => setUsersPage(1))
  }, [userSearch])

  const filteredRecords = useMemo(() => {
    const q = recordsSearch.trim().toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        (r.user_name ?? '').toLowerCase().includes(q) ||
        (r.user_phone ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
    )
  }, [records, recordsSearch])

  useEffect(() => {
    queueMicrotask(() => setRecordsPage(1))
  }, [refreshTick, recordsTypeFilter, recordsSearch])

  const pagedRecords = useMemo(() => {
    const start = (recordsPage - 1) * recordsPageSize
    return filteredRecords.slice(start, start + recordsPageSize)
  }, [filteredRecords, recordsPage, recordsPageSize])

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
            <button
              type="button"
              className={`segment-tabs__tab${loyaltyTab === 'redeem' ? ' segment-tabs__tab--active' : ''}`}
              role="tab"
              aria-selected={loyaltyTab === 'redeem'}
              id="loyalty-tab-redeem"
              aria-controls="loyalty-panel-redeem"
              onClick={() => setLoyaltyTab('redeem')}
            >
              {t('loyalty.tabRedeem')}
            </button>
            <button
              type="button"
              className={`segment-tabs__tab${loyaltyTab === 'records' ? ' segment-tabs__tab--active' : ''}`}
              role="tab"
              aria-selected={loyaltyTab === 'records'}
              id="loyalty-tab-records"
              aria-controls="loyalty-panel-records"
              onClick={() => setLoyaltyTab('records')}
            >
              {t('loyalty.tabRecords')}
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
                    <th>{t('loyalty.table.pointsBalance')}</th>
                    <th>{t('common.tier')}</th>
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
                        <td>
                          <span className="badge badge--success">{u.total_points.toLocaleString()}</span>
                        </td>
                        <td>
                          {u.tier_name ? (
                            <span className="badge badge--neutral">{membershipTierLabel(u.tier_name)}</span>
                          ) : (
                            t('common.none')
                          )}
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

          <div
            id="loyalty-panel-redeem"
            role="tabpanel"
            aria-labelledby="loyalty-tab-redeem"
            hidden={loyaltyTab !== 'redeem'}
          >
            <h3 className="card-title" style={{ margin: '0 0 0.35rem' }}>
              {t('loyalty.redeem.title')}
            </h3>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem', maxWidth: 520 }}>
              {t('loyalty.redeem.description')}
            </p>
            {!hasApi ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{t('loyalty.redeem.noApi')}</p>
            ) : loading ? (
              <LoadingSpinner label={t('loyalty.redeem.loading')} />
            ) : (
              <div
                className="card"
                style={{ maxWidth: 420, boxShadow: 'none', border: '1px solid var(--border, #e8ecf4)' }}
              >
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
                  {t('loyalty.redeem.currentRateLabel')}:{' '}
                  <strong>
                    {redemptionSetting
                      ? t('loyalty.redeem.currentRateValue', {
                          amount: redemptionSetting.mmk_per_point.toLocaleString(),
                          currency: t('orders.currency'),
                        })
                      : t('common.none')}
                  </strong>
                </p>
                {redemptionSetting && redemptionSetting.mmk_per_point <= 0 ? (
                  <p className="system-settings-subsection__hint system-settings-subsection__hint--warn">
                    {t('loyalty.redeem.unsetHint')}
                  </p>
                ) : null}
                <form
                  className="settings-form__stack"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleSaveRedeemRate()
                  }}
                >
                  <div className="field">
                    <label htmlFor="redeem-rate-input">{t('loyalty.redeem.inputLabel')}</label>
                    <input
                      id="redeem-rate-input"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={redeemRateInput === '' ? '' : redeemRateInput}
                      onChange={(e) =>
                        setRedeemRateInput(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      disabled={redeemSaving}
                    />
                  </div>
                  <div>
                    <button type="submit" className="btn btn-primary" disabled={redeemSaving}>
                      {redeemSaving ? t('common.saving') : t('loyalty.redeem.save')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div
            id="loyalty-panel-records"
            role="tabpanel"
            aria-labelledby="loyalty-tab-records"
            hidden={loyaltyTab !== 'records'}
          >
            <h3 className="card-title" style={{ margin: '0 0 0.35rem' }}>
              {t('loyalty.records.title')}
            </h3>
            <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem', maxWidth: 520 }}>
              {t('loyalty.records.description')}
            </p>
            <div className="list-tools-row">
              <div className="list-filters-bar" aria-label={t('loyalty.records.filtersAria')}>
                <ListFilterSearchField
                  id="records-search"
                  label={t('common.user')}
                  placeholder={listFilterSearchPlaceholder(
                    t('common.user'),
                    t('loyalty.records.searchDetail'),
                  )}
                  value={recordsSearch}
                  onChange={(e) => setRecordsSearch(e.target.value)}
                  disabled={!hasApi || recordsLoading}
                />
                <div className="list-filters-bar__group">
                  <label className="list-filters-bar__label" htmlFor="records-type-filter">
                    {t('loyalty.records.typeLabel')}
                  </label>
                  <select
                    id="records-type-filter"
                    className="list-filters-bar__select"
                    value={recordsTypeFilter}
                    onChange={(e) => setRecordsTypeFilter(e.target.value as '' | PointTransactionType)}
                    disabled={!hasApi || recordsLoading}
                  >
                    {RECORDS_TYPE_FILTER_VALUES.map((value) => (
                      <option key={value || 'all-types'} value={value}>
                        {value ? transactionTypeLabel(value, t) : t('loyalty.records.typeAll')}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm list-filters-bar__clear"
                  onClick={() => {
                    setRecordsSearch('')
                    setRecordsTypeFilter('')
                  }}
                  disabled={!hasApi || recordsLoading || (recordsSearch.trim() === '' && recordsTypeFilter === '')}
                >
                  {t('filters.clearFilters')}
                </button>
              </div>
              <div className="list-tools-row__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRefreshTick((tick) => tick + 1)}
                  disabled={!hasApi || recordsLoading}
                >
                  {recordsLoading ? t('common.refreshing') : t('common.refresh')}
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('loyalty.records.table.date')}</th>
                    <th>{t('common.user')}</th>
                    <th>{t('loyalty.records.table.type')}</th>
                    <th className="col-num">{t('loyalty.records.table.points')}</th>
                    <th>{t('loyalty.records.table.description')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recordsLoading ? (
                    <tr>
                      <td colSpan={recordsColSpan + 1} className="data-table__state data-table__state--loading">
                        <LoadingSpinner label={t('loyalty.records.loading')} />
                      </td>
                    </tr>
                  ) : !hasApi ? (
                    <tr>
                      <td colSpan={recordsColSpan + 1} className="data-table__state">
                        {t('loyalty.records.noApi')}
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={recordsColSpan + 1} className="data-table__state">
                        {records.length === 0 ? t('loyalty.records.empty') : t('loyalty.records.noMatch')}
                      </td>
                    </tr>
                  ) : (
                    pagedRecords.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                          {r.created_at ? formatIsoDatetime(r.created_at, intlLocale) : t('common.none')}
                        </td>
                        <td>
                          {r.user_name || t('common.none')}
                          {r.user_phone ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{r.user_phone}</div>
                          ) : null}
                        </td>
                        <td>
                          <span
                            className={`badge ${r.transaction_type === 'redeem' ? 'badge--warn' : 'badge--success'}`}
                          >
                            {transactionTypeLabel(r.transaction_type, t)}
                          </span>
                        </td>
                        <td className="col-num" style={{ color: r.points < 0 ? 'var(--danger, #c0392b)' : undefined }}>
                          {r.points > 0 ? `+${r.points}` : r.points}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{r.description || t('common.none')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!recordsLoading && hasApi && filteredRecords.length > 0 ? (
              <TablePagination
                mode="client"
                page={recordsPage}
                pageSize={recordsPageSize}
                totalItems={filteredRecords.length}
                itemsOnPage={pagedRecords.length}
                onPageChange={setRecordsPage}
                onPageSizeChange={(n) => {
                  setRecordsPageSize(n)
                  setRecordsPage(1)
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
