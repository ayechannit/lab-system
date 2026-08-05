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
  type TestDiscountListRow,
} from '../services/discountService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import '../components/common/ui.css'

const colSpan = 7

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

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<TestDiscountListRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestDiscountListRow | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!hasApi) {
      queueMicrotask(() => {
        setLoading(false)
        setRows([])
        setTests([])
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
        const [discountList, catalog] = await Promise.all([fetchAllDiscounts(), fetchLabTestsList()])
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
    const id = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, search])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (a.test_name ?? a.test_id).localeCompare(b.test_name ?? b.test_id))
  }, [rows])

  const filtered = useMemo(() => {
    let list = sorted
    if (search) {
      list = list.filter((r) => {
        const name = (r.test_name ?? '').toLowerCase()
        const code = (r.test_code ?? '').toLowerCase()
        return name.includes(search) || code.includes(search)
      })
    }
    return list
  }, [sorted, search])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

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

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setPage(1)
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi || searchInput.trim() === ''}
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
        <div className="table-wrap">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th>{t('common.test')}</th>
                <th>{t('common.code')}</th>
                <th className="col-num">{t('labTests.table.base')}</th>
                <th className="col-num">{t('discounts.table.discountPercent')}</th>
                <th className="col-num">{t('discounts.table.afterDiscountPrice')}</th>
                <th>{t('common.active')}</th>
                <th className="action-col">{t('common.actions')}</th>
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
                        <span className="material-symbols-outlined">sell</span>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('discounts.noMatch')}
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id}>
                    <td>{r.test_name ?? t('common.none')}</td>
                    <td>
                      <code>{r.test_code ?? t('common.none')}</code>
                    </td>
                    <td className="col-num">
                      {r.original_price !== undefined ? r.original_price.toLocaleString() : t('common.none')}
                    </td>
                    <td className="col-num">{r.discount_percent}</td>
                    <td className="col-num">
                      {r.after_discount_price !== undefined
                        ? r.after_discount_price.toLocaleString()
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
        title={t('discounts.delete.title')}
        message={
          deleteTarget
            ? t('discounts.delete.message', {
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
