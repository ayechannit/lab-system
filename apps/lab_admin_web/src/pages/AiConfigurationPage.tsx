import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { AiConfigFormModal } from '../components/ai/AiConfigFormModal'
import { isApiMode } from '../services/apiBase'
import {
  deleteAiConfig,
  fetchAiConfigs,
  maskApiKey,
  providerLabel,
  type AiConfigRow,
  type AiProviderType,
} from '../services/aiConfigService'
import '../components/common/ui.css'

const colSpan = 5

function formatWhen(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function AiConfigurationPage() {
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<AiConfigRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [filterProvider, setFilterProvider] = useState<'' | AiProviderType>('')
  const [filterModelInput, setFilterModelInput] = useState('')
  const [filterModel, setFilterModel] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editRow, setEditRow] = useState<AiConfigRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AiConfigRow | null>(null)

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
        const list = await fetchAiConfigs()
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load AI configurations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick])

  useEffect(() => {
    const id = window.setTimeout(() => setFilterModel(filterModelInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [filterModelInput])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, rows.length, filterProvider, filterModel])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
  }, [rows])

  const filtered = useMemo(() => {
    return sorted.filter((r) => {
      if (filterProvider && r.type !== filterProvider) return false
      if (filterModel && !r.model_name.toLowerCase().includes(filterModel)) return false
      return true
    })
  }, [sorted, filterProvider, filterModel])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  function clearFilters() {
    setFilterProvider('')
    setFilterModelInput('')
    setFilterModel('')
    setPage(1)
  }

  function openCreate() {
    setFormMode('create')
    setEditRow(null)
    setFormOpen(true)
  }

  function openEdit(row: AiConfigRow) {
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
      await deleteAiConfig(row.id)
      showSuccess(`Deleted configuration for ${row.model_name}.`)
      setRefreshTick((t) => t + 1)
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="AI configuration"
        description="Manage Gemini and OpenAI models and API keys for patient AI summaries."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. AI settings load from the backend only.
          </p>
        </div>
      ) : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label="AI configuration filters">
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="ai-config-filter-provider">
                Provider
              </label>
              <select
                id="ai-config-filter-provider"
                className="list-filters-bar__select"
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value as '' | AiProviderType)}
                disabled={loading || !hasApi}
              >
                <option value="">All</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <ListFilterSearchField
              id="ai-config-filter-model"
              label="Model"
              value={filterModelInput}
              onChange={(e) => setFilterModelInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi}
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
              Add configuration
            </button>
          </div>
        </div>
        <h3 className="card-title" style={{ margin: '0 0 0.65rem' }}>
          Configuration list
        </h3>
        <div className="table-wrap">
          <table className="data-table data-table--align-left">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>API key</th>
                <th>Updated</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading AI configurations" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">smart_toy</span>
                      </div>
                      <p className="data-table__empty-title">No AI configurations yet</p>
                      <p className="data-table__empty-text">
                        Add a Gemini or OpenAI model and API key so patients can run AI summaries on lab results.
                      </p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          Add configuration
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    No configurations match these filters.
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id}>
                    <td>{providerLabel(r.type)}</td>
                    <td>
                      <code>{r.model_name}</code>
                    </td>
                    <td>
                      <code title="Masked for display">{maskApiKey(r.api_key)}</code>
                    </td>
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
        title="Delete AI configuration?"
        message={
          deleteTarget
            ? `Delete ${providerLabel(deleteTarget.type)} config "${deleteTarget.model_name}"? Patient AI analysis may fail until another config exists.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <AiConfigFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editRow}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(formMode === 'edit' ? 'Configuration updated.' : 'Configuration created.')
          setRefreshTick((t) => t + 1)
        }}
      />
    </div>
  )
}
