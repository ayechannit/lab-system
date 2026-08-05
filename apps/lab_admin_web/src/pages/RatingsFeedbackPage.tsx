import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import {
  ListFilterSearchField,
  listFilterSearchPlaceholder,
} from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useErrorToast } from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { isApiMode } from '../services/apiBase'
import type { ApiOrderStatus } from '../services/orderService'
import {
  fetchAllRatings,
  formatRatingContact,
  formatRatingSubmittedDate,
  formatRatingTests,
  formatShortOrderId,
  type RatingListRow,
} from '../services/ratingService'
import { orderPriorityLabel, orderStatusLabel } from '../utils/orderLabels'
import '../components/common/ui.css'

const RATING_SCORE_FILTER_VALUES: ('' | '1' | '2' | '3' | '4' | '5')[] = ['', '5', '4', '3', '2', '1']

function orderStatusBadgeClass(status: ApiOrderStatus | undefined): string {
  if (!status) return 'badge badge--neutral'
  const map: Record<ApiOrderStatus, string> = {
    pending: 'badge badge--warn',
    scheduled: 'badge badge--neutral',
    collecting: 'badge badge--neutral',
    running: 'badge badge--neutral',
    completed: 'badge badge--success',
    delivered: 'badge badge--success',
  }
  return map[status] ?? 'badge badge--neutral'
}

function priorityBadgeClass(priority: string | undefined): string {
  return priority === 'urgent' ? 'badge badge--warn' : 'badge badge--neutral'
}

