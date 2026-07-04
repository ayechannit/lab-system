import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StaffListRow } from '../../model/types'
import { StaffAvatar } from './StaffAvatar'

type RouteCollectorPickerProps = {
  id: string
  routeLabel: string
  collectorId: string
  collectors: StaffListRow[]
  onChange: (collectorId: string) => void
  disabled?: boolean
  locked?: boolean
  /** When true, empty selection is allowed and shown as "no preference". */
  allowNone?: boolean
  noneLabel?: string
  noneHint?: string
  placeholderLabel?: string
}

export function RouteCollectorPicker({
  id,
  routeLabel,
  collectorId,
  collectors,
  onChange,
  disabled = false,
  locked = false,
  allowNone = false,
  noneLabel,
  noneHint,
  placeholderLabel,
}: RouteCollectorPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = collectors.find((s) => s.id === collectorId) ?? null
  const isDisabled = disabled || locked
  const emptyLabel =
    allowNone && !collectorId
      ? (noneLabel ?? t('orders.create.preferredCollectorNone'))
      : (placeholderLabel ?? t('collections.editModal.selectCollector'))
  const emptyHint = allowNone && !collectorId ? (noneHint ?? routeLabel) : routeLabel

  useEffect(() => {
    if (locked) setOpen(false)
  }, [locked])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function pick(nextId: string) {
    onChange(nextId)
    setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      className={`route-collector-picker${open ? ' route-collector-picker--open' : ''}${
        selected ? ' route-collector-picker--selected' : ''
      }${locked ? ' route-collector-picker--locked' : ''}`}
    >
      {locked ? (
        <div className="route-collector-picker__trigger route-collector-picker__trigger--locked" aria-labelledby={`${id}-label`}>
          <span id={`${id}-label`} className="route-collector-picker__trigger-main">
            {selected ? (
              <>
                <StaffAvatar
                  name={selected.name}
                  profileImageUrl={selected.profile_image_url}
                  className="route-collector-picker__avatar"
                />
                <span className="route-collector-picker__identity">
                  <span className="route-collector-picker__name">{selected.name}</span>
                  <span className="route-collector-picker__email">{selected.email}</span>
                </span>
              </>
            ) : null}
          </span>
          <span className="route-collector-picker__locked-badge">{t('collections.customerSelected')}</span>
        </div>
      ) : (
      <button
        type="button"
        id={id}
        className="route-collector-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        disabled={isDisabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span id={`${id}-label`} className="route-collector-picker__trigger-main">
          {selected ? (
            <>
              <StaffAvatar
                name={selected.name}
                profileImageUrl={selected.profile_image_url}
                className="route-collector-picker__avatar"
              />
              <span className="route-collector-picker__identity">
                <span className="route-collector-picker__name">{selected.name}</span>
                <span className="route-collector-picker__email">{selected.email}</span>
              </span>
            </>
          ) : (
            <>
              <span className="staff-avatar route-collector-picker__avatar route-collector-picker__avatar--empty">
                <span className="material-symbols-outlined" aria-hidden>
                  person
                </span>
              </span>
              <span className="route-collector-picker__identity">
                <span className="route-collector-picker__name route-collector-picker__name--placeholder">
                  {emptyLabel}
                </span>
                <span className="route-collector-picker__email">{emptyHint}</span>
              </span>
            </>
          )}
        </span>
        <span className="material-symbols-outlined route-collector-picker__chevron" aria-hidden>
          expand_more
        </span>
      </button>
      )}

      {!locked && open ? (
        <ul className="route-collector-picker__menu" role="listbox" aria-labelledby={id}>
          {allowNone ? (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={!collectorId}
                className={`route-collector-picker__option${
                  !collectorId ? ' route-collector-picker__option--active' : ''
                }`}
                onClick={() => pick('')}
              >
                <span className="staff-avatar route-collector-picker__option-avatar route-collector-picker__avatar--empty">
                  <span className="material-symbols-outlined" aria-hidden>
                    person_off
                  </span>
                </span>
                <span className="route-collector-picker__option-copy">
                  <span className="route-collector-picker__option-name">
                    {noneLabel ?? t('orders.create.preferredCollectorNone')}
                  </span>
                  <span className="route-collector-picker__option-email">
                    {noneHint ?? t('orders.create.preferredCollectorNoneHint')}
                  </span>
                </span>
                {!collectorId ? (
                  <span className="material-symbols-outlined route-collector-picker__check" aria-hidden>
                    check
                  </span>
                ) : null}
              </button>
            </li>
          ) : null}
          {collectors.map((collector) => {
            const active = collector.id === collectorId
            return (
              <li key={collector.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`route-collector-picker__option${
                    active ? ' route-collector-picker__option--active' : ''
                  }`}
                  onClick={() => pick(collector.id)}
                >
                  <StaffAvatar
                    name={collector.name}
                    profileImageUrl={collector.profile_image_url}
                    className="route-collector-picker__option-avatar"
                  />
                  <span className="route-collector-picker__option-copy">
                    <span className="route-collector-picker__option-name">{collector.name}</span>
                    <span className="route-collector-picker__option-email">{collector.email}</span>
                  </span>
                  {active ? (
                    <span className="material-symbols-outlined route-collector-picker__check" aria-hidden>
                      check
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
