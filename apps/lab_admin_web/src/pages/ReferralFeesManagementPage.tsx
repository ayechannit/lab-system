import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ReferralFeeFormModal } from '../components/referral-fees/ReferralFeeFormModal'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import type { LabTestCatalogRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  deleteReferralFeeById,
  fetchAllReferralFees,
  fetchReferralFeeReport,
  type ReferralFeeReportRow,
  type TestReferralFeeListRow,
} from '../services/referralFeeService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import '../components/common/ui.css'

const colSpan = 7

export function ReferralFeesManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<TestReferralFeeListRow[]>([])
  const [tests, setTests] = useState<LabTestCatalogRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editInitial, setEditInitial] = useState<TestReferralFeeListRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestReferralFeeListRow | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [referralTab, setReferralTab] = useState<'settings' | 'report'>('settings')

  const [reportRows, setReportRows] = useState<ReferralFeeReportRow[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportTotalOrders, setReportTotalOrders] = useState(0)
  const [reportTotalFee, setReportTotalFee] = useState(0)
  const [reportStartDateInput, setReportStartDateInput] = useState('')
  const [reportEndDateInput, setReportEndDateInput] = useState('')
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportPage, setReportPage] = useState(1)
  const [reportPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [reportRefreshTick, setReportRefreshTick] = useState(0)

  useErrorToast(reportError)

  useEffect(() => {
    if (referralTab !== 'report' || !hasApi) {
      queueMicrotask(() => setReportLoading(false))
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      setReportLoading(true)
      setReportError(null)
    })
    void (async () => {
      try {
        const report = await fetchReferralFeeReport({
          start_date: reportStartDate || undefined,
          end_date: reportEndDate || undefined,
          page: reportPage,
          limit: reportPageSize,
        })
        if (!cancelled) {
          setReportRows(report.rows)
          setReportTotalOrders(report.total_orders)
          setReportTotalFee(report.total_referral_fee_mmk)
        }
      } catch (e) {
        if (!cancelled) setReportError(e instanceof Error ? e.message : t('referralFees.report.loadFailed'))
      } finally {
        if (!cancelled) setReportLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [referralTab, hasApi, reportStartDate, reportEndDate, reportPage, reportPageSize, reportRefreshTick, t])

  function applyReportDateFilter() {
    setReportPage(1)
    setReportStartDate(reportStartDateInput)
    setReportEndDate(reportEndDateInput)
  }

  function clearReportDateFilter() {
    setReportStartDateInput('')
    setReportEndDateInput('')
    setReportStartDate('')
    setReportEndDate('')
    setReportPage(1)
  }

  useEffect(() => {
    if (!hasApi) {
      queueMicrotask(() => {
        setLoading(false)
        setRows([])
        setTests([])
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
        const [feeList, catalog] = await Promise.all([fetchAllReferralFees(), fetchLabTestsList()])
        if (!cancelled) {
          setRows(feeList)
          setTests(catalog.filter((test) => test.is_active && !test.is_deleted))
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('referralFees.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, t])

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, search])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (a.test_name ?? a.test_id).localeCompare(b.test_name ?? b.test_id))
  }, [rows])

  const filtered = useMemo(() => {
    let list = sorted
    if (search) {
      list = list.filter((r) => {
        const name = (r.test_name ?? '').toLowerCase()
        const code = (r.test_code ?? '').toLowerCase()
        return name.includes(search) || code.includes(search)
      })
    }
    return list
  }, [sorted, search])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  function openCreate() {
    setFormMode('create')
    setEditInitial(null)
    setFormOpen(true)
  }

  function openEdit(row: TestReferralFeeListRow) {
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
      await deleteReferralFeeById(row.id)
      showSuccess(t('referralFees.delete.success'))
      setRefreshTick((tick) => tick + 1)
    } catch (e) {
      showError(messageFromError(e, t('common.delete')))
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.referralFees.title')} description={t('pages.referralFees.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="segment-tabs" role="tablist" aria-label={t('referralFees.tabsAria')}>
        <button
          type="button"
          className={`segment-tabs__tab${referralTab === 'settings' ? ' segment-tabs__tab--active' : ''}`}
          role="tab"
          aria-selected={referralTab === 'settings'}
          id="referral-tab-settings"
          aria-controls="referral-panel-settings"
          onClick={() => setReferralTab('settings')}
        >
          {t('referralFees.tabSettings')}
        </button>
        <button
          type="button"
          className={`segment-tabs__tab${referralTab === 'report' ? ' segment-tabs__tab--active' : ''}`}
          role="tab"
          aria-selected={referralTab === 'report'}
          id="referral-tab-report"
          aria-controls="referral-panel-report"
          onClick={() => setReferralTab('report')}
        >
          {t('referralFees.tabReport')}
        </button>
      </div>

      <div role="tabpanel" id="referral-panel-settings" aria-labelledby="referral-tab-settings" hidden={referralTab !== 'settings'}>
      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label={t('referralFees.filters.ariaLabel')}>
            <ListFilterSearchField
              id="referral-fee-filter-test"
              label={t('common.test')}
              placeholder={listFilterSearchPlaceholder(
                t('common.test'),
                t('referralFees.filters.searchDetail'),
              )}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi || searchInput.trim() === ''}
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
              {t('referralFees.add')}
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">{t('referralFees.hint')}</p>
        <div className="table-wrap">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th>{t('common.test')}</th>
                <th>{t('common.code')}</th>
                <th className="col-num">{t('labTests.table.base')}</th>
                <th className="col-num">{t('referralFees.table.referralPercent')}</th>
                <th className="col-num">{t('referralFees.table.fee')}</th>
                <th>{t('common.active')}</th>
                <th className="action-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('referralFees.loading')} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <p className="data-table__empty-title">{t('referralFees.empty.title')}</p>
                      <p className="data-table__empty-text">{t('referralFees.empty.body')}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          {t('referralFees.add')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('referralFees.noMatch')}
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id}>
                    <td>{r.test_name ?? t('common.none')}</td>
                    <td>
                      <code>{r.test_code ?? t('common.none')}</code>
                    </td>
                    <td className="col-num">
                      {r.original_price !== undefined ? r.original_price.toLocaleString() : t('common.none')}
                    </td>
                    <td className="col-num">{r.referral_percent}</td>
                    <td className="col-num">
                      {r.referral_fee_amount !== undefined
                        ? r.referral_fee_amount.toLocaleString()
                        : t('common.none')}
                    </td>
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
                          { label: t('common.edit'), onSelect: () => openEdit(r) },
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
      </div>

      <div role="tabpanel" id="referral-panel-report" aria-labelledby="referral-tab-report" hidden={referralTab !== 'report'}>
        <div className="card">
          <div className="list-tools-row">
            <div className="list-filters-bar" aria-label={t('referralFees.report.filtersAria')}>
              <div className="field">
                <label htmlFor="rf-report-start">{t('referralFees.report.startDate')}</label>
                <input
                  id="rf-report-start"
                  type="date"
                  value={reportStartDateInput}
                  onChange={(e) => setReportStartDateInput(e.target.value)}
                  disabled={reportLoading || !hasApi}
                />
              </div>
              <div className="field">
                <label htmlFor="rf-report-end">{t('referralFees.report.endDate')}</label>
                <input
                  id="rf-report-end"
                  type="date"
                  value={reportEndDateInput}
                  onChange={(e) => setReportEndDateInput(e.target.value)}
                  disabled={reportLoading || !hasApi}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={applyReportDateFilter}
                disabled={reportLoading || !hasApi}
              >
                {t('filters.apply')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm list-filters-bar__clear"
                onClick={clearReportDateFilter}
                disabled={reportLoading || !hasApi || (!reportStartDateInput && !reportEndDateInput)}
              >
                {t('filters.clearFilters')}
              </button>
            </div>
            <div className="list-tools-row__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReportRefreshTick((tick) => tick + 1)}
                disabled={reportLoading || !hasApi}
              >
                {reportLoading ? t('common.refreshing') : t('common.refresh')}
              </button>
            </div>
          </div>
          <p className="catalog-mode-hint">
            {t('referralFees.report.summary', {
              orders: reportTotalOrders,
              fee: reportTotalFee.toLocaleString(),
            })}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('referralFees.report.orderId')}</th>
                  <th>{t('common.patient')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('referralFees.report.date')}</th>
                  <th className="col-num">{t('orders.table.final')}</th>
                  <th className="col-num">{t('referralFees.report.fee')}</th>
                </tr>
              </thead>
              <tbody>
                {reportLoading ? (
                  <tr>
                    <td colSpan={6} className="data-table__state data-table__state--loading">
                      <LoadingSpinner label={t('referralFees.report.loading')} />
                    </td>
                  </tr>
                ) : !hasApi ? (
                  <tr>
                    <td colSpan={6} className="data-table__state">
                      {t('referralFees.noApi')}
                    </td>
                  </tr>
                ) : reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="data-table__state">
                      {t('referralFees.report.empty')}
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row) => (
                    <tr key={row.order_id}>
                      <td>
                        <code>{row.order_id.slice(0, 8)}</code>
                      </td>
                      <td>{row.patient_name || t('common.none')}</td>
                      <td>{row.status}</td>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : t('common.none')}</td>
                      <td className="col-num">{row.final_price_mmk.toLocaleString()}</td>
                      <td className="col-num">{row.referral_fee_total_mmk.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!reportLoading && hasApi && reportRows.length > 0 ? (
            <TablePagination
              mode="server"
              page={reportPage}
              pageSize={reportPageSize}
              itemsOnPage={reportRows.length}
              onPageChange={setReportPage}
            />
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('referralFees.delete.title')}
        message={
          deleteTarget
            ? t('referralFees.delete.message', {
                test: deleteTarget.test_name ?? deleteTarget.test_id,
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ReferralFeeFormModal
        open={formOpen && hasApi}
        mode={formMode}
        initial={editInitial}
        tests={tests}
        onClose={closeForm}
        onSuccess={() => {
          showSuccess(
            formMode === 'edit' ? t('referralFees.toast.updated') : t('referralFees.toast.created'),
          )
          setRefreshTick((tick) => tick + 1)
        }}
      />
    </div>
  )
}
