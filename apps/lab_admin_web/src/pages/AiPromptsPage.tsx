import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { PromptFormModal } from '../components/ai/PromptFormModal'
import { isApiMode } from '../services/apiBase'
import {
  deletePrompt,
  fetchPrompts,
  previewPromptText,
  type PromptRow,
} from '../services/promptService'
import '../components/common/ui.css'

const colSpan = 5

function formatWhen(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function AiPromptsPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<PromptRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [filterNameInput, setFilterNameInput] = useState('')
  const [filterName, setFilterName] = useState('')
  const [filterPreviewInput, setFilterPreviewInput] = useState('')
  const [filterPreview, setFilterPreview] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editRow, setEditRow] = useState<PromptRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PromptRow | null>(null)

  useErrorToast(loadError)

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
        const list = await fetchPrompts()
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load prompts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick])

  useEffect(() => {
    const id = window.setTimeout(() => setFilterName(filterNameInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [filterNameInput])

  useEffect(() => {
    const id = window.setTimeout(() => setFilterPreview(filterPreviewInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [filterPreviewInput])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, rows.length, filterName, filterPreview])

  const sorted = useMemo(() => [...rows].sort((a, b) => a.name.localeCompare(b.name)), [rows])

  const filtered = useMemo(() => {
    return sorted.filter((r) => {
      if (filterName && !r.name.toLowerCase().includes(filterName)) return false
      if (filterPreview && !r.prompt_text.toLowerCase().includes(filterPreview)) return false
      return true
    })
  }, [sorted, filterName, filterPreview])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  function clearFilters() {
    setFilterNameInput('')
    setFilterName('')
    setFilterPreviewInput('')
    setFilterPreview('')
    setPage(1)
  }

  function openCreate() {
    setFormMode('create')
    setEditRow(null)
    setFormOpen(true)
  }

  function openEdit(row: PromptRow) {
    setFormMode('edit')
    setEditRow(row)
    setFormOpen(true)
    setOpenMenuId(null)
  }

  function closeForm() {
    setFormOpen(false)
    setEditRow(null)
  }

  async function confirmDelete() {
    if (!deleteTarget || !hasApi) return
    const row = deleteTarget
    setDeleteTarget(null)
    try {
      await deletePrompt(row.id)
      showSuccess(`Deleted prompt "${row.name}".`)
      setRefreshTick((t) => t + 1)
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.aiPrompts.title')} description={t('pages.aiPrompts.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label="Prompt filters">
            <ListFilterSearchField
              id="prompt-filter-name"
              label="Name"
              value={filterNameInput}
              onChange={(e) => setFilterNameInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <ListFilterSearchField
              id="prompt-filter-preview"
              label="Preview"
              value={filterPreviewInput}
              onChange={(e) => setFilterPreviewInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi}
            >
              {t('filters.clearFilters')}
            </button>
          </div>
          <div className="list-tools-row__actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRefreshTick((t) => t + 1)}
              disabled={loading || !hasApi}
            >
              {loading ? t('common.refreshing') : t('common.refresh')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate} disabled={loading || !hasApi}>
              Add prompt
            </button>
          </div>
        </div>
        <h3 className="card-title" style={{ margin: '0 0 0.65rem' }}>
          Prompt list
        </h3>
        <div className="table-wrap">
          <table className="data-table data-table--align-left">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Preview</th>
                <th>Updated</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading prompts" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">chat</span>
                      </div>
                      <p className="data-table__empty-title">No prompts yet</p>
                      <p className="data-table__empty-text">
                        Create prompts for consistent AI tone and instructions across conversations.
                      </p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          Add prompt
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    No prompts match these filters.
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{r.id}</code>
                    </td>
                    <td>{r.name}</td>
                    <td title={r.prompt_text}>{previewPromptText(r.prompt_text)}</td>
                    <td>{formatWhen(r.updated_at ?? r.created_at)}</td>
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
        title="Delete prompt?"
        message={deleteTarget ? `Delete prompt "${deleteTarget.name}"?` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <PromptFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editRow}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(formMode === 'edit' ? 'Prompt updated.' : 'Prompt created.')
          setRefreshTick((t) => t + 1)
        }}
      />
    </div>
  )
}
