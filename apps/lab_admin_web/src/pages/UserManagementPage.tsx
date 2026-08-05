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
import type { UserListRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import { deleteUser, fetchUserList, type FetchUserListParams } from '../services/userService'
import { membershipTierLabel } from '../utils/membershipTierLabels'
import '../components/common/ui.css'

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
    return Object.keys(p).length ? p : undefined
  }, [userFilterName, userFilterPhone])

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
  }, [userFilterName, userFilterPhone])

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

  function clearUserFilters() {
    setUserFilterNameInput('')
    setUserFilterName('')
    setUserFilterPhoneInput('')
    setUserFilterPhone('')
    setUserPage(1)
  }

  const colSpan = 7

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
                <th>{t('users.table.phone')}</th>
                <th>{t('users.table.address')}</th>
                <th>{t('users.table.coords')}</th>
                <th>{t('users.table.points')}</th>
                <th>{t('common.tier')}</th>
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
                    <td style={{ whiteSpace: 'nowrap' }}>{r.phone || t('common.none')}</td>
                    <td style={{ maxWidth: 180, whiteSpace: 'normal' }}>{r.address || t('common.none')}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {r.latitude}, {r.longitude}
                    </td>
                    <td>{r.total_points.toLocaleString()}</td>
                    <td>
                      {r.tier_name ? (
                        <span className="badge badge--neutral">{membershipTierLabel(r.tier_name)}</span>
                      ) : (
                        t('common.none')
                      )}
                    </td>
                    <td className="action-cell">
                      <TableActionMenu
                        open={openMenuId === r.id}
                        onOpenChange={(next) => setOpenMenuId(next ? r.id : null)}
                        items={[
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
