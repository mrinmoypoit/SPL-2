import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../services/api'
import './NotificationDropdown.css'

const CHATBOT_OPEN_EVENT = 'tulona:open-chatbot'

const toBoolean = (value) => value === true || value === 1 || value === '1'

const mapNotification = (notification = {}) => {
  const isRead = toBoolean(notification.isRead ?? notification.is_read)

  return {
    id: notification.id ?? notification.notification_id,
    title: notification.title || 'Notification',
    message: notification.message || '',
    type: notification.type || notification.notification_type || 'info',
    productId: notification.productId ?? notification.product_id ?? null,
    productName: notification.productName ?? notification.product_name ?? null,
    productCategory: notification.productCategory ?? notification.product_category ?? null,
    parentCategory: notification.parentCategory ?? notification.parent_category ?? null,
    createdAt: notification.createdAt ?? notification.created_at ?? new Date().toISOString(),
    unread: !isRead
  }
}

const formatTimeAgo = (value) => {
  const createdAt = value ? new Date(value) : null

  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return 'Just now'
  }

  const diffMs = Date.now() - createdAt.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return createdAt.toLocaleDateString()
}

const resolveProductRoute = (notification) => {
  const lookupText = [
    notification.parentCategory,
    notification.productCategory,
    notification.title,
    notification.message
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (lookupText.includes('loan')) return '/loans'
  if (lookupText.includes('deposit') || lookupText.includes('saving')) return '/deposits'
  if (lookupText.includes('credit card') || lookupText.includes('card')) return '/credit-cards'

  return '/bank-services'
}

function NotificationDropdown() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter((notification) => notification.unread).length

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await notificationsAPI.getAll()
      const mapped = (data?.notifications || []).map(mapNotification)
      setNotifications(mapped)
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()

    const refreshInterval = window.setInterval(() => {
      loadNotifications()
    }, 45000)

    return () => {
      window.clearInterval(refreshInterval)
    }
  }, [loadNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, unread: false } : notification))
    )

    try {
      await notificationsAPI.markAsRead(id)
    } catch (markError) {
      console.warn('Failed to mark notification as read:', markError?.message)
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, unread: false })))

    try {
      await notificationsAPI.markAllAsRead()
    } catch (markError) {
      console.warn('Failed to mark all notifications as read:', markError?.message)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ai_assistant':
        return 'fa-robot'
      case 'feature_filter':
        return 'fa-filter'
      case 'product_match':
        return 'fa-bullseye'
      case 'deal':
        return 'fa-tag'
      case 'update':
        return 'fa-check-circle'
      case 'offer':
        return 'fa-gift'
      default:
        return 'fa-bell'
    }
  }

  const handleNotificationAction = (notification) => {
    if (notification.type === 'ai_assistant') {
      window.dispatchEvent(
        new CustomEvent(CHATBOT_OPEN_EVENT, {
          detail: {
            prefillMessage: 'Suggest products based on my monthly income and profession.'
          }
        })
      )
      return
    }

    if (notification.type === 'feature_filter') {
      navigate('/credit-cards?highlightFilter=1')
      return
    }

    if (notification.type === 'product_match') {
      const route = resolveProductRoute(notification)
      const queryParams = new URLSearchParams({ highlightFilter: '1' })

      if (notification.productId) {
        queryParams.set('highlightProduct', String(notification.productId))
      }

      navigate(`${route}?${queryParams.toString()}`)
      return
    }

    if (notification.productId) {
      const route = resolveProductRoute(notification)
      navigate(`${route}?highlightProduct=${encodeURIComponent(notification.productId)}`)
    }
  }

  const handleNotificationClick = (notification) => {
    if (notification.unread) {
      markAsRead(notification.id)
    }

    handleNotificationAction(notification)
    setIsOpen(false)
  }

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button className="notification-btn" onClick={() => setIsOpen(!isOpen)}>
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-menu">
          <div className="notification-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="no-notifications">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.unread ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={`notification-icon ${notification.type}`}>
                    <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
                  </div>
                  <div className="notification-content">
                    <h5>{notification.title}</h5>
                    <p>{notification.message}</p>
                    <span className="notification-time">{formatTimeAgo(notification.createdAt)}</span>
                  </div>
                  {notification.unread && <div className="unread-dot"></div>}
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <i className="fas fa-bell-slash"></i>
                <p>{error || 'No notifications'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
