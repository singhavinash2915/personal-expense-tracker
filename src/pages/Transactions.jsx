import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Trash2, Edit2, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR } from '../lib/utils'
import TransactionModal from '../components/ui/TransactionModal'

const TYPES = ['All', 'Income', 'Expense', 'Transfer']

function formatMono(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en', { month: 'short' }).toUpperCase()}`
}

export default function Transactions() {
  const { state, dispatch, getCategory } = useApp()
  const location = useLocation()
  const accounts = state.accounts || []

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

  const totalIncome   = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense  = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalTransfer = filtered.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0)

  function handleDelete(id) {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id })
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <SummaryTile label="Income"    value={formatINR(totalIncome)}   tone="positive" icon="↑" />
        <SummaryTile label="Expenses"  value={formatINR(totalExpense)}  tone="negative" icon="↓" />
        <SummaryTile label="Transfers" value={formatINR(totalTransfer)} tone="default"  icon="↔" />
        <SummaryTile label="Records"   value={filtered.length}          tone="default"  icon="◆" />
      </div>

      {/* Filters */}
      <div className="card p-3 md:p-4 space-y-3">
        {/* Search */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Type pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 md:flex-wrap">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              type="button"
              className={`chip ${typeFilter === t ? 'active' : ''}`}
              style={{ flexShrink: 0 }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Category/Account selects + Add */}
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input select" style={{ padding: '8px 12px', fontSize: 13 }}>
            <option value="">All Categories</option>
            {state.categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          <select value={accFilter} onChange={e => setAccFilter(e.target.value)} className="input select" style={{ padding: '8px 12px', fontSize: 13 }}>
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          {(state.creditCards || []).length > 0 && (
            <select value={ccFilter} onChange={e => setCCFilter(e.target.value)} className="input select" style={{ padding: '8px 12px', fontSize: 13 }}>
              <option value="">All Cards</option>
              {(state.creditCards || []).map(c => <option key={c.id} value={c.id}>💳 {c.name}</option>)}
            </select>
          )}

          <button
            onClick={() => setShowAdd(true)}
            className="btn btn-primary md:ml-auto"
            style={{ padding: '8px 16px' }}
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden txn-list" style={{ padding: filtered.length === 0 ? 0 : '4px 12px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🔍</div>
            <p className="message">No transactions found.</p>
            <p className="hint">Try a different filter or add a new one.</p>
          </div>
        ) : (
          filtered.map(tx => {
            const cat = getCategory(tx.categoryId)
            const isIncome = tx.type === 'income'
            const isTransfer = tx.type === 'transfer'
            const sign = isIncome ? '+' : isTransfer ? '↔' : '\u2212'
            const amtClass = isIncome ? 'up' : isTransfer ? '' : 'down'
            return (
              <div key={tx.id} className="txn tr-hover" onClick={() => setEditTx(tx)} style={{ cursor: 'pointer' }}>
                <div className="txn-ico">{cat?.icon || '💳'}</div>
                <div className="txn-info">
                  <div className="txn-name">{tx.description || cat?.name}</div>
                  <div className="txn-meta">
                    {formatMono(tx.date)} · {cat?.name || 'OTHER'}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span
                    className={`txn-amt ${amtClass}`}
                    style={{ color: isTransfer ? 'var(--gold)' : undefined }}
                  >
                    {sign}{formatINR(tx.amount).replace(/^[+\u2212-]/, '')}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(tx.id) }}
                    className="p-1.5 ml-1"
                    style={{ color: 'var(--text-dim)' }}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Date', 'Description', 'Category', 'Account', 'Type', 'Amount', ''].map(h => (
                <th
                  key={h}
                  className="label-mono text-left px-5 py-3.5"
                  style={{ fontSize: 10 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="emoji">🔍</div>
                    <p className="message">No transactions found.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(tx => {
              const cat = getCategory(tx.categoryId)
              const acc = accounts.find(a => a.id === tx.accountId)
              const isIncome = tx.type === 'income'
              const isTransfer = tx.type === 'transfer'
              const sign = isIncome ? '+' : isTransfer ? '↔' : '\u2212'
              return (
                <tr key={tx.id} className="tr-hover" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-5 py-3.5">
                    <span className="label-mono" style={{ fontSize: 10 }}>{formatMono(tx.date)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-body" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {tx.description}
                    </p>
                    {tx.toAccountId && (() => {
                      const toAcc = accounts.find(a => a.id === tx.toAccountId)
                      return toAcc ? <p className="label-mono" style={{ fontSize: 9, marginTop: 2, color: 'var(--emerald)' }}>→ {toAcc.name}</p> : null
                    })()}
                    {tx.creditCardId && (() => {
                      const cc = (state.creditCards || []).find(c => c.id === tx.creditCardId)
                      return cc ? <p className="label-mono" style={{ fontSize: 9, marginTop: 2, color: 'var(--gold)' }}>💳 {cc.name} (••{cc.last4})</p> : null
                    })()}
                    {tx.notes && <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes}</p>}
                  </td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    <span>{cat?.icon}</span> {cat?.name}
                  </td>
                  <td className="px-5 py-3.5 label-mono" style={{ fontSize: 10 }}>
                    {acc ? `🏦 ${acc.name}` : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={
                      isTransfer ? 'chip-gold' :
                      isIncome ? 'chip-success' :
                      'chip-danger'
                    }
                    style={{ padding: '4px 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="font-display"
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: isIncome ? 'var(--emerald)' : isTransfer ? 'var(--gold)' : 'var(--danger)',
                      }}
                    >
                      {sign}{formatINR(tx.amount).replace(/^[+\u2212-]/, '')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => setEditTx(tx)} className="p-1.5 rounded-lg" style={{ color: 'var(--emerald)' }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(tx.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--danger)' }}>
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

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(3,17,13,0.85)', backdropFilter: 'blur(8px)' }}
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

function SummaryTile({ label, value, tone, icon }) {
  const color = tone === 'positive' ? 'var(--emerald)' : tone === 'negative' ? 'var(--danger)' : 'var(--text-primary)'
  return (
    <div className="asset-tile">
      <div className="tile-label"><span style={{ color }}>{icon}</span> {label}</div>
      <div className="tile-value" style={{ color }}>{value}</div>
    </div>
  )
}
