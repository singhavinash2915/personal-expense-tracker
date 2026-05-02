import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'
import {
  RETIREMENT_TYPES, getRetirementType,
  ytdContributed, monthsToMaturity, projectMaturity,
  shouldAutoContribute, totalRetirementValue, eightyCTotal,
} from '../lib/retirement'

const EMPTY = {
  type: 'ppf',
  name: '',
  institution: '',
  accountNumber: '',
  currentBalance: '',
  monthlyContribution: '',
  employerContribution: '',
  dueDay: 5,
  fromAccountId: '',
  annualRate: '',
  annualLimit: '',
  startDate: new Date().toISOString().slice(0, 10),
  maturityDate: '',
  autoContribute: true,
  active: true,
}

export default function Retirement() {
  const { state, dispatch } = useApp()
  const accounts = state.retirementAccounts || []
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  // ── Auto-contribute scheduler: runs once on mount ─────────────────────
  useEffect(() => {
    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10)
    for (const acc of accounts) {
      if (shouldAutoContribute(acc, today)) {
        contribute(acc, true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openAdd() {
    const t = RETIREMENT_TYPES[0]
    setForm({
      ...EMPTY,
      annualRate: t.defaultRate,
      annualLimit: t.annualLimit || '',
      fromAccountId: state.accounts[0]?.id || '',
    })
    setEditing(null)
    setShowForm(true)
  }
  function openEdit(acc) {
    setForm({
      ...EMPTY, ...acc,
      currentBalance: String(acc.currentBalance ?? ''),
      monthlyContribution: String(acc.monthlyContribution ?? ''),
      employerContribution: String(acc.employerContribution ?? ''),
      annualRate: String(acc.annualRate ?? ''),
      annualLimit: String(acc.annualLimit ?? ''),
      dueDay: acc.dueDay ?? 5,
    })
    setEditing(acc)
    setShowForm(true)
  }

  function save() {
    if (!form.name) { alert('Please enter a name'); return }
    if (!form.fromAccountId) { alert('Please select pay-from account'); return }
    const payload = {
      ...form,
      currentBalance: parseFloat(form.currentBalance) || 0,
      monthlyContribution: parseFloat(form.monthlyContribution) || 0,
      employerContribution: parseFloat(form.employerContribution) || 0,
      annualRate: parseFloat(form.annualRate) || 0,
      annualLimit: parseFloat(form.annualLimit) || null,
      dueDay: parseInt(form.dueDay) || 5,
    }
    if (editing) {
      dispatch({ type: 'UPDATE_RETIREMENT', payload: { ...editing, ...payload } })
    } else {
      dispatch({
        type: 'ADD_RETIREMENT',
        payload: { ...payload, id: generateId(), createdAt: new Date().toISOString() },
      })
    }
    setShowForm(false)
  }

  function remove(id) {
    if (!confirm('Delete this retirement account? Past contributions stay in transactions.')) return
    dispatch({ type: 'DELETE_RETIREMENT', payload: id })
  }

  // ── Make a contribution: creates transfer + updates balance ───────────
  function contribute(acc, isAuto = false) {
    if (!acc.fromAccountId) { alert('No source account set. Edit and select one.'); return }
    const today = new Date().toISOString().slice(0, 10)
    const contribAmt = (acc.monthlyContribution || 0) + (acc.employerContribution || 0)
    if (contribAmt <= 0) { alert('Set a monthly contribution amount first.'); return }

    const type = getRetirementType(acc.type)
    const monthLabel = new Date().toLocaleString('en', { month: 'short', year: 'numeric' })

    // 1. Transfer transaction (employee portion only — actually leaves your bank)
    const tx = {
      id: generateId(),
      type: 'transfer',
      accountId: acc.fromAccountId,
      categoryId: type.categoryId,
      amount: acc.monthlyContribution || 0,
      date: today,
      description: `${type.label} contribution — ${monthLabel}${isAuto ? ' (auto)' : ''}`,
      source: isAuto ? 'auto-retirement' : 'retirement',
      linkedRetirementId: acc.id,
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: tx })

    // 2. Update retirement balance: employee + (passive) employer credit
    dispatch({
      type: 'UPDATE_RETIREMENT',
      payload: {
        ...acc,
        currentBalance: (acc.currentBalance || 0) + contribAmt,
        lastContributionDate: today,
      },
    })
  }

  const totalCorpus = useMemo(() => totalRetirementValue(accounts), [accounts])
  const totalMonthly = useMemo(
    () => accounts.filter(a => a.active !== false)
                  .reduce((s, a) => s + (a.monthlyContribution || 0), 0),
    [accounts]
  )
  const ytdAll = useMemo(
    () => accounts.reduce((s, a) => s + ytdContributed(a, state.transactions || []), 0),
    [accounts, state.transactions]
  )
  const eightyC = useMemo(
    () => eightyCTotal(accounts, state.transactions || []),
    [accounts, state.transactions]
  )
  const eightyCCap = 150000

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero: Total Corpus */}
      <div className="hero-card">
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="label-mono">— Retirement Corpus</div>
            <p className="amount-hero truncate" style={{ marginTop: 6 }}>
              <span className="rupee">₹</span>
              {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalCorpus)}
            </p>
            <p className="body-secondary" style={{ fontSize: 12, marginTop: 6 }}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ color: 'var(--gold)' }}>{formatINR(totalMonthly)}/mo</span> committed
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary flex-shrink-0" style={{ padding: '10px 16px' }}>
            + Add
          </button>
        </div>

        {/* Stats row inside hero */}
        <div className="grid grid-cols-3 gap-2 mt-4 relative z-10">
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)' }}>
            <div className="label-mono" style={{ fontSize: 9 }}>FY YTD</div>
            <div className="font-display" style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 2 }}>
              {formatINR(ytdAll)}
            </div>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)' }}>
            <div className="label-mono" style={{ fontSize: 9 }}>80C USED</div>
            <div className="font-display" style={{ fontSize: 14, color: eightyC >= eightyCCap ? 'var(--emerald)' : 'var(--gold)', marginTop: 2 }}>
              {((eightyC / eightyCCap) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)' }}>
            <div className="label-mono" style={{ fontSize: 9 }}>TAX-SAVED</div>
            <div className="font-display" style={{ fontSize: 14, color: 'var(--emerald)', marginTop: 2 }}>
              ~{formatINR(Math.min(eightyC, eightyCCap) * 0.3)}
            </div>
          </div>
        </div>
      </div>

      {/* 80C tracker bar */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="label-mono" style={{ fontSize: 10 }}>— 80C Limit</span>
          <span className="font-display" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {formatINR(eightyC)} / {formatINR(eightyCCap)}
          </span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${eightyC >= eightyCCap ? 'ok' : eightyC > eightyCCap * 0.7 ? 'warn' : 'ok'}`}
            style={{
              width: `${Math.min(100, (eightyC / eightyCCap) * 100)}%`,
              background: eightyC >= eightyCCap ? 'var(--emerald)' : 'var(--gradient-fab)'
            }}
          />
        </div>
        <p className="label-mono" style={{ fontSize: 9, marginTop: 6 }}>
          — {eightyC >= eightyCCap
              ? '✓ Maxed out — no more 80C savings this FY'
              : `Add ${formatINR(eightyCCap - eightyC)} more to maximize 80C`}
        </p>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div className="card empty-state">
          <div className="emoji">🏛️</div>
          <p className="message">No retirement accounts tracked yet.</p>
          <p className="hint">Add your PPF, NPS, EPF or Sukanya Samriddhi account.</p>
          <button onClick={openAdd} className="btn btn-primary mt-4">Add Your First Account</button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => {
            const t = getRetirementType(acc.type)
            const ytd = ytdContributed(acc, state.transactions || [])
            const months = monthsToMaturity(acc)
            const projected = projectMaturity(acc)
            const fromAcc = state.accounts.find(a => a.id === acc.fromAccountId)
            const yearsLeft = months != null ? Math.floor(months / 12) : null
            const monthsLeftMod = months != null ? months % 12 : null
            const limitPct = acc.annualLimit ? Math.min(100, (ytd / acc.annualLimit) * 100) : null

            return (
              <div key={acc.id} className="card p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="txn-ico flex-shrink-0">{t.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display truncate" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {acc.name}
                      </p>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => remove(acc.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--danger)' }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="label-mono" style={{ fontSize: 9, marginTop: 2 }}>
                      {acc.institution || t.label.toUpperCase()}
                      {acc.accountNumber && ` · ••${acc.accountNumber.slice(-4)}`}
                      {' · '}DUE DAY {acc.dueDay}
                      {t.taxSection && <> · ★ {t.taxSection}</>}
                    </p>
                  </div>
                </div>

                {/* Balance + maturity */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="asset-tile" style={{ padding: 10 }}>
                    <div className="tile-label" style={{ fontSize: 9 }}>BALANCE</div>
                    <div className="tile-value positive" style={{ fontSize: 16 }}>
                      {formatINR(acc.currentBalance || 0)}
                    </div>
                  </div>
                  <div className="asset-tile" style={{ padding: 10 }}>
                    <div className="tile-label" style={{ fontSize: 9 }}>MATURITY</div>
                    <div className="tile-value" style={{ fontSize: 14, color: 'var(--gold)' }}>
                      {months != null
                        ? `${yearsLeft}y ${monthsLeftMod}m`
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Stat label="MONTHLY" value={formatINR(acc.monthlyContribution || 0)} />
                  {acc.employerContribution > 0 ? (
                    <Stat label="EMPLOYER" value={formatINR(acc.employerContribution || 0)} tone="emerald" />
                  ) : (
                    <Stat label="RATE" value={`${acc.annualRate || 0}%`} />
                  )}
                  <Stat label="FY YTD" value={formatINR(ytd)} tone="gold" />
                </div>

                {/* Annual limit progress (PPF/Sukanya) */}
                {acc.annualLimit && (
                  <div className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span className="label-mono" style={{ fontSize: 9 }}>ANNUAL CAP</span>
                      <span className="label-mono" style={{ fontSize: 9, color: limitPct >= 90 ? 'var(--gold)' : 'var(--text-muted)' }}>
                        {limitPct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${limitPct >= 100 ? 'over' : limitPct >= 70 ? 'warn' : 'ok'}`}
                        style={{ width: `${limitPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Projected maturity */}
                {projected != null && months > 0 && (
                  <div className="rounded-xl p-2.5 mb-3" style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(52,211,153,0.25)' }}>
                    <p className="label-mono" style={{ fontSize: 9, color: 'var(--emerald)' }}>— PROJECTED AT MATURITY</p>
                    <p className="font-display" style={{ fontSize: 18, fontWeight: 500, color: 'var(--emerald)', marginTop: 4 }}>
                      ~{formatINR(projected)}
                    </p>
                  </div>
                )}

                {/* Contribute button */}
                <button onClick={() => contribute(acc)} className="btn btn-primary w-full" style={{ padding: 12 }}>
                  Contribute {formatINR((acc.monthlyContribution || 0) + (acc.employerContribution || 0))} →
                </button>
                {fromAcc && (
                  <p className="text-center label-mono" style={{ fontSize: 9, marginTop: 6 }}>
                    — Debits {formatINR(acc.monthlyContribution || 0)} from {fromAcc.name}
                    {acc.employerContribution > 0 && <> · employer adds {formatINR(acc.employerContribution)}</>}
                  </p>
                )}

                {/* Auto badge */}
                {acc.autoContribute && (
                  <div className="text-center mt-2">
                    <span className="chip-success" style={{ padding: '3px 10px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      ⚡ AUTO ON DAY {acc.dueDay}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <RetirementForm
          form={form}
          setForm={setForm}
          editing={editing}
          accounts={state.accounts}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function Stat({ label, value, tone }) {
  const color = tone === 'emerald' ? 'var(--emerald)' : tone === 'gold' ? 'var(--gold)' : 'var(--text-primary)'
  return (
    <div className="rounded-lg p-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <p className="label-mono" style={{ fontSize: 9 }}>{label}</p>
      <p className="font-display" style={{ fontSize: 13, color, marginTop: 2 }}>{value}</p>
    </div>
  )
}

function RetirementForm({ form, setForm, editing, accounts, onSave, onClose }) {
  function setType(typeId) {
    const t = RETIREMENT_TYPES.find(x => x.id === typeId)
    setForm(f => ({
      ...f,
      type: typeId,
      annualRate: t?.defaultRate ?? f.annualRate,
      annualLimit: t?.annualLimit ?? null,
    }))
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
      style={{ background: 'rgba(3,17,13,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full md:w-[480px] max-h-[92vh] overflow-y-auto p-5 animate-sheet-up md:animate-fadeIn"
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
            <div className="label-mono" style={{ fontSize: 10 }}>— {editing ? 'Edit' : 'New'}</div>
            <h3 className="heading" style={{ fontSize: 22, marginTop: 4 }}>
              {editing ? 'Edit Account' : 'Add Retirement Account'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            ×
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Type">
            <div className="grid grid-cols-3 gap-2">
              {RETIREMENT_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className="p-2 text-center"
                  style={{
                    borderRadius: 'var(--r-md)',
                    background: form.type === t.id ? 'var(--gold-dim)' : 'var(--bg-elevated)',
                    border: `1px solid ${form.type === t.id ? 'rgba(251,191,36,0.4)' : 'var(--border-default)'}`,
                    color: form.type === t.id ? 'var(--gold)' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{ fontSize: 18 }}>{t.icon}</div>
                  <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600 }}>{t.label}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Account Name *">
            <input className="input" placeholder="e.g. SBI PPF"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Institution">
              <input className="input" placeholder="SBI / HDFC / India Post"
                value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} />
            </Field>
            <Field label="Account # (last 4)">
              <input className="input" maxLength={4} placeholder="1234"
                value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} />
            </Field>
          </div>

          <Field label="Current Balance (₹)">
            <input className="input" type="number" placeholder="385200"
              value={form.currentBalance} onChange={e => setForm({ ...form, currentBalance: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Monthly Contribution (₹) *">
              <input className="input" type="number" placeholder="10000"
                value={form.monthlyContribution} onChange={e => setForm({ ...form, monthlyContribution: e.target.value })} />
            </Field>
            <Field label="Employer Match (₹)">
              <input className="input" type="number" placeholder="0"
                value={form.employerContribution} onChange={e => setForm({ ...form, employerContribution: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Due day of month">
              <input className="input" type="number" min="1" max="28" placeholder="5"
                value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} />
            </Field>
            <Field label="Annual Rate %">
              <input className="input" type="number" step="0.01" placeholder="7.1"
                value={form.annualRate} onChange={e => setForm({ ...form, annualRate: e.target.value })} />
            </Field>
          </div>

          <Field label="Pay-from account *">
            <select className="input select"
              value={form.fromAccountId} onChange={e => setForm({ ...form, fromAccountId: e.target.value })}>
              <option value="">Select account</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {formatINR(a.balance || 0)}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Start date">
              <input className="input" type="date"
                value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="Maturity date">
              <input className="input" type="date"
                value={form.maturityDate} onChange={e => setForm({ ...form, maturityDate: e.target.value })} />
            </Field>
          </div>

          <Field label="Annual Cap (₹) — for 80C tracking">
            <input className="input" type="number" placeholder="150000"
              value={form.annualLimit} onChange={e => setForm({ ...form, annualLimit: e.target.value })} />
          </Field>

          {/* Toggle: auto-contribute */}
          <label
            className="flex items-center justify-between p-3 cursor-pointer"
            style={{ borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <div>
              <div className="font-body" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Auto-contribute on due day
              </div>
              <div className="label-mono" style={{ fontSize: 9, marginTop: 2 }}>
                — Creates the monthly transfer automatically
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.autoContribute}
              onChange={e => setForm({ ...form, autoContribute: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
          </label>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button onClick={onSave} className="btn btn-primary flex-1">{editing ? 'Save Changes' : 'Add Account'}</button>
          </div>
        </div>
      </div>
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
