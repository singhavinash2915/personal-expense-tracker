import { useEffect, useRef } from 'react'

// Map old color classes → tinted CSS class names for icon backgrounds
const TONE = {
  'text-rose-400':    { bg: 'var(--danger-bg)',   color: 'var(--danger)'  },
  'text-amber-400':   { bg: 'var(--warning-bg)',  color: 'var(--warning)' },
  'text-emerald-400': { bg: 'var(--success-bg)',  color: 'var(--success)' },
  'text-cyan-400':    { bg: 'var(--info-bg)',     color: 'var(--info)'    },
  'text-violet-400':  { bg: 'var(--primary-light)', color: 'var(--primary)' },
}

function defaultTone() {
  return { bg: 'var(--primary-light)', color: 'var(--primary)' }
}

export default function NotificationPanel({ open, onClose, notifications = [] }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 10)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick) }
  }, [open, onClose])

  if (!open) return null
  const unread = notifications.filter(n => !n.read).length

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 64,
        right: 16,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 480,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--r-xl)',
        boxShadow: '0 12px 40px rgba(15,26,46,0.10), 0 0 0 1px var(--border-subtle)',
        overflow: 'hidden',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--primary)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}>
            Inbox
          </span>
          {unread > 0 && (
            <span
              style={{
                background: 'var(--primary)',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '6px 0', flex: 1, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px' }}>
            <div className="emoji">🔔</div>
            <p className="message">All clear</p>
            <p className="hint">No notifications right now.</p>
          </div>
        ) : (
          notifications.map((n, idx) => {
            const tone = TONE[n.color] || defaultTone()
            return (
              <div key={n.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 18px',
                    background: n.read ? 'transparent' : tone.bg,
                    transition: 'background 0.2s',
                    cursor: 'default',
                  }}
                >
                  <div
                    style={{
                      width: 38, height: 38,
                      borderRadius: 'var(--r-md)',
                      background: tone.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {n.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                      }}>
                        {n.title}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--text-light)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        marginTop: 2,
                      }}>
                        {n.time}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}>
                      {n.message}
                    </p>
                  </div>
                </div>
                {idx < notifications.length - 1 && (
                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 18px' }} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
