import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DiscountFormModal } from '../components/discounts/DiscountFormModal'
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
  deleteDiscountById,
  fetchAllDiscounts,
  formatDiscountDateCell,
  isDiscountLiveNow,
  type TestDiscountListRow,
} from '../services/discountService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import { scheduleStatusLabel } from '../utils/scheduleStatusLabels'
import { roleLabel } from '../utils/roleLabels'
import '../components/common/ui.css'

const colSpan = 10

const DISCOUNT_ROLE_FILTER_VALUES: ('' | 'clinic' | 'doctor' | 'patient' | 'all')[] = [
  '',
  'clinic',
  'doctor',
  'patient',
  'all',
]

function discountStatusBadge(row: TestDiscountListRow) {
  if (!row.is_active) {
    return <span className="badge badge--neutral">{scheduleStatusLabel('inactive')}</span>
  }
  if (isDiscountLiveNow(row)) {
    return <span className="badge badge--success">{scheduleStatusLabel('live')}</span>
  }
  const now = new Date()
  if (row.start_date && now < new Date(row.start_date)) {
    return <span className="badge badge--neutral">{scheduleStatusLabel('scheduled')}</span>
  }
  if (row.end_date && now > new Date(row.end_date)) {
    return <span className="badge badge--neutral">{scheduleStatusLabel('expired')}</span>
  }
  return <span className="badge badge--neutral">{scheduleStatusLabel('offSchedule')}</span>
}

function discountRoleLabel(role: string): string {
  if (role === 'all') return roleLabel('all')
  return roleLabel(role)
}

