import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { LabTestFormModal } from '../components/lab-tests/LabTestFormModal'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { LabTestCatalogRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import { deleteLabTest, fetchLabTestsList, type FetchLabTestsQueryParams } from '../services/labTestCatalogService'
import '../components/common/ui.css'

const colSpan = 8

export function LabTestCatalogPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<LabTestCatalogRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchText, setSearchText] = useState('')
  const [searchApplied, setSearchApplied] = useState('')

  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogPageSize, setCatalogPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<LabTestCatalogRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LabTestCatalogRow | null>(null)

  const statusFilterOptions = useMemo(
    () =>
      [
        { value: 'all' as const, label: t('labTests.filters.statusAll') },
        { value: 'active' as const, label: t('labTests.filters.statusActive') },
        { value: 'inactive' as const, label: t('labTests.filters.statusInactive') },
      ] as const,
    [t],
  )

  useEffect(() => {
    const handle = window.setTimeout(() => setSearchApplied(searchText.trim()), 350)
    return () => window.clearTimeout(handle)
  }, [searchText])

  useEffect(() => {
    queueMicrotask(() => setCatalogPage(1))
  }, [activeFilter, searchApplied])

  useEffect(() => {
    if (!hasApi) {
      queueMicrotask(() => {
        setLoading(false)
        setRows([])
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
        const query: FetchLabTestsQueryParams = {}
        if (searchApplied) query.test_name = searchApplied
        if (activeFilter === 'active') query.is_active = true
        if (activeFilter === 'inactive') query.is_active = false
        const list = await fetchLabTestsList(query)
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('labTests.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, activeFilter, searchApplied, t])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.test_name.localeCompare(b.test_name)),
    [rows],
  )

  const pagedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize
    return sorted.slice(start, start + catalogPageSize)
  }, [sorted, catalogPage, catalogPageSize])

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: LabTestCatalogRow) {
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
      await deleteLabTest(row.id)
      showSuccess(t('labTests.toasts.deleted', { name: row.test_name }))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('labTests.toasts.deleteFailed')))
    }
  }

  function clearCatalogFilters() {
    setActiveFilter('all')
    setSearchText('')
    setCatalogPage(1)
  }

  const emptyMessage = useMemo(() => {
    if (searchApplied.trim() !== '') {
      return {
        title: t('labTests.empty.noMatchTitle'),
        body: t('labTests.empty.noMatchBody'),
      }
    }
    if (activeFilter !== 'all') {
      return {
        title: t('labTests.empty.filterTitle'),
        body: t('labTests.empty.filterBody'),
      }
    }
    return {
      title: t('labTests.empty.noneTitle'),
      body: t('labTests.empty.noneBody'),
    }
  }, [activeFilter, searchApplied, t])

  return (
    <div className="stack">
      <PageHeader title={t('pages.labTests.title')} description={t('pages.labTests.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label={t('labTests.filters.ariaLabel')}>
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="lab-catalog-status">
              {t('common.status')}
            </label>
            <select
              id="lab-catalog-status"
              className="list-filters-bar__select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              disabled={loading || !hasApi}
            >
              {statusFilterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <ListFilterSearchField
            id="lab-catalog-search"
            label={t('labTests.filters.tests')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            disabled={loading || !hasApi}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={clearCatalogFilters}
            disabled={
              loading || !hasApi || (activeFilter === 'all' && searchText.trim() === '')
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
            {t('labTests.actions.create')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table data-table--catalog">
            <thead>
              <tr>
                <th>{t('labTests.table.name')}</th>
                <th>{t('labTests.table.code')}</th>
                <th className="col-num">{t('labTests.table.base')}</th>
                <th className="col-num">{t('labTests.table.discountPercent')}</th>
                <th className="col-num">{t('labTests.table.discountedPrice')}</th>
                <th>{t('labTests.table.status')}</th>
                <th>{t('labTests.table.category')}</th>
                <th className="action-col">{t('labTests.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('labTests.loading')} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">science</span>
                      </div>
                      <p className="data-table__empty-title">{emptyMessage.title}</p>
                      <p className="data-table__empty-text">{emptyMessage.body}</p>
                      {hasApi && !searchApplied.trim() && activeFilter === 'all' ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          {t('labTests.actions.create')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedCatalog.map((r) => (
                  <tr key={r.id}>
                    <td title={r.description?.trim() ? r.description : undefined}>{r.test_name}</td>
                    <td>
                      <code>{r.test_code}</code>
                    </td>
                    <td className="col-num">{r.base_price_mmk.toLocaleString()}</td>
                    <td className="col-num">
                      {r.discount_percent != null ? `${r.discount_percent}%` : '—'}
                    </td>
                    <td className="col-num">
                      {r.discounted_price_mmk != null ? r.discounted_price_mmk.toLocaleString() : '—'}
                    </td>
                    <td>
                      {r.is_active ? (
                        <span className="badge badge--success">{t('common.active')}</span>
                      ) : (
                        <span className="badge badge--neutral">{t('common.inactive')}</span>
                      )}
                    </td>
                    <td>{r.category || t('common.none')}</td>
                    <td className="action-cell">
                      <TableActionMenu
                        open={openMenuId === r.id}
                        onOpenChange={(next) => setOpenMenuId(next ? r.id : null)}
                        items={[
                          { label: t('labTests.actions.edit'), onSelect: () => openEdit(r) },
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
        {!loading && hasApi && sorted.length > 0 ? (
          <TablePagination
            mode="client"
            page={catalogPage}
            pageSize={catalogPageSize}
            totalItems={sorted.length}
            itemsOnPage={pagedCatalog.length}
            onPageChange={setCatalogPage}
            onPageSizeChange={(n) => {
              setCatalogPageSize(n)
              setCatalogPage(1)
            }}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('labTests.delete.title')}
        message={
          deleteTarget ? t('labTests.delete.message', { name: deleteTarget.test_name }) : ''
        }
        confirmLabel={t('labTests.delete.confirm')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <LabTestFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editInitial}
        existingRows={rows}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(
            formMode === 'edit' ? t('labTests.toasts.updated') : t('labTests.toasts.created'),
          )
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
