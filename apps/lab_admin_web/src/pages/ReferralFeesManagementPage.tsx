import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ReferralFeeFormModal } from '../components/referral-fees/ReferralFeeFormModal'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { LabTestCatalogRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  deleteReferralFeeById,
  fetchAllReferralFees,
  type ReferralFeeRole,
  type TestReferralFeeListRow,
} from '../services/referralFeeService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import { roleLabel } from '../utils/roleLabels'
import '../components/common/ui.css'

const colSpan = 8

const REFERRAL_ROLE_FILTER_VALUES: ('' | ReferralFeeRole)[] = [
  '',
  'clinic',
  'doctor',
  'patient',
  'phlebotomist',
]

export function ReferralFeesManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<TestReferralFeeListRow[]>([])
  const [tests, setTests] = useState<LabTestCatalogRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<TestReferralFeeListRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestReferralFeeListRow | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'' | ReferralFeeRole>('')

  const roleFilterOptions = useMemo(
    () =>
      REFERRAL_ROLE_FILTER_VALUES.map((value) => ({
        value,
        label: value === '' ? t('common.allRoles') : roleLabel(value),
      })),
    [t],
  )

  useEffect(() => {
    if (!hasApi) {
      setLoading(false)
      setRows([])
      setTests([])
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const [feeList, catalog] = await Promise.all([fetchAllReferralFees(), fetchLabTestsList()])
        if (!cancelled) {
          setRows(feeList)
          setTests(catalog.filter((test) => test.is_active && !test.is_deleted))
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('referralFees.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, t])

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, search, roleFilter])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const na = (a.test_name ?? a.test_id).localeCompare(b.test_name ?? b.test_id)
      if (na !== 0) return na
      return a.role.localeCompare(b.role)
    })
  }, [rows])

  const filtered = useMemo(() => {
    let list = sorted
    if (roleFilter) {
      list = list.filter((r) => r.role === roleFilter)
    }
    if (search) {
      list = list.filter((r) => {
        const name = (r.test_name ?? '').toLowerCase()
        const code = (r.test_code ?? '').toLowerCase()
        return name.includes(search) || code.includes(search)
      })
    }
    return list
  }, [sorted, search, roleFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: TestReferralFeeListRow) {
    setFormMode('edit')
    setEditInitial(row)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditInitial(null)
  }

  async function confirmDelete() {
    if (!deleteTarget || !hasApi) return
    const row = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteReferralFeeById(row.id)
      showSuccess(t('referralFees.delete.success'))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('common.delete')))
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setRoleFilter('')
    setPage(1)
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.referralFees.title')} description={t('pages.referralFees.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label={t('referralFees.filters.ariaLabel')}>
            <ListFilterSearchField
              id="referral-fee-filter-test"
              label={t('common.test')}
              placeholder={listFilterSearchPlaceholder(
                t('common.test'),
                t('referralFees.filters.searchDetail'),
              )}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="referral-fee-filter-role">
                {t('common.role')}
              </label>
              <select
                id="referral-fee-filter-role"
                className="list-filters-bar__select"
                value={roleFilter}
                onChange={(e) => setRoleFilter((e.target.value || '') as '' | ReferralFeeRole)}
                disabled={loading || !hasApi}
              >
                {roleFilterOptions.map((o) => (
                  <option key={o.value || 'all-roles'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi || (searchInput.trim() === '' && roleFilter === '')}
            >
              {t('filters.clearFilters')}
            </button>
          </div>
          <div className="list-tools-row__actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRefreshTick((tick) => tick + 1)}
              disabled={loading || !hasApi}
            >
              {loading ? t('common.refreshing') : t('common.refresh')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate} disabled={loading || !hasApi}>
              {t('referralFees.add')}
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">{t('referralFees.hint')}</p>
        <div className="table-wrap">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th>{t('common.test')}</th>
                <th>{t('common.code')}</th>
                <th>{t('common.role')}</th>
                <th className="col-num">{t('labTests.table.base')}</th>
                <th className="col-num">{t('referralFees.table.referralPercent')}</th>
                <th className="col-num">{t('referralFees.table.fee')}</th>
                <th>{t('common.active')}</th>
                <th className="action-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('referralFees.loading')} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <p className="data-table__empty-title">{t('referralFees.empty.title')}</p>
                      <p className="data-table__empty-text">{t('referralFees.empty.body')}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          {t('referralFees.add')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('referralFees.noMatch')}
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id}>
                    <td>{r.test_name ?? t('common.none')}</td>
                    <td>
                      <code>{r.test_code ?? t('common.none')}</code>
                    </td>
                    <td>{roleLabel(r.role)}</td>
                    <td className="col-num">
                      {r.original_price !== undefined ? r.original_price.toLocaleString() : t('common.none')}
                    </td>
                    <td className="col-num">{r.referral_percent}</td>
                    <td className="col-num">
                      {r.referral_fee_amount !== undefined
                        ? r.referral_fee_amount.toLocaleString()
                        : t('common.none')}
                    </td>
                    <td>
                      {r.is_active ? (
                        <span className="badge badge--success">{t('common.yes')}</span>
                      ) : (
                        <span className="badge badge--neutral">{t('common.no')}</span>
                      )}
                    </td>
                    <td className="action-cell">
                      <TableActionMenu
                        open={openMenuId === r.id}
                        onOpenChange={(next) => setOpenMenuId(next ? r.id : null)}
                        items={[
                          { label: t('common.edit'), onSelect: () => openEdit(r) },
                          {
                            label: t('common.delete'),
                            onSelect: () => {
                              setDeleteTarget(r)
                              setOpenMenuId(null)
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
        {!loading && hasApi && filtered.length > 0 ? (
          <TablePagination
            mode="client"
            page={page}
            pageSize={pageSize}
            totalItems={filtered.length}
            itemsOnPage={paged.length}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n)
              setPage(1)
            }}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('referralFees.delete.title')}
        message={
          deleteTarget
            ? t('referralFees.delete.message', {
                role: roleLabel(deleteTarget.role),
                test: deleteTarget.test_name ?? deleteTarget.test_id,
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ReferralFeeFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editInitial}
        tests={tests}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(
            formMode === 'edit' ? t('referralFees.toast.updated') : t('referralFees.toast.created'),
          )
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
