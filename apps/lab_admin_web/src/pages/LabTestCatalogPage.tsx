import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { LabTestFormModal } from '../components/lab-tests/LabTestFormModal'
import { PageHeader } from '../components/common/PageHeader'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { LabTestCatalogRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import { deleteLabTest, fetchLabTestsList, type FetchLabTestsQueryParams } from '../services/labTestCatalogService'
import '../components/common/ui.css'

const colSpan = 8

const STATUS_FILTER_OPTIONS: { value: 'all' | 'active' | 'inactive'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
]

export function LabTestCatalogPage() {
  const hasApi = isApiMode()
  const [rows, setRows] = useState<LabTestCatalogRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
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

  useEffect(() => {
    const handle = window.setTimeout(() => setSearchApplied(searchText.trim()), 350)
    return () => window.clearTimeout(handle)
  }, [searchText])

  useEffect(() => {
    queueMicrotask(() => setCatalogPage(1))
  }, [activeFilter, searchApplied])

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
        const query: FetchLabTestsQueryParams = {}
        if (searchApplied) query.test_name = searchApplied
        if (activeFilter === 'active') query.is_active = true
        if (activeFilter === 'inactive') query.is_active = false
        const list = await fetchLabTestsList(query)
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load catalog')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, activeFilter, searchApplied])

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
      setRefreshTick((t) => t + 1)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  function clearCatalogFilters() {
    setActiveFilter('all')
    setSearchText('')
    setCatalogPage(1)
  }

  const emptyMessage =
    searchApplied.trim() !== ''
      ? {
          title: 'No matching tests',
          body: 'Try a different search term or clear the filter to see more results.',
        }
      : activeFilter !== 'all'
        ? {
            title: 'Nothing in this filter',
            body: 'Change the status filter or set it to “All statuses”.',
          }
        : {
            title: 'No tests in the catalog yet',
            body: 'Create a lab test to start building your catalog.',
          }

  return (
    <div className="stack">
      <PageHeader
        title="Test catalog"
        description="Browse and edit the tests you offer: names, codes, prices, and whether each test is available. Discount columns show example prices when a discount applies; set those rules on the Discounts page."
      />

      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. The catalog is loaded only from the
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
        <div className="list-filters-bar" aria-label="Catalog filters">
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="lab-catalog-status">
              Status
            </label>
            <select
              id="lab-catalog-status"
              className="list-filters-bar__select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              disabled={loading || !hasApi}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="list-filters-bar__group list-filters-bar__group--text">
            <label className="list-filters-bar__label" htmlFor="lab-catalog-search">
              Name
            </label>
            <input
              id="lab-catalog-search"
              type="search"
              className="list-filters-bar__input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search tests…"
              disabled={loading || !hasApi}
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={clearCatalogFilters}
            disabled={
              loading || !hasApi || (activeFilter === 'all' && searchText.trim() === '')
            }
          >
            Clear filters
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={loading || !hasApi}
          >
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate} disabled={loading || !hasApi}>
            Create lab test
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table data-table--catalog">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th className="col-num">Base (MMK)</th>
                <th className="col-num" title="Highest discount_percent among this test’s configured role discounts">
                  Disc. %
                </th>
                <th className="col-num" title="Base price after that discount">
                  After (MMK)
                </th>
                <th>Status</th>
                <th>Category</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading catalog" />
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
                          Create lab test
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
                    <td className="col-num">{r.discount_percent}%</td>
                    <td className="col-num">{r.discounted_price_mmk.toLocaleString()}</td>
                    <td>
                      {r.is_active ? (
                        <span className="badge badge--success">Active</span>
                      ) : (
                        <span className="badge badge--neutral">Inactive</span>
                      )}
                    </td>
                    <td>{r.category || '—'}</td>
                    <td className="action-cell">
                      <TableActionMenu
                        open={openMenuId === r.id}
                        onOpenChange={(next) => setOpenMenuId(next ? r.id : null)}
                        items={[
                          { label: 'Edit', onSelect: () => openEdit(r) },
                          {
                            label: 'Delete',
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
        title="Delete lab test?"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.test_name}"?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
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
        onSuccess={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  )
}
