import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Trash2, Edit2, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, formatDate } from '../lib/utils'
import TransactionModal from '../components/ui/TransactionModal'

const TYPES = ['All', 'Income', 'Expense', 'Transfer']

export default function Transactions() {
  const { state, dispatch, getCategory } = useApp()
  const location = useLocation()
  const accounts = state.accounts || []

  // Support navigating here from Accounts page with a pre-set account filter
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [catFilter, setCatFilter] = useState('')
  const [accFilter, setAccFilter] = useState(location.state?.accountId || '')
  const [ccFilter, setCCFilter] = useState(location.state?.creditCardId || '')
  const [editTx, setEditTx] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    return [...state.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter(t => {
        if (typeFilter !== 'All' && t.type !== typeFilter.toLowerCase()) return false
        if (catFilter && t.categoryId !== catFilter) return false
        if (accFilter && t.accountId !== accFilter) return false
        if (ccFilter && t.creditCardId !== ccFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return t.description.toLowerCase().includes(q) || (getCategory(t.categoryId)?.name || '').toLowerCase().includes(q)
        }
        return true
      })
  }, [state.transactions, search, typeFilter, catFilter, accFilter, ccFilter])

  const totalIncome    = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense   = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalTransfer  = filtered.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0)

  function handleDelete(id) {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id })
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-3 md:space-y-5">
      {/* Summary Bar — compact 2x2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {[
          { icon: '📈', label: 'Income', value: formatINR(totalIncome), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: '📉', label: 'Expenses', value: formatINR(totalExpense), color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { icon: '↔️', label: 'Transfers', value: formatINR(totalTransfer), color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { icon: '🔢', label: 'Records', value: filtered.length, color: 'text-white', bg: 'bg-violet-500/10' },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="card p-2.5 md:p-4 flex items-center gap-2 md:gap-3">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${bg} flex items-center justify-center text-base md:text-xl`}>{icon}</div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs truncate" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</p>
              <p className={`text-sm md:text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters — stacked on mobile */}
      <div className="card p-2.5 md:p-4 space-y-2 md:space-y-0">
        {/* Search — full width on mobile */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(167,139,250,0.45)' }} />
          <input type="text" placeholder="Search transactions..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-sm w-full" />
        </div>

        {/* Type pills — horizontally scrollable on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 md:pb-0 md:flex-wrap md:mt-3">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                typeFilter === t ? 'btn-primary' : 'btn-ghost'
              }`}>{t}</button>
          ))}
        </div>

        {/* Selects — grid on mobile, flex on desktop */}
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3 md:mt-3">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="input-field py-1.5 md:py-2 text-xs md:text-sm">
            <option value="">All Categories</option>
            {state.categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          <select value={accFilter} onChange={e => setAccFilter(e.target.value)}
            className="input-field py-1.5 md:py-2 text-xs md:text-sm">
            <option value="">All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {(state.creditCards || []).length > 0 && (
            <select value={ccFilter} onChange={e => setCCFilter(e.target.value)} className="input-field text-xs md:text-sm py-1.5">
              <option value="">All Cards</option>
              {(state.creditCards || []).map(c => (
                <option key={c.id} value={c.id}>💳 {c.name}</option>
              ))}
            </select>
          )}

          <button onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center justify-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold rounded-lg md:rounded-xl md:ml-auto">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Mobile: Card list / Desktop: Table */}
      {/* Mobile card list */}
      <div className="md:hidden space-y-1.5">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm" style={{ color: 'rgba(196,181,253,0.4)' }}>No transactions found</div>
        ) : filtered.map(tx => {
          const cat = getCategory(tx.categoryId)
          return (
            <div key={tx.id} className="card p-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
              onClick={() => setEditTx(tx)}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                tx.type === 'income' ? 'bg-emerald-500/10' : tx.type === 'transfer' ? 'bg-cyan-500/10' : 'bg-rose-500/10'
              }`}>{cat?.icon || '💳'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                  <span className={`text-sm font-bold flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}{formatINR(tx.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[11px] truncate" style={{ color: 'rgba(196,181,253,0.5)' }}>
                    {formatDate(tx.date)} · {cat?.name}
                  </p>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(tx.id) }}
                      className="p-1.5 rounded-lg text-rose-400 active:bg-rose-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
              {['Date', 'Description', 'Category', 'Account', 'Type', 'Amount', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'rgba(196,181,253,0.5)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-sm" style={{ color: 'rgba(196,181,253,0.4)' }}>No transactions found</td></tr>
            ) : filtered.map(tx => {
              const cat = getCategory(tx.categoryId)
              const acc = accounts.find(a => a.id === tx.accountId)
              return (
                <tr key={tx.id} className="tr-hover" style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.6)' }}>{formatDate(tx.date)}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-white">{tx.description}</p>
                    {tx.toAccountId && (() => { const toAcc = accounts.find(a => a.id === tx.toAccountId); return toAcc ? <p className="text-xs mt-0.5 text-cyan-400/70">→ {toAcc.name}</p> : null })()}
                    {tx.creditCardId && (() => {
                      const cc = (state.creditCards || []).find(c => c.id === tx.creditCardId)
                      return cc ? (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(99,102,241,0.7)' }}>💳 {cc.name} (••{cc.last4})</p>
                      ) : null
                    })()}
                    {tx.notes && <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'rgba(196,181,253,0.4)' }}>{tx.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>
                      <span>{cat?.icon}</span> {cat?.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {acc ? (
                      <span className="text-xs" style={{ color: 'rgba(196,181,253,0.6)' }}>🏦 {acc.name}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'rgba(196,181,253,0.3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {tx.type === 'transfer' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 capitalize">{tx.type}</span>
                    ) : (
                      <span className={`badge-${tx.type === 'income' ? 'success' : 'danger'} capitalize`}>{tx.type}</span>
                    )}
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}{formatINR(tx.amount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => setEditTx(tx)}
                        className="btn-ghost p-1.5 rounded-lg text-violet-300 hover:text-violet-100 transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(tx.id)}
                        className="btn-ghost p-1.5 rounded-lg text-rose-400 hover:text-rose-300 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(8,10,20,0.8)' }}>
          <div className="card p-6 w-80 text-center">
            <p className="text-2xl mb-3">🗑️</p>
            <p className="text-white font-semibold mb-1">Delete Transaction?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {editTx  && <TransactionModal existing={editTx}  onClose={() => setEditTx(null)} />}
      {showAdd && <TransactionModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
