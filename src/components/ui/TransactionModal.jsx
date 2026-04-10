import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const today = new Date().toISOString().split('T')[0]

export default function TransactionModal({ onClose, existing }) {
  const { state, dispatch } = useApp()
  const [form, setForm] = useState(existing || {
    type: 'expense', amount: '', description: '', categoryId: '', accountId: '', toAccountId: '', date: today, notes: '', creditCardId: ''
  })

  const expenseCategories  = state.categories.filter(c => c.type === 'expense')
  const incomeCategories   = state.categories.filter(c => c.type === 'income')
  const transferCategories = state.categories.filter(c => c.type === 'transfer')
  const cats = form.type === 'expense' ? expenseCategories : form.type === 'income' ? incomeCategories : transferCategories
  const accounts = state.accounts || []

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.description || !form.categoryId) return
    const payload = { ...form, amount: parseFloat(form.amount) }
    dispatch({ type: existing ? 'UPDATE_TRANSACTION' : 'ADD_TRANSACTION', payload })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}
        onClick={onClose} />
      <div className="relative h-full w-[480px] flex flex-col animate-slide-in overflow-y-auto"
        style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>

        <div className="flex items-center justify-between p-8 pb-4">
          <h3 className="text-xl font-semibold text-white">{existing ? 'Edit' : 'Add'} Transaction</h3>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
            <X className="w-5 h-5 text-violet-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-8 pb-8 space-y-5">
          {/* Type Toggle */}
          <div className="flex gap-2">
            {['expense', 'income', 'transfer'].map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({ ...f, type: t, categoryId: '', toAccountId: '' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : t === 'income'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'btn-ghost'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-violet-200 mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold text-lg">₹</span>
              <input type="number" min="0" step="0.01" required placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="input-field pl-9 text-xl font-bold" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-violet-200 mb-1.5">Description</label>
            <input type="text" required placeholder="e.g., Grocery shopping"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-violet-200 mb-1.5">Category</label>
            <select required value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="input-field">
              <option value="">Select category</option>
              {form.type === 'transfer' ? (
                <>
                  <optgroup label="── Investments ──">
                    {transferCategories.filter(c => ['tr1','tr2','tr3','tr4','tr5','tr6','tr7'].includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                    {transferCategories.filter(c => !['tr1','tr2','tr3','tr4','tr5','tr6','tr7','tr8','tr9','tr10','tr11','tr12','tr13','tr14','tr15','tr16'].includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="── Loan EMIs ──">
                    {transferCategories.filter(c => ['tr8','tr9','tr10','tr11','tr12','tr13'].includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="── Savings & Transfers ──">
                    {transferCategories.filter(c => ['tr14','tr15','tr16'].includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                </>
              ) : (
                cats.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-violet-200 mb-1.5">Date</label>
            <input type="date" required value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="input-field" />
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-violet-200 mb-1.5">
              {form.type === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <select value={form.accountId}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
              className="input-field">
              <option value="">Select account (optional)</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.bank}</option>
              ))}
            </select>
          </div>

          {/* To Account — only for transfers */}
          {form.type === 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-violet-200 mb-1.5">To Account</label>
              <select value={form.toAccountId}
                onChange={e => setForm(f => ({ ...f, toAccountId: e.target.value }))}
                className="input-field">
                <option value="">Select destination account (optional)</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.bank}</option>
                ))}
              </select>
            </div>
          )}

          {/* Credit Card (only for expenses) */}
          {form.type === 'expense' && state.creditCards?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-violet-200 mb-1.5">
                Charged to Credit Card <span style={{ color: 'rgba(196,181,253,0.4)', fontWeight: 400 }}>(optional)</span>
              </label>
              <select value={form.creditCardId || ''}
                onChange={e => setForm(f => ({ ...f, creditCardId: e.target.value }))}
                className="input-field">
                <option value="">Paid directly (not via credit card)</option>
                {(state.creditCards || []).map(c => (
                  <option key={c.id} value={c.id}>💳 {c.name} (••{c.last4})</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-violet-200 mb-1.5">Notes (Optional)</label>
            <textarea rows={3} placeholder="Add any notes..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field resize-none" />
          </div>

          <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
            {existing ? 'Update' : 'Add'} Transaction
          </button>
        </form>
      </div>
    </div>
  )
}
