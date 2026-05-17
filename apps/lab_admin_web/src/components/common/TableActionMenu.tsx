import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ui.css'

export type TableActionMenuItem = {
  label: string
  onSelect: () => void
  /** Destructive row action (e.g. delete) — red on hover */
  danger?: boolean
}

type TableActionMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: TableActionMenuItem[]
}

const GAP = 6
const EST_ITEM_H = 40
const PORTAL_Z = 15000

type Box = { top: number; right: number }

/** ⋯ trigger + portal dropdown (fixed, width fits labels; avoids table overflow clipping). */
export function TableActionMenu({ open, onOpenChange, items }: TableActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [box, setBox] = useState<Box | null>(null)

  const measure = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const estH = items.length * EST_ITEM_H + 16
    let top = rect.bottom + GAP
    if (top + estH > window.innerHeight - 8 && rect.top > estH + GAP) {
      top = rect.top - estH - GAP
    }
    const right = Math.max(8, window.innerWidth - rect.right)
    setBox({ top, right })
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setBox(null)
      return
    }
    measure()
  }, [open, items.length])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (t.closest('.action-menu-portal') || triggerRef.current?.contains(t)) return
      onOpenChange(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const onScroll = () => onOpenChange(false)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open, onOpenChange])

  useLayoutEffect(() => {
    if (!open) return
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, items.length])

  const portal =
    open && box ? (
      <div
        className="action-menu-portal action-menu-list"
        role="menu"
        style={{
          position: 'fixed',
          top: box.top,
          right: box.right,
          left: 'auto',
          zIndex: PORTAL_Z,
        }}
      >
        {items.map((item, i) => {
          const danger = item.danger ?? /^delete$/i.test(item.label.trim())
          return (
          <button
            key={`${item.label}-${i}`}
            type="button"
            role="menuitem"
            className={danger ? 'action-menu-item action-menu-item--danger' : 'action-menu-item'}
            onClick={() => {
              item.onSelect()
              onOpenChange(false)
            }}
          >
            {item.label}
          </button>
          )
        })}
      </div>
    ) : null

  return (
    <>
      <div className="action-menu">
        <button
          ref={triggerRef}
          type="button"
          className="btn btn-secondary action-menu-trigger"
          aria-label="Open actions menu"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => onOpenChange(!open)}
        >
          ⋯
        </button>
      </div>
      {portal ? createPortal(portal, document.body) : null}
    </>
  )
}
