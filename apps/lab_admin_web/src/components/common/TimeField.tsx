import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function parseTimeValue(value: string): { h: number; min: number } | null {
  const trimmed = value.trim()
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return null
  const [h, m] = trimmed.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null
  return { h, min: m }
}

function formatTimeValue(h: number, min: number): string {
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function displayTimeLabel(value: string): string {
  const parts = parseTimeValue(value)
  if (!parts) return ''
  const d = new Date(2000, 0, 1, parts.h, parts.min)
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d)
  } catch {
    return formatTimeValue(parts.h, parts.min)
  }
}

type TimeFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function TimeField({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select time',
}: TimeFieldProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const parts = parseTimeValue(value)
  const hourVal = parts?.h ?? new Date().getHours()
  const minuteVal = parts?.min ?? new Date().getMinutes()
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const closePopover = useCallback(() => setOpen(false), [])

  const openPopover = useCallback(() => {
    if (disabled) return
    setOpen(true)
  }, [disabled])

  const setTime = useCallback(
    (h: number, min: number) => {
      onChange(formatTimeValue(h, min))
    },
    [onChange],
  )

  const onNow = useCallback(() => {
    const now = new Date()
    setTime(now.getHours(), now.getMinutes())
  }, [setTime])

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
  }, [open, value])

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
      const t = e.target as Node
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      closePopover()
    }
    document.addEventListener('mousedown', onOutsidePointer)
    document.addEventListener('touchstart', onOutsidePointer, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onOutsidePointer)
      document.removeEventListener('touchstart', onOutsidePointer)
    }
  }, [open, closePopover])

  const popover = open
    ? createPortal(
        <div
          ref={popRef}
          className="datetime-popover time-popover"
          role="dialog"
          aria-modal="true"
          aria-label="Choose time"
        >
          <div className="datetime-popover__time time-popover__time">
            <span className="datetime-popover__time-label">Start time</span>
            <div className="datetime-popover__time-controls">
              <select
                className="datetime-popover__select"
                aria-label="Hour"
                value={hourVal}
                onChange={(e) => setTime(Number.parseInt(e.target.value, 10), minuteVal)}
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
                aria-label="Minute"
                value={minuteVal}
                onChange={(e) => setTime(hourVal, Number.parseInt(e.target.value, 10))}
              >
                {minutes.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="datetime-popover__footer time-popover__footer">
            <button type="button" className="btn btn-secondary datetime-popover__btn" onClick={onNow}>
              Now
            </button>
            <button type="button" className="btn btn-primary datetime-popover__btn" onClick={closePopover}>
              Done
            </button>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div className="datetime-local-field time-field">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={[
          'datetime-local-field__trigger',
          'time-field__trigger',
          !parts ? 'datetime-local-field__trigger--empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? closePopover() : openPopover())}
      >
        <span className="datetime-local-field__value">
          {parts ? displayTimeLabel(value) : placeholder}
        </span>
      </button>
      {popover}
    </div>
  )
}
