import { useEffect, useMemo, useState } from 'react'
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
  type ReferralFeeRole,
  type TestReferralFeeListRow,
} from '../services/referralFeeService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import '../components/common/ui.css'

const colSpan = 8

const REFERRAL_ROLE_FILTER_OPTIONS: { value: '' | ReferralFeeRole; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
  { value: 'phlebotomist', label: 'Phlebotomist' },
]

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
    phlebotomist: 'Phlebotomist',
  }
  return map[role] ?? role
}

export function ReferralFeesManagementPage() {
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
  const [roleFilter, setRoleFilter] = useState<'' | ReferralFeeRole>('')

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
        const [feeList, catalog] = await Promise.all([fetchAllReferralFees(), fetchLabTestsList()])
        if (!cancelled) {
          setRows(feeList)
          setTests(catalog.filter((t) => t.is_active && !t.is_deleted))
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load referral fees')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick])

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    queueMicrotask(() => setPage(1))
  }, [refreshTick, search, roleFilter])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const na = (a.test_name ?? a.test_id).localeCompare(b.test_name ?? b.test_id)
      if (na !== 0) return na
      return a.role.localeCompare(b.role)
    })
  }, [rows])

  const filtered = useMemo(() => {
    let list = sorted
    if (roleFilter) {
      list = list.filter((r) => r.role === roleFilter)
    }
    if (search) {
      list = list.filter((r) => {
        const name = (r.test_name ?? '').toLowerCase()
        const code = (r.test_code ?? '').toLowerCase()
        return name.includes(search) || code.includes(search)
      })
    }
    return list
  }, [sorted, search, roleFilter])

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
      showSuccess('Referral fee rule deleted.')
      setRefreshTick((t) => t + 1)
    } catch (e) {
      showError(messageFromError(e, 'Delete failed'))
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setRoleFilter('')
    setPage(1)
  }

  const emptyMessage = {
    title: 'No referral fee rules yet',
    body: 'Set a referral percentage for each test and referrer role. The fee amount is calculated from the test base price.',
  }

  return (
    <div className="stack">
      <PageHeader
        title="Referral fees"
        description="Configure referral commission percentages per lab test and referrer role (clinic, doctor, patient, phlebotomist)."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g.{' '}
            <code>http://localhost:3000</code>) and restart the dev server. Referral fees load from the backend only.
          </p>
        </div>
      ) : null}

      <div className="card">
        <div className="list-tools-row">
          <div className="list-filters-bar" aria-label="Referral fee filters">
            <ListFilterSearchField
              id="referral-fee-filter-test"
              label="Test"
              placeholder={listFilterSearchPlaceholder('Test', 'name or code')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="referral-fee-filter-role">
                Role
              </label>
              <select
                id="referral-fee-filter-role"
                className="list-filters-bar__select"
                value={roleFilter}
                onChange={(e) => setRoleFilter((e.target.value || '') as '' | ReferralFeeRole)}
                disabled={loading || !hasApi}
              >
                {REFERRAL_ROLE_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all-roles'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi || (searchInput.trim() === '' && roleFilter === '')}
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
              Add referral fee
            </button>
          </div>
        </div>
        <p className="catalog-mode-hint">
          Rules apply to active catalog tests only. Referral fee (MMK) = base price × referral %.
        </p>
        <div className="table-wrap">
          <table className="data-table data-table--discounts">
            <thead>
              <tr>
                <th>Test</th>
                <th>Code</th>
                <th>Role</th>
                <th className="col-num">Base (MMK)</th>
                <th className="col-num">Referral (%)</th>
                <th className="col-num">Fee (MMK)</th>
                <th>Active</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading referral fees" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <p className="data-table__empty-title">{emptyMessage.title}</p>
                      <p className="data-table__empty-text">{emptyMessage.body}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          Add referral fee
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    No referral fees match these filters. Clear filters or try a different test or role.
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id}>
                    <td>{r.test_name ?? '—'}</td>
                    <td>
                      <code>{r.test_code ?? '—'}</code>
                    </td>
                    <td>{roleLabel(r.role)}</td>
                    <td className="col-num">
                      {r.original_price !== undefined ? r.original_price.toLocaleString() : '—'}
                    </td>
                    <td className="col-num">{r.referral_percent}</td>
                    <td className="col-num">
                      {r.referral_fee_amount !== undefined ? r.referral_fee_amount.toLocaleString() : '—'}
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
        title="Delete referral fee?"
        message={
          deleteTarget
            ? `Delete this ${roleLabel(deleteTarget.role)} referral fee for "${deleteTarget.test_name ?? deleteTarget.test_id}"?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
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
          showSuccess(formMode === 'edit' ? 'Referral fee updated.' : 'Referral fee created.')
          setRefreshTick((t) => t + 1)
        }}
      />
    </div>
  )
}
