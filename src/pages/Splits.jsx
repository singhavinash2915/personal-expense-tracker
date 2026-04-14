import { useState, useMemo } from 'react'
import { Plus, Trash2, X, Check, Clock, UserPlus, Minus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR } from '../lib/utils'

const today = () => new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  description: '',
  totalAmount: '',
  date: today(),
  paidBy: 'You',
  splitType: 'equal',
  members: [
    { name: 'You', share: '', settled: false },
    { name: '', share: '', settled: false },
  ],
}

export default function Splits() {
  const { state, dispatch } = useApp()
  const splits = state.splits || []
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Summary calculations
  const { youAreOwed, youOwe } = useMemo(() => {
    let owed = 0
    let owe = 0
    splits.forEach(split => {
      if (split.paidBy === 'You') {
        // You paid — others owe you their unsettled shares (excluding your own share)
        split.members.forEach(m => {
          if (m.name !== 'You' && !m.settled) owed += m.share
        })
      } else {
        // Someone else paid — you owe your unsettled share
        const yourShare = split.members.find(m => m.name === 'You')
        if (yourShare && !yourShare.settled) owe += yourShare.share
      }
    })
    return { youAreOwed: owed, youOwe: owe }
  }, [splits])

  function openAdd() {
    setForm({ ...EMPTY_FORM, date: today(), members: [{ name: 'You', share: '', settled: false }, { name: '', share: '', settled: false }] })
    setShowForm(true)
  }

  function addMember() {
    setForm(f => ({
      ...f,
      members: [...f.members, { name: '', share: '', settled: false }],
    }))
  }

  function removeMember(idx) {
    if (form.members.length <= 2) return
    setForm(f => ({ ...f, members: f.members.filter((_, i) => i !== idx) }))
  }

  function updateMember(idx, field, value) {
    setForm(f => ({
      ...f,
      members: f.members.map((m, i) => i === idx ? { ...m, [field]: value } : m),
    }))
  }

  // Auto-calculate equal shares
  function getEqualShare() {
    const total = parseFloat(form.totalAmount) || 0
    const count = form.members.length
    return count > 0 ? Math.round((total / count) * 100) / 100 : 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    const total = parseFloat(form.totalAmount)
    if (!form.description || !total || total <= 0) return

    // Validate at least 2 members with names
    const validMembers = form.members.filter(m => m.name.trim())
    if (validMembers.length < 2) return

    let members
    if (form.splitType === 'equal') {
      const share = Math.round((total / validMembers.length) * 100) / 100
      members = validMembers.map(m => ({ name: m.name.trim(), share, settled: m.name.trim() === form.paidBy }))
    } else {
      members = validMembers.map(m => ({
        name: m.name.trim(),
        share: parseFloat(m.share) || 0,
        settled: m.name.trim() === form.paidBy,
      }))
    }

    // The person who paid is automatically settled (they paid their own share)
    dispatch({
      type: 'ADD_SPLIT',
      payload: {
        description: form.description,
        totalAmount: total,
        paidBy: form.paidBy,
        date: form.date,
        splitType: form.splitType,
        members,
      },
    })
    setShowForm(false)
  }

  function allSettled(split) {
    return split.members.every(m => m.settled)
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'You are owed', value: formatINR(youAreOwed), icon: '💰', color: 'text-emerald-400' },
          { label: 'You owe',      value: formatINR(youOwe),     icon: '💸', color: 'text-rose-400' },
          { label: 'Total Splits', value: splits.length,         icon: '🤝', color: 'text-violet-300', isNum: true },
        ].map(({ label, value, icon, color, isNum }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl">{icon}</div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">All Splits</h3>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
          <Plus className="w-4 h-4" /> Add Split
        </button>
      </div>

      {/* Empty State */}
      {splits.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-white font-semibold mb-1">No split expenses</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Split bills with friends and track who owes what</p>
          <button onClick={openAdd} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Split</button>
        </div>
      ) : (
        <div className="space-y-4">
          {splits.map(split => {
            const settled = allSettled(split)
            return (
              <div key={split.id} className="card p-5">
                {/* Split header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{split.description}</p>
                      {settled && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                          All settled
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.4)' }}>
                      {split.date} &middot; Total: {formatINR(split.totalAmount)} &middot; Paid by: {split.paidBy}
                    </p>
                  </div>
                  <button onClick={() => setConfirmDelete(split.id)} className="btn-ghost p-1.5 rounded-lg text-rose-400 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Members */}
                <div className="space-y-1.5">
                  {split.members.map(member => (
                    <div key={member.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                      style={{ background: member.settled ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)' }}>
                      <div className="flex items-center gap-2">
                        {member.settled ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className={`text-sm ${member.settled ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {member.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${member.settled ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {formatINR(member.share)}
                        </span>
                        {!member.settled && (
                          <button
                            onClick={() => dispatch({ type: 'SETTLE_SPLIT_MEMBER', payload: { splitId: split.id, memberName: member.name } })}
                            className="text-xs px-2 py-1 rounded-lg font-medium transition-all"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                            Mark Settled
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Split Form — slide-in panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative w-full md:w-[480px] h-auto md:h-full max-h-[90vh] md:max-h-full flex flex-col animate-slide-in overflow-y-auto rounded-t-2xl md:rounded-none"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-5 pb-4 md:p-8 md:pb-4">
              <h3 className="text-xl font-semibold text-white">Add Split</h3>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 px-5 pb-5 md:px-8 md:pb-8 space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Description</label>
                <input type="text" required placeholder="e.g., Dinner at Bombay Canteen" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" />
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 font-semibold">₹</span>
                  <input type="number" min="1" step="0.01" required placeholder="0" value={form.totalAmount}
                    onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} className="input-field pl-9" />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Date</label>
                <input type="date" required value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Paid By</label>
                <input type="text" required placeholder="You" value={form.paidBy}
                  onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))} className="input-field" />
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Split Type</label>
                <div className="flex gap-2">
                  {['equal', 'custom'].map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, splitType: t }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                        form.splitType === t ? 'btn-primary' : 'btn-ghost'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-violet-200">Members</label>
                  <button type="button" onClick={addMember}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <UserPlus className="w-3 h-3" /> Add Member
                  </button>
                </div>

                {form.splitType === 'equal' && form.totalAmount && (
                  <p className="text-xs mb-2" style={{ color: 'rgba(196,181,253,0.5)' }}>
                    Each person pays: {formatINR(getEqualShare())}
                  </p>
                )}

                <div className="space-y-2">
                  {form.members.map((member, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={idx === 0 ? 'You' : `Friend ${idx}`}
                        value={member.name}
                        onChange={e => updateMember(idx, 'name', e.target.value)}
                        className="input-field flex-1"
                        required
                        readOnly={idx === 0}
                      />
                      {form.splitType === 'custom' && (
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-300 font-semibold text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={member.share}
                            onChange={e => updateMember(idx, 'share', e.target.value)}
                            className="input-field pl-7 w-full"
                            required
                          />
                        </div>
                      )}
                      {form.members.length > 2 && (
                        <button type="button" onClick={() => removeMember(idx)}
                          className="btn-ghost p-1.5 rounded-lg text-rose-400 flex-shrink-0">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {form.members.filter(m => m.name.trim()).length < 2 && (
                  <p className="text-xs mt-1 text-amber-400">At least 2 members required</p>
                )}
              </div>

              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                Add Split
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
            <p className="text-white font-semibold mb-1">Remove Split?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => { dispatch({ type: 'DELETE_SPLIT', payload: confirmDelete }); setConfirmDelete(null) }}
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
