import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'
import { calculateEMI, amortizationSchedule, loanStatus, buildEMITransactions } from '../lib/loans'

const LOAN_TYPES = [
  { id: 'home',     icon: '🏠', label: 'Home Loan' },
  { id: 'car',      icon: '🚗', label: 'Car Loan' },
  { id: 'personal', icon: '💸', label: 'Personal Loan' },
  { id: 'edu',      icon: '🎓', label: 'Education Loan' },
  { id: 'biz',      icon: '💼', label: 'Business Loan' },
  { id: 'other',    icon: '💳', label: 'Other' },
]

const EMPTY_LOAN = {
  name: '',
  type: 'home',
  principal: 0,
  annualRate: 8.5,
  tenureMonths: 120,
  startDate: new Date().toISOString().slice(0, 10),
  lender: '',
  preExistingPaid: 0,  // EMIs already paid before tracking in app
}

export default function Loans() {
  const { state, dispatch } = useApp()
  const loans = state.loans || []
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_LOAN)
  const [payingLoan, setPayingLoan] = useState(null)

  function saveLoan() {
    if (!form.name || !form.principal) return
    const loan = { ...form, id: generateId(), createdAt: new Date().toISOString() }
    dispatch({ type: 'ADD_LOAN', payload: loan })
    setShowForm(false)
    setForm(EMPTY_LOAN)
  }

  function deleteLoan(id) {
    if (!confirm('Delete this loan? EMI history stays.')) return
    dispatch({ type: 'DELETE_LOAN', payload: id })
  }

  function payNextEMI(loan) {
    const paidTxs = state.transactions.filter(t => t.linkedLoanId === loan.id && t.type === 'transfer')
    const status = loanStatus(loan, paidTxs)
    if (!status.nextDue) { alert('No more EMIs — loan fully paid!'); return }
    const firstAccount = state.accounts[0]?.id
    if (!firstAccount) { alert('Add a bank account first'); return }
    const txs = buildEMITransactions(loan, status.nextDue, new Date().toISOString().slice(0, 10), firstAccount)
    dispatch({ type: 'IMPORT_STATEMENT', payload: txs })
    setPayingLoan(null)
  }

  const emi = useMemo(() => calculateEMI(form.principal, form.annualRate, form.tenureMonths), [form])
  const totalInterest = useMemo(() => {
    if (!form.principal) return 0
    return emi * form.tenureMonths - form.principal
  }, [emi, form])

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero */}
      <div className="rounded-2xl p-4 md:p-5 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b, #7c2d12)'
      }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-300/70">Total Outstanding</p>
              <p className="text-2xl md:text-3xl font-extrabold text-white">
                {formatINR(loans.reduce((s, l) => {
                  const paid = state.transactions.filter(t => t.linkedLoanId === l.id && t.type === 'transfer')
                  const status = loanStatus(l, paid)
                  return s + status.outstanding
                }, 0))}
              </p>
              <p className="text-xs text-orange-200/70 mt-1">{loans.length} active loan{loans.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
              + Add Loan
            </button>
          </div>
        </div>
      </div>

      {/* How EMIs work */}
      <div className="card p-3 flex items-start gap-2.5">
        <span className="text-xl">💡</span>
        <p className="text-xs text-slate-300">
          <strong>How it works:</strong> Each EMI payment creates 2 linked transactions — the <em>principal</em> becomes a transfer (reduces your debt), and the <em>interest</em> becomes an expense. Your net worth updates automatically.
        </p>
      </div>

      {/* Loan list */}
      {loans.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-2">🏦</p>
          <p className="text-sm text-slate-400 mb-4">No loans tracked yet</p>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            Add Your First Loan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map(l => {
            const paid = state.transactions.filter(t => t.linkedLoanId === l.id && t.type === 'transfer')
            const status = loanStatus(l, paid)
            const progress = (status.paidCount / l.tenureMonths) * 100
            const type = LOAN_TYPES.find(x => x.id === l.type) || LOAN_TYPES[5]
            return (
              <div key={l.id} className="card p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(249,115,22,0.15)' }}>
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white truncate">{l.name}</p>
                      <button onClick={() => deleteLoan(l.id)} className="text-rose-400 text-xs">Delete</button>
                    </div>
                    <p className="text-[10px] text-slate-400">{l.lender || type.label} · {l.annualRate}%</p>
                  </div>
                </div>

                {/* Outstanding */}
                <div className="mb-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400">Outstanding</p>
                      <p className="text-lg font-bold text-rose-300">{formatINR(status.outstanding)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-slate-400">EMI</p>
                      <p className="text-sm font-bold text-white">{formatINR(status.nextDue?.emi || 0)}/mo</p>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">{status.paidCount}/{l.tenureMonths} EMIs paid</span>
                    <span className="text-slate-400">{status.remaining} left</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f97316, #fbbf24)' }} />
                  </div>
                </div>

                {/* Interest breakdown */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="rounded-lg p-1.5 bg-white/5">
                    <p className="text-[9px] text-slate-400">Principal Paid</p>
                    <p className="text-[11px] font-semibold text-emerald-300">{formatINR(status.paidPrincipal)}</p>
                  </div>
                  <div className="rounded-lg p-1.5 bg-white/5">
                    <p className="text-[9px] text-slate-400">Interest Paid</p>
                    <p className="text-[11px] font-semibold text-rose-300">{formatINR(status.paidInterest)}</p>
                  </div>
                  <div className="rounded-lg p-1.5 bg-white/5">
                    <p className="text-[9px] text-slate-400">Total Interest</p>
                    <p className="text-[11px] font-semibold text-amber-300">{formatINR(status.totalInterest)}</p>
                  </div>
                </div>

                {/* Action */}
                {status.nextDue && (
                  <button onClick={() => payNextEMI(l)}
                    className="w-full py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                    Pay EMI #{status.nextDue.month} · {formatINR(status.nextDue.emi)}
                    <span className="block text-[10px] font-normal opacity-80">
                      P: {formatINR(status.nextDue.principal)} + I: {formatINR(status.nextDue.interest)}
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
          style={{ background: 'rgba(5,3,20,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full md:w-[480px] max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-5 animate-sheet-up md:animate-fadeIn"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="md:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
            <h3 className="text-base font-bold text-white mb-4">Add Loan</h3>
            <div className="space-y-3 text-sm">
              <Input label="Loan Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Home Loan HDFC" />
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {LOAN_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm({ ...form, type: t.id })}
                      className={`p-2 rounded-lg text-xs border ${form.type === t.id ? 'border-indigo-400 bg-indigo-500/15' : 'border-white/10'}`}>
                      <div className="text-lg">{t.icon}</div>
                      <p className="text-white truncate">{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Lender" value={form.lender} onChange={v => setForm({ ...form, lender: v })} placeholder="HDFC / SBI / …" />
              <Input label="Principal (₹)" type="number" value={form.principal} onChange={v => setForm({ ...form, principal: +v })} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Annual Rate %" type="number" step="0.01" value={form.annualRate} onChange={v => setForm({ ...form, annualRate: +v })} />
                <Input label="Tenure (months)" type="number" value={form.tenureMonths} onChange={v => setForm({ ...form, tenureMonths: +v })} />
              </div>
              <Input label="Start Date (original)" type="date" value={form.startDate} onChange={v => setForm({ ...form, startDate: v })} />
              <Input
                label={`EMIs already paid (before tracking) — out of ${form.tenureMonths || '?'}`}
                type="number"
                min="0"
                max={form.tenureMonths || 0}
                value={form.preExistingPaid}
                onChange={v => setForm({ ...form, preExistingPaid: Math.max(0, Math.min(form.tenureMonths || 0, parseInt(v) || 0)) })}
                placeholder="0 = brand new loan"
              />
            </div>

            {/* Preview */}
            {form.principal > 0 && (
              <div className="mt-4 rounded-2xl p-3 bg-white/5 border border-white/10">
                <div className="grid grid-cols-2 gap-2 text-xs text-white">
                  <div><p className="text-slate-400">Monthly EMI</p><p className="font-bold">{formatINR(emi)}</p></div>
                  <div><p className="text-slate-400">Total Interest</p><p className="font-bold text-rose-300">{formatINR(totalInterest)}</p></div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm">Cancel</button>
              <button onClick={saveLoan} className="flex-1 py-2.5 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Save Loan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} {...rest}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-indigo-500/20 text-white focus:outline-none focus:border-indigo-400"
        style={{ fontSize: '16px' }} />
    </div>
  )
}
