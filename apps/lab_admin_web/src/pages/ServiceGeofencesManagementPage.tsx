import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { ServiceGeofenceFormModal } from '../components/service-geofences/ServiceGeofenceFormModal'
import { hasUsableCoords, LocationMapPicker } from '../components/users/LocationMapPicker'
import { isApiMode } from '../services/apiBase'
import {
  calculateServiceFee,
  deleteServiceGeofence,
  fetchServiceGeofences,
  type CalculateServiceFeeResult,
  type ServiceGeofenceRow,
} from '../services/serviceGeofenceService'
import '../components/common/ui.css'

const colSpan = 6

function formatCoord(n: number): string {
  return n.toFixed(5)
}

function formatBounds(row: ServiceGeofenceRow): string {
  return `${formatCoord(row.south_latitude)}–${formatCoord(row.north_latitude)}°N · ${formatCoord(row.west_longitude)}–${formatCoord(row.east_longitude)}°E`
}

export function ServiceGeofencesManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<ServiceGeofenceRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'' | 'active' | 'inactive'>('')

  const [formOpen, setFormOpen] = useState(false)
  const [formNonce, setFormNonce] = useState(0)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editRow, setEditRow] = useState<ServiceGeofenceRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceGeofenceRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [testLat, setTestLat] = useState<number | ''>('')
  const [testLng, setTestLng] = useState<number | ''>('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<CalculateServiceFeeResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)

  const [previewZoneId, setPreviewZoneId] = useState<string | null>(null)

  const hasTestPoint = hasUsableCoords(testLat, testLng)
  const activeZoneCount = useMemo(() => rows.filter((r) => r.is_active).length, [rows])
  const previewZone = useMemo(
    () => (previewZoneId ? rows.find((r) => r.id === previewZoneId) ?? null : null),
    [rows, previewZoneId],
  )
  const zoneOverlays = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        south_latitude: r.south_latitude,
        north_latitude: r.north_latitude,
        west_longitude: r.west_longitude,
        east_longitude: r.east_longitude,
        name: r.name,
        highlighted: r.id === previewZoneId,
      })),
    [rows, previewZoneId],
  )

  useErrorToast(loadError)

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
        const list = await fetchServiceGeofences()
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('serviceGeofences.loadFailed'))
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
  }, [refreshTick, rows.length, search, filterActive])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return a.name.localeCompare(b.name)
    })
  }, [rows])

  const filtered = useMemo(() => {
    return sorted.filter((r) => {
      if (filterActive === 'active' && !r.is_active) return false
      if (filterActive === 'inactive' && r.is_active) return false
      if (search && !r.name.toLowerCase().includes(search)) return false
      return true
    })
  }, [sorted, search, filterActive])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setFilterActive('')
    setPage(1)
  }

  function openCreate() {
    setFormMode('create')
    setEditRow(null)
    setFormNonce((n) => n + 1)
    setFormOpen(true)
  }

  function openEdit(row: ServiceGeofenceRow) {
    setFormMode('edit')
    setEditRow(row)
    setFormNonce((n) => n + 1)
    setFormOpen(true)
    setOpenMenuId(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteServiceGeofence(deleteTarget.id)
      showSuccess(t('serviceGeofences.delete.success'))
      setRefreshTick((x) => x + 1)
    } catch (e) {
      showError(e instanceof Error ? e.message : t('serviceGeofences.delete.failed'))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function runFeeTestAt(lat: number, lng: number) {
    setTestError(null)
    setTestResult(null)
    setTestLoading(true)
    try {
      const result = await calculateServiceFee(lat, lng)
      setTestResult(result)
    } catch (e) {
      const err = e as Error & { isOutOfCoverage?: boolean }
      if (err.isOutOfCoverage) {
        setTestError(t('serviceGeofences.tester.outOfCoverage'))
      } else {
        setTestError(err instanceof Error ? err.message : t('serviceGeofences.tester.failed'))
      }
    } finally {
      setTestLoading(false)
    }
  }

  async function runFeeTest() {
    const lat = typeof testLat === 'number' ? testLat : Number.parseFloat(String(testLat))
    const lng = typeof testLng === 'number' ? testLng : Number.parseFloat(String(testLng))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setTestError(t('serviceGeofences.tester.errorCoords'))
      return
    }
    await runFeeTestAt(lat, lng)
  }

  function clearTestPoint() {
    setTestLat('')
    setTestLng('')
    setTestResult(null)
    setTestError(null)
    setGeoMessage(null)
    setPreviewZoneId(null)
  }

  function previewZoneOnMap(row: ServiceGeofenceRow) {
    if (previewZoneId === row.id) {
      clearTestPoint()
      return
    }
    setPreviewZoneId(row.id)
    const lat = (row.south_latitude + row.north_latitude) / 2
    const lng = (row.west_longitude + row.east_longitude) / 2
    setTestLat(lat)
    setTestLng(lng)
    setGeoMessage(null)
    document.getElementById('sg-fee-tester-title')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    void runFeeTestAt(lat, lng)
  }

  function requestBrowserLocation() {
    setGeoMessage(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage(t('locationMap.geolocationNotSupported'))
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        setTestLat(pos.coords.latitude)
        setTestLng(pos.coords.longitude)
        setTestResult(null)
        setTestError(null)
      },
      (err) => {
        setGeoLoading(false)
        const code = err.code
        if (code === 1) {
          setGeoMessage(t('locationMap.permissionDenied'))
        } else if (code === 2) {
          setGeoMessage(t('locationMap.positionUnavailable'))
        } else if (code === 3) {
          setGeoMessage(t('locationMap.requestTimedOut'))
        } else {
          setGeoMessage(t('locationMap.couldNotReadLocation'))
        }
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    )
  }

  return (
    <div className="stack service-geofences-page">
      <PageHeader title={t('pages.serviceGeofences.title')} description={t('pages.serviceGeofences.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <section className="card service-geofence-tester" aria-labelledby="sg-fee-tester-title">
        <header className="service-geofence-tester__head">
          <span className="service-geofence-tester__icon" aria-hidden>
            <span className="material-symbols-outlined">calculate</span>
          </span>
          <div className="service-geofence-tester__copy">
            <h2 id="sg-fee-tester-title" className="service-geofence-tester__title">
              {t('serviceGeofences.tester.title')}
            </h2>
            <p className="service-geofence-tester__hint">{t('serviceGeofences.tester.hint')}</p>
          </div>
        </header>

        <div className="service-geofence-tester__body">
          <div className="service-geofence-tester__map-wrap">
            <LocationMapPicker
              latitude={testLat}
              longitude={testLng}
              onPick={(lat, lng) => {
                setTestLat(lat)
                setTestLng(lng)
                setTestResult(null)
                setTestError(null)
                setGeoMessage(null)
              }}
              hideToolbar
              zoneOverlays={zoneOverlays}
              fitZoneId={previewZoneId}
            />
          </div>

          <aside className="service-geofence-tester__panel" aria-live="polite">
            <ol className="service-geofence-tester__steps">
              <li
                className={`service-geofence-tester__step${hasTestPoint ? ' service-geofence-tester__step--done' : ' service-geofence-tester__step--active'}`}
              >
                <span className="service-geofence-tester__step-index" aria-hidden>
                  1
                </span>
                <span>{t('serviceGeofences.tester.stepSelect')}</span>
              </li>
              <li
                className={`service-geofence-tester__step${
                  testResult
                    ? ' service-geofence-tester__step--done'
                    : hasTestPoint
                      ? ' service-geofence-tester__step--active'
                      : ''
                }`}
              >
                <span className="service-geofence-tester__step-index" aria-hidden>
                  2
                </span>
                <span>{t('serviceGeofences.tester.stepCalculate')}</span>
              </li>
            </ol>

            <div
              className={`service-geofence-tester__selection${hasTestPoint ? ' service-geofence-tester__selection--ready' : ''}`}
            >
              <p className="service-geofence-tester__panel-label">{t('serviceGeofences.tester.selectedPoint')}</p>
              {hasTestPoint ? (
                <dl className="service-geofence-tester__coords">
                  <div className="service-geofence-tester__coord-row">
                    <dt>{t('serviceGeofences.tester.latitude')}</dt>
                    <dd>{typeof testLat === 'number' ? testLat.toFixed(5) : testLat}</dd>
                  </div>
                  <div className="service-geofence-tester__coord-row">
                    <dt>{t('serviceGeofences.tester.longitude')}</dt>
                    <dd>{typeof testLng === 'number' ? testLng.toFixed(5) : testLng}</dd>
                  </div>
                </dl>
              ) : (
                <p className="service-geofence-tester__selection-empty">{t('serviceGeofences.tester.noPoint')}</p>
              )}
            </div>

            <div className="service-geofence-tester__zones-meta">
              <div className="service-geofence-tester__zones-meta-copy">
                <span className="material-symbols-outlined" aria-hidden>
                  layers
                </span>
                <span>
                  {previewZone
                    ? t('serviceGeofences.tester.previewingZone', { name: previewZone.name })
                    : t('serviceGeofences.tester.activeZones', { count: activeZoneCount })}
                </span>
              </div>
            </div>

            <div
              className={`service-geofence-tester__result-slot${
                testResult
                  ? ' service-geofence-tester__result-slot--success'
                  : testError
                    ? ' service-geofence-tester__result-slot--error'
                    : ''
              }`}
            >
              {testResult ? (
                <div className="service-geofence-tester__outcome service-geofence-tester__outcome--success">
                  <span className="material-symbols-outlined" aria-hidden>
                    check_circle
                  </span>
                  <div>
                    <p className="service-geofence-tester__outcome-title">{testResult.zone_name}</p>
                    <p className="service-geofence-tester__outcome-fee">
                      {testResult.service_fee_mmk.toLocaleString()}{' '}
                      <span className="service-geofence-tester__outcome-currency">{t('orders.currency')}</span>
                    </p>
                    <p className="service-geofence-tester__outcome-sub">
                      {t('serviceGeofences.tester.feeLine', {
                        fee: testResult.service_fee_mmk.toLocaleString(),
                      })}
                    </p>
                  </div>
                </div>
              ) : testError ? (
                <div className="service-geofence-tester__outcome service-geofence-tester__outcome--error" role="alert">
                  <span className="material-symbols-outlined" aria-hidden>
                    error
                  </span>
                  <p>{testError}</p>
                </div>
              ) : (
                <div className="service-geofence-tester__result-idle">
                  <span className="material-symbols-outlined" aria-hidden>
                    payments
                  </span>
                  <p>{t('serviceGeofences.tester.resultIdle')}</p>
                </div>
              )}
            </div>

            <div className="service-geofence-tester__actions">
              <div className="service-geofence-tester__actions-row">
                <button
                  type="button"
                  className="btn btn-secondary service-geofence-tester__btn service-geofence-tester__btn-half"
                  onClick={requestBrowserLocation}
                  disabled={!hasApi || geoLoading}
                  aria-busy={geoLoading}
                >
                  {geoLoading ? t('locationMap.gettingLocation') : t('locationMap.useMyLocation')}
                </button>
                {hasTestPoint || previewZone ? (
                  <button
                    type="button"
                    className="btn btn-ghost service-geofence-tester__btn service-geofence-tester__btn-half service-geofence-tester__btn-clear"
                    onClick={clearTestPoint}
                    disabled={testLoading}
                  >
                    {t('serviceGeofences.tester.clearSelection')}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn-primary service-geofence-tester__btn"
                onClick={() => void runFeeTest()}
                disabled={!hasApi || testLoading || !hasTestPoint}
              >
                {testLoading ? t('common.loadingEllipsis') : t('serviceGeofences.tester.check')}
              </button>
              {geoMessage ? (
                <p className="service-geofence-tester__geo-message" role="status">
                  {geoMessage}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="card service-geofences-zones" aria-labelledby="sg-zones-title">
        <header className="service-geofences-zones__head">
          <div>
            <h2 id="sg-zones-title" className="service-geofences-zones__title">
              {t('serviceGeofences.listTitle')}
            </h2>
            <p className="service-geofences-zones__hint">{t('serviceGeofences.hint')}</p>
          </div>
          <div className="service-geofences-zones__head-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRefreshTick((x) => x + 1)}
              disabled={loading || !hasApi}
            >
              {loading ? t('common.refreshing') : t('common.refresh')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate} disabled={loading || !hasApi}>
              {t('serviceGeofences.add')}
            </button>
          </div>
        </header>

        <div className="list-tools-row service-geofences-zones__filters">
          <div className="list-filters-bar" aria-label={t('serviceGeofences.filters.ariaLabel')}>
            <ListFilterSearchField
              id="sg-filter-search"
              label={t('common.name')}
              placeholder={listFilterSearchPlaceholder(
                t('common.name'),
                t('serviceGeofences.filters.searchDetail'),
              )}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading || !hasApi}
            />
            <div className="list-filters-bar__group">
              <label className="list-filters-bar__label" htmlFor="sg-filter-active">
                {t('common.status')}
              </label>
              <select
                id="sg-filter-active"
                className="list-filters-bar__select"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as '' | 'active' | 'inactive')}
                disabled={loading || !hasApi}
              >
                <option value="">{t('common.all')}</option>
                <option value="active">{t('common.activeOnly')}</option>
                <option value="inactive">{t('common.inactiveOnly')}</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm list-filters-bar__clear"
              onClick={clearFilters}
              disabled={loading || !hasApi}
            >
              {t('filters.clearFilters')}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table data-table--align-left">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('serviceGeofences.table.bounds')}</th>
                <th>{t('serviceGeofences.table.fee')}</th>
                <th>{t('serviceGeofences.form.coverage')}</th>
                <th>{t('common.active')}</th>
                <th className="action-col">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('serviceGeofences.loading')} />
                  </td>
                </tr>
              ) : !hasApi ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('serviceGeofences.noApi')}
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">map</span>
                      </div>
                      <p className="data-table__empty-title">{t('serviceGeofences.empty.title')}</p>
                      <p className="data-table__empty-text">{t('serviceGeofences.empty.body')}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreate}>
                          {t('serviceGeofences.add')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="data-table__state">
                    {t('serviceGeofences.noMatch')}
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === previewZoneId ? 'service-geofences-zones__row--preview' : undefined}
                  >
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className="service-geofences-zones__bounds-cell">
                      <button
                        type="button"
                        className="service-geofences-zones__bounds-btn"
                        onClick={() => previewZoneOnMap(r)}
                        aria-label={t('serviceGeofences.table.viewOnMap', { name: r.name })}
                        aria-pressed={r.id === previewZoneId}
                      >
                        {formatBounds(r)}
                      </button>
                    </td>
                    <td>
                      {r.service_fee_mmk.toLocaleString()} {t('orders.currency')}
                    </td>
                    <td>
                      {r.priority === 1
                        ? t('serviceGeofences.form.priorityInside')
                        : t('serviceGeofences.form.priorityOutside')}
                    </td>
                    <td>
                      {r.is_active ? (
                        <span className="badge badge--success">{t('common.active')}</span>
                      ) : (
                        <span className="badge" style={{ background: '#eef1f6', color: '#5c6478' }}>
                          {t('common.off')}
                        </span>
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
      </section>

      <ServiceGeofenceFormModal
        key={formNonce}
        open={formOpen}
        mode={formMode}
        initial={editRow}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          showSuccess(
            formMode === 'edit' ? t('serviceGeofences.toast.updated') : t('serviceGeofences.toast.created'),
          )
          setRefreshTick((x) => x + 1)
        }}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t('serviceGeofences.delete.title')}
        message={t('serviceGeofences.delete.message', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
