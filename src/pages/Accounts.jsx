import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit2, X, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, generateId } from '../lib/utils'
import ViewBalance from '../components/ui/ViewBalance'
import StatementUploadModal from '../components/ui/StatementUploadModal'

const ACCOUNT_TYPES = ['savings', 'current', 'salary', 'wallet', 'cash', 'fd', 'nre', 'nro']

const ACCOUNT_TYPE_ICONS = {
  savings: '🏛️', current: '🏢', salary: '💼', wallet: '👛', cash: '💵', fd: '🔒', nre: '🌐', nro: '🌏'
}

const EMPTY_FORM = {
  name: '', bank: '', type: 'savings', balance: '', accountNumber: '', ifsc: ''
}

// Section configuration — each section has a tint, label color, and account-type filter
const SECTIONS = [
  {
    id: 'bank',
    label: 'Bank',
    tint: 'bank',                         // tile-bank (peach)
    headerColor: '#B85B5B',
    matches: a => ['savings','salary','current','nre','nro'].includes(a.type),
  },
  {
    id: 'wallet',
    label: 'Wallet',
    tint: 'wallet',
    headerColor: '#B85B5B',
    matches: a => ['wallet','cash'].includes(a.type),
  },
  {
    id: 'deposits',
    label: 'Deposits',
    tint: 'mf',                           // mint
    headerColor: '#2F8E5A',
    matches: a => a.type === 'fd',
  },
]

