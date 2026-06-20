import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type AppNotification,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATION_TOPIC_OPTIONS,
  sendPushNotification,
} from '../../services/notificationService'
import { useAuth } from '../../hooks/AuthContext'
import { useToast } from '../../hooks/ToastContext'
import { isApiMode } from '../../services/apiBase'
import './notification-bell.css'

type PanelTab = 'inbox' | 'send'
type InboxFilter = 'all' | 'unread'
type SendTargetMode = 'topic' | 'token'

type NotificationVisual = {
  icon: string
  tone: 'order' | 'status' | 'result' | 'payment' | 'rating' | 'account' | 'general'
  label: string
}

type NotificationGroup = {
  key: string
  label: string
  items: AppNotification[]
}

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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function parseNotificationPayload(raw: string | null): Record<string, unknown> | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function notificationVisual(notification: AppNotification): NotificationVisual {
  const payload = parseNotificationPayload(notification.data_payload)
  const event = String(payload?.event ?? '').toLowerCase()
  const title = notification.title.toLowerCase()

  if (event.includes('order') || title.includes('order')) {
    if (title.includes('result') || event.includes('result')) {
      return { icon: 'science', tone: 'result', label: 'Lab result' }
    }
    if (title.includes('status')) {
      return { icon: 'sync', tone: 'status', label: 'Status update' }
    }
    return { icon: 'receipt_long', tone: 'order', label: 'New order' }
  }
  if (title.includes('payment') || event.includes('payment')) {
    return { icon: 'payments', tone: 'payment', label: 'Payment' }
  }
  if (title.includes('rating') || event.includes('rating')) {
    return { icon: 'star', tone: 'rating', label: 'Feedback' }
  }
  if (title.includes('approved') || title.includes('account') || event.includes('approve')) {
    return { icon: 'verified_user', tone: 'account', label: 'Account' }
  }
  if (title.includes('schedule') || title.includes('collection') || event.includes('schedule')) {
    return { icon: 'local_shipping', tone: 'status', label: 'Collection' }
  }
  if (title.includes('discount') || event.includes('discount')) {
    return { icon: 'sell', tone: 'general', label: 'Promotion' }
  }
  return { icon: 'notifications', tone: 'general', label: 'Alert' }
}

function notificationRoute(notification: AppNotification): string | null {
  const payload = parseNotificationPayload(notification.data_payload)
  const event = String(payload?.event ?? '').toLowerCase()
  const title = notification.title.toLowerCase()

  if (title.includes('rating') || event.includes('rating')) return '/ratings'
  if (title.includes('result') || event.includes('result')) return '/results'
  if (title.includes('schedule') || title.includes('collection') || event.includes('schedule')) {
    return '/collections'
  }
  if (payload?.order_id) return '/orders'
  if (title.includes('order') || event.includes('order')) return '/orders'
  if (title.includes('payment') || event.includes('payment')) return '/orders'
  return null
}

function groupLabelForDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  if (date >= startOfToday) return 'Today'
  if (date >= startOfYesterday) return 'Yesterday'
  if (date >= startOfWeek) return 'This week'
  return 'Earlier'
}

function groupNotifications(items: AppNotification[]): NotificationGroup[] {
  const buckets = new Map<string, AppNotification[]>()
  for (const item of items) {
    const label = groupLabelForDate(item.created_at)
    const list = buckets.get(label) ?? []
    list.push(item)
    buckets.set(label, list)
  }
  const order = ['Today', 'Yesterday', 'This week', 'Earlier']
  return order
    .filter((label) => buckets.has(label))
    .map((label) => ({ key: label, label, items: buckets.get(label)! }))
}

function formatBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count)
}

