import { useState } from 'react'
import { Plus, Trash2, Edit2, X, PiggyBank, Calendar } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'

const ICONS = ['🏖️', '✈️', '🏠', '🚗', '📱', '💍', '🎓', '💰', '🏥', '👶', '🎯', '🔧']
const COLORS = [
  'linear-gradient(90deg, #7c3aed, #06b6d4)',
  'linear-gradient(90deg, #e11d48, #f59e0b)',
  'linear-gradient(90deg, #059669, #34d399)',
  'linear-gradient(90deg, #2563eb, #7c3aed)',
  'linear-gradient(90deg, #d946ef, #f43f5e)',
]

const EMPTY_FORM = {
  name: '', icon: '🎯', target: '', saved: '0', deadline: '', color: COLORS[0],
}

function getMonthsRemaining(deadline) {
  const now = new Date()
  const end = new Date(deadline)
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  return Math.max(months, 0)
}

function getDaysRemaining(deadline) {
  const now = new Date()
  const end = new Date(deadline)
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 0)
}

function formatDeadline(deadline) {
  return new Date(deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export default function Goals() {
  const { state, dispatch } = useApp()
  const goals = state.savingsGoals || []
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [depositGoal, setDepositGoal] = useState(null)
  const [depositForm, setDepositForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] })

  const totalTarget = goals.reduce((s, g) => s + (g.target || 0), 0)
  const totalSaved = goals.reduce((s, g) => s + (g.saved || 0), 0)
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditGoal(null)
    setShowForm(true)
  }

  function openEdit(goal) {
    setForm({
      ...goal,
      target: String(goal.target),
      saved: String(goal.saved || 0),
    })
    setEditGoal(goal)
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.target || !form.deadline) return
    const payload = {
      ...form,
      target: parseFloat(form.target),
      saved: parseFloat(form.saved) || 0,
      deposits: editGoal ? editGoal.deposits || [] : [],
      createdAt: editGoal ? editGoal.createdAt : new Date().toISOString(),
    }
    if (editGoal) {
      dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: { ...payload, id: editGoal.id } })
    } else {
      dispatch({ type: 'ADD_SAVINGS_GOAL', payload })
    }
    setShowForm(false)
  }

  function handleDeposit(e) {
    e.preventDefault()
    if (!depositForm.amount || !depositGoal) return
    dispatch({
      type: 'ADD_GOAL_DEPOSIT',
      payload: {
        goalId: depositGoal.id,
        amount: parseFloat(depositForm.amount),
        date: depositForm.date,
      },
    })
    setDepositGoal(null)
    setDepositForm({ amount: '', date: new Date().toISOString().split('T')[0] })
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Goals',    value: goals.length,          icon: '🎯', color: 'text-violet-300', isNum: true },
          { label: 'Target Amount',  value: formatINR(totalTarget), icon: '🏆', color: 'text-amber-400' },
          { label: 'Total Saved',    value: formatINR(totalSaved),  icon: '💰', color: 'text-emerald-400' },
          { label: 'Overall Progress', value: `${overallPct}%`,    icon: '📊', color: 'text-cyan-400', isNum: true },
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
        <h3 className="text-base font-semibold text-white">Savings Goals</h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-white font-semibold mb-1">No savings goals yet</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Set a goal and start saving towards it</p>
          <button onClick={openAdd} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">
            Add Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = goal.target > 0 ? Math.round(((goal.saved || 0) / goal.target) * 100) : 0
            const remaining = goal.target - (goal.saved || 0)
            const monthsLeft = getMonthsRemaining(goal.deadline)
            const daysLeft = getDaysRemaining(goal.deadline)
            const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : remaining
            const isComplete = pct >= 100

            return (
              <div key={goal.id} className="card p-5">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: 'rgba(124,58,237,0.12)' }}>
                      {goal.icon || '🎯'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{goal.name}</p>
                        {isComplete && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                            🎉 Goal reached!
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>
                        Target: {formatINR(goal.target)} · Saved: {formatINR(goal.saved || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(goal)} className="btn-ghost p-1.5 rounded-lg text-violet-300">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(goal.id)} className="btn-ghost p-1.5 rounded-lg text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-track mb-2">
                  <div className="progress-fill" style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: goal.color || 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                    transition: 'width 0.8s ease',
                  }} />
                </div>

                {/* Progress info */}
                <div className="flex justify-between text-xs mb-3">
                  <span style={{ color: 'rgba(196,181,253,0.6)' }}>
                    {pct}% complete
                  </span>
                  <span style={{ color: isComplete ? '#34d399' : 'rgba(196,181,253,0.6)' }}>
                    {isComplete ? 'Completed!' : `${formatINR(remaining)} remaining`}
                  </span>
                </div>

                {/* Deadline & Monthly needed */}
                <div className="flex items-center justify-between text-xs mb-3" style={{ color: 'rgba(196,181,253,0.4)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDeadline(goal.deadline)} · {daysLeft} days left
                  </span>
                  {!isComplete && monthsLeft > 0 && (
                    <span>
                      {formatINR(Math.ceil(monthlyNeeded))}/mo needed
                    </span>
                  )}
                </div>

                {/* Add Money button */}
                {!isComplete && (
                  <button
                    onClick={() => {
                      setDepositGoal(goal)
                      setDepositForm({ amount: '', date: new Date().toISOString().split('T')[0] })
                    }}
                    className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: 'rgba(124,58,237,0.12)',
                      color: '#a78bfa',
                      border: '1px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    <PiggyBank className="w-3.5 h-3.5 inline mr-1.5" style={{ verticalAlign: '-2px' }} />
                    Add Money
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Goal Form — slide-in panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative w-full md:w-[480px] h-auto md:h-full max-h-[90vh] md:max-h-full flex flex-col animate-slide-in overflow-y-auto rounded-t-2xl md:rounded-none"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-5 pb-4 md:p-8 md:pb-4">
              <h3 className="text-xl font-semibold text-white">{editGoal ? 'Edit' : 'Add'} Savings Goal</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 px-5 pb-5 md:px-8 md:pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Goal Name</label>
                <input type="text" required placeholder="e.g., Vacation Fund" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`p-2 rounded-xl text-xl text-center transition-all ${
                        form.icon === icon
                          ? 'ring-2 ring-violet-500 bg-violet-500/20'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Target Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                  <input type="number" min="1" required placeholder="0" value={form.target}
                    onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="input-field pl-9" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Current Saved (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                  <input type="number" min="0" placeholder="0" value={form.saved}
                    onChange={e => setForm(f => ({ ...f, saved: e.target.value }))} className="input-field pl-9" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Deadline</label>
                <input type="date" required value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-10 h-10 rounded-xl transition-all ${
                        form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0a23]' : ''
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                {editGoal ? 'Update' : 'Add'} Goal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Money Dialog */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="card p-5 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">
                Add Money to "{depositGoal.name}"
              </h3>
              <button onClick={() => setDepositGoal(null)} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-4 h-4 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                  <input type="number" min="1" required placeholder="0" value={depositForm.amount}
                    onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))} className="input-field pl-9" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Date</label>
                <input type="date" required value={depositForm.date}
                  onChange={e => setDepositForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setDepositGoal(null)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold">
                  Confirm Deposit
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
            <p className="text-white font-semibold mb-1">Delete Goal?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: confirmDelete }); setConfirmDelete(null) }}
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
