import { useEffect, useRef, useState } from 'react'
import {
  type AppNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/notificationService'
import { useToast } from '../../hooks/ToastContext'
import './notification-bell.css'

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) return 'Just now'
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { showError } = useToast()

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const loadNotifications = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await fetchNotifications(15)
      setNotifications(data)
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err)
      if (!silent) {
        showError('Could not load notifications.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Load once on mount, then poll every 30 seconds
  useEffect(() => {
    void loadNotifications(true)
    const interval = setInterval(() => {
      void loadNotifications(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      void loadNotifications(true)
    }
  }

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      showError('Failed to mark notification as read.')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      showError('Failed to mark all as read.')
    }
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell-btn"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <span className="material-symbols-outlined notification-icon">notifications</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list-container">
            {loading && notifications.length === 0 ? (
              <div className="notification-empty">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="material-symbols-outlined empty-icon">notifications_off</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.is_read ? 'notification-item--unread' : ''}`}
                    onClick={(e) => !n.is_read && handleMarkAsRead(n.id, e as any)}
                  >
                    <div className="notification-item-content">
                      <div className="notification-item-title-row">
                        <span className="notification-item-title">{n.title}</span>
                        {!n.is_read && (
                          <span
                            className="notification-item-dot"
                            title="Unread"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="notification-item-body">{n.body}</p>
                      <span className="notification-item-time">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
