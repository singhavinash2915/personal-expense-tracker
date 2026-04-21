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

  const typeStyles = {
    expense:  { bg: 'var(--danger-dim)',  color: 'var(--danger)',  border: 'rgba(252,165,165,0.3)' },
    income:   { bg: 'var(--emerald-dim)', color: 'var(--emerald)', border: 'rgba(52,211,153,0.3)' },
    transfer: { bg: 'var(--gold-dim)',    color: 'var(--gold)',    border: 'rgba(251,191,36,0.3)' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-start md:justify-end">
      <div className="absolute inset-0"
        style={{ background: 'rgba(3,17,13,0.85)', backdropFilter: 'blur(10px)' }}
        onClick={onClose} />

      <div
        className="relative w-full md:w-[480px] md:h-full max-h-[92vh] md:max-h-full flex flex-col overflow-y-auto animate-sheet-up md:animate-slide-in"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-default)',
          borderLeft: '1px solid var(--border-default)',
          borderRadius: '24px 24px 0 0',
          borderRadiusMd: 0,
        }}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-default)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-8 py-3 md:py-6">
          <div>
            <div className="label-mono" style={{ fontSize: 10 }}>— {existing ? 'Edit' : 'New'}</div>
            <h3 className="heading" style={{ fontSize: 22, marginTop: 4 }}>Transaction</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-5 md:px-8 pb-6 md:pb-8 space-y-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
          {/* Type Toggle */}
          <div className="flex gap-2">
            {['expense', 'income', 'transfer'].map(t => {
              const active = form.type === t
              const s = typeStyles[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t, categoryId: '', toAccountId: '' }))}
                  className="flex-1 py-2.5 capitalize transition-all"
                  style={{
                    borderRadius: 'var(--r-md)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    fontWeight: 600,
                    background: active ? s.bg : 'var(--bg-elevated)',
                    color: active ? s.color : 'var(--text-muted)',
                    border: `1px solid ${active ? s.border : 'var(--border-default)'}`,
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>

          {/* Amount */}
          <div>
            <label className="label-mono" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>— Amount</label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400 }}
              >
                ₹
              </span>
              <input
                type="number" min="0" step="0.01" required placeholder="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="input"
                style={{
                  paddingLeft: 36,
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  background: 'var(--bg-elevated)',
                }}
              />
            </div>
          </div>

          {/* Description */}
          <Field label="Description">
            <input type="text" required placeholder="e.g., Grocery shopping"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input" />
          </Field>

          {/* Category */}
          <Field label="Category">
            <select required value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="input select">
              <option value="">Select category</option>
              {form.type === 'transfer' ? (
                <>
                  <optgroup label="Investments">
                    {transferCategories.filter(c => ['tr1','tr2','tr3','tr4','tr5','tr6','tr7'].includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Loan EMIs">
                    {transferCategories.filter(c => ['tr8','tr9','tr10','tr11','tr12','tr13'].includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Savings & Other">
                    {transferCategories.filter(c => !['tr1','tr2','tr3','tr4','tr5','tr6','tr7','tr8','tr9','tr10','tr11','tr12','tr13'].includes(c.id)).map(c => (
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
          </Field>

          {/* Date */}
          <Field label="Date">
            <input type="date" required value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="input" />
          </Field>

          {/* Account */}
          <Field label={form.type === 'transfer' ? 'From Account' : 'Account'}>
            <select value={form.accountId}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
              className="input select">
              <option value="">Select account (optional)</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.bank}</option>
              ))}
            </select>
          </Field>

          {/* To Account */}
          {form.type === 'transfer' && (
            <Field label="To Account">
              <select value={form.toAccountId}
                onChange={e => setForm(f => ({ ...f, toAccountId: e.target.value }))}
                className="input select">
                <option value="">Select destination (optional)</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.bank}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Credit Card */}
          {form.type === 'expense' && state.creditCards?.length > 0 && (
            <Field label="Credit Card (optional)">
              <select value={form.creditCardId || ''}
                onChange={e => setForm(f => ({ ...f, creditCardId: e.target.value }))}
                className="input select">
                <option value="">Paid directly</option>
                {(state.creditCards || []).map(c => (
                  <option key={c.id} value={c.id}>💳 {c.name} (••{c.last4})</option>
                ))}
              </select>
            </Field>
          )}

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea rows={3} placeholder="Add any notes..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input textarea"
              style={{ resize: 'none' }} />
          </Field>

          <button type="submit" className="btn btn-primary w-full" style={{ padding: '14px', marginTop: 8 }}>
            {existing ? 'Update' : 'Save'} Transaction
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-mono" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>— {label}</label>
      {children}
    </div>
  )
}
