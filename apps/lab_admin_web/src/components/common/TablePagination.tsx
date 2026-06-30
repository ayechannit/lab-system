import { useTranslation } from 'react-i18next'

export const DEFAULT_TABLE_PAGE_SIZE = 10

export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50] as const

export type TablePaginationMode = 'client' | 'server'

export type TablePaginationProps = {
  mode: TablePaginationMode
  page: number
  pageSize: number
  itemsOnPage: number
  /** Client mode: length of the full filtered list */
  totalItems?: number
  onPageChange: (nextPage: number) => void
  onPageSizeChange?: (nextSize: number) => void
  disabled?: boolean
  /** Omit controls when everything fits on one page */
  hideWhenSinglePage?: boolean
  className?: string
}

export function TablePagination({
  mode,
  page,
  pageSize,
  itemsOnPage,
  totalItems,
  onPageChange,
  onPageSizeChange,
  disabled,
  hideWhenSinglePage = true,
  className,
}: TablePaginationProps) {
  const { t } = useTranslation()
  const hasPrev = page > 1
  let hasNext = false

  if (mode === 'client' && totalItems != null) {
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize)
    hasNext = page < totalPages
  } else {
    hasNext = itemsOnPage >= pageSize
  }

  const showNav =
    hasPrev ||
    hasNext ||
    (mode === 'client' && totalItems != null && totalItems > 0) ||
    (mode === 'server' && itemsOnPage > 0)

  if (hideWhenSinglePage && !showNav && page === 1) {
    return null
  }

  const rangeStart = itemsOnPage === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = itemsOnPage === 0 ? 0 : (page - 1) * pageSize + itemsOnPage

  const meta =
    mode === 'client' && totalItems != null
      ? t('pagination.showingRange', { start: rangeStart, end: rangeEnd, total: totalItems })
      : itemsOnPage > 0
        ? t('pagination.showingRangeShort', { start: rangeStart, end: rangeEnd })
        : t('pagination.pageNumber', { page })

  return (
    <div className={`table-pagination${className ? ` ${className}` : ''}`} role="navigation" aria-label={t('pagination.navLabel')}>
      <div className="table-pagination__meta">{meta}</div>
      <div className="table-pagination__controls">
        {onPageSizeChange ? (
          <label className="table-pagination__page-size">
            <span className="table-pagination__page-size-label">{t('pagination.rowsPerPage')}</span>
            <select
              className="table-pagination__page-size-select"
              value={pageSize}
              disabled={disabled}
              aria-label={t('pagination.rowsPerPage')}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                if (Number.isFinite(n)) onPageSizeChange(n)
              }}
            >
              {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="table-pagination__nav">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled || !hasPrev}
            onClick={() => onPageChange(page - 1)}
            aria-label={t('pagination.previousPage')}
          >
            {t('pagination.previous')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled || !hasNext}
            onClick={() => onPageChange(page + 1)}
            aria-label={t('pagination.nextPage')}
          >
            {t('pagination.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
