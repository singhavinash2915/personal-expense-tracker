import { useState } from 'react'
import { Bell, Plus, Search, Menu } from 'lucide-react'
import TransactionModal from '../ui/TransactionModal'

export default function Header({ title, subtitle, onMenuOpen, onAddTx }) {
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  function handleAdd() {
    if (onAddTx) onAddTx()
    else setShowModal(true)
  }

  return (
    <>
      <header className="glass sticky top-0 z-10 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">

        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuOpen} className="md:hidden btn-ghost p-2 rounded-xl flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base md:text-xl font-semibold text-white truncate">{title}</h2>
            <p className="text-xs hidden sm:block truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{subtitle}</p>
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
    </>
  )
}
