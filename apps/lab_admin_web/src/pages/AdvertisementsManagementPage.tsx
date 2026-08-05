import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
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
import { scheduleStatusLabel } from '../utils/scheduleStatusLabels'
import '../components/common/ui.css'

const colSpan = 7

function truncate(text: string | null, max = 80, none = '—'): string {
  if (!text) return none
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function liveStatusBadge(row: AdvertisementRow) {
  if (!row.is_active) {
    return <span className="badge badge--neutral">{scheduleStatusLabel('inactive')}</span>
  }
  if (isAdLiveNow(row)) {
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

export function AdvertisementsManagementPage() {
  const { t } = useTranslation()
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
        const list = await fetchAdvertisements({ sortBy: 'created_at', sortOrder: 'DESC' })
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('advertisements.loadFailed'))
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
      showSuccess(t('advertisements.delete.success'))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('common.delete')))
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setActiveFilter('')
    setPage(1)
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.advertisements.title')} description={t('pages.advertisements.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label={t('advertisements.filters.ariaLabel')}>
            <ListFilterSearchField
              id="ad-filter-title"
              label={t('common.searchLabel')}
              placeholder={listFilterSearchPlaceholder(
                t('common.title'),
                t('advertisements.filters.searchDetail'),
              )}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="ad-filter-active">
                {t('common.status')}
              </label>
              <select
                id="ad-filter-active"
                className="list-filters-bar__select"
                value={activeFilter}
                onChange={(e) => setActiveFilter((e.target.value || '') as '' | 'active' | 'inactive')}
                disabled={loading || !hasApi}
              >
                <option value="">{t('common.all')}</option>
                <option value="active">{t('common.activeOnly')}</option>
                <option value="inactive">{t('common.inactiveOnly')}</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi || (searchInput.trim() === '' && activeFilter === '')}
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
              {t('advertisements.add')}
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">{t('advertisements.hint')}</p>
        <div className="table-wrap">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th>{t('common.banner')}</th>
                <th>{t('common.title')}</th>
                <th>{t('common.description')}</th>
                <th>{t('common.schedule')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.active')}</th>
                <th className="action-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('advertisements.loading')} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">campaign</span>
                      </div>
                      <p className="data-table__empty-title">{t('advertisements.empty.title')}</p>
                      <p className="data-table__empty-text">{t('advertisements.empty.body')}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          {t('advertisements.add')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('advertisements.noMatch')}
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
                            className="ad-table-thumb"
                          />
                        ) : (
                          <span className="badge badge--neutral">{t('common.noImage')}</span>
                        )}
                      </td>
                      <td>{r.title}</td>
                      <td>{truncate(r.description, 80, t('common.none'))}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatAdSchedulePeriod(r.start_date, r.end_date)}</td>
                      <td>{liveStatusBadge(r)}</td>
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
        title={t('advertisements.delete.title')}
        message={deleteTarget ? t('advertisements.delete.message', { title: deleteTarget.title }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
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
          showSuccess(
            formMode === 'edit' ? t('advertisements.toast.updated') : t('advertisements.toast.created'),
          )
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
