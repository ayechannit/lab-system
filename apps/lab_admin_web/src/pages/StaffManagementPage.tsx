import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { StaffFormModal } from '../components/staff/StaffFormModal'
import { StaffAvatar } from '../components/staff/StaffAvatar'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { StaffListRow, StaffRole } from '../model/types'
import { useAuth } from '../hooks/AuthContext'
import { isApiMode } from '../services/apiBase'
import { deleteStaff, fetchStaffList, type FetchStaffListParams } from '../services/staffService'
import { roleLabel } from '../utils/roleLabels'
import '../components/common/ui.css'

const STAFF_ROLES: StaffRole[] = ['admin', 'lab_technician', 'reception', 'manager', 'collector']

export function StaffManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { account } = useAuth()
  const { showSuccess, showError } = useToast()
  const currentStaffId = account?.type === 'staff' ? account.id : null
  const [rows, setRows] = useState<StaffListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

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
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('staff.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, staffListQuery, t])

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
    if (currentStaffId && row.id === currentStaffId) {
      showError(t('staff.delete.cannotDeleteSelf'))
      return
    }
    try {
      await deleteStaff(row.id)
      showSuccess(t('staff.toasts.deleted', { name: row.name }))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('staff.toasts.deleteFailed')))
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
      <PageHeader title={t('pages.staff.title')} description={t('pages.staff.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label={t('staff.filters.ariaLabel')}>
            <ListFilterSearchField
              id="staff-filter-name"
              label={t('common.name')}
              value={staffFilterNameInput}
              onChange={(e) => setStaffFilterNameInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="staff-filter-role">
                {t('common.role')}
              </label>
              <select
                id="staff-filter-role"
                className="list-filters-bar__select"
                value={staffFilterRole}
                onChange={(e) => setStaffFilterRole(e.target.value as '' | StaffRole)}
                disabled={loading || !hasApi}
              >
                <option value="">{t('common.all')}</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="staff-filter-active">
                {t('common.active')}
              </label>
              <select
                id="staff-filter-active"
                className="list-filters-bar__select"
                value={staffFilterActive}
                onChange={(e) => setStaffFilterActive(e.target.value as '' | 'yes' | 'no')}
                disabled={loading || !hasApi}
              >
                <option value="">{t('common.all')}</option>
                <option value="yes">{t('common.yes')}</option>
                <option value="no">{t('common.no')}</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearStaffFilters}
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
              {t('staff.actions.add')}
            </button>
          </div>
        </div>
        <h3 className="card-title" style={{ margin: '0 0 0.65rem' }}>
          {t('staff.listTitle')}
        </h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('staff.table.id')}</th>
                <th>{t('staff.table.name')}</th>
                <th>{t('staff.table.email')}</th>
                <th>{t('staff.table.role')}</th>
                <th>{t('staff.table.active')}</th>
                <th className="action-col">{t('staff.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('staff.loading')} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="data-table__state">
                    {t('staff.empty')}
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{r.id}</code>
                    </td>
                    <td>
                      <span className="staff-name-cell">
                        <StaffAvatar
                          name={r.name}
                          profileImageUrl={r.profile_image_url}
                          className="staff-avatar staff-avatar--table"
                        />
                        <span>{r.name}</span>
                      </span>
                    </td>
                    <td>{r.email}</td>
                    <td>{roleLabel(r.role)}</td>
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
                          { label: t('staff.actions.edit'), onSelect: () => openEdit(r) },
                          ...(currentStaffId === r.id
                            ? []
                            : [
                                {
                                  label: t('common.delete'),
                                  onSelect: () => {
                                    setDeleteTarget(r)
                                    setOpenMenuId(null)
                                  },
                                },
                              ]),
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
        title={t('staff.delete.title')}
        message={deleteTarget ? t('staff.delete.message', { name: deleteTarget.name }) : ''}
        confirmLabel={t('staff.delete.confirm')}
        cancelLabel={t('common.cancel')}
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
        onSuccess={() => {
          showSuccess(formMode === 'edit' ? t('staff.toasts.updated') : t('staff.toasts.created'))
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
