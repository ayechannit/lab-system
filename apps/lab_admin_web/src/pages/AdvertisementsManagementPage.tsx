import { useEffect, useMemo, useState } from 'react'
import { AdvertisementFormModal } from '../components/advertisements/AdvertisementFormModal'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { isApiMode } from '../services/apiBase'
import {
  deleteAdvertisement,
  fetchAdvertisements,
  formatAdSchedulePeriod,
  isAdLiveNow,
  resolveAdvertisementImageUrl,
  type AdvertisementRow,
} from '../services/advertisementService'
import '../components/common/ui.css'

const colSpan = 7

function truncate(text: string | null, max = 80): string {
  if (!text) return '—'
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function liveStatusBadge(row: AdvertisementRow) {
  if (!row.is_active) {
    return <span className="badge badge--neutral">Inactive</span>
  }
  if (isAdLiveNow(row)) {
    return <span className="badge badge--success">Live</span>
  }
  const now = new Date()
  if (row.start_date && now < new Date(row.start_date)) {
    return <span className="badge badge--neutral">Scheduled</span>
  }
  if (row.end_date && now > new Date(row.end_date)) {
    return <span className="badge badge--neutral">Expired</span>
  }
  return <span className="badge badge--neutral">Off schedule</span>
}

export function AdvertisementsManagementPage() {
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<AdvertisementRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<AdvertisementRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdvertisementRow | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'active' | 'inactive'>('')

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
        const list = await fetchAdvertisements({ sortBy: 'created_at', sortOrder: 'DESC' })
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load advertisements')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick])

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, search, activeFilter])

  const filtered = useMemo(() => {
    let list = rows
    if (activeFilter === 'active') list = list.filter((r) => r.is_active)
    if (activeFilter === 'inactive') list = list.filter((r) => !r.is_active)
    if (search) {
      list = list.filter((r) => {
        const title = r.title.toLowerCase()
        const desc = (r.description ?? '').toLowerCase()
        return title.includes(search) || desc.includes(search)
      })
    }
    return list
  }, [rows, search, activeFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: AdvertisementRow) {
    setFormMode('edit')
    setEditInitial(row)
    setFormOpen(true)
    setOpenMenuId(null)
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
      await deleteAdvertisement(row.id)
      showSuccess('Advertisement deleted.')
      setRefreshTick((t) => t + 1)
    } catch (e) {
      showError(messageFromError(e, 'Delete failed'))
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setActiveFilter('')
    setPage(1)
  }

  const emptyMessage = {
    title: 'No advertisements yet',
    body: 'Create banners and promos for the mobile app. Set optional start and end dates to schedule when they appear.',
  }

  return (
    <div className="stack">
      <PageHeader
        title="Advertisements"
        description="Manage promotional banners shown in the patient mobile app. Each ad can include an image, description, optional link, and schedule."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Advertisements load from the backend only.
          </p>
        </div>
      ) : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label="Advertisement filters">
            <ListFilterSearchField
              id="ad-filter-title"
              label="Search"
              placeholder={listFilterSearchPlaceholder('Advertisement', 'title or description')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="ad-filter-active">
                Status
              </label>
              <select
                id="ad-filter-active"
                className="list-filters-bar__select"
                value={activeFilter}
                onChange={(e) => setActiveFilter((e.target.value || '') as '' | 'active' | 'inactive')}
                disabled={loading || !hasApi}
              >
                <option value="">All</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi || (searchInput.trim() === '' && activeFilter === '')}
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
              Add advertisement
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">
          Mobile clients fetch active ads within their schedule via <code>GET /api/advertisements</code>.
        </p>
        <div className="table-wrap">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Title</th>
                <th>Description</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Active</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading advertisements" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">campaign</span>
                      </div>
                      <p className="data-table__empty-title">{emptyMessage.title}</p>
                      <p className="data-table__empty-text">{emptyMessage.body}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          Add advertisement
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    No advertisements match these filters.
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const imgSrc = resolveAdvertisementImageUrl(r.image_url, r.image_display_url)
                  return (
                    <tr key={r.id}>
                      <td>
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt=""
                            style={{
                              width: 72,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 4,
                              display: 'block',
                              background: 'var(--surface-muted, #f3f4f6)',
                            }}
                          />
                        ) : (
                          <span className="badge badge--neutral">No image</span>
                        )}
                      </td>
                      <td>{r.title}</td>
                      <td>{truncate(r.description)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatAdSchedulePeriod(r.start_date, r.end_date)}</td>
                      <td>{liveStatusBadge(r)}</td>
                      <td>
                        {r.is_active ? (
                          <span className="badge badge--success">Yes</span>
                        ) : (
                          <span className="badge badge--neutral">No</span>
                        )}
                      </td>
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
                  )
                })
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
        title="Delete advertisement?"
        message={deleteTarget ? `Delete "${deleteTarget.title}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <AdvertisementFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editInitial}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(formMode === 'edit' ? 'Advertisement updated.' : 'Advertisement created.')
          setRefreshTick((t) => t + 1)
        }}
      />
    </div>
  )
}
