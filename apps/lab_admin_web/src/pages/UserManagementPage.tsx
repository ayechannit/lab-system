import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { UserFormModal } from '../components/users/UserFormModal'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { EndUserRole, UserListRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  approveUser,
  deleteUser,
  fetchUserList,
  type FetchUserListParams,
} from '../services/userService'
import '../components/common/ui.css'

function roleLabel(r: EndUserRole): string {
  const map: Record<EndUserRole, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
  }
  return map[r]
}

const USER_ROLES: EndUserRole[] = ['clinic', 'doctor', 'patient']

export function UserManagementPage() {
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<UserListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

  const [userFilterNameInput, setUserFilterNameInput] = useState('')
  const [userFilterName, setUserFilterName] = useState('')
  const [userFilterPhoneInput, setUserFilterPhoneInput] = useState('')
  const [userFilterPhone, setUserFilterPhone] = useState('')
  const [userFilterRole, setUserFilterRole] = useState<'' | EndUserRole>('')
  const [userFilterApproval, setUserFilterApproval] = useState<'' | 'pending' | 'approved'>('')

  const [userPage, setUserPage] = useState(1)
  const [userPageSize, setUserPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<UserListRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserListRow | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setUserFilterName(userFilterNameInput.trim())
      setUserFilterPhone(userFilterPhoneInput.trim())
    }, 350)
    return () => window.clearTimeout(id)
  }, [userFilterNameInput, userFilterPhoneInput])

  const userFetchParams = useMemo((): FetchUserListParams | undefined => {
    const p: FetchUserListParams = {}
    if (userFilterName) p.name = userFilterName
    if (userFilterPhone) p.phone = userFilterPhone
    if (userFilterRole) p.role = userFilterRole
    if (userFilterApproval === 'pending') p.is_approved = false
    if (userFilterApproval === 'approved') p.is_approved = true
    return Object.keys(p).length ? p : undefined
  }, [userFilterName, userFilterPhone, userFilterRole, userFilterApproval])

  const userListQuery = useMemo(
    (): FetchUserListParams => ({
      ...(userFetchParams ?? {}),
      page: userPage,
      limit: userPageSize,
    }),
    [userFetchParams, userPage, userPageSize],
  )

  useEffect(() => {
    queueMicrotask(() => setUserPage(1))
  }, [userFilterName, userFilterPhone, userFilterRole, userFilterApproval])

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
        const list = await fetchUserList(userListQuery)
        if (!cancelled) {
          setRows(list)
          if (list.length === 0 && userPage > 1) {
            setUserPage((p) => Math.max(1, p - 1))
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, userListQuery])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  )

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: UserListRow) {
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
      await deleteUser(row.id)
      showSuccess(`Deleted user "${row.name}".`)
      setRefreshTick((t) => t + 1)
    } catch (e) {
      showError(messageFromError(e, 'Delete failed'))
    }
  }

  async function confirmApprove(row: UserListRow) {
    if (!hasApi) return
    setOpenMenuId(null)
    try {
      await approveUser(row.id)
      showSuccess(`Approved "${row.name}". They can sign in on the mobile app now.`)
      setRefreshTick((t) => t + 1)
    } catch (e) {
      showError(messageFromError(e, 'Approve failed'))
    }
  }

  function clearUserFilters() {
    setUserFilterNameInput('')
    setUserFilterName('')
    setUserFilterPhoneInput('')
    setUserFilterPhone('')
    setUserFilterRole('')
    setUserFilterApproval('')
    setUserPage(1)
  }

  const colSpan = 9

  return (
    <div className="stack">
      <PageHeader
        title="Users"
        description="Manage patient and partner accounts: contact details, location, and loyalty balance."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Data is loaded only from the
            backend.
          </p>
        </div>
      ) : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label="User filters">
            <ListFilterSearchField
              id="user-filter-name"
              label="Name"
              value={userFilterNameInput}
              onChange={(e) => setUserFilterNameInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <ListFilterSearchField
              id="user-filter-phone"
              label="Phone"
              value={userFilterPhoneInput}
              onChange={(e) => setUserFilterPhoneInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="user-filter-role">
                Role
              </label>
              <select
                id="user-filter-role"
                className="list-filters-bar__select"
                value={userFilterRole}
                onChange={(e) => setUserFilterRole(e.target.value as '' | EndUserRole)}
                disabled={loading || !hasApi}
              >
                <option value="">All</option>
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="user-filter-approval">
                Status
              </label>
              <select
                id="user-filter-approval"
                className="list-filters-bar__select"
                value={userFilterApproval}
                onChange={(e) =>
                  setUserFilterApproval(e.target.value as '' | 'pending' | 'approved')
                }
                disabled={loading || !hasApi}
              >
                <option value="">All</option>
                <option value="pending">Pending approval</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearUserFilters}
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
              Add user
            </button>
          </div>
        </div>
        <h3 className="card-title" style={{ margin: '0 0 0.65rem' }}>
          User directory
        </h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Address</th>
                <th>Lat / Lng</th>
                <th>Points</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading users" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    No users yet.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.phone || '—'}</td>
                    <td>{roleLabel(r.role)}</td>
                    <td>
                      {r.is_approved ? (
                        <span className="badge badge--ok">Approved</span>
                      ) : (
                        <span className="badge badge--warn">Pending</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 180, whiteSpace: 'normal' }}>{r.address || '—'}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {r.latitude}, {r.longitude}
                    </td>
                    <td>{r.total_points.toLocaleString()}</td>
                    <td className="action-cell">
                      <TableActionMenu
                        open={openMenuId === r.id}
                        onOpenChange={(next) => setOpenMenuId(next ? r.id : null)}
                        items={[
                          ...(!r.is_approved
                            ? [
                                {
                                  label: 'Approve account',
                                  onSelect: () => void confirmApprove(r),
                                },
                              ]
                            : []),
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
            page={userPage}
            pageSize={userPageSize}
            itemsOnPage={sorted.length}
            onPageChange={setUserPage}
            onPageSizeChange={(n) => {
              setUserPageSize(n)
              setUserPage(1)
            }}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user?"
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

      <UserFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editInitial}
        existingRows={rows}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(formMode === 'edit' ? 'User updated.' : 'User created.')
          setRefreshTick((t) => t + 1)
        }}
      />
    </div>
  )
}
