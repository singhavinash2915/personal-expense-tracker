import { useState } from 'react'
import { Bell, Plus, Search } from 'lucide-react'
import TransactionModal from '../ui/TransactionModal'

export default function Header({ title, subtitle }) {
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  return (
    <>
      <header className="glass sticky top-0 z-10 px-8 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-white truncate">{title}</h2>
          <p className="text-sm truncate" style={{ color: 'rgba(196,181,253,0.6)' }}>{subtitle}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(167,139,250,0.45)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-field pl-9 pr-4 py-2 w-52 text-sm"
              style={{ borderRadius: '0.65rem' }}
            />
          </div>

          {/* Bell */}
          <button className="btn-ghost p-2 rounded-xl relative">
            <Bell className="w-5 h-5" style={{ color: 'rgba(196,181,253,0.7)' }} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">3</span>
          </button>

          {/* Add Transaction */}
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </header>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
    </>
  )
}
