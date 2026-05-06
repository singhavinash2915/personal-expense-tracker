import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, HelpCircle, Settings as SettingsIcon, MoreVertical, Menu, Mic, ScanLine, Search } from 'lucide-react'
import TransactionModal from '../ui/TransactionModal'
import ReceiptScanner from '../ui/ReceiptScanner'
import PrivacyToggle from '../ui/PrivacyToggle'
import NotificationPanel from '../ui/NotificationPanel'
import { generateNotifications } from '../../lib/notifications'
import { useApp } from '../../context/AppContext'

export default function Header({ title, subtitle, onMenuOpen, onAddTx, onScan, onVoice }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const { state } = useApp()
  const { pathname } = useLocation()
  const notifications = generateNotifications(state)

  const isDashboard = pathname === '/'
  const firstName = (state.userName || '').split(' ')[0] || ''

  function handleAdd() {
    if (onAddTx) onAddTx()
    else setShowAddModal(true)
  }

  return (
    <>
      {/* Top app bar */}
      <header
        className="sticky top-0 z-10 px-4 md:px-8 py-3 flex items-center justify-between gap-3"
        style={{
          background: 'var(--bg-base)',
        }}
      >
        {/* Left: hamburger + brand */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuOpen}
            className="md:hidden flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={2.2} />
          </button>

          {/* Brand mark — small, just on mobile */}
          <div className="md:hidden flex items-center gap-2 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--primary)',
                color: 'white',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              ₹
            </div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
              ExpenseFlow
            </span>
          </div>

          {/* Desktop: page title */}
          <div className="hidden md:block min-w-0">
            <h2 className="heading" style={{ fontSize: 24 }}>{title}</h2>
            {subtitle && (
              <p className="body-secondary" style={{ marginTop: 2, fontSize: 12 }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Mobile actions */}
          <IconBtn onClick={onVoice} ariaLabel="Voice add">
            <Mic className="w-5 h-5" />
          </IconBtn>
          <IconBtn onClick={() => { if (onScan) onScan(); else setShowScanner(true) }} ariaLabel="Scan receipt">
            <ScanLine className="w-5 h-5" />
          </IconBtn>
          <PrivacyToggle />
          <div className="relative">
            <IconBtn onClick={() => setNotifOpen(n => !n)} ariaLabel="Notifications">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{ background: 'var(--primary)' }}
                />
              )}
            </IconBtn>
            <NotificationPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
            />
          </div>

          {/* Desktop-only quick actions */}
          <button onClick={handleAdd} className="hidden md:flex btn btn-primary" style={{ padding: '10px 18px' }}>
            + Add
          </button>
        </div>
      </header>

      {/* Mobile page title (below header) */}
      <div className="md:hidden px-4 pt-2 pb-3">
        {isDashboard ? (
          <>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {firstName ? <>Hi, {firstName}!</> : 'Dashboard'}
            </h1>
            {subtitle && (
              <p className="body-secondary" style={{ marginTop: 4 }}>
                {subtitle}
              </p>
            )}
          </>
        ) : (
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
        )}
      </div>

      {showAddModal && <TransactionModal onClose={() => setShowAddModal(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
    </>
  )
}

function IconBtn({ children, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
      style={{ color: 'var(--text-primary)' }}
    >
      {children}
    </button>
  )
}
