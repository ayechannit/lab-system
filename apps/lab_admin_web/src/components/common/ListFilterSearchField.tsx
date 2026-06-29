import type { ChangeEventHandler } from 'react'
import { listFilterSearchPlaceholder } from '../../utils/i18nLabels'

export type ListFilterSearchFieldProps = {
  id: string
  /** Short field name shown above the input (e.g. Name, Phone). */
  label: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  disabled?: boolean
  /** Overrides default `Search {label}…` placeholder. */
  placeholder?: string
}

export { listFilterSearchPlaceholder }

export function ListFilterSearchField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
}: ListFilterSearchFieldProps) {
  const resolvedPlaceholder = placeholder ?? listFilterSearchPlaceholder(label)

  return (
    <div className="list-filters-bar__group list-filters-bar__group--text">
      <label className="list-filters-bar__label" htmlFor={id}>
        {label}
      </label>
      <div className="list-filters-bar__search-wrap">
        <span className="material-symbols-outlined list-filters-bar__search-icon" aria-hidden="true">
          search
        </span>
        <input
          id={id}
          type="search"
          className="list-filters-bar__input list-filters-bar__input--with-icon"
          placeholder={resolvedPlaceholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
    </div>
  )
}
