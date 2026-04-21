import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useApp } from '../context/AppContext'
import { formatINR, formatDate, currentMonthYear } from '../lib/utils'
import { privateValue } from '../lib/privacy'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import TransactionModal from '../components/ui/TransactionModal'
import { calculateHealthScore } from '../lib/healthScore'
import { calculateNetWorth } from '../lib/netWorth'
import { generateInsights } from '../lib/insights'
import InsightCard from '../components/ui/InsightCard'

// Emerald/gold chart palette — no purple or teal
const COLORS = ['#34d399', '#fbbf24', '#059669', '#d97706', '#10b981', '#f59e0b']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="glass"
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--border-accent)',
      }}
    >
      <p className="label-mono" style={{ fontSize: 10 }}>— {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontFamily: 'var(--font-display)', fontSize: 14, marginTop: 4 }}>
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  )
}

function formatShortINR(v) {
  if (Math.abs(v) >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`
  if (Math.abs(v) >= 100000)  return `₹${(v/100000).toFixed(1)}L`
  if (Math.abs(v) >= 1000)    return `₹${(v/1000).toFixed(1)}k`
  return `₹${v}`
}

function formatDateEditorial(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')} · ${d.toLocaleString('en', { month: 'short' }).toUpperCase()} · ${String(d.getFullYear()).slice(2)}`
}

export default function Dashboard() {
  const { state, getCategory, getMonthlyStats } = useApp()
  const privacyMode = state.privacyMode
  const [editTx, setEditTx] = useState(null)

  const month = currentMonthYear()
  const { income, expenses, balance } = getMonthlyStats(month)

  const prevDate = new Date(); prevDate.setDate(1); prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const { income: prevIncome, expenses: prevExpenses } = getMonthlyStats(prevMonth)

  const netWorthData = useMemo(() => calculateNetWorth(state), [state])
  const healthScore = useMemo(() => calculateHealthScore(state), [state])
  const insights = useMemo(() => generateInsights(state), [state])

  // Delta vs last month
  const monthDelta = prevExpenses > 0 && prevIncome > 0
    ? (((balance - (prevIncome - prevExpenses)) / Math.abs(prevIncome - prevExpenses)) * 100)
    : 0

  const monthlyData = useMemo(() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'short' })
      const monthTx = state.transactions.filter(t => t.date.startsWith(key))
      const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      result.push({ month: label, income: inc, expense: exp })
    }
    return result
  }, [state.transactions])

  // Category pie
  const categorySpend = {}
  state.transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(month))
    .forEach(t => { categorySpend[t.categoryId] = (categorySpend[t.categoryId] || 0) + t.amount })
  const pieData = Object.entries(categorySpend)
    .map(([id, value]) => ({ name: getCategory(id)?.name || 'Other', value }))
    .sort((a, b) => b.value - a.value).slice(0, 6)

  const recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)

  // Health ring
  const ringProgress = healthScore.total / 100
  const ringStyle = {
    background: `conic-gradient(var(--gold) 0% ${ringProgress * 100}%, rgba(255,255,255,0.08) ${ringProgress * 100}% 100%)`,
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      {/* ── Hero: Net Worth ── */}
      <div className="hero-card">
        <div className="flex items-start justify-between relative z-10">
          <div className="min-w-0 flex-1">
            <div className="label-mono">— Total Net Worth</div>
            <p className="amount-hero truncate" style={{ marginTop: 8 }}>
              {privacyMode ? '••••••' : (
                <>
                  <span className="rupee">₹</span>
                  <AnimatedNumber value={netWorthData.netWorth} formatter={v => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)} />
                </>
              )}
            </p>
          </div>
          <Link to="/health" className="ring flex-shrink-0" style={ringStyle}>
            <span style={{ color: 'var(--gold)' }}>{healthScore.total}</span>
          </Link>
        </div>
        <div className="flex items-center justify-between mt-5 relative z-10" style={{ gap: 12, flexWrap: 'wrap' }}>
          <span className={`chip ${monthDelta >= 0 ? 'chip-success' : 'chip-danger'}`}>
            {monthDelta >= 0 ? '↑' : '↓'} {Math.abs(monthDelta).toFixed(1)}% this month
          </span>
          <span className="label-mono" style={{ fontSize: 10 }}>
            {formatDateEditorial(new Date().toISOString())}
          </span>
        </div>
      </div>

      {/* ── Asset tiles 2×2 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'Bank', value: netWorthData.breakdown.bankBalance, icon: '🏦' },
          { label: 'Mutual Funds', value: netWorthData.breakdown.mfValue, icon: '📈' },
          { label: 'Stocks', value: netWorthData.breakdown.stockValue, icon: '📊', tone: 'positive' },
          { label: 'CC Debt', value: netWorthData.breakdown.ccDebt, icon: '💳', tone: 'negative' },
        ].map(({ label, value, icon, tone }) => (
          <div key={label} className="asset-tile">
            <div className="tile-label">{icon} {label}</div>
            <div className={`tile-value ${tone || ''}`}>
              {privacyMode ? '••••' : formatINR(Math.abs(value))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Monthly snapshot row (income/expense/savings) ── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <MonthStat icon="↑" label="Income" value={income} privacyMode={privacyMode} tone="positive" />
        <MonthStat icon="↓" label="Expenses" value={expenses} privacyMode={privacyMode} tone="negative" />
        <MonthStat icon="◆" label="Saved" value={balance} privacyMode={privacyMode} tone={balance >= 0 ? 'positive' : 'negative'} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        {/* Area chart */}
        <div className="card md:col-span-2 p-3 md:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="heading" style={{ fontSize: 18 }}>Monthly flow</h3>
            <span className="label-mono" style={{ fontSize: 10 }}>— Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => formatShortINR(v)}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#fbbf24" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: categories */}
        <div className="card p-3 md:p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="heading" style={{ fontSize: 18 }}>Categories</h3>
            <span className="label-mono" style={{ fontSize: 10 }}>— This Month</span>
          </div>
          {pieData.length > 0 ? (
            <>
              <div className="flex justify-center mb-3">
                <div className="relative w-36 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3} dataKey="value" stroke="none">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(v)}
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-accent)', borderRadius: 12, color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-display" style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-primary)' }}>
                      {privateValue(expenses, privacyMode, formatINR)}
                    </span>
                    <span className="label-mono" style={{ fontSize: 9, marginTop: 2 }}>Spent</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                      {d.name}
                    </span>
                    <span className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {privateValue(d.value, privacyMode, formatINR)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="emoji">🌱</div>
              <p className="message" style={{ fontSize: 15 }}>No expenses yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="heading" style={{ fontSize: 19 }}>Recent Activity</h3>
          <Link to="/transactions" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>
            View All →
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="txn-list">
            {recent.map(tx => {
              const cat = getCategory(tx.categoryId)
              const isIncome = tx.type === 'income'
              const sign = isIncome ? '+' : '\u2212'
              return (
                <div key={tx.id} className="txn tr-hover cursor-pointer" onClick={() => setEditTx(tx)}>
                  <div className="txn-ico">{cat?.icon || '💳'}</div>
                  <div className="txn-info">
                    <div className="txn-name">{tx.description || cat?.name}</div>
                    <div className="txn-meta">{formatDateEditorial(tx.date).replace(/ · \d{2}$/, '')} · {cat?.name || 'Other'}</div>
                  </div>
                  <div className={`txn-amt ${isIncome ? 'up' : 'down'}`}>
                    {privacyMode ? '••••' : `${sign}${formatINR(tx.amount).replace(/^[+\u2212-]/, '')}`}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass empty-state">
            <div className="emoji">🌱</div>
            <p className="message">No activity yet.</p>
            <p className="hint">Tap + to add your first transaction.</p>
          </div>
        )}
      </section>

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="heading" style={{ fontSize: 19 }}>
              <em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>Insights</em>
            </h3>
            <Link to="/ai-insights" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>
              All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.slice(0, 4).map(i => <InsightCard key={i.id} insight={i} />)}
          </div>
        </section>
      )}

      {editTx && <TransactionModal existing={editTx} onClose={() => setEditTx(null)} />}
    </div>
  )
}

function MonthStat({ icon, label, value, privacyMode, tone }) {
  const color = tone === 'positive' ? 'var(--emerald)' : tone === 'negative' ? 'var(--danger)' : 'var(--text-primary)'
  return (
    <div className="asset-tile" style={{ padding: 14 }}>
      <div className="tile-label">
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div className="tile-value" style={{ color }}>
        {privacyMode ? '••••' : formatINR(value)}
      </div>
    </div>
  )
}
