import { useState } from 'react'
import { Bell, Plus, Search, Menu, ScanLine } from 'lucide-react'
import TransactionModal from '../ui/TransactionModal'
import ReceiptScanner from '../ui/ReceiptScanner'

export default function Header({ title, subtitle, onMenuOpen, onAddTx }) {
  const [showModal, setShowModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  function handleAdd() {
    if (onAddTx) onAddTx()
    else setShowModal(true)
  }

  return (
    <>
      <header className="glass sticky top-0 z-10 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">

        {/* Left: hamburger (mobile) + logo/title */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuOpen} className="md:hidden btn-ghost p-2 rounded-xl flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile: show logo icon + name */}
          <div className="md:hidden flex items-center gap-2 flex-shrink-0">
            <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="ExpenseFlow" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-sm font-extrabold leading-none" style={{ color: '#f97316' }}>Expense<span className="text-white">Flow</span></span>
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

          {/* Search icon — mobile */}
          <button className="md:hidden btn-ghost p-2 rounded-xl" onClick={() => setSearchOpen(s => !s)}>
            <Search className="w-4 h-4" />
          </button>

          {/* Bell */}
          <button className="btn-ghost p-2 rounded-xl relative">
            <Bell className="w-4 h-4 md:w-5 md:h-5" style={{ color: 'rgba(196,181,253,0.7)' }} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">3</span>
          </button>

          {/* Scan Receipt button — desktop only */}
          <button onClick={() => setShowScanner(true)}
            className="hidden md:flex btn-ghost items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl"
            style={{ border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(252,165,165,0.9)' }}>
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

      {/* Mobile expandable search */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-2 pt-1" style={{ background: 'rgba(20,20,20,0.98)' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(167,139,250,0.45)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions..." autoFocus
              className="input-field pl-9 pr-4 py-2 w-full text-sm"
              style={{ borderRadius: '0.65rem' }} />
          </div>
        </div>
      )}

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
    </>
  )
}
