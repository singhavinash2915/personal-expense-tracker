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

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Total Budgeted', value: formatINR(totalBudgeted), icon: '📋', color: 'text-violet-300' },
          { label: 'Total Spent',    value: formatINR(totalSpent),    icon: '💸', color: 'text-rose-400'   },
          { label: 'Over Budget',    value: `${overBudget} categories`, icon: '⚠️', color: 'text-amber-400' },
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

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Monthly Budgets</h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
          <Plus className="w-4 h-4" /> Add Budget
        </button>
      </div>

      {/* Budget Cards */}
      {budgets.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white font-semibold mb-1">No budgets set</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Add a budget to start tracking spending limits</p>
          <button onClick={openAdd} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold mx-auto">
            Add Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => {
            const cat  = getCategory(b.categoryId)
            const over = b.percentage >= 100
            const warn = b.percentage >= 80 && !over
            const barColor = over ? '#e11d48' : warn ? '#f59e0b' : '#7c3aed'
            const remaining = b.monthlyLimit - b.spent

            return (
              <div key={b.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: `${barColor}20` }}>{cat?.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-white">{cat?.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>
                        Limit: {formatINR(b.monthlyLimit)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(b)} className="btn-ghost p-1.5 rounded-lg text-violet-300">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(b.id)} className="btn-ghost p-1.5 rounded-lg text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="progress-track mb-2">
                  <div className="progress-fill" style={{ width: `${Math.min(b.percentage, 100)}%`, background: barColor }} />
                </div>

                <div className="flex justify-between text-xs">
                  <span style={{ color: 'rgba(196,181,253,0.6)' }}>
                    Spent: <span className="font-semibold text-white">{formatINR(b.spent)}</span>
                  </span>
                  <span style={{ color: over ? '#fb7185' : warn ? '#fbbf24' : 'rgba(196,181,253,0.6)' }}>
                    {over
                      ? `Over by ${formatINR(Math.abs(remaining))}`
                      : `${formatINR(remaining)} left`
                    }
                  </span>
                </div>

                {over && (
                  <div className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20">
                    ⚠️ Over budget by {b.percentage.toFixed(0)}%
                  </div>
                )}
                {warn && (
                  <div className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20">
                    ⚡ {b.percentage.toFixed(0)}% used — almost at limit!
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Budget Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="card p-5 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">{editBudget ? 'Edit' : 'Add'} Budget</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-4 h-4 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Category</label>
                <select required value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="input-field">
                  <option value="">Select category</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Monthly Limit (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                  <input type="number" min="1" required placeholder="0"
                    value={form.monthlyLimit} onChange={e => setForm(f => ({ ...f, monthlyLimit: e.target.value }))}
                    className="input-field pl-9" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold">
                  {editBudget ? 'Update' : 'Add'} Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)' }}>
          <div className="card p-6 w-80 text-center">
            <p className="text-2xl mb-3">🗑️</p>
            <p className="text-white font-semibold mb-1">Delete Budget?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { dispatch({ type: 'DELETE_BUDGET', payload: confirmDelete }); setConfirmDelete(null) }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
