import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit2, X, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'
import ViewBalance from '../components/ui/ViewBalance'
import StatementUploadModal from '../components/ui/StatementUploadModal'

const ACCOUNT_TYPES = ['savings', 'current', 'salary', 'wallet', 'cash', 'fd', 'nre', 'nro']

const ACCOUNT_TYPE_ICONS = {
  savings: '🏛️', current: '🏢', salary: '💼', wallet: '👛', cash: '💵', fd: '🔒', nre: '🌐', nro: '🌏'
}

// Each account type maps to a pastel tint card
const ACCOUNT_TYPE_TINT = {
  savings: 'bank',
  salary: 'bank',
  current: 'investment',
  fd: 'mf',
  wallet: 'wallet',
  cash: 'wallet',
  nre: 'bank',
  nro: 'bank',
}

const EMPTY_FORM = {
  name: '', bank: '', type: 'savings', balance: '', accountNumber: '', ifsc: ''
}

export default function Accounts() {
  const { state, dispatch } = useApp()
  const accounts = state.accounts || []

  const [showForm, setShowForm] = useState(false)
  const [editAcc, setEditAcc] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [uploadAcc, setUploadAcc] = useState(null)
  const [filter, setFilter] = useState('All')

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  // Filter chips
  const types = [
    { id: 'All',     label: 'All',      count: accounts.length },
    { id: 'savings', label: 'Savings',  count: accounts.filter(a => ['savings','salary','nre','nro'].includes(a.type)).length },
    { id: 'current', label: 'Current',  count: accounts.filter(a => a.type === 'current').length },
    { id: 'wallet',  label: 'Wallet',   count: accounts.filter(a => ['wallet','cash'].includes(a.type)).length },
    { id: 'fd',      label: 'Deposits', count: accounts.filter(a => a.type === 'fd').length },
  ]

  const filtered = accounts.filter(a => {
    if (filter === 'All') return true
    if (filter === 'savings') return ['savings','salary','nre','nro'].includes(a.type)
    if (filter === 'current') return a.type === 'current'
    if (filter === 'wallet') return ['wallet','cash'].includes(a.type)
    if (filter === 'fd') return a.type === 'fd'
    return true
  })

  function openAdd() { setForm(EMPTY_FORM); setEditAcc(null); setShowForm(true) }
  function openEdit(acc) {
    setForm({ ...acc, balance: String(acc.balance || '') })
    setEditAcc(acc); setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, balance: parseFloat(form.balance) || 0 }
    if (editAcc) {
      dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...editAcc, ...payload } })
    } else {
      dispatch({ type: 'ADD_ACCOUNT', payload: { ...payload, id: generateId() } })
    }
    setShowForm(false)
  }

  function getStats(accId) {
    const txs = state.transactions.filter(t => t.accountId === accId)
    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, count: txs.length }
  }

  return (
    <div className="space-y-5">
      {/* Total card */}
      <div className="card" style={{ padding: 24 }}>
        <p className="section-title" style={{ marginBottom: 8 }}>
          Total Balance
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 22 }}>₹</span>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalBalance)}
          </span>
        </div>
        <p className="body-secondary" style={{ marginTop: 8, fontSize: 13 }}>
          Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', margin: '0 -4px', padding: '0 4px 4px' }}>
        {types.map(t => {
          const active = filter === t.id
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              type="button"
              className={`chip ${active ? 'chip-active' : ''}`}
              style={{ flexShrink: 0 }}
            >
              {active && <span>✓</span>}
              {t.label} ({t.count})
            </button>
          )
        })}
      </div>

      {/* Account cards (pastel tinted) */}
      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="emoji">🏦</div>
          <p className="message">No accounts yet.</p>
          <p className="hint">Add a bank, wallet, or cash account to get started.</p>
          <button onClick={openAdd} className="btn btn-primary mt-4">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
      ) : (
        <section>
          <div className="section-header">
            <span className="section-title">{filter === 'All' ? 'Accounts' : types.find(t => t.id === filter)?.label}</span>
            <span className="section-count">{filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}</span>
          </div>
          <div className="space-y-3">
            {filtered.map(acc => {
              const stats = getStats(acc.id)
              const tint = ACCOUNT_TYPE_TINT[acc.type] || 'bank'
              const icon = ACCOUNT_TYPE_ICONS[acc.type] || '🏛️'
              return (
                <div key={acc.id} className={`tile tile-${tint}`}>
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <div className="tile-icon">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {acc.name}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
                        {acc.bank}{acc.accountNumber ? ` · •••• ${String(acc.accountNumber).slice(-4)}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(acc.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--danger)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="mt-4">
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Available Balance
                    </p>
                    <div style={{ marginTop: 8 }}>
                      <ViewBalance value={formatINR(acc.balance || 0)} size="md" />
                    </div>
                  </div>

                  {/* Stats + actions */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Income
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
                        {formatINR(stats.income)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Expenses
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)', marginTop: 2 }}>
                        {formatINR(stats.expense)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Txns
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                        {stats.count}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/transactions"
                      state={{ accountId: acc.id }}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}
                    >
                      View Transactions
                    </Link>
                    <button
                      onClick={() => setUploadAcc(acc)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: 12 }}
                    >
                      <Upload className="w-3.5 h-3.5" /> Statement
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
          style={{ background: 'rgba(15,26,46,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full md:w-[460px] max-h-[92vh] overflow-y-auto p-5 animate-sheet-up md:animate-fadeIn"
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '28px 28px 0 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
            }}
          >
            <div className="md:hidden w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border-default)' }} />

            <div className="flex items-center justify-between mb-4">
              <h3 className="heading" style={{ fontSize: 22 }}>
                {editAcc ? 'Edit Account' : 'Add Account'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Account Name *">
                <input required placeholder="e.g. SBI Savings" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
              </Field>
              <Field label="Bank *">
                <input required placeholder="State Bank of India" value={form.bank}
                  onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className="input" />
              </Field>
              <Field label="Type">
                <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input select">
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t}>
                      {ACCOUNT_TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Balance (₹) *">
                <input type="number" min="0" step="0.01" required placeholder="0" value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Last 4 digits">
                  <input maxLength={4} placeholder="1234" value={form.accountNumber || ''}
                    onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="input" />
                </Field>
                <Field label="IFSC">
                  <input placeholder="SBIN0001234" value={form.ifsc || ''}
                    onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))} className="input" style={{ textTransform: 'uppercase' }} />
                </Field>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editAcc ? 'Save Changes' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add account FAB-like — only when there are accounts (otherwise empty state shows it) */}
      {filtered.length > 0 && (
        <button onClick={openAdd} className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
          <Plus className="w-5 h-5" /> Add Account
        </button>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,26,46,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmDelete(null)}
        >
          <div className="card p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="heading" style={{ fontSize: 18 }}>Delete account?</h3>
            <p className="body-secondary" style={{ marginTop: 8 }}>
              This won't delete linked transactions, but they'll lose this account reference.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => { dispatch({ type: 'DELETE_ACCOUNT', payload: confirmDelete }); setConfirmDelete(null) }}
                className="btn btn-danger flex-1"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {uploadAcc && <StatementUploadModal account={uploadAcc} onClose={() => setUploadAcc(null)} />}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'block', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}
