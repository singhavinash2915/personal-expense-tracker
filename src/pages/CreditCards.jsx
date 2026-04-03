import { useState } from 'react'
import { Plus, Trash2, Edit2, X, CreditCard } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'

const CARD_GRADIENTS = [
  'from-violet-800 to-blue-900',
  'from-amber-800 to-yellow-900',
  'from-slate-800 to-slate-700',
  'from-rose-800 to-pink-900',
  'from-emerald-800 to-teal-900',
  'from-indigo-800 to-purple-900',
]

const EMPTY_FORM = {
  name: '', bank: '', type: '', last4: '', limit: '', outstanding: '', expires: '', color: CARD_GRADIENTS[0]
}

export default function CreditCards() {
  const { state, dispatch } = useApp()
  const cards = state.creditCards || []
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const totalLimit       = cards.reduce((s, c) => s + c.limit, 0)
  const totalOutstanding = cards.reduce((s, c) => s + c.outstanding, 0)
  const totalAvailable   = totalLimit - totalOutstanding

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditCard(null)
    setShowForm(true)
  }

  function openEdit(card) {
    setForm({ ...card, limit: String(card.limit), outstanding: String(card.outstanding) })
    setEditCard(card)
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, limit: parseFloat(form.limit), outstanding: parseFloat(form.outstanding) }
    if (editCard) {
      dispatch({ type: 'UPDATE_CREDIT_CARD', payload })
    } else {
      dispatch({ type: 'ADD_CREDIT_CARD', payload: { ...payload, id: generateId() } })
    }
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Total Credit Limit',  value: formatINR(totalLimit),       icon: '💳', color: 'text-violet-300' },
          { label: 'Total Outstanding',   value: formatINR(totalOutstanding),  icon: '📊', color: 'text-rose-400'   },
          { label: 'Available Credit',    value: formatINR(totalAvailable),    icon: '✅', color: 'text-emerald-400'},
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
        <h3 className="text-base font-semibold text-white">My Credit Cards</h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
          <Plus className="w-4 h-4" /> Add Card
        </button>
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="card p-16 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-violet-400 opacity-40" />
          <p className="text-white font-semibold mb-1">No credit cards added</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Add your credit cards to track outstanding balances</p>
          <button onClick={openAdd} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Card</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map(card => {
            const usePct = card.limit > 0 ? (card.outstanding / card.limit * 100) : 0
            const barColor = usePct >= 80 ? '#e11d48' : usePct >= 60 ? '#f59e0b' : '#7c3aed'
            return (
              <div key={card.id} className="space-y-4">
                {/* Card Visual */}
                <div className={`relative rounded-2xl p-6 bg-gradient-to-br ${card.color} shadow-lg overflow-hidden min-h-[160px]`}>
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-xs text-white/60 font-medium uppercase tracking-wider">{card.bank}</p>
                      <p className="text-lg font-bold text-white">{card.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/60">{card.type}</p>
                    </div>
                  </div>
                  <p className="text-xl font-mono text-white/80 mb-4 tracking-widest">•••• •••• •••• {card.last4}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-white/50">Expires</p>
                      <p className="text-sm font-semibold text-white">{card.expires}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50">Outstanding</p>
                      <p className="text-base font-bold text-white">{formatINR(card.outstanding)}</p>
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <div className="card p-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span style={{ color: 'rgba(196,181,253,0.6)' }}>Credit Used</span>
                    <span className="text-white font-medium">{usePct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track mb-3">
                    <div className="progress-fill" style={{ width: `${Math.min(usePct, 100)}%`, background: barColor }} />
                  </div>
                  <div className="flex justify-between text-xs mb-3">
                    <span style={{ color: 'rgba(196,181,253,0.5)' }}>Limit: <span className="text-white">{formatINR(card.limit)}</span></span>
                    <span style={{ color: 'rgba(196,181,253,0.5)' }}>Available: <span className="text-emerald-400">{formatINR(card.limit - card.outstanding)}</span></span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(card)}
                      className="btn-ghost flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => setConfirmDelete(card.id)}
                      className="flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition">
                      <Trash2 className="w-3 h-3" /> Delete
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
        <div className="fixed inset-0 z-50 flex items-end md:items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative w-full md:w-[480px] h-auto md:h-full max-h-[90vh] md:max-h-full flex flex-col animate-slide-in overflow-y-auto rounded-t-2xl md:rounded-none"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-5 pb-4 md:p-8 md:pb-4">
              <h3 className="text-xl font-semibold text-white">{editCard ? 'Edit' : 'Add'} Credit Card</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 px-5 pb-5 md:px-8 md:pb-8 space-y-4">
              {[
                { label: 'Card Name', key: 'name', placeholder: 'e.g., HDFC Regalia' },
                { label: 'Bank', key: 'bank', placeholder: 'e.g., HDFC Bank' },
                { label: 'Card Type', key: 'type', placeholder: 'e.g., VISA Platinum' },
                { label: 'Last 4 Digits', key: 'last4', placeholder: '0000', maxLength: 4 },
                { label: 'Expiry (MM/YY)', key: 'expires', placeholder: '12/28' },
              ].map(({ label, key, placeholder, maxLength }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">{label}</label>
                  <input type="text" required placeholder={placeholder} maxLength={maxLength}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="input-field" />
                </div>
              ))}
              {[
                { label: 'Credit Limit (₹)', key: 'limit' },
                { label: 'Outstanding (₹)', key: 'outstanding' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">{label}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                    <input type="number" min="0" required placeholder="0"
                      value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="input-field pl-9" />
                  </div>
                </div>
              ))}

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-2">Card Color</label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_GRADIENTS.map(g => (
                    <button key={g} type="button" onClick={() => setForm(f => ({ ...f, color: g }))}
                      className={`w-10 h-6 rounded-lg bg-gradient-to-r ${g} transition-all ${
                        form.color === g ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-transparent' : ''
                      }`} />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                {editCard ? 'Update' : 'Add'} Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)' }}>
          <div className="card p-6 w-80 text-center">
            <p className="text-2xl mb-3">🗑️</p>
            <p className="text-white font-semibold mb-1">Remove Credit Card?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { dispatch({ type: 'DELETE_CREDIT_CARD', payload: confirmDelete }); setConfirmDelete(null) }}
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
