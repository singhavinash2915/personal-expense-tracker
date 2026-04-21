import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Plus, Search, ScanLine, Mic, Menu } from 'lucide-react'
import TransactionModal from '../ui/TransactionModal'
import ReceiptScanner from '../ui/ReceiptScanner'
import PrivacyToggle from '../ui/PrivacyToggle'
import NotificationPanel from '../ui/NotificationPanel'
import { generateNotifications } from '../../lib/notifications'
import { useApp } from '../../context/AppContext'

function greetingForTime() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Hello'
}

export default function Header({ title, subtitle, onMenuOpen, onAddTx, onScan, onVoice }) {
  const [showModal, setShowModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const { state } = useApp()
  const { pathname } = useLocation()
  const notifications = generateNotifications(state)

  const isDashboard = pathname === '/'
  const firstName = (state.userName || '').split(' ')[0] || ''

  function handleAdd() {
    if (onAddTx) onAddTx()
    else setShowModal(true)
  }

  return (
    <>
      <header
        className="sticky top-0 z-10 px-3 md:px-8 py-2 md:py-3 flex items-center justify-between gap-2"
        style={{
          background: 'rgba(3,17,13,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuOpen}
            className="md:hidden flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Desktop title */}
          <div className="min-w-0 hidden md:block">
            <h2 className="heading" style={{ fontSize: 22 }}>{title}</h2>
            {subtitle && <p className="body-secondary" style={{ marginTop: 2, fontSize: 12 }}>{subtitle}</p>}
          </div>

          {/* Mobile: compact brand */}
          <div className="md:hidden flex-shrink-0">
            <span className="font-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Expense<em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>Flow</em>
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile: Voice + Scan */}
          <button
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center"
            onClick={onVoice}
            aria-label="Voice add"
            style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center"
            onClick={() => { if (onScan) onScan(); else setShowScanner(true); }}
            aria-label="Scan receipt"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
          >
            <ScanLine className="w-4 h-4" />
          </button>

          <PrivacyToggle />

          {/* Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(n => !n)}
              className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center"
                  style={{ background: 'var(--gold)', color: 'var(--bg-base)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                >
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            <NotificationPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
            />
          </div>

          {/* Desktop actions */}
          <button onClick={onVoice} className="hidden md:flex btn btn-ghost" style={{ padding: '8px 14px' }}>
            <Mic className="w-4 h-4" /> Quick Add
          </button>
          <button onClick={() => setShowScanner(true)} className="hidden md:flex btn btn-secondary" style={{ padding: '8px 14px' }}>
            <ScanLine className="w-4 h-4" /> Scan
          </button>
          <button onClick={handleAdd} className="hidden md:flex btn btn-primary" style={{ padding: '8px 14px' }}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </header>

      {/* Mobile page title / greeting */}
      <div className="md:hidden px-4 pt-3 pb-2">
        {isDashboard ? (
          <>
            <div className="label-mono">— {greetingForTime()}</div>
            <h1
              className="font-display"
              style={{
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                marginTop: 4,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {firstName ? <>Hello, <em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>{firstName}.</em></> : <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Welcome.</em>}
            </h1>
          </>
        ) : (
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            {title}
          </h2>
        )}
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
    </>
  )
}
