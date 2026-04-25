import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'

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
  lender: '',
  monthlyEMI: '',
  totalEMIs: '',
  paidEMIs: '',
  dueDay: 5,                 // day of month
  fromAccountId: '',
  active: true,
}

// Helper: pick the loan EMI category id (Finance)
const EMI_CATEGORY_ID = 'c1'

export default function Loans() {
  const { state, dispatch } = useApp()
  const loans = state.loans || []
  const [showForm, setShowForm] = useState(false)
  const [editLoan, setEditLoan] = useState(null)
  const [form, setForm] = useState(EMPTY_LOAN)

  function openAdd() {
    setForm({ ...EMPTY_LOAN, fromAccountId: state.accounts[0]?.id || '' })
    setEditLoan(null)
    setShowForm(true)
  }
  function openEdit(loan) {
    setForm({
      ...loan,
      monthlyEMI: String(loan.monthlyEMI || ''),
      totalEMIs:  String(loan.totalEMIs  || ''),
      paidEMIs:   String(loan.paidEMIs   || 0),
      dueDay:     loan.dueDay || 5,
    })
    setEditLoan(loan)
    setShowForm(true)
  }

  function saveLoan() {
    if (!form.name || !form.monthlyEMI || !form.totalEMIs) {
      alert('Please fill name, monthly EMI, and total EMIs')
      return
    }
    const payload = {
      ...form,
      monthlyEMI: parseFloat(form.monthlyEMI) || 0,
      totalEMIs:  parseInt(form.totalEMIs)    || 0,
      paidEMIs:   parseInt(form.paidEMIs)     || 0,
      dueDay:     parseInt(form.dueDay) || 5,
    }
    if (editLoan) {
      dispatch({ type: 'UPDATE_LOAN', payload: { ...editLoan, ...payload } })
    } else {
      dispatch({ type: 'ADD_LOAN', payload: { ...payload, id: generateId(), createdAt: new Date().toISOString() } })
    }
    setShowForm(false)
  }

  function deleteLoan(id) {
    if (!confirm('Delete this loan?')) return
    dispatch({ type: 'DELETE_LOAN', payload: id })
  }

  // ── Pay one month's EMI: creates expense from account ──────────────────
  function payEMI(loan) {
    if (!loan.fromAccountId) {
      alert('No source account set on this loan. Edit and select one.')
      return
    }
    if ((loan.paidEMIs || 0) >= loan.totalEMIs) {
      alert('All EMIs already paid! 🎉')
      return
    }
    const nextNumber = (loan.paidEMIs || 0) + 1
    const today = new Date().toISOString().slice(0, 10)
    const tx = {
      id: generateId(),
      accountId: loan.fromAccountId,
      categoryId: EMI_CATEGORY_ID,
      type: 'expense',
      amount: loan.monthlyEMI,
      date: today,
      description: `EMI #${nextNumber} — ${loan.name}`,
      source: 'emi',
      linkedLoanId: loan.id,
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: tx })
    dispatch({ type: 'UPDATE_LOAN', payload: { ...loan, paidEMIs: nextNumber } })
  }

  // Total monthly outflow from active loans
  const totalMonthlyEMI = useMemo(
    () => loans.filter(l => l.active !== false).reduce((s, l) => s + (l.monthlyEMI || 0), 0),
    [loans]
  )
  const totalOutstanding = useMemo(
    () => loans.reduce((s, l) => s + (l.monthlyEMI || 0) * Math.max(0, (l.totalEMIs || 0) - (l.paidEMIs || 0)), 0),
    [loans]
  )

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero */}
      <div className="hero-card">
        <div className="flex items-start justify-between relative z-10 gap-3">
          <div className="min-w-0 flex-1">
            <div className="label-mono">— Total Outstanding</div>
            <p className="amount-hero truncate" style={{ marginTop: 6 }}>
              <span className="rupee">₹</span>
              {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalOutstanding)}
            </p>
            <p className="body-secondary" style={{ fontSize: 12, marginTop: 6 }}>
              {loans.length} loan{loans.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ color: 'var(--gold)' }}>{formatINR(totalMonthlyEMI)}/mo</span> committed
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary flex-shrink-0" style={{ padding: '10px 18px' }}>
            + Add Loan
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-3 flex items-start gap-3">
        <span className="text-xl" style={{ flexShrink: 0 }}>💡</span>
        <p className="body-secondary" style={{ fontSize: 13 }}>
          <strong style={{ color: 'var(--text-primary)' }}>How EMIs work:</strong> Each "Pay" tap creates an expense
          on your linked account. We track <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>how many EMIs are left</em> —
          no complex amortization needed.
        </p>
      </div>

      {/* Loan list */}
      {loans.length === 0 ? (
        <div className="card empty-state">
          <div className="emoji">🏦</div>
          <p className="message">No loans tracked yet.</p>
          <p className="hint">Add your home loan, car loan, or any EMI you pay monthly.</p>
          <button onClick={openAdd} className="btn btn-primary mt-4">Add Your First Loan</button>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map(l => {
            const type = LOAN_TYPES.find(x => x.id === l.type) || LOAN_TYPES[5]
            const remaining = Math.max(0, (l.totalEMIs || 0) - (l.paidEMIs || 0))
            const outstanding = remaining * (l.monthlyEMI || 0)
            const progress = l.totalEMIs > 0 ? ((l.paidEMIs || 0) / l.totalEMIs) * 100 : 0
            const fullyPaid = remaining === 0
            const fromAcc = state.accounts.find(a => a.id === l.fromAccountId)

            return (
              <div key={l.id} className="card p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="txn-ico flex-shrink-0">{type.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display truncate" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {l.name}
                      </p>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => deleteLoan(l.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--danger)' }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="label-mono" style={{ fontSize: 9, marginTop: 2 }}>
                      {l.lender || type.label.toUpperCase()} · DUE DAY {l.dueDay}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="asset-tile" style={{ padding: 10 }}>
                    <div className="tile-label" style={{ fontSize: 9 }}>EMI/MONTH</div>
                    <div className="tile-value" style={{ fontSize: 16, color: 'var(--text-primary)' }}>{formatINR(l.monthlyEMI || 0)}</div>
                  </div>
                  <div className="asset-tile" style={{ padding: 10 }}>
                    <div className="tile-label" style={{ fontSize: 9 }}>OUTSTANDING</div>
                    <div className="tile-value negative" style={{ fontSize: 16 }}>{formatINR(outstanding)}</div>
                  </div>
                  <div className="asset-tile" style={{ padding: 10 }}>
                    <div className="tile-label" style={{ fontSize: 9 }}>EMIS LEFT</div>
                    <div className="tile-value" style={{ fontSize: 16, color: 'var(--gold)' }}>{remaining}</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="label-mono" style={{ fontSize: 9 }}>{l.paidEMIs || 0} / {l.totalEMIs} PAID</span>
                    <span className="label-mono" style={{ fontSize: 9, color: fullyPaid ? 'var(--emerald)' : 'var(--gold)' }}>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${fullyPaid ? 'ok' : progress > 70 ? 'warn' : 'ok'}`}
                      style={{ width: `${Math.min(100, progress)}%`, background: fullyPaid ? 'var(--emerald)' : 'var(--gradient-fab)' }}
                    />
                  </div>
                </div>

                {/* Pay action */}
                {!fullyPaid && (
                  <button
                    onClick={() => payEMI(l)}
                    className="btn btn-primary w-full"
                    style={{ padding: 12 }}
                  >
                    Pay EMI #{(l.paidEMIs || 0) + 1} · {formatINR(l.monthlyEMI || 0)}
                  </button>
                )}
                {fullyPaid && (
                  <p className="text-center label-mono" style={{ fontSize: 11, color: 'var(--emerald)', padding: 8 }}>
                    ✓ Loan fully paid
                  </p>
                )}
                {fromAcc && !fullyPaid && (
                  <p className="text-center label-mono" style={{ fontSize: 9, marginTop: 6 }}>
                    — Debits from {fromAcc.name}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
          style={{ background: 'rgba(3,17,13,0.85)', backdropFilter: 'blur(10px)' }}
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full md:w-[460px] max-h-[92vh] overflow-y-auto p-5 animate-sheet-up md:animate-fadeIn"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '28px 28px 0 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
            }}
          >
            <div className="md:hidden w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border-default)' }} />

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="label-mono" style={{ fontSize: 10 }}>— {editLoan ? 'Edit' : 'New'}</div>
                <h3 className="heading" style={{ fontSize: 22, marginTop: 4 }}>{editLoan ? 'Edit Loan' : 'Add Loan'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>×</button>
            </div>

            <div className="space-y-3">
              <Field label="Loan Name *">
                <input className="input" placeholder="e.g. Home Loan HDFC"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </Field>

              <Field label="Type">
                <div className="grid grid-cols-3 gap-2">
                  {LOAN_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.id })}
                      className="p-2 text-center"
                      style={{
                        borderRadius: 'var(--r-md)',
                        background: form.type === t.id ? 'var(--gold-dim)' : 'var(--bg-elevated)',
                        border: `1px solid ${form.type === t.id ? 'rgba(251,191,36,0.4)' : 'var(--border-default)'}`,
                        color: form.type === t.id ? 'var(--gold)' : 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ fontSize: 18 }}>{t.icon}</div>
                      <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600 }}>{t.label.replace(' Loan', '')}</div>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Lender">
                <input className="input" placeholder="HDFC / SBI / …"
                  value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Monthly EMI (₹) *">
                  <input className="input" type="number" placeholder="48500"
                    value={form.monthlyEMI} onChange={e => setForm({ ...form, monthlyEMI: e.target.value })} />
                </Field>
                <Field label="Due day of month">
                  <input className="input" type="number" min="1" max="28" placeholder="5"
                    value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Total EMIs *">
                  <input className="input" type="number" placeholder="180"
                    value={form.totalEMIs} onChange={e => setForm({ ...form, totalEMIs: e.target.value })} />
                </Field>
                <Field label="EMIs already paid">
                  <input className="input" type="number" placeholder="0"
                    value={form.paidEMIs} onChange={e => setForm({ ...form, paidEMIs: e.target.value })} />
                </Field>
              </div>

              <Field label="Pay from account *">
                <select className="input select"
                  value={form.fromAccountId}
                  onChange={e => setForm({ ...form, fromAccountId: e.target.value })}>
                  <option value="">Select account</option>
                  {state.accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} — {formatINR(a.balance || 0)}</option>
                  ))}
                </select>
              </Field>

              {/* Preview */}
              {form.monthlyEMI && form.totalEMIs && (
                <div className="rounded-2xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="label-mono" style={{ fontSize: 9 }}>OUTSTANDING</div>
                      <div className="font-display" style={{ fontSize: 16, color: 'var(--danger)' }}>
                        {formatINR((parseFloat(form.monthlyEMI) || 0) * Math.max(0, (parseInt(form.totalEMIs) || 0) - (parseInt(form.paidEMIs) || 0)))}
                      </div>
                    </div>
                    <div>
                      <div className="label-mono" style={{ fontSize: 9 }}>TOTAL PAYABLE</div>
                      <div className="font-display" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
                        {formatINR((parseFloat(form.monthlyEMI) || 0) * (parseInt(form.totalEMIs) || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={saveLoan} className="btn btn-primary flex-1">{editLoan ? 'Save Changes' : 'Add Loan'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-mono" style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>— {label}</label>
      {children}
    </div>
  )
}
