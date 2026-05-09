import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LabTestFormModal } from '../components/lab-tests/LabTestFormModal'
import { PageHeader } from '../components/common/PageHeader'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { LabTestCatalogRow } from '../mock-data/types'
import { isApiMode } from '../services/apiBase'
import {
  type CatalogPricingRole,
  deleteLabTest,
  fetchLabTestCatalog,
} from '../services/labTestCatalogService'
import '../components/common/ui.css'

const colSpan = 9

const PRICING_ROLE_OPTIONS: { value: CatalogPricingRole; label: string }[] = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
]

export function LabTestCatalogPage() {
  const hasApi = isApiMode()
  const [rows, setRows] = useState<LabTestCatalogRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [pricingRole, setPricingRole] = useState<CatalogPricingRole>('clinic')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<LabTestCatalogRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LabTestCatalogRow | null>(null)

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
        const list = await fetchLabTestCatalog(pricingRole)
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
  }, [hasApi, refreshTick, pricingRole])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.test_name.localeCompare(b.test_name)),
    [rows],
  )

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

  return (
    <div className="stack">
      <PageHeader title="Lab test catalog" />

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

      <div className="card">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem 1rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              Catalog
            </h3>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              Discount for role
              <select
                className="select-chevron-left"
                value={pricingRole}
                onChange={(e) => setPricingRole(e.target.value as CatalogPricingRole)}
                disabled={loading || !hasApi}
                aria-label="User role for discount columns (GET /api/tests role query)"
              >
                {PRICING_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreate} disabled={loading || !hasApi}>
            Create lab test
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>Base (MMK)</th>
                <th>Discount %</th>
                <th>After discount</th>
                <th>Category</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    Loading…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    No lab tests yet.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{r.id}</code>
                    </td>
                    <td>{r.test_name}</td>
                    <td>
                      <code>{r.test_code}</code>
                    </td>
                    <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>{r.description || '—'}</td>
                    <td>{r.base_price_mmk.toLocaleString()}</td>
                    <td>{r.discount_percent}</td>
                    <td>{r.discounted_price_mmk.toLocaleString()}</td>
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
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove lab test?"
        message={
          deleteTarget ? `Soft-delete "${deleteTarget.test_name}" in the database?` : ''
        }
        confirmLabel="Remove"
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
