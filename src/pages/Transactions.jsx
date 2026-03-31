import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Trash2, Edit2, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, formatDate } from '../lib/utils'
import TransactionModal from '../components/ui/TransactionModal'

const TYPES = ['All', 'Income', 'Expense']

export default function Transactions() {
  const { state, dispatch, getCategory } = useApp()
  const location = useLocation()
  const accounts = state.accounts || []

  // Support navigating here from Accounts page with a pre-set account filter
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [catFilter, setCatFilter] = useState('')
  const [accFilter, setAccFilter] = useState(location.state?.accountId || '')
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
        if (search) {
          const q = search.toLowerCase()
          return t.description.toLowerCase().includes(q) || (getCategory(t.categoryId)?.name || '').toLowerCase().includes(q)
        }
        return true
      })
  }, [state.transactions, search, typeFilter, catFilter, accFilter])

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  function handleDelete(id) {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id })
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-5">
      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">📈</div>
          <div>
            <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Filtered Income</p>
            <p className="text-lg font-bold text-emerald-400">{formatINR(totalIncome)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-xl">📉</div>
          <div>
            <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Filtered Expenses</p>
            <p className="text-lg font-bold text-rose-400">{formatINR(totalExpense)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl">🔢</div>
          <div>
            <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Total Records</p>
            <p className="text-lg font-bold text-white">{filtered.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(167,139,250,0.45)' }} />
            <input type="text" placeholder="Search transactions..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-full" />
          </div>

          {/* Type Filter */}
          <div className="flex gap-1">
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === t ? 'btn-primary' : 'btn-ghost'
                }`}>{t}</button>
            ))}
          </div>

          {/* Category Filter */}
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="input-field py-2 text-sm">
            <option value="">All Categories</option>
            {state.categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          {/* Account Filter */}
          <select value={accFilter} onChange={e => setAccFilter(e.target.value)}
            className="input-field py-2 text-sm">
            <option value="">All Accounts</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} — {a.bank}</option>
            ))}
          </select>

          <button onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl ml-auto">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(109,40,217,0.2)' }}>
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
                <tr key={tx.id} className="tr-hover" style={{ borderBottom: '1px solid rgba(109,40,217,0.08)' }}>
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.6)' }}>{formatDate(tx.date)}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-white">{tx.description}</p>
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
                    <span className={`badge-${tx.type === 'income' ? 'success' : 'danger'} capitalize`}>{tx.type}</span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)' }}>
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