export default function Accounts() {
  const { state, dispatch } = useApp()
  const accounts = state.accounts || []
  const creditCards = state.creditCards || []
  const mfTotal = (state.mutualFunds || []).reduce((s, m) => s + (m.units * m.currentNav), 0)
  const stockTotal = (state.stocks || []).reduce((s, st) => s + (st.shares * st.currentPrice), 0)
  const retireTotal = (state.retirementAccounts || []).filter(r => r.active !== false).reduce((s, r) => s + (r.currentBalance || 0), 0)

  const [showForm, setShowForm] = useState(false)
  const [editAcc, setEditAcc] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [uploadAcc, setUploadAcc] = useState(null)

  const totalAssets =
    accounts.reduce((s, a) => s + (a.balance || 0), 0)
    + mfTotal + stockTotal + retireTotal

  function openAdd() { setForm(EMPTY_FORM); setEditAcc(null); setShowForm(true) }
  function openEdit(acc) {
    setForm({ ...acc, balance: String(acc.balance || '') })
    setEditAcc(acc); setShowForm(true)
  }
  function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, balance: parseFloat(form.balance) || 0 }
    if (editAcc) {
      dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...editAcc, ...payload } })
    } else {
      dispatch({ type: 'ADD_ACCOUNT', payload: { ...payload, id: generateId() } })
    }
    setShowForm(false)
  }
  function getStats(accId) {
    const txs = state.transactions.filter(t => t.accountId === accId)
    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, count: txs.length }
  }

  return (
    <div className="space-y-5">
      {/* Total card */}
      <div className="card" style={{ padding: 24 }}>
        <p className="section-title" style={{ marginBottom: 8 }}>Total Assets</p>
        <ViewBalance value={`₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(totalAssets)}`} size="lg" />
        <p className="body-secondary" style={{ marginTop: 8, fontSize: 13 }}>
          {accounts.length} accounts · {creditCards.length} cards
        </p>
      </div>

      {/* ── Bank / Wallet / Deposits sections ─────────────────── */}
      {SECTIONS.map(section => {
        const items = accounts.filter(section.matches)
        if (items.length === 0) return null
        return (
          <SectionGroup
            key={section.id}
            label={section.label}
            count={items.length}
            countSuffix="account"
            headerColor={section.headerColor}
            tint={section.tint}
          >
            {items.map(acc => (
              <BankCard
                key={acc.id}
                acc={acc}
                tint={section.tint}
                stats={getStats(acc.id)}
                onEdit={() => openEdit(acc)}
                onDelete={() => setConfirmDelete(acc.id)}
                onUpload={() => setUploadAcc(acc)}
              />
            ))}
          </SectionGroup>
        )
      })}

      {/* ── Credit Cards section ──────────────────────────────── */}
      {creditCards.length > 0 && (
        <SectionGroup
          label="Credit Card"
          count={creditCards.length}
          countSuffix="card"
          headerColor="#B07E3E"
          tint="creditcard"
          rightAction={<Link to="/credit" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>Manage →</Link>}
        >
          {creditCards.map(c => <CreditCardTile key={c.id} card={c} />)}
        </SectionGroup>
      )}

      {/* ── Investments (MF + Stocks) ─────────────────────────── */}
      {(mfTotal > 0 || stockTotal > 0) && (
        <SectionGroup
          label="Investments"
          count={(state.mutualFunds || []).length + (state.stocks || []).length}
          countSuffix="holding"
          headerColor="#3B5BA5"
          tint="investment"
          rightAction={<Link to="/investments" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>View All →</Link>}
        >
          {mfTotal > 0 && (
            <SimpleTile
              tint="mf"
              icon="📊"
              title="Mutual Funds"
              sub={`${(state.mutualFunds || []).length} schemes`}
              labelText="Current Value"
              value={mfTotal}
            />
          )}
          {stockTotal > 0 && (
            <SimpleTile
              tint="stocks"
              icon="📈"
              title="Stocks"
              sub={`${(state.stocks || []).length} holdings`}
              labelText="Market Value"
              value={stockTotal}
            />
          )}
        </SectionGroup>
      )}

      {/* ── Retirement section ────────────────────────────────── */}
      {retireTotal > 0 && (
        <SectionGroup
          label="Retirement"
          count={(state.retirementAccounts || []).length}
          countSuffix="account"
          headerColor="#A85788"
          tint="retirement"
          rightAction={<Link to="/retirement" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>View All →</Link>}
        >
          <SimpleTile
            tint="retirement"
            icon="🏛️"
            title="PPF / NPS / EPF"
            sub={`${(state.retirementAccounts || []).length} accounts`}
            labelText="Total Corpus"
            value={retireTotal}
          />
        </SectionGroup>
      )}

      {/* Empty state */}
      {accounts.length === 0 && creditCards.length === 0 && (
        <div className="card empty-state">
          <div className="emoji">🏦</div>
          <p className="message">No accounts yet.</p>
          <p className="hint">Add a bank, wallet, or cash account to get started.</p>
          <button onClick={openAdd} className="btn btn-primary mt-4">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
      )}

      {/* Add Account button */}
      {accounts.length > 0 && (
        <button onClick={openAdd} className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
          <Plus className="w-5 h-5" /> Add Account
        </button>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
          style={{ background: 'rgba(15,26,46,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full md:w-[460px] max-h-[92vh] overflow-y-auto p-5 animate-sheet-up md:animate-fadeIn"
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '28px 28px 0 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
            }}
          >
            <div className="md:hidden w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border-default)' }} />
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading" style={{ fontSize: 22 }}>{editAcc ? 'Edit Account' : 'Add Account'}</h3>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Account Name *">
                <input required placeholder="e.g. SBI Savings" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
              </Field>
              <Field label="Bank *">
                <input required placeholder="State Bank of India" value={form.bank}
                  onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className="input" />
              </Field>
              <Field label="Type">
                <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input select">
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t}>{ACCOUNT_TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Balance (₹) *">
                <input type="number" min="0" step="0.01" required placeholder="0" value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Last 4 digits">
                  <input maxLength={4} placeholder="1234" value={form.accountNumber || ''}
                    onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="input" />
                </Field>
                <Field label="IFSC">
                  <input placeholder="SBIN0001234" value={form.ifsc || ''}
                    onChange={e => setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))} className="input" style={{ textTransform: 'uppercase' }} />
                </Field>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editAcc ? 'Save Changes' : 'Add Account'}
                </button>
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
            <h3 className="heading" style={{ fontSize: 18 }}>Delete account?</h3>
            <p className="body-secondary" style={{ marginTop: 8 }}>
              This won't delete linked transactions, but they'll lose this account reference.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => { dispatch({ type: 'DELETE_ACCOUNT', payload: confirmDelete }); setConfirmDelete(null) }}
                className="btn btn-danger flex-1"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {uploadAcc && <StatementUploadModal account={uploadAcc} onClose={() => setUploadAcc(null)} />}
    </div>
  )
}

