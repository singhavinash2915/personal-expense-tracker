import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit2, X, Landmark, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'
import StatementUploadModal from '../components/ui/StatementUploadModal'

const ACCOUNT_TYPES = ['savings', 'current', 'salary', 'wallet', 'cash', 'fd', 'nre', 'nro']

const ACCOUNT_COLORS = [
  'from-violet-800 to-blue-900',
  'from-red-800 to-rose-900',
  'from-orange-800 to-amber-900',
  'from-sky-700 to-blue-800',
  'from-emerald-800 to-teal-900',
  'from-indigo-800 to-purple-900',
  'from-pink-800 to-rose-900',
  'from-cyan-800 to-blue-900',
]

const ACCOUNT_TYPE_ICONS = {
  savings: '🏦', current: '🏢', salary: '💼', wallet: '👛', cash: '💵', fd: '🔒', nre: '🌐', nro: '🌏'
}

const EMPTY_FORM = {
  name: '', bank: '', type: 'savings', balance: '', accountNumber: '', ifsc: '', color: ACCOUNT_COLORS[0]
}

export default function Accounts() {
  const { state, dispatch } = useApp()
  const accounts = state.accounts || []
  const [showForm, setShowForm] = useState(false)
  const [editAcc, setEditAcc] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [uploadAcc, setUploadAcc] = useState(null)

  const totalBalance  = accounts.reduce((s, a) => s + a.balance, 0)
  const savingsTotal  = accounts.filter(a => ['savings','salary','nre','nro'].includes(a.type)).reduce((s,a) => s + a.balance, 0)
  const currentTotal  = accounts.filter(a => a.type === 'current').reduce((s,a) => s + a.balance, 0)
  const walletTotal   = accounts.filter(a => ['wallet','cash'].includes(a.type)).reduce((s,a) => s + a.balance, 0)

  function openAdd() { setForm(EMPTY_FORM); setEditAcc(null); setShowForm(true) }
  function openEdit(acc) {
    setForm({ ...acc, balance: String(acc.balance) })
    setEditAcc(acc); setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, balance: parseFloat(form.balance) }
    if (editAcc) {
      dispatch({ type: 'UPDATE_ACCOUNT', payload })
    } else {
      dispatch({ type: 'ADD_ACCOUNT', payload: { ...payload, id: generateId() } })
    }
    setShowForm(false)
  }

  // Per-account transaction stats
  function getAccountStats(accId) {
    const txs = state.transactions.filter(t => t.accountId === accId)
    const income  = txs.filter(t => t.type === 'income').reduce((s,t)  => s + t.amount, 0)
    const expense = txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0)
    return { income, expense, count: txs.length }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Net Worth',       value: formatINR(totalBalance),  icon: '💰', color: 'text-violet-300' },
          { label: 'Savings/Salary',  value: formatINR(savingsTotal),  icon: '🏦', color: 'text-cyan-400'   },
          { label: 'Current/Business',value: formatINR(currentTotal),  icon: '🏢', color: 'text-amber-400'  },
          { label: 'Wallet & Cash',   value: formatINR(walletTotal),   icon: '👛', color: 'text-emerald-400'},
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl">{icon}</div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">My Accounts</h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-16 text-center">
          <Landmark className="w-12 h-12 mx-auto mb-3 text-violet-400 opacity-40" />
          <p className="text-white font-semibold mb-1">No accounts added</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Add your bank accounts, wallets, and cash to track your net worth</p>
          <button onClick={openAdd} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Account</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {accounts.map(acc => {
            const stats = getAccountStats(acc.id)
            const typeIcon = ACCOUNT_TYPE_ICONS[acc.type] || '🏦'

            return (
              <div key={acc.id} className="space-y-0">
                {/* Account Card */}
                <div className={`relative rounded-2xl rounded-b-none p-6 bg-gradient-to-br ${acc.color} shadow-lg overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-white/60 font-medium uppercase tracking-wider">{acc.bank}</p>
                      <p className="text-lg font-bold text-white">{acc.name}</p>
                    </div>
                    <span className="text-2xl">{typeIcon}</span>
                  </div>

                  {acc.accountNumber && (
                    <p className="text-sm font-mono text-white/70 mb-4 tracking-widest">
                      •••• •••• •••• {acc.accountNumber}
                    </p>
                  )}

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-white/50">Available Balance</p>
                      <p className="text-2xl font-bold text-white">{formatINR(acc.balance)}</p>
                    </div>
                    <span className="text-xs font-medium text-white/60 bg-white/10 px-2.5 py-1 rounded-full capitalize">{acc.type}</span>
                  </div>
                </div>

                {/* Account Details */}
                <div className="card rounded-t-none border-t-0 p-4">
                  <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(109,40,217,0.08)' }}>
                      <p style={{ color: 'rgba(196,181,253,0.5)' }}>Transactions</p>
                      <p className="font-bold text-white mt-0.5">{stats.count}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(5,150,105,0.08)' }}>
                      <p style={{ color: 'rgba(196,181,253,0.5)' }}>Income</p>
                      <p className="font-bold text-emerald-400 mt-0.5">{formatINR(stats.income)}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(225,29,72,0.08)' }}>
                      <p style={{ color: 'rgba(196,181,253,0.5)' }}>Expenses</p>
                      <p className="font-bold text-rose-400 mt-0.5">{formatINR(stats.expense)}</p>
                    </div>
                  </div>

                  {acc.ifsc && (
                    <p className="text-xs mb-3" style={{ color: 'rgba(196,181,253,0.4)' }}>
                      IFSC: <span className="font-mono">{acc.ifsc}</span>
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setUploadAcc(acc)}
                      className="btn-primary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0">
                      <Upload className="w-3 h-3" /> Upload Statement
                    </button>
                    <Link to="/transactions" state={{ accountId: acc.id }}
                      className="btn-ghost flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 text-center">
                      View
                    </Link>
                    <button onClick={() => openEdit(acc)}
                      className="btn-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-1.5">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => setConfirmDelete(acc.id)}
                      className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative h-full w-[480px] flex flex-col animate-slide-in overflow-y-auto"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-8 pb-4">
              <h3 className="text-xl font-semibold text-white">{editAcc ? 'Edit' : 'Add'} Account</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 px-8 pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Account Name</label>
                <input type="text" required placeholder="e.g., SBI Savings" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Bank / Institution</label>
                <input type="text" required placeholder="e.g., State Bank of India" value={form.bank}
                  onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Account Type</label>
                <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t} className="capitalize">
                      {ACCOUNT_TYPE_ICONS[t]} {t.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Current Balance (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                  <input type="number" min="0" step="0.01" required placeholder="0" value={form.balance}
                    onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} className="input-field pl-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Last 4 Digits</label>
                  <input type="text" placeholder="1234" maxLength={4} value={form.accountNumber || ''}
                    onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">IFSC Code</label>
                  <input type="text" placeholder="SBIN0001234" value={form.ifsc || ''}
                    onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))} className="input-field uppercase" />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-2">Card Color</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_COLORS.map(g => (
                    <button key={g} type="button" onClick={() => setForm(f => ({ ...f, color: g }))}
                      className={`w-10 h-6 rounded-lg bg-gradient-to-r ${g} transition-all ${
                        form.color === g ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-transparent' : ''
                      }`} />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                {editAcc ? 'Update' : 'Add'} Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Statement Upload Modal */}
      {uploadAcc && <StatementUploadModal account={uploadAcc} onClose={() => setUploadAcc(null)} />}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)' }}>
          <div className="card p-6 w-80 text-center">
            <p className="text-2xl mb-3">🗑️</p>
            <p className="text-white font-semibold mb-1">Remove Account?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { dispatch({ type: 'DELETE_ACCOUNT', payload: confirmDelete }); setConfirmDelete(null) }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
