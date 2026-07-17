import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
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
import { roleLabel } from '../utils/roleLabels'
import '../components/common/ui.css'

const USER_ROLES: EndUserRole[] = ['clinic', 'doctor', 'patient', 'phlebotomist']

export function UserManagementPage() {
  const { t } = useTranslation()
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

  const approvalFilterOptions = useMemo(
    () =>
      [
        { value: 'pending' as const, label: t('users.filters.approvalPending') },
        { value: 'approved' as const, label: t('users.filters.approvalApproved') },
      ] as const,
    [t],
  )

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
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('users.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, userListQuery, t])

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
      showSuccess(t('users.toasts.deleted', { name: row.name }))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('users.toasts.deleteFailed')))
    }
  }

  async function confirmApprove(row: UserListRow) {
    if (!hasApi) return
    setOpenMenuId(null)
    try {
      await approveUser(row.id)
      showSuccess(t('users.toasts.approved', { name: row.name }))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('users.toasts.approveFailed')))
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
      <PageHeader title={t('pages.users.title')} description={t('pages.users.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label={t('users.filters.ariaLabel')}>
            <ListFilterSearchField
              id="user-filter-name"
              label={t('common.name')}
              value={userFilterNameInput}
              onChange={(e) => setUserFilterNameInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <ListFilterSearchField
              id="user-filter-phone"
              label={t('common.phone')}
              value={userFilterPhoneInput}
              onChange={(e) => setUserFilterPhoneInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="user-filter-role">
                {t('common.role')}
              </label>
              <select
                id="user-filter-role"
                className="list-filters-bar__select"
                value={userFilterRole}
                onChange={(e) => setUserFilterRole(e.target.value as '' | EndUserRole)}
                disabled={loading || !hasApi}
              >
                <option value="">{t('common.all')}</option>
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="user-filter-approval">
                {t('common.status')}
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
                <option value="">{t('common.all')}</option>
                {approvalFilterOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearUserFilters}
              disabled={loading || !hasApi}
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
              {t('users.actions.add')}
            </button>
          </div>
        </div>
        <h3 className="card-title" style={{ margin: '0 0 0.65rem' }}>
          {t('users.listTitle')}
        </h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('users.table.name')}</th>
                <th>{t('users.table.email')}</th>
                <th>{t('users.table.phone')}</th>
                <th>{t('users.table.role')}</th>
                <th>{t('users.table.status')}</th>
                <th>{t('users.table.address')}</th>
                <th>{t('users.table.coords')}</th>
                <th>{t('users.table.points')}</th>
                <th className="action-col">{t('users.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('users.loading')} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('users.empty')}
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.phone || t('common.none')}</td>
                    <td>{roleLabel(r.role)}</td>
                    <td>
                      {r.is_approved ? (
                        <span className="badge badge--ok">{t('users.status.approved')}</span>
                      ) : (
                        <span className="badge badge--warn">{t('users.status.pending')}</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 180, whiteSpace: 'normal' }}>{r.address || t('common.none')}</td>
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
                                  label: t('users.actions.approve'),
                                  onSelect: () => void confirmApprove(r),
                                },
                              ]
                            : []),
                          { label: t('users.actions.edit'), onSelect: () => openEdit(r) },
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
        title={t('users.delete.title')}
        message={deleteTarget ? t('users.delete.message', { name: deleteTarget.name }) : ''}
        confirmLabel={t('users.delete.confirm')}
        cancelLabel={t('common.cancel')}
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
          showSuccess(formMode === 'edit' ? t('users.toasts.updated') : t('users.toasts.created'))
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