function RatingStarsDisplay({ value, ariaLabel }: { value: number; ariaLabel: string }) {
  const score = Math.min(5, Math.max(0, Math.round(value)))
  return (
    <span className="rating-stars" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`rating-stars__star${star <= score ? ' rating-stars__star--filled' : ''}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
      <span className="visually-hidden">{ariaLabel}</span>
    </span>
  )
}

const colSpan = 9

export function RatingsFeedbackPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const [rows, setRows] = useState<RatingListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)

  useErrorToast(loadError)

  const [ratingFilterInput, setRatingFilterInput] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [ratingScoreFilter, setRatingScoreFilter] = useState<'' | '1' | '2' | '3' | '4' | '5'>('')
  const [ratingPage, setRatingPage] = useState(1)
  const [ratingPageSize, setRatingPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)

  const ratingScoreOptions = useMemo(
    () =>
      RATING_SCORE_FILTER_VALUES.map((value) => ({
        value,
        label:
          value === ''
            ? t('ratings.filters.all')
            : value === '1'
              ? t('ratings.filters.oneStar')
              : t('ratings.filters.stars', { count: Number(value) }),
      })),
    [t],
  )

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
        const list = await fetchAllRatings()
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('ratings.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, t])

  useEffect(() => {
    const id = window.setTimeout(() => setRatingFilter(ratingFilterInput.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [ratingFilterInput])

  useEffect(() => {
    queueMicrotask(() => setRatingPage(1))
  }, [ratingFilter, ratingScoreFilter])

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [rows],
  )

  const filteredRatings = useMemo(() => {
    const q = ratingFilter
    const scoreFilter = ratingScoreFilter ? Number(ratingScoreFilter) : null
    return sorted.filter((r) => {
      if (scoreFilter != null && r.rating !== scoreFilter) return false
      if (!q) return true
      const blob = [
        r.patient_name,
        r.patient_age != null ? String(r.patient_age) : '',
        r.user_name,
        formatRatingContact(r),
        formatShortOrderId(r.order_id),
        r.order_id,
        r.order_status,
        r.priority,
        formatRatingTests(r.order_tests),
        r.final_price_mmk != null ? String(r.final_price_mmk) : '',
        String(r.rating),
        r.remark,
        formatRatingSubmittedDate(r.created_at),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [sorted, ratingFilter, ratingScoreFilter])

  const pagedRatings = useMemo(() => {
    const start = (ratingPage - 1) * ratingPageSize
    return filteredRatings.slice(start, start + ratingPageSize)
  }, [filteredRatings, ratingPage, ratingPageSize])

  const hasActiveFilters = ratingFilterInput.trim() !== '' || ratingScoreFilter !== ''

  return (
    <div className="stack">
      <PageHeader title={t('pages.ratings.title')} description={t('pages.ratings.description')} />
      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label={t('ratings.filters.ariaLabel')}>
          <ListFilterSearchField
            id="rating-filter-search"
            label={t('ratings.filters.feedback')}
            placeholder={listFilterSearchPlaceholder(
              t('ratings.filters.feedback'),
              t('ratings.filters.searchDetail'),
            )}
            value={ratingFilterInput}
            onChange={(e) => setRatingFilterInput(e.target.value)}
            disabled={!hasApi}
          />
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="rating-score-filter">
              {t('ratings.filters.rating')}
            </label>
            <select
              id="rating-score-filter"
              className="list-filters-bar__select"
              value={ratingScoreFilter}
              onChange={(e) => setRatingScoreFilter(e.target.value as '' | '1' | '2' | '3' | '4' | '5')}
              disabled={!hasApi}
            >
              {ratingScoreOptions.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={() => {
              setRatingFilterInput('')
              setRatingFilter('')
              setRatingScoreFilter('')
              setRatingPage(1)
            }}
            disabled={!hasApi || !hasActiveFilters}
          >
            {t('filters.clearFilters')}
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((tick) => tick + 1)}
            disabled={!hasApi}
            aria-busy={loading}
          >
            {loading ? t('common.refreshing') : t('common.refresh')}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('ratings.table.patient')}</th>
              <th>{t('ratings.table.submittedBy')}</th>
              <th>{t('ratings.table.contact')}</th>
              <th>{t('ratings.table.order')}</th>
              <th>{t('ratings.table.tests')}</th>
              <th>{t('ratings.table.amount')}</th>
              <th>{t('ratings.table.rating')}</th>
              <th>{t('ratings.table.remark')}</th>
              <th>{t('ratings.table.ratedOn')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__state data-table__state--loading">
                  <LoadingSpinner label={t('ratings.loading')} />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__state">
                  {hasApi ? t('ratings.empty.none') : t('ratings.empty.noApi')}
                </td>
              </tr>
            ) : filteredRatings.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__state">
                  {t('ratings.empty.noMatch')}
                </td>
              </tr>
            ) : (
              pagedRatings.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span>{r.patient_name?.trim() || t('common.none')}</span>
                    {r.patient_age != null ? (
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        {t('ratings.table.age', { age: r.patient_age })}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span>{r.user_name?.trim() || t('common.none')}</span>
                  </td>
                  <td>{formatRatingContact(r)}</td>
                  <td>
                    <code style={{ fontSize: '0.72rem' }} title={r.order_id}>
                      {formatShortOrderId(r.order_id)}
                    </code>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {r.order_status ? (
                        <span className={orderStatusBadgeClass(r.order_status)}>
                          {orderStatusLabel(r.order_status)}
                        </span>
                      ) : null}
                      {r.priority ? (
                        <span className={priorityBadgeClass(r.priority)}>
                          {orderPriorityLabel(r.priority)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatRatingTests(r.order_tests)}</td>
                  <td className="col-num">
                    {r.final_price_mmk != null
                      ? `${r.final_price_mmk.toLocaleString()} ${t('orders.currency')}`
                      : t('common.none')}
                  </td>
                  <td>
                    <RatingStarsDisplay
                      value={r.rating}
                      ariaLabel={t('ratings.starsAria', { score: r.rating })}
                    />
                  </td>
                  <td>{r.remark?.trim() || t('common.none')}</td>
                  <td>{formatRatingSubmittedDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hasApi && filteredRatings.length > 0 ? (
        <TablePagination
          mode="client"
          page={ratingPage}
          pageSize={ratingPageSize}
          totalItems={filteredRatings.length}
          itemsOnPage={pagedRatings.length}
          onPageChange={setRatingPage}
          onPageSizeChange={(n) => {
            setRatingPageSize(n)
            setRatingPage(1)
          }}
        />
      ) : null}
    </div>
  )
}
