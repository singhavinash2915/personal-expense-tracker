import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Trash2, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR } from '../lib/utils'
import { groupTransactionsByDay } from '../lib/groupByDate'
import TransactionModal from '../components/ui/TransactionModal'
import ViewBalance from '../components/ui/ViewBalance'

const TYPES = [
  { id: 'All',      label: 'All' },
  { id: 'Income',   label: 'Income' },
  { id: 'Expense',  label: 'Expense' },
  { id: 'Transfer', label: 'Transfer' },
]

export default function Transactions() {
  const { state, dispatch, getCategory } = useApp()
  const location = useLocation()
  const accounts = state.accounts || []
  const privacy = state.privacyMode

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
          return t.description.toLowerCase().includes(q) ||
                 (getCategory(t.categoryId)?.name || '').toLowerCase().includes(q)
        }
        return true
      })
  }, [state.transactions, search, typeFilter, catFilter, accFilter, ccFilter])

  const totalIncome   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense  = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalTransfer = filtered.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0)

  const groups = useMemo(() => groupTransactionsByDay(filtered), [filtered])

  function handleDelete(id) {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id })
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <SummaryTile label="Income"   value={totalIncome}   tone="income" />
        <SummaryTile label="Expense"  value={totalExpense}  tone="expense" />
        <SummaryTile label="Transfer" value={totalTransfer} tone="transfer" />
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-light)' }} />
        <input
          type="text"
          placeholder="Search transactions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ paddingLeft: 40 }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', margin: '0 -4px', padding: '0 4px 4px' }}>
        {TYPES.map(t => {
          const active = typeFilter === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`chip ${active ? 'chip-active' : ''}`}
              style={{ flexShrink: 0 }}
            >
              {active && <span>✓</span>}
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input select"
          style={{ padding: '10px 14px', fontSize: 14 }}>
          <option value="">All Categories</option>
          {state.categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select value={accFilter} onChange={e => setAccFilter(e.target.value)} className="input select"
          style={{ padding: '10px 14px', fontSize: 14 }}>
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {(state.creditCards || []).length > 0 && (
          <select value={ccFilter} onChange={e => setCCFilter(e.target.value)} className="input select"
            style={{ padding: '10px 14px', fontSize: 14 }}>
            <option value="">All Cards</option>
            {(state.creditCards || []).map(c => <option key={c.id} value={c.id}>💳 {c.name}</option>)}
          </select>
        )}
        <button onClick={() => setShowAdd(true)} className="btn btn-primary md:ml-auto">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="emoji">🔍</div>
          <p className="message">No transactions found.</p>
          <p className="hint">Try a different filter or add a new one.</p>
        </div>
      ) : (
        groups.map(group => (
          <section key={group.key}>
            <div className="date-group">
              <div className="flex items-baseline gap-2">
                <span className="group-label">{group.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.05em' }}>
                  · {group.count} {group.count === 1 ? 'item' : 'items'}
                </span>
              </div>
              {group.total !== 0 && !privacy && (
                <span className="group-total" style={{
                  color: group.total >= 0 ? 'var(--success)' : 'var(--danger)',
                }}>
                  {(group.total > 0 ? '+' : '−') + formatINR(Math.abs(group.total)).replace(/^[+−-]/, '')}
                </span>
              )}
            </div>

            <div className="txn-list">
              {group.items.map(tx => {
                const cat = getCategory(tx.categoryId)
                const isIncome = tx.type === 'income'
                const isTransfer = tx.type === 'transfer'
                const sign = isIncome ? '+' : isTransfer ? '↔' : '−'
                const acc = accounts.find(a => a.id === tx.accountId)
                return (
                  <div
                    key={tx.id}
                    className="txn tr-hover"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setEditTx(tx)}
                  >
                    <div className="txn-ico">{cat?.icon || '💳'}</div>
                    <div className="txn-info">
                      <div className="txn-name">{tx.description || cat?.name}</div>
                      <div className="txn-meta">
                        {cat?.name || 'Other'}{acc ? ` · ${acc.name}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className={`txn-amt ${isIncome ? 'up' : isTransfer ? '' : 'down'}`}
                        style={{ color: isTransfer ? 'var(--info)' : undefined }}
                      >
                        {privacy ? '••••' : `${sign}${formatINR(tx.amount).replace(/^[+−-]/, '')}`}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(tx.id) }}
                        className="p-1.5 ml-1 rounded-lg"
                        style={{ color: 'var(--text-light)' }}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,26,46,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmDelete(null)}
        >
          <div className="card p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="heading" style={{ fontSize: 18 }}>Delete transaction?</h3>
            <p className="body-secondary" style={{ marginTop: 8 }}>This action cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {editTx  && <TransactionModal existing={editTx}  onClose={() => setEditTx(null)} />}
      {showAdd && <TransactionModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function SummaryTile({ label, value, tone }) {
  return (
    <div className={`tile tile-${tone}`} style={{ padding: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <div style={{ marginTop: 6 }}>
        <ViewBalance value={formatINR(value)} size="sm" />
      </div>
    </div>
  )
}
