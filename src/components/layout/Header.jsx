import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Plus, Search, ScanLine } from 'lucide-react'
import TransactionModal from '../ui/TransactionModal'
import ReceiptScanner from '../ui/ReceiptScanner'
import PrivacyToggle from '../ui/PrivacyToggle'
import NotificationPanel from '../ui/NotificationPanel'
import { generateNotifications } from '../../lib/notifications'
import { useApp } from '../../context/AppContext'

export default function Header({ title, subtitle, onMenuOpen, onAddTx, onScan }) {
  const [showModal, setShowModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const { state } = useApp()
  const { pathname } = useLocation()
  const notifications = generateNotifications(state)

  function handleAdd() {
    if (onAddTx) onAddTx()
    else setShowModal(true)
  }

  return (
    <>
      <header className="glass sticky top-0 z-10 px-3 md:px-8 py-1.5 md:py-4 flex items-center justify-between gap-2">

        {/* Left: avatar (mobile) + logo/title */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Mobile: avatar initial that opens drawer */}
          <button
            onClick={onMenuOpen}
            className="md:hidden flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            {(state.userName || 'U').charAt(0).toUpperCase()}
          </button>
          {/* Mobile: show app name only */}
          <div className="md:hidden flex-shrink-0">
            <span className="text-sm font-extrabold leading-none" style={{ color: '#818cf8' }}>Expense<span className="text-white">Flow</span></span>
          </div>
          {/* Desktop: show page title */}
          <div className="min-w-0 hidden md:block">
            <h2 className="text-xl font-semibold text-white truncate">{title}</h2>
            <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{subtitle}</p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search bar — desktop only */}
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(167,139,250,0.45)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="input-field pl-9 pr-4 py-2 w-52 text-sm"
              style={{ borderRadius: '0.65rem' }} />
          </div>

          {/* Scan icon — mobile */}
          <button className="md:hidden btn-ghost p-2 rounded-xl" onClick={() => { if (onScan) onScan(); else setShowScanner(true); }}>
            <ScanLine className="w-4 h-4" />
          </button>

          <PrivacyToggle />

          {/* Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(n => !n)}
              className="btn-ghost p-2 rounded-xl relative"
            >
              <Bell className="w-5 h-5 md:w-5 md:h-5" style={{ color: 'rgba(196,181,253,0.7)' }} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
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

          {/* Scan Receipt button — desktop only */}
          <button onClick={() => setShowScanner(true)}
            className="hidden md:flex btn-ghost items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl"
            style={{ border: '1px solid rgba(99,102,241,0.25)', color: 'rgba(165,180,252,0.9)' }}>
            <ScanLine className="w-4 h-4" />
            Scan
          </button>

          {/* Add button — desktop only (mobile uses FAB in bottom nav) */}
          <button onClick={handleAdd}
            className="hidden md:flex btn-primary items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </header>

      {/* Mobile page title */}
      <div className="md:hidden px-3 pt-1.5 pb-0.5">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {subtitle && pathname === '/' && <p className="text-[11px] leading-tight" style={{ color: 'rgba(196,181,253,0.5)' }}>{subtitle}</p>}
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
    </>
  )
}
