import { useState } from 'react'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'
import { SUBSCRIPTION_CATEGORIES } from '../lib/constants'

const BILLING_CYCLES = ['monthly', 'yearly', 'quarterly']
const STATUSES = ['active', 'paused', 'variable']

const EMPTY_FORM = {
  name: '', category: '', amount: '', billingDay: '1',
  status: 'active', icon: '', iconBg: '#7c3aed', billingCycle: 'monthly'
}

export default function Subscriptions() {
  const { state, dispatch } = useApp()
  const subs = state.subscriptions || []
  const [showForm, setShowForm] = useState(false)
  const [editSub, setEditSub] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const active   = subs.filter(s => s.status === 'active')
  const paused   = subs.filter(s => s.status === 'paused')
  const monthlyTotal = active.reduce((s, sub) => {
    if (sub.billingCycle === 'yearly')    return s + sub.amount / 12
    if (sub.billingCycle === 'quarterly') return s + sub.amount / 3
    return s + sub.amount
  }, 0)
  const yearlyTotal = monthlyTotal * 12

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditSub(null)
    setShowForm(true)
  }

  function openEdit(sub) {
    setForm({ ...sub, amount: String(sub.amount), billingDay: String(sub.billingDay) })
    setEditSub(sub)
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, amount: parseFloat(form.amount), billingDay: parseInt(form.billingDay) }
    if (editSub) {
      dispatch({ type: 'UPDATE_SUBSCRIPTION', payload })
    } else {
      dispatch({ type: 'ADD_SUBSCRIPTION', payload: { ...payload, id: generateId() } })
    }
    setShowForm(false)
  }

  function getDueDays(billingDay) {
    const today = new Date()
    const due = new Date(today.getFullYear(), today.getMonth(), billingDay)
    if (due <= today) due.setMonth(due.getMonth() + 1)
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  function getMonthlyEquiv(sub) {
    if (sub.billingCycle === 'yearly')    return sub.amount / 12
    if (sub.billingCycle === 'quarterly') return sub.amount / 3
    return sub.amount
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Active Subs',      value: active.length,            icon: '✅', color: 'text-emerald-400', isNum: true },
          { label: 'Paused',           value: paused.length,            icon: '⏸️', color: 'text-amber-400',   isNum: true },
          { label: 'Monthly Cost',     value: formatINR(monthlyTotal),  icon: '📅', color: 'text-rose-400'   },
          { label: 'Annual Cost',      value: formatINR(yearlyTotal),   icon: '📊', color: 'text-violet-300' },
        ].map(({ label, value, icon, color, isNum }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl">{icon}</div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</p>
              <p className={`text-lg font-bold ${color}`}>{isNum ? value : value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">All Subscriptions</h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {subs.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white font-semibold mb-1">No subscriptions tracked</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Add your recurring subscriptions to track monthly costs</p>
          <button onClick={openAdd} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Subscription</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subs.map(sub => {
            const dueIn = getDueDays(sub.billingDay)
            const monthly = getMonthlyEquiv(sub)
            const statusColor = sub.status === 'active' ? '#10b981' : sub.status === 'paused' ? '#f59e0b' : '#06b6d4'

            return (
              <div key={sub.id} className="card p-5 flex items-center gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: sub.iconBg || '#7c3aed' }}>
                  {sub.icon || sub.name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white truncate">{sub.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.5)' }}>{sub.category}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(196,181,253,0.4)' }}>
                    Due in {dueIn} day{dueIn !== 1 ? 's' : ''} · Day {sub.billingDay} · {sub.billingCycle}
                  </p>
                </div>

                {/* Amount + Actions */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-white">{formatINR(sub.amount)}</p>
                  {sub.billingCycle !== 'monthly' && (
                    <p className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>≈ {formatINR(monthly)}/mo</p>
                  )}
                  <div className="flex gap-1.5 mt-2 justify-end">
                    <button onClick={() => openEdit(sub)} className="btn-ghost p-1.5 rounded-lg text-violet-300">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(sub.id)} className="btn-ghost p-1.5 rounded-lg text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
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
              <h3 className="text-xl font-semibold text-white">{editSub ? 'Edit' : 'Add'} Subscription</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 px-5 pb-5 md:px-8 md:pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Service Name</label>
                <input type="text" required placeholder="e.g., Netflix" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Category</label>
                <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                  <option value="">Select category</option>
                  {SUBSCRIPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                  <input type="number" min="1" required placeholder="0" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-field pl-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Billing Day</label>
                  <input type="number" min="1" max="31" required value={form.billingDay}
                    onChange={e => setForm(f => ({ ...f, billingDay: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Billing Cycle</label>
                  <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))} className="input-field">
                    {BILLING_CYCLES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Status</label>
                <div className="flex gap-2">
                  {STATUSES.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                        form.status === s ? 'btn-primary' : 'btn-ghost'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Icon Text</label>
                  <input type="text" placeholder="N, AI, ▶" maxLength={3} value={form.icon}
                    onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Icon Color</label>
                  <input type="color" value={form.iconBg}
                    onChange={e => setForm(f => ({ ...f, iconBg: e.target.value }))}
                    className="input-field h-10 p-1 cursor-pointer" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                {editSub ? 'Update' : 'Add'} Subscription
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
            <p className="text-white font-semibold mb-1">Remove Subscription?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { dispatch({ type: 'DELETE_SUBSCRIPTION', payload: confirmDelete }); setConfirmDelete(null) }}
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
