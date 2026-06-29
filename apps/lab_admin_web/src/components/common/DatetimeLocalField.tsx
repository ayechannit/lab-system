import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { getIntlLocale } from '../../i18n'
import {
  formatDatetimeLocalParts,
  parseDatetimeLocalParts,
} from '../../utils/datetimeLocal'
import { formatDatetimeDisplay, weekdayShortLabels } from '../../utils/dateIntl'

function monthGrid(viewYear: number, viewMonth: number): Date[] {
  const first = new Date(viewYear, viewMonth, 1)
  const pad = first.getDay()
  const start = new Date(viewYear, viewMonth, 1 - pad)
  const out: Date[] = []
  for (let i = 0; i < 42; i++) {
    out.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  return out
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(d: Date): boolean {
  return sameLocalDay(d, new Date())
}

type DatetimeLocalFieldProps = {
  id: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  allowClear?: boolean
  placeholder?: string
  /** Softer border when used inside the order “schedule” card */
  schedule?: boolean
}

export function DatetimeLocalField({
  id,
  value,
  onChange,
  disabled = false,
  allowClear = true,
  placeholder,
  schedule = false,
}: DatetimeLocalFieldProps) {
  const { t, i18n } = useTranslation()
  const intlLocale = getIntlLocale()
  const [open, setOpen] = useState(false)
  const [viewY, setViewY] = useState(() => new Date().getFullYear())
  const [viewM, setViewM] = useState(() => new Date().getMonth())
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const parts = parseDatetimeLocalParts(value)
  const resolvedPlaceholder = placeholder ?? t('datetime.defaultPlaceholder')

  const displayLabel = useMemo(() => {
    if (!parts) return ''
    return formatDatetimeDisplay(parts.y, parts.m, parts.d, parts.h, parts.min, intlLocale)
  }, [parts, intlLocale, i18n.language])

  const weekdays = useMemo(() => weekdayShortLabels(intlLocale), [intlLocale, i18n.language])

  const openPopover = useCallback(() => {
    if (disabled) return
    const p = parseDatetimeLocalParts(value)
    const base = p ? new Date(p.y, p.m - 1, p.d) : new Date()
    setViewY(base.getFullYear())
    setViewM(base.getMonth())
    setOpen(true)
  }, [disabled, value])

  const closePopover = useCallback(() => setOpen(false), [])

  const setFromParts = useCallback(
    (y: number, mo: number, d: number, h: number, min: number) => {
      onChange(formatDatetimeLocalParts(y, mo, d, h, min))
    },
    [onChange],
  )

  const pickDay = useCallback(
    (cell: Date) => {
      const p = parseDatetimeLocalParts(value)
      const now = new Date()
      const h = p?.h ?? now.getHours()
      const min = p?.min ?? now.getMinutes()
      setFromParts(cell.getFullYear(), cell.getMonth() + 1, cell.getDate(), h, min)
      setViewY(cell.getFullYear())
      setViewM(cell.getMonth())
    },
    [setFromParts, value],
  )

  const onHourChange = useCallback(
    (h: number) => {
      const p = parseDatetimeLocalParts(value)
      const now = new Date()
      if (p) {
        setFromParts(p.y, p.m, p.d, h, p.min)
        return
      }
      setFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate(), h, now.getMinutes())
    },
    [setFromParts, value],
  )

  const onMinuteChange = useCallback(
    (min: number) => {
      const p = parseDatetimeLocalParts(value)
      const now = new Date()
      if (p) {
        setFromParts(p.y, p.m, p.d, p.h, min)
        return
      }
      setFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), min)
    },
    [setFromParts, value],
  )

  const onToday = useCallback(() => {
    const now = new Date()
    const p = parseDatetimeLocalParts(value)
    const h = p?.h ?? now.getHours()
    const min = p?.min ?? now.getMinutes()
    setFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate(), h, min)
    setViewY(now.getFullYear())
    setViewM(now.getMonth())
  }, [setFromParts, value])

  const onNow = useCallback(() => {
    const now = new Date()
    setFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes())
    setViewY(now.getFullYear())
    setViewM(now.getMonth())
  }, [setFromParts])

  const onClear = useCallback(() => {
    onChange('')
    closePopover()
  }, [closePopover, onChange])

  useLayoutEffect(() => {
    if (!open) return
    const el = popRef.current
    const tr = triggerRef.current
    if (!el || !tr) return

    const position = () => {
      const rect = tr.getBoundingClientRect()
      const margin = 10
      const gap = 6
      const pw = el.offsetWidth
      const ph = el.offsetHeight
      let left = rect.left
      let top = rect.bottom + gap
      if (left + pw > window.innerWidth - margin) left = window.innerWidth - pw - margin
      if (left < margin) left = margin
      if (top + ph > window.innerHeight - margin) top = rect.top - ph - gap
      if (top < margin) top = margin
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    }

    position()
    const ro = new ResizeObserver(position)
    ro.observe(el)
    window.addEventListener('scroll', position, true)
    window.addEventListener('resize', position)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
    }
  }, [open, viewY, viewM, value])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closePopover()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closePopover])

  useEffect(() => {
    if (!open) return
    const onOutsidePointer = (e: Event) => {
      const target = e.target as Node
      if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      closePopover()
    }
    document.addEventListener('mousedown', onOutsidePointer)
    document.addEventListener('touchstart', onOutsidePointer, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onOutsidePointer)
      document.removeEventListener('touchstart', onOutsidePointer)
    }
  }, [open, closePopover])

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(
        new Date(viewY, viewM, 1),
      ),
    [intlLocale, viewY, viewM, i18n.language],
  )

  const cells = monthGrid(viewY, viewM)
  const selectedDate = parts ? new Date(parts.y, parts.m - 1, parts.d) : null
  const hourVal = parts?.h ?? new Date().getHours()
  const minuteVal = parts?.min ?? new Date().getMinutes()

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const wrapClass = ['datetime-local-field', schedule ? 'datetime-local-field--schedule' : '']
    .filter(Boolean)
    .join(' ')

  const popover = open
    ? createPortal(
        <div
          ref={popRef}
          className="datetime-popover"
          role="dialog"
          aria-modal="true"
          aria-label={t('datetime.dialogLabel')}
        >
          <div className="datetime-popover__head">
            <button
              type="button"
              className="datetime-popover__nav"
              aria-label={t('datetime.prevMonth')}
              onClick={() => {
                const d = new Date(viewY, viewM - 1, 1)
                setViewY(d.getFullYear())
                setViewM(d.getMonth())
              }}
            >
              ‹
            </button>
            <span className="datetime-popover__title">{monthTitle}</span>
            <button
              type="button"
              className="datetime-popover__nav"
              aria-label={t('datetime.nextMonth')}
              onClick={() => {
                const d = new Date(viewY, viewM + 1, 1)
                setViewY(d.getFullYear())
                setViewM(d.getMonth())
              }}
            >
              ›
            </button>
          </div>
          <div className="datetime-popover__weekdays" aria-hidden="true">
            {weekdays.map((d, i) => (
              <span key={i} className="datetime-popover__weekday">
                {d}
              </span>
            ))}
          </div>
          <div className="datetime-popover__grid">
            {cells.map((cell) => {
              const inMonth = cell.getMonth() === viewM
              const selected = selectedDate != null && sameLocalDay(cell, selectedDate)
              const today = isToday(cell)
              return (
                <button
                  key={`${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`}
                  type="button"
                  className={[
                    'datetime-popover__day',
                    !inMonth ? 'datetime-popover__day--outside' : '',
                    selected ? 'datetime-popover__day--selected' : '',
                    today && !selected ? 'datetime-popover__day--today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => pickDay(cell)}
                >
                  {cell.getDate()}
                </button>
              )
            })}
          </div>
          <div className="datetime-popover__time">
            <span className="datetime-popover__time-label">{t('datetime.time')}</span>
            <div className="datetime-popover__time-controls">
              <select
                className="datetime-popover__select"
                aria-label={t('datetime.hour')}
                value={hourVal}
                onChange={(e) => onHourChange(Number.parseInt(e.target.value, 10))}
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="datetime-popover__time-sep">:</span>
              <select
                className="datetime-popover__select"
                aria-label={t('datetime.minute')}
                value={minuteVal}
                onChange={(e) => onMinuteChange(Number.parseInt(e.target.value, 10))}
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="datetime-popover__footer">
            <div className="datetime-popover__footer-start">
              {allowClear ? (
                <button type="button" className="btn btn-secondary datetime-popover__btn" onClick={onClear}>
                  {t('datetime.clear')}
                </button>
              ) : null}
            </div>
            <div className="datetime-popover__footer-mid">
              <button type="button" className="btn btn-secondary datetime-popover__btn" onClick={onToday}>
                {t('datetime.today')}
              </button>
              <button type="button" className="btn btn-secondary datetime-popover__btn" onClick={onNow}>
                {t('datetime.now')}
              </button>
            </div>
            <button type="button" className="btn btn-primary datetime-popover__btn" onClick={closePopover}>
              {t('datetime.done')}
            </button>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div className={wrapClass}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={['datetime-local-field__trigger', !parts ? 'datetime-local-field__trigger--empty' : ''].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? closePopover() : openPopover())}
      >
        <span className="datetime-local-field__value">{parts ? displayLabel : resolvedPlaceholder}</span>
      </button>
      {popover}
    </div>
  )
}