export function DiscountManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<TestDiscountListRow[]>([])
  const [tests, setTests] = useState<LabTestCatalogRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

  const [discountPage, setDiscountPage] = useState(1)
  const [discountPageSize, setDiscountPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<TestDiscountListRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestDiscountListRow | null>(null)

  const [discountSearchInput, setDiscountSearchInput] = useState('')
  const [discountSearch, setDiscountSearch] = useState('')
  const [discountRoleFilter, setDiscountRoleFilter] = useState<'' | 'clinic' | 'doctor' | 'patient' | 'all'>('')

  const roleFilterOptions = useMemo(
    () =>
      DISCOUNT_ROLE_FILTER_VALUES.map((value) => ({
        value,
        label:
          value === ''
            ? t('common.allRoles')
            : value === 'all'
              ? t('common.allCustomers')
              : roleLabel(value),
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
        const [discountList, catalog] = await Promise.all([
          fetchAllDiscounts(),
          fetchLabTestsList(),
        ])
        if (!cancelled) {
          setRows(discountList)
          setTests(catalog.filter((test) => test.is_active && !test.is_deleted))
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('discounts.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, t])

  useEffect(() => {
    const id = window.setTimeout(() => setDiscountSearch(discountSearchInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [discountSearchInput])

  useEffect(() => {
    queueMicrotask(() => setDiscountPage(1))
  }, [refreshTick, discountSearch, discountRoleFilter])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const na = (a.test_name ?? a.test_id).localeCompare(b.test_name ?? b.test_id)
      if (na !== 0) return na
      return a.role.localeCompare(b.role)
    })
  }, [rows])

  const filteredDiscounts = useMemo(() => {
    let list = sorted
    if (discountRoleFilter) {
      list = list.filter((r) => r.role === discountRoleFilter)
    }
    if (discountSearch) {
      list = list.filter((r) => {
        const name = (r.test_name ?? '').toLowerCase()
        const code = (r.test_code ?? '').toLowerCase()
        return name.includes(discountSearch) || code.includes(discountSearch)
      })
    }
    return list
  }, [sorted, discountSearch, discountRoleFilter])

  const pagedDiscounts = useMemo(() => {
    const start = (discountPage - 1) * discountPageSize
    return filteredDiscounts.slice(start, start + discountPageSize)
  }, [filteredDiscounts, discountPage, discountPageSize])

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: TestDiscountListRow) {
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
      await deleteDiscountById(row.id)
      showSuccess(t('discounts.delete.success'))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('common.delete')))
    }
  }

  function clearDiscountFilters() {
    setDiscountSearchInput('')
    setDiscountSearch('')
    setDiscountRoleFilter('')
    setDiscountPage(1)
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.discounts.title')} description={t('pages.discounts.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label={t('discounts.filters.ariaLabel')}>
            <ListFilterSearchField
              id="discount-filter-test"
              label={t('common.test')}
              placeholder={listFilterSearchPlaceholder(
                t('common.test'),
                t('discounts.filters.searchDetail'),
              )}
              value={discountSearchInput}
              onChange={(e) => setDiscountSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="discount-filter-role">
                {t('common.role')}
              </label>
              <select
                id="discount-filter-role"
                className="list-filters-bar__select"
                value={discountRoleFilter}
                onChange={(e) =>
                  setDiscountRoleFilter(
                    (e.target.value || '') as '' | 'clinic' | 'doctor' | 'patient' | 'all',
                  )
                }
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
              onClick={clearDiscountFilters}
              disabled={
                loading ||
                !hasApi ||
                (discountSearchInput.trim() === '' && discountRoleFilter === '')
              }
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
              {t('discounts.add')}
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">{t('discounts.hint')}</p>
        <div className="table-wrap table-wrap--sticky-actions">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th scope="col">{t('common.test')}</th>
                <th scope="col">{t('common.code')}</th>
                <th scope="col">{t('common.role')}</th>
                <th scope="col" className="col-num">
                  {t('labTests.table.base')}
                </th>
                <th scope="col" className="col-num">
                  {t('discounts.table.discountPercent')}
                </th>
                <th scope="col" className="col-num">
                  {t('discounts.table.afterDiscount')}
                </th>
                <th scope="col">{t('common.startDate')}</th>
                <th scope="col">{t('common.endDate')}</th>
                <th scope="col">{t('common.status')}</th>
                <th scope="col" className="action-col">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('discounts.loading')} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">percent</span>
                      </div>
                      <p className="data-table__empty-title">{t('discounts.empty.title')}</p>
                      <p className="data-table__empty-text">{t('discounts.empty.body')}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          {t('discounts.add')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('discounts.noMatch')}
                  </td>
                </tr>
              ) : (
                pagedDiscounts.map((r) => (
                  <tr key={r.id}>
                    <td>{r.test_name ?? t('common.none')}</td>
                    <td>
                      <code>{r.test_code ?? t('common.none')}</code>
                    </td>
                    <td>{discountRoleLabel(r.role)}</td>
                    <td className="col-num">
                      {r.original_price !== undefined ? r.original_price.toLocaleString() : t('common.none')}
                    </td>
                    <td className="col-num">{r.discount_percent}</td>
                    <td className="col-num">
                      {r.after_discount_price !== undefined
                        ? r.after_discount_price.toLocaleString()
                        : t('common.none')}
                    </td>
                    <td className="data-table__date-cell">{formatDiscountDateCell(r.start_date)}</td>
                    <td className="data-table__date-cell">{formatDiscountDateCell(r.end_date)}</td>
                    <td>{discountStatusBadge(r)}</td>
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
        {!loading && hasApi && filteredDiscounts.length > 0 ? (
          <TablePagination
            mode="client"
            page={discountPage}
            pageSize={discountPageSize}
            totalItems={filteredDiscounts.length}
            itemsOnPage={pagedDiscounts.length}
            onPageChange={setDiscountPage}
            onPageSizeChange={(n) => {
              setDiscountPageSize(n)
              setDiscountPage(1)
            }}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('discounts.delete.title')}
        message={
          deleteTarget
            ? t('discounts.delete.message', {
                role: discountRoleLabel(deleteTarget.role),
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

      <DiscountFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editInitial}
        tests={tests}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(
            formMode === 'edit' ? t('discounts.toast.updated') : t('discounts.toast.created'),
          )
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
