import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ui.css'

export type TableActionSubmenuItem = {
  label: string
  onSelect: () => void
}

export type TableActionMenuItem = {
  label: string
  onSelect?: () => void
  /** Nested items shown in a flyout on hover (e.g. Payment → Add / Update). */
  children?: TableActionSubmenuItem[]
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
const SUBMENU_CLOSE_MS = 120

type Box = { top: number; right: number }

function countMenuRows(items: TableActionMenuItem[]): number {
  return items.length
}

function ActionMenuSubmenuRow({
  item,
  onClose,
}: {
  item: TableActionMenuItem & { children: TableActionSubmenuItem[] }
  onClose: () => void
}) {
  const [subOpen, setSubOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setSubOpen(false), SUBMENU_CLOSE_MS)
  }

  const openSub = () => {
    cancelClose()
    setSubOpen(true)
  }

  return (
    <div
      className="action-menu-item action-menu-item--submenu"
      onMouseEnter={openSub}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="action-menu-item__submenu-trigger"
        aria-haspopup="menu"
        aria-expanded={subOpen}
        onClick={() => setSubOpen((v) => !v)}
      >
        <span>{item.label}</span>
        <span className="action-menu-item__chevron" aria-hidden>
          ›
        </span>
      </button>
      {subOpen ? (
        <div
          className="action-menu-submenu"
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {item.children.map((child) => (
            <button
              key={child.label}
              type="button"
              role="menuitem"
              className="action-menu-item"
              onClick={() => {
                child.onSelect()
                onClose()
              }}
            >
              {child.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** ⋯ trigger + portal dropdown (fixed, width fits labels; avoids table overflow clipping). */
export function TableActionMenu({ open, onOpenChange, items }: TableActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [box, setBox] = useState<Box | null>(null)

  const closeMenu = () => onOpenChange(false)

  const measure = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const estH = countMenuRows(items) * EST_ITEM_H + 16
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
          if (item.children && item.children.length > 0) {
            return <ActionMenuSubmenuRow key={`${item.label}-${i}`} item={{ ...item, children: item.children }} onClose={closeMenu} />
          }
          const danger = item.danger ?? /^delete$/i.test(item.label.trim())
          return (
            <button
              key={`${item.label}-${i}`}
              type="button"
              role="menuitem"
              className={danger ? 'action-menu-item action-menu-item--danger' : 'action-menu-item'}
              onClick={() => {
                item.onSelect?.()
                closeMenu()
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