// ── Section group with colored header ────────────────────────────────
function SectionGroup({ label, count, countSuffix = 'item', headerColor, children, rightAction }) {
  return (
    <section>
      <div className="section-header" style={{ alignItems: 'center' }}>
        <span
          className="section-title"
          style={{ color: headerColor || 'var(--primary)' }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          {rightAction}
          <span className="section-count">
            {count} {count === 1 ? countSuffix : countSuffix + 's'}
          </span>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

// ── Bank account card ────────────────────────────────────────────────
function BankCard({ acc, tint, stats, onEdit, onDelete, onUpload }) {
  const icon = ACCOUNT_TYPE_ICONS[acc.type] || '🏛️'
  return (
    <div className={`tile tile-${tint}`}>
      <div className="flex items-start gap-3">
        <div className="tile-icon">{icon}</div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {acc.name}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
            {acc.bank}{acc.accountNumber ? ` · •••• ${String(acc.accountNumber).slice(-4)}` : ''}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} aria-label="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: 'var(--danger)' }} aria-label="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Available Balance</p>
        <div style={{ marginTop: 8 }}>
          <ViewBalance value={formatINR(acc.balance || 0)} size="md" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Income" value={stats.income} color="var(--success)" />
        <Stat label="Expenses" value={stats.expense} color="var(--danger)" />
        <Stat label="Txns" value={stats.count} color="var(--text-primary)" raw />
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to="/transactions"
          state={{ accountId: acc.id }}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}
        >
          View Transactions
        </Link>
        <button onClick={onUpload} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>
          <Upload className="w-3.5 h-3.5" /> Statement
        </button>
      </div>
    </div>
  )
}

// ── Read-only credit card tile (full edit on /credit) ───────────────
function CreditCardTile({ card }) {
  const allPaid = (card.outstanding || 0) === 0
  return (
    <Link
      to="/credit"
      className="tile tile-creditcard block"
      style={{ textDecoration: 'none' }}
    >
      <div className="flex items-start gap-3">
        <div className="tile-icon">💳</div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {card.name}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
            {card.last4 ? `•••• ${card.last4}` : 'Credit Card'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Outstanding</p>
          <div style={{ marginTop: 6 }}>
            <ViewBalance value={formatINR(card.outstanding || 0)} size="md" />
          </div>
        </div>
        {(card.minDue || 0) > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Remaining Due</p>
            <div style={{ marginTop: 6 }}>
              <ViewBalance value={formatINR(card.minDue || 0)} size="md" />
            </div>
          </div>
        )}
      </div>

      {allPaid && (
        <span className="chip-success" style={{ marginTop: 12, padding: '4px 10px', fontSize: 11, display: 'inline-flex' }}>
          ✓ All Paid
        </span>
      )}
    </Link>
  )
}

// ── Simple summary tile (Investments/Retirement) ────────────────────
function SimpleTile({ tint, icon, title, sub, labelText, value }) {
  return (
    <div className={`tile tile-${tint}`}>
      <div className="flex items-start gap-3">
        <div className="tile-icon">{icon}</div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {title}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
            {sub}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{labelText}</p>
        <div style={{ marginTop: 6 }}>
          <ViewBalance value={formatINR(value)} size="md" />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color, raw }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ fontSize: 13, fontWeight: 800, color, marginTop: 2 }}>
        {raw ? value : formatINR(value)}
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
