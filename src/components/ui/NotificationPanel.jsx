import { useEffect, useRef } from 'react'

const colorMap = {
  'text-rose-400':    'var(--danger)',
  'text-amber-400':   'var(--gold)',
  'text-emerald-400': 'var(--emerald)',
  'text-cyan-400':    'var(--emerald)',
  'text-violet-400':  'var(--gold)',
}

export default function NotificationPanel({ open, onClose, notifications = [] }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open, onClose])

  if (!open) return null
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: '64px',
        right: '16px',
        width: '360px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '480px',
        background: 'rgba(10,20,15,0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-xl)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        overflowY: 'auto',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          background: 'rgba(10,20,15,0.95)',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="label-mono" style={{ fontSize: 10 }}>— Inbox</div>
          {unreadCount > 0 && (
            <span className="chip-gold" style={{ padding: '2px 8px', fontSize: 10 }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 0', flex: 1 }}>
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🔔</div>
            <p className="message">All clear.</p>
            <p className="hint">No notifications right now.</p>
          </div>
        ) : (
          notifications.map((notif, idx) => {
            const titleColor = colorMap[notif.color] || 'var(--gold)'
            return (
              <div key={notif.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 16px',
                    borderLeft: notif.read ? '3px solid transparent' : '3px solid var(--gold)',
                    background: notif.read ? 'transparent' : 'var(--gold-dim)',
                  }}
                >
                  <div
                    style={{
                      width: 36, height: 36,
                      borderRadius: 'var(--r-md)',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {notif.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 14,
                          fontWeight: 500,
                          color: titleColor,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {notif.title}
                      </span>
                      <span
                        className="label-mono"
                        style={{ fontSize: 9, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}
                      >
                        {notif.time}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {notif.message}
                    </p>
                  </div>
                </div>
                {idx < notifications.length - 1 && (
                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 16px' }} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
