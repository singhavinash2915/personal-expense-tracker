import { useEffect, useRef } from 'react'

const PANEL_STYLES = {
  panel: {
    position: 'fixed',
    top: '56px',
    right: '16px',
    width: '360px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: '480px',
    background: 'rgba(13,10,35,0.98)',
    border: '1px solid rgba(109,40,217,0.25)',
    borderRadius: '1rem',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(109,40,217,0.1)',
    overflowY: 'auto',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: '1px solid rgba(109,40,217,0.15)',
    position: 'sticky',
    top: 0,
    background: 'rgba(13,10,35,0.99)',
    zIndex: 1,
    flexShrink: 0,
  },
  title: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.01em',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 5px',
    background: '#e11d48',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#fff',
    marginLeft: '8px',
  },
  markAllBtn: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'rgba(167,139,250,0.8)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '6px',
    transition: 'color 0.15s',
  },
  list: {
    padding: '8px 0',
    flex: 1,
  },
  emptyState: {
    padding: '40px 16px',
    textAlign: 'center',
    color: 'rgba(167,139,250,0.5)',
    fontSize: '0.85rem',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: '10px',
    display: 'block',
  },
  item: (unread) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '11px 14px',
    cursor: 'default',
    transition: 'background 0.12s',
    background: unread ? 'rgba(109,40,217,0.06)' : 'transparent',
    borderLeft: unread ? '3px solid rgba(139,92,246,0.55)' : '3px solid transparent',
  }),
  iconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '2px',
  },
  itemTime: {
    fontSize: '0.65rem',
    color: 'rgba(167,139,250,0.45)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginTop: '1px',
  },
  itemMessage: {
    fontSize: '0.75rem',
    color: 'rgba(196,181,253,0.55)',
    lineHeight: 1.45,
  },
  divider: {
    height: '1px',
    background: 'rgba(109,40,217,0.08)',
    margin: '0 14px',
  },
}

// Helper to resolve color class -> actual CSS color for inline style use
const colorMap = {
  'text-rose-400':    '#fb7185',
  'text-amber-400':   '#fbbf24',
  'text-emerald-400': '#34d399',
  'text-cyan-400':    '#22d3ee',
  'text-violet-400':  '#a78bfa',
}

export default function NotificationPanel({ open, onClose, notifications = [] }) {
  const panelRef = useRef(null)

  // Responsive top offset: use 64px on >=768px screens
  useEffect(() => {
    if (!panelRef.current) return
    const update = () => {
      if (panelRef.current) {
        panelRef.current.style.top = window.innerWidth >= 768 ? '64px' : '56px'
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open])

  // Click-outside closes
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Slight delay so the bell-button click that opens it doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open, onClose])

  if (!open) return null

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div ref={panelRef} style={PANEL_STYLES.panel}>
      {/* Header */}
      <div style={PANEL_STYLES.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={PANEL_STYLES.title}>Notifications</span>
          {unreadCount > 0 && (
            <span style={PANEL_STYLES.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button style={PANEL_STYLES.markAllBtn}>
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div style={PANEL_STYLES.list}>
        {notifications.length === 0 ? (
          <div style={PANEL_STYLES.emptyState}>
            <span style={PANEL_STYLES.emptyIcon}>🔔</span>
            <p style={{ margin: 0, fontWeight: 600, color: 'rgba(196,181,253,0.6)' }}>All clear!</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem' }}>No notifications right now.</p>
          </div>
        ) : (
          notifications.map((notif, idx) => {
            const titleColor = colorMap[notif.color] || '#a78bfa'
            return (
              <div key={notif.id}>
                <div style={PANEL_STYLES.item(!notif.read)}>
                  <div style={PANEL_STYLES.iconBox}>{notif.icon}</div>
                  <div style={PANEL_STYLES.itemBody}>
                    <div style={PANEL_STYLES.itemTitleRow}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 650,
                          color: titleColor,
                          lineHeight: 1.3,
                          minWidth: 0,
                        }}
                      >
                        {notif.title}
                      </span>
                      <span style={PANEL_STYLES.itemTime}>{notif.time}</span>
                    </div>
                    <p style={PANEL_STYLES.itemMessage}>{notif.message}</p>
                  </div>
                </div>
                {idx < notifications.length - 1 && (
                  <div style={PANEL_STYLES.divider} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
