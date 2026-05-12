import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { DiscountFormModal } from '../components/discounts/DiscountFormModal'
import { PageHeader } from '../components/common/PageHeader'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { LabTestCatalogRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  deleteDiscountById,
  fetchAllDiscounts,
  type FetchDiscountsParams,
  type TestDiscountListRow,
} from '../services/discountService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import '../components/common/ui.css'

const colSpan = 8

const ROLE_FILTER_OPTIONS: { value: '' | 'clinic' | 'doctor' | 'patient'; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
]

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
    all: 'All',
  }
  return map[role] ?? role
}

export function DiscountManagementPage() {
  const hasApi = isApiMode()
  const [rows, setRows] = useState<TestDiscountListRow[]>([])
  const [tests, setTests] = useState<LabTestCatalogRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [roleFilter, setRoleFilter] = useState<'' | 'clinic' | 'doctor' | 'patient'>('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<TestDiscountListRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestDiscountListRow | null>(null)

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
        const listParams: FetchDiscountsParams | undefined =
          roleFilter === '' ? undefined : { role: roleFilter }
        const [discountList, catalog] = await Promise.all([
          fetchAllDiscounts(listParams),
          fetchLabTestsList(),
        ])
        if (!cancelled) {
          setRows(discountList)
          setTests(catalog.filter((t) => t.is_active && !t.is_deleted))
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load discounts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, roleFilter])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const na = (a.test_name ?? a.test_id).localeCompare(b.test_name ?? b.test_id)
      if (na !== 0) return na
      return a.role.localeCompare(b.role)
    })
  }, [rows])

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
      setRefreshTick((t) => t + 1)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const emptyMessage =
    roleFilter !== ''
      ? {
          title: 'No discounts for this role',
          body: 'Switch to "All roles" to see every rule, or add a discount for this audience.',
        }
      : {
          title: 'No discount rules yet',
          body: 'Set percentage reductions per test and role. Prices on the Lab tests page reflect the role you select there.',
        }

  return (
    <div className="stack">
      <PageHeader
        title="Test discounts"
        description="Per-test, per-role percentages off catalog prices. Use the Lab tests page to preview published pricing for clinic, doctor, or patient."
      />

      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Discounts load from the backend only.
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="card" style={{ borderColor: '#f0c4c4', background: '#fff8f8' }}>
          <p style={{ margin: 0, color: '#ba1a1a', fontSize: '0.9rem' }}>{loadError}</p>
        </div>
      ) : null}

      <div className="card">
        <div className="catalog-card__toolbar">
          <div className="catalog-card__filters">
            <div className="field">
              <label htmlFor="discount-role-filter">Role</label>
              <select
                id="discount-role-filter"
                className="select-chevron-left"
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as '' | 'clinic' | 'doctor' | 'patient')
                }
                disabled={loading || !hasApi}
                aria-label="Filter discounts by role"
              >
                {ROLE_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="catalog-card__actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRefreshTick((t) => t + 1)}
              disabled={loading || !hasApi}
            >
              Refresh
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate} disabled={loading || !hasApi}>
              Add discount
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">
          Rules apply to active catalog tests only. Editing here updates how discounted prices appear for each role.
        </p>
        <div className="table-wrap">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th>Test</th>
                <th>Code</th>
                <th>Role</th>
                <th className="col-num">Base (MMK)</th>
                <th className="col-num">Discount (%)</th>
                <th className="col-num">After discount</th>
                <th>Active</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    Loading discounts…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">percent</span>
                      </div>
                      <p className="data-table__empty-title">{emptyMessage.title}</p>
                      <p className="data-table__empty-text">{emptyMessage.body}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          Add discount
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.id}>
                    <td>{r.test_name ?? '—'}</td>
                    <td>
                      <code>{r.test_code ?? '—'}</code>
                    </td>
                    <td>{roleLabel(r.role)}</td>
                    <td className="col-num">
                      {r.original_price !== undefined ? r.original_price.toLocaleString() : '—'}
                    </td>
                    <td className="col-num">{r.discount_percent}</td>
                    <td className="col-num">
                      {r.after_discount_price !== undefined
                        ? r.after_discount_price.toLocaleString()
                        : '—'}
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete discount?"
        message={
          deleteTarget
            ? `Delete this ${roleLabel(deleteTarget.role)} discount for "${deleteTarget.test_name ?? deleteTarget.test_id}"?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
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
        onSuccess={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  )
}
