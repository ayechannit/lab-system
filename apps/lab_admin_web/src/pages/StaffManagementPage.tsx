import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { StaffFormModal } from '../components/staff/StaffFormModal'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { StaffListRow, StaffRole } from '../model/types'
import { isApiMode } from '../services/apiBase'
import { deleteStaff, fetchStaffList, type FetchStaffListParams } from '../services/staffService'
import '../components/common/ui.css'

function roleLabel(r: StaffRole): string {
  const map: Record<StaffRole, string> = {
    admin: 'Admin',
    lab_technician: 'Lab technician',
    reception: 'Reception',
    manager: 'Manager',
  }
  return map[r]
}

const STAFF_ROLES: StaffRole[] = ['admin', 'lab_technician', 'reception', 'manager']

export function StaffManagementPage() {
  const hasApi = isApiMode()
  const [rows, setRows] = useState<StaffListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const [staffFilterNameInput, setStaffFilterNameInput] = useState('')
  const [staffFilterName, setStaffFilterName] = useState('')
  const [staffFilterRole, setStaffFilterRole] = useState<'' | StaffRole>('')
  const [staffFilterActive, setStaffFilterActive] = useState<'' | 'yes' | 'no'>('')

  const [staffPage, setStaffPage] = useState(1)
  const [staffPageSize, setStaffPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<StaffListRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StaffListRow | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setStaffFilterName(staffFilterNameInput.trim()), 350)
    return () => window.clearTimeout(id)
  }, [staffFilterNameInput])

  const staffFetchParams = useMemo((): FetchStaffListParams | undefined => {
    const p: FetchStaffListParams = {}
    if (staffFilterName) p.name = staffFilterName
    if (staffFilterRole) p.role = staffFilterRole
    if (staffFilterActive === 'yes') p.is_active = true
    if (staffFilterActive === 'no') p.is_active = false
    return Object.keys(p).length ? p : undefined
  }, [staffFilterName, staffFilterRole, staffFilterActive])

  const staffListQuery = useMemo(
    (): FetchStaffListParams => ({
      ...(staffFetchParams ?? {}),
      page: staffPage,
      limit: staffPageSize,
    }),
    [staffFetchParams, staffPage, staffPageSize],
  )

  useEffect(() => {
    queueMicrotask(() => setStaffPage(1))
  }, [staffFilterName, staffFilterRole, staffFilterActive])

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
        const list = await fetchStaffList(staffListQuery)
        if (!cancelled) {
          setRows(list)
          if (list.length === 0 && staffPage > 1) {
            setStaffPage((p) => Math.max(1, p - 1))
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load staff')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, staffListQuery])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  )

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: StaffListRow) {
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
      await deleteStaff(row.id)
      setRefreshTick((t) => t + 1)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  function clearStaffFilters() {
    setStaffFilterNameInput('')
    setStaffFilterName('')
    setStaffFilterRole('')
    setStaffFilterActive('')
    setStaffPage(1)
  }

  return (
    <div className="stack">
      <PageHeader
        title="Lab staff"
        description="Add and maintain people who work in the lab—roles control what they can do in the system."
      />

      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Data is loaded only from the
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
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label="Staff filters">
            <ListFilterSearchField
              id="staff-filter-name"
              label="Name"
              value={staffFilterNameInput}
              onChange={(e) => setStaffFilterNameInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="staff-filter-role">
                Role
              </label>
              <select
                id="staff-filter-role"
                className="list-filters-bar__select"
                value={staffFilterRole}
                onChange={(e) => setStaffFilterRole(e.target.value as '' | StaffRole)}
                disabled={loading || !hasApi}
              >
                <option value="">All</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="staff-filter-active">
                Active
              </label>
              <select
                id="staff-filter-active"
                className="list-filters-bar__select"
                value={staffFilterActive}
                onChange={(e) => setStaffFilterActive(e.target.value as '' | 'yes' | 'no')}
                disabled={loading || !hasApi}
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearStaffFilters}
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
              Add staff
            </button>
          </div>
        </div>
        <h3 className="card-title" style={{ margin: '0 0 0.65rem' }}>
          Staff list
        </h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading staff" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="data-table__state">
                    No staff yet.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{r.id}</code>
                    </td>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td>{roleLabel(r.role)}</td>
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
        {!loading && hasApi ? (
          <TablePagination
            mode="server"
            page={staffPage}
            pageSize={staffPageSize}
            itemsOnPage={sorted.length}
            onPageChange={setStaffPage}
            onPageSizeChange={(n) => {
              setStaffPageSize(n)
              setStaffPage(1)
            }}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete staff?"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <StaffFormModal
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
