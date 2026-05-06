import { useState } from 'react'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, currentMonthYear, generateId } from '../lib/utils'

export default function Budgets() {
  const { state, dispatch, getCategory, getBudgetUsage } = useApp()
  const month = currentMonthYear()
  const budgets = getBudgetUsage(month)
  const [showForm, setShowForm] = useState(false)
  const [editBudget, setEditBudget] = useState(null)
  const [form, setForm] = useState({ categoryId: '', monthlyLimit: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)

  const expenseCategories = state.categories.filter(c => c.type === 'expense')

  function openAdd() {
    setForm({ categoryId: '', monthlyLimit: '' })
    setEditBudget(null)
    setShowForm(true)
  }
  function openEdit(b) {
    setForm({ categoryId: b.categoryId, monthlyLimit: String(b.monthlyLimit) })
    setEditBudget(b)
    setShowForm(true)
  }
  function handleSubmit(e) {
    e.preventDefault()
    if (!form.categoryId || !form.monthlyLimit) return
    if (editBudget) {
      dispatch({ type: 'UPDATE_BUDGET', payload: { ...editBudget, ...form, monthlyLimit: parseFloat(form.monthlyLimit) } })
    } else {
      dispatch({ type: 'ADD_BUDGET', payload: { id: generateId(), ...form, monthlyLimit: parseFloat(form.monthlyLimit) } })
    }
    setShowForm(false)
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.monthlyLimit, 0)
  const totalSpent    = budgets.reduce((s, b) => s + b.spent, 0)
  const overBudget    = budgets.filter(b => b.percentage >= 100).length
  const remaining     = Math.max(0, totalBudgeted - totalSpent)
  const overallPct    = totalBudgeted > 0 ? (totalSpent / totalBudgeted * 100) : 0

  return (
    <div className="space-y-5 overflow-x-hidden">
      {/* Hero — overall budget */}
      <div className="card" style={{ padding: 24 }}>
        <p className="section-title" style={{ marginBottom: 8 }}>Monthly Budget</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 22 }}>₹</span>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalSpent)}
          </span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>
            / {formatINR(totalBudgeted)}
          </span>
        </div>
        <div className="mt-4 progress-track">
          <div
            className={`progress-fill ${overallPct >= 100 ? 'over' : overallPct >= 80 ? 'warn' : 'ok'}`}
            style={{ width: `${Math.min(100, overallPct)}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={overallPct >= 100 ? 'chip-danger' : overallPct >= 80 ? 'chip-warning' : 'chip-success'}
            style={{ padding: '4px 10px', fontSize: 11 }}>
            {overallPct.toFixed(0)}% used
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: overallPct >= 100 ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {overallPct >= 100 ? `Over by ${formatINR(totalSpent - totalBudgeted)}` : `${formatINR(remaining)} left`}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Tile tone="budget" label="Categories" value={budgets.length} />
        <Tile tone="expense" label="Over Budget" value={overBudget} valueColor="var(--danger)" />
        <Tile tone="savings" label="On Track" value={budgets.length - overBudget} valueColor="var(--success)" />
      </div>

      {/* Header */}
      <section>
        <div className="section-header">
          <span className="section-title">Categories</span>
          <button onClick={openAdd} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, fontWeight: 700 }}>
            + Add
          </button>
        </div>

        {budgets.length === 0 ? (
          <div className="card empty-state">
            <div className="emoji">📋</div>
            <p className="message">No budgets set</p>
            <p className="hint">Add a budget to start tracking spending limits</p>
            <button onClick={openAdd} className="btn btn-primary mt-4">Add Your First Budget</button>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map(b => {
              const cat = getCategory(b.categoryId)
              const over = b.percentage >= 100
              const warn = b.percentage >= 80 && !over
              const remaining = b.monthlyLimit - b.spent
              return (
                <div key={b.id} className="card" style={{ padding: 18 }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{
                          background: over ? 'var(--danger-bg)' : warn ? 'var(--warning-bg)' : 'var(--primary-light)',
                        }}
                      >
                        {cat?.icon || '📋'}
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{cat?.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Limit {formatINR(b.monthlyLimit)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(b.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--danger)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="progress-track mb-2">
                    <div
                      className={`progress-fill ${over ? 'over' : warn ? 'warn' : 'ok'}`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {formatINR(b.spent)} spent
                    </span>
                    <span style={{
                      fontWeight: 700,
                      color: over ? 'var(--danger)' : warn ? 'var(--warning)' : 'var(--text-muted)',
                    }}>
                      {over ? `Over by ${formatINR(Math.abs(remaining))}` : `${formatINR(remaining)} left`}
                    </span>
                  </div>

                  {(over || warn) && (
                    <div
                      className={over ? 'chip-danger' : 'chip-warning'}
                      style={{ display: 'inline-block', marginTop: 10, padding: '4px 10px', fontSize: 11 }}
                    >
                      {over ? `⚠️ ${b.percentage.toFixed(0)}% used` : `⚡ ${b.percentage.toFixed(0)}% used`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
          style={{ background: 'rgba(15,26,46,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full md:w-[420px] p-5 animate-sheet-up md:animate-fadeIn"
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '28px 28px 0 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
            }}
          >
            <div className="md:hidden w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border-default)' }} />
            <div className="flex items-center justify-between mb-5">
              <h3 className="heading" style={{ fontSize: 22 }}>{editBudget ? 'Edit' : 'Add'} Budget</h3>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Category">
                <select required value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className="input select">
                  <option value="">Select category</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </Field>
              <Field label="Monthly Limit (₹)">
                <input type="number" min="1" required placeholder="0"
                  value={form.monthlyLimit} onChange={e => setForm(f => ({ ...f, monthlyLimit: e.target.value }))} className="input" />
              </Field>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">{editBudget ? 'Save' : 'Add'} Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,26,46,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmDelete(null)}>
          <div className="card p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="heading" style={{ fontSize: 18 }}>Delete budget?</h3>
            <p className="body-secondary" style={{ marginTop: 8 }}>This action cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => { dispatch({ type: 'DELETE_BUDGET', payload: confirmDelete }); setConfirmDelete(null) }}
                className="btn btn-danger flex-1"
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Tile({ tone, label, value, valueColor }) {
  return (
    <div className={`tile tile-${tone}`} style={{ padding: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
        color: valueColor || 'var(--text-primary)', marginTop: 4,
      }}>
        {value}
      </p>
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
