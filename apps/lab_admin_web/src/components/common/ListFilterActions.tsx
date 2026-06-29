import { useTranslation } from 'react-i18next'

type ListFilterActionsProps = {
  onClear?: () => void
  onRefresh: () => void
  loading?: boolean
  disabled?: boolean
  showClear?: boolean
}

export function ListFilterActions({
  onClear,
  onRefresh,
  loading = false,
  disabled = false,
  showClear = true,
}: ListFilterActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="list-tools-row__actions">
      {showClear && onClear ? (
        <button type="button" className="btn btn-ghost" onClick={onClear} disabled={disabled || loading}>
          {t('filters.clearFilters')}
        </button>
      ) : null}
      <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={disabled || loading}>
        {loading ? t('common.refreshing') : t('common.refresh')}
      </button>
    </div>
  )
}
