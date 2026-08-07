import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { MembershipTierFormModal } from '../components/membership-tiers/MembershipTierFormModal'
import { isApiMode } from '../services/apiBase'
import {
  deleteMembershipTier,
  fetchMembershipTiers,
  type MembershipTierRow,
} from '../services/membershipTierService'
import { membershipTierLabel } from '../utils/membershipTierLabels'
import '../components/common/ui.css'

const colSpan = 5

export function MembershipTiersManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<MembershipTierRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<MembershipTierRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MembershipTierRow | null>(null)

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
        const list = await fetchMembershipTiers()
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('membershipTiers.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, t])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, rows.length])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.min_spend_mmk - b.min_spend_mmk),
    [rows],
  )

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: MembershipTierRow) {
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
      await deleteMembershipTier(row.id)
      showSuccess(t('membershipTiers.delete.success'))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('common.delete')))
    }
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.membershipTiers.title')} description={t('pages.membershipTiers.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label={t('membershipTiers.title')} />
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
              {t('membershipTiers.add')}
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">{t('membershipTiers.hint')}</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th className="col-num">{t('membershipTiers.table.minSpend')}</th>
                <th className="col-num">{t('membershipTiers.table.discountPercent')}</th>
                <th>{t('common.active')}</th>
                <th className="action-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('membershipTiers.loading')} />
                  </td>
                </tr>
              ) : !hasApi ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('membershipTiers.noApi')}
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('membershipTiers.empty')}
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{membershipTierLabel(row.name)}</td>
                    <td className="col-num">
                      {row.min_spend_mmk.toLocaleString()} {t('orders.currency')}
                    </td>
                    <td className="col-num">{row.discount_percent}%</td>
                    <td>
                      {row.is_active ? (
                        <span className="badge badge--success">{t('common.active')}</span>
                      ) : (
                        <span className="badge" style={{ background: '#eef1f6', color: '#5c6478' }}>
                          {t('common.off')}
                        </span>
                      )}
                    </td>
                    <td className="action-cell">
                      <TableActionMenu
                        open={openMenuId === row.id}
                        onOpenChange={(next) => setOpenMenuId(next ? row.id : null)}
                        items={[
                          { label: t('common.edit'), onSelect: () => openEdit(row) },
                          {
                            label: t('common.delete'),
                            onSelect: () => {
                              setDeleteTarget(row)
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
        {!loading && hasApi && sorted.length > 0 ? (
          <TablePagination
            mode="client"
            page={page}
            pageSize={pageSize}
            totalItems={sorted.length}
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
        title={t('membershipTiers.delete.title')}
        message={deleteTarget ? t('membershipTiers.delete.message', { name: membershipTierLabel(deleteTarget.name) }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <MembershipTierFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editInitial}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(formMode === 'edit' ? t('membershipTiers.toast.updated') : t('membershipTiers.toast.created'))
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