export function NotificationBell() {
  const navigate = useNavigate()
  const { signedIn } = useAuth()
  const hasApi = isApiMode()
  const canUseNotifications = hasApi && signedIn
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<PanelTab>('inbox')
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { showError, showSuccess } = useToast()

  const [sendTargetMode, setSendTargetMode] = useState<SendTargetMode>('topic')
  const [sendTopic, setSendTopic] = useState(NOTIFICATION_TOPIC_OPTIONS[0].value)
  const [sendToken, setSendToken] = useState('')
  const [sendTitle, setSendTitle] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [sendSubmitting, setSendSubmitting] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const filteredNotifications = useMemo(
    () => (inboxFilter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, inboxFilter],
  )
  const groupedNotifications = useMemo(() => groupNotifications(filteredNotifications), [filteredNotifications])

  const loadNotifications = async (silent = false) => {
    if (!canUseNotifications) {
      setNotifications([])
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    try {
      const data = await fetchNotifications(50)
      setNotifications(data)
    } catch (err: unknown) {
      console.error('Failed to fetch notifications:', err)
      if (!silent) {
        showError('Could not load notifications.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const refreshNotifications = async () => {
    if (!canUseNotifications) return
    setRefreshing(true)
    try {
      const data = await fetchNotifications(50)
      setNotifications(data)
    } catch {
      showError('Could not refresh notifications.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!canUseNotifications) {
      setNotifications([])
      setLoading(false)
      return
    }
    void loadNotifications(true)
    const interval = setInterval(() => {
      void loadNotifications(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [canUseNotifications])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    setIsOpen((open) => {
      if (!open) void loadNotifications(true)
      return !open
    })
  }

  const markRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id)
    if (!target || target.is_read) return
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch {
      showError('Failed to mark notification as read.')
    }
  }

  const handleNotificationClick = async (notification: AppNotification) => {
    await markRead(notification.id)
    const route = notificationRoute(notification)
    if (route) {
      setIsOpen(false)
      navigate(route)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      showSuccess('All notifications marked as read.')
    } catch {
      showError('Failed to mark all as read.')
    }
  }

  const handleMarkAsReadButton = async (id: string, e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    await markRead(id)
  }

  const resetSendForm = () => {
    setSendTargetMode('topic')
    setSendTopic(NOTIFICATION_TOPIC_OPTIONS[0].value)
    setSendToken('')
    setSendTitle('')
    setSendBody('')
    setSendError(null)
  }

  const handleSendNotification = async (e: FormEvent) => {
    e.preventDefault()
    if (!canUseNotifications) {
      setSendError('Sign in with API mode enabled to send notifications.')
      return
    }
    setSendError(null)

    const title = sendTitle.trim()
    const body = sendBody.trim()
    if (!title) return setSendError('Enter a notification title.')
    if (!body) return setSendError('Enter a notification message.')

    const payload =
      sendTargetMode === 'topic'
        ? { title, body, topic: sendTopic.trim() }
        : { title, body, token: sendToken.trim() }

    if (sendTargetMode === 'topic' && !payload.topic) {
      return setSendError('Select an audience topic.')
    }
    if (sendTargetMode === 'token' && !payload.token) {
      return setSendError('Enter a device FCM token.')
    }

    setSendSubmitting(true)
    try {
      const result = await sendPushNotification(payload)
      const inboxCount = result.delivery?.inbox_count
      const inboxSaved = result.delivery?.inbox_saved
      const detail =
        typeof inboxCount === 'number'
          ? ` Saved to ${inboxCount} inbox${inboxCount === 1 ? '' : 'es'}.`
          : inboxSaved
            ? ' Saved to recipient inbox.'
            : ''
      showSuccess(`${result.message || 'Notification sent successfully.'}${detail}`)
      resetSendForm()
      setActiveTab('inbox')
      void loadNotifications(true)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send notification.')
    } finally {
      setSendSubmitting(false)
    }
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell-btn${isOpen ? ' notification-bell-btn--open' : ''}`}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <span className="material-symbols-outlined notification-icon" aria-hidden>
          notifications
        </span>
        {unreadCount > 0 ? (
          <span className="notification-badge" aria-hidden>
            {formatBadgeCount(unreadCount)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-header">
            <div className="notification-dropdown-header__copy">
              <h3 className="notification-dropdown-title">Notifications</h3>
              <p className="notification-dropdown-subtitle">
                {activeTab === 'send'
                  ? 'Send a manual push notification to a topic or device.'
                  : unreadCount > 0
                    ? `${unreadCount} unread ${unreadCount === 1 ? 'alert' : 'alerts'}`
                    : 'You are all caught up'}
              </p>
            </div>
            {activeTab === 'inbox' ? (
              <div className="notification-header-actions">
                <button
                  type="button"
                  className="notification-icon-action"
                  aria-label="Refresh notifications"
                  title="Refresh"
                  disabled={refreshing}
                  onClick={() => void refreshNotifications()}
                >
                  <span
                    className={`material-symbols-outlined${refreshing ? ' notification-icon-action__spin' : ''}`}
                    aria-hidden
                  >
                    refresh
                  </span>
                </button>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="notification-mark-all-btn"
                    onClick={() => void handleMarkAllAsRead()}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="notification-tabs" role="tablist" aria-label="Notification panels">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inbox'}
              className={`notification-tab${activeTab === 'inbox' ? ' notification-tab--active' : ''}`}
              onClick={() => setActiveTab('inbox')}
            >
              Inbox
              {unreadCount > 0 ? <span className="notification-tab__badge">{formatBadgeCount(unreadCount)}</span> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'send'}
              className={`notification-tab${activeTab === 'send' ? ' notification-tab--active' : ''}`}
              onClick={() => setActiveTab('send')}
            >
              Send push
            </button>
          </div>

          {activeTab === 'inbox' ? (
            <>
              <div className="notification-inbox-toolbar">
                <div className="notification-filter" role="group" aria-label="Filter inbox">
                  <button
                    type="button"
                    className={`notification-filter__btn${inboxFilter === 'all' ? ' notification-filter__btn--active' : ''}`}
                    onClick={() => setInboxFilter('all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`notification-filter__btn${inboxFilter === 'unread' ? ' notification-filter__btn--active' : ''}`}
                    onClick={() => setInboxFilter('unread')}
                  >
                    Unread
                  </button>
                </div>
                <span className="notification-inbox-toolbar__meta">
                  {filteredNotifications.length} shown
                </span>
              </div>

              <div className="notification-list-container">
                {!hasApi ? (
                  <div className="notification-empty">
                    <p className="notification-empty__title">API not configured</p>
                    <p className="notification-empty__hint">
                      Set <code>VITE_API_BASE_URL</code> to connect the notification inbox.
                    </p>
                  </div>
                ) : !signedIn ? (
                  <div className="notification-empty">
                    <p className="notification-empty__title">Sign in required</p>
                    <p className="notification-empty__hint">Notifications load from your staff account inbox.</p>
                  </div>
                ) : loading && notifications.length === 0 ? (
                  <div className="notification-empty notification-empty--loading">
                    <span className="loading-spinner loading-spinner--sm" aria-hidden />
                    <p>Loading notifications…</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="notification-empty">
                    <span className="notification-empty__icon-wrap" aria-hidden>
                      <span className="material-symbols-outlined">
                        {inboxFilter === 'unread' ? 'mark_email_read' : 'notifications_off'}
                      </span>
                    </span>
                    <p className="notification-empty__title">
                      {inboxFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="notification-empty__hint">
                      {inboxFilter === 'unread'
                        ? 'Switch to All or wait for new alerts.'
                        : 'New orders, payments, and updates will appear here.'}
                    </p>
                  </div>
                ) : (
                  <div className="notification-groups">
                    {groupedNotifications.map((group) => (
                      <section key={group.key} className="notification-group" aria-label={group.label}>
                        <h4 className="notification-group__label">{group.label}</h4>
                        <ul className="notification-list">
                          {group.items.map((n) => {
                            const visual = notificationVisual(n)
                            const route = notificationRoute(n)
                            return (
                              <li key={n.id} className="notification-row">
                                <button
                                  type="button"
                                  className={`notification-item${!n.is_read ? ' notification-item--unread' : ''}`}
                                  onClick={() => void handleNotificationClick(n)}
                                >
                                  <span
                                    className={`notification-item__icon notification-item__icon--${visual.tone}`}
                                    aria-hidden
                                  >
                                    <span className="material-symbols-outlined">{visual.icon}</span>
                                  </span>
                                  <span className="notification-item__content">
                                    <span className="notification-item__top">
                                      <span className="notification-item__title">{n.title}</span>
                                      <span className="notification-item__time">{timeAgo(n.created_at)}</span>
                                    </span>
                                    <span className="notification-item__meta">
                                      <span
                                        className={`notification-item__chip notification-item__chip--${visual.tone}`}
                                      >
                                        {visual.label}
                                      </span>
                                      {!n.is_read ? (
                                        <span className="notification-item__unread-pill">New</span>
                                      ) : null}
                                    </span>
                                    <span className="notification-item__body">{n.body}</span>
                                    {route ? (
                                      <span className="notification-item__action">
                                        View details
                                        <span className="material-symbols-outlined" aria-hidden>
                                          arrow_forward
                                        </span>
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                                {!n.is_read ? (
                                  <button
                                    type="button"
                                    className="notification-item__mark-read-btn"
                                    aria-label="Mark as read"
                                    onClick={(e) => void handleMarkAsReadButton(n.id, e)}
                                  >
                                    <span className="material-symbols-outlined" aria-hidden>
                                      done
                                    </span>
                                  </button>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <form className="notification-send-form" onSubmit={(e) => void handleSendNotification(e)}>
              <p className="notification-send-form__intro">
                Deliver a push alert to a topic audience (staff, patients, doctors) or a single device token.
              </p>

              <div className="notification-send-target" role="radiogroup" aria-label="Send target">
                <label className="notification-send-target__option">
                  <input
                    type="radio"
                    name="send-target"
                    value="topic"
                    checked={sendTargetMode === 'topic'}
                    onChange={() => setSendTargetMode('topic')}
                    disabled={sendSubmitting}
                  />
                  <span>Topic audience</span>
                </label>
                <label className="notification-send-target__option">
                  <input
                    type="radio"
                    name="send-target"
                    value="token"
                    checked={sendTargetMode === 'token'}
                    onChange={() => setSendTargetMode('token')}
                    disabled={sendSubmitting}
                  />
                  <span>Device token</span>
                </label>
              </div>

              {sendTargetMode === 'topic' ? (
                <div className="field">
                  <label htmlFor="notification-send-topic">Audience topic</label>
                  <select
                    id="notification-send-topic"
                    className="select-chevron-left"
                    value={sendTopic}
                    onChange={(e) => setSendTopic(e.target.value)}
                    disabled={sendSubmitting}
                  >
                    {NOTIFICATION_TOPIC_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.value})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="notification-send-token">FCM device token</label>
                  <textarea
                    id="notification-send-token"
                    value={sendToken}
                    onChange={(e) => setSendToken(e.target.value)}
                    disabled={sendSubmitting}
                    rows={3}
                    placeholder="Paste the user's registered FCM token"
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="notification-send-title">Title</label>
                <input
                  id="notification-send-title"
                  value={sendTitle}
                  onChange={(e) => setSendTitle(e.target.value)}
                  disabled={sendSubmitting}
                  placeholder="Notification title"
                  maxLength={120}
                />
              </div>

              <div className="field">
                <label htmlFor="notification-send-body">Message</label>
                <textarea
                  id="notification-send-body"
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  disabled={sendSubmitting}
                  rows={4}
                  placeholder="What should recipients see?"
                  maxLength={500}
                />
              </div>

              {sendError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {sendError}
                </div>
              ) : null}

              <div className="notification-send-form__actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={resetSendForm}
                  disabled={sendSubmitting}
                >
                  Clear
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={sendSubmitting}>
                  {sendSubmitting ? 'Sending…' : 'Send notification'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}
