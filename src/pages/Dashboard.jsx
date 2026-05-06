import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Sankey, Layer, Rectangle
} from 'recharts'
import { useApp } from '../context/AppContext'
import { formatINR, currentMonthYear } from '../lib/utils'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import TransactionModal from '../components/ui/TransactionModal'
import ViewBalance from '../components/ui/ViewBalance'
import { calculateHealthScore } from '../lib/healthScore'
import { calculateNetWorth } from '../lib/netWorth'
import { generateInsights } from '../lib/insights'
import InsightCard from '../components/ui/InsightCard'
import { groupTransactionsByDate } from '../lib/groupByDate'

const SANKEY_COLORS = ['#5856D6', '#A5A4F7', '#FBA74F', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B']

function shortINR(v) {
  const n = Math.abs(v)
  if (n >= 10000000) return `${v < 0 ? '−' : ''}₹${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `${v < 0 ? '−' : ''}₹${(n/100000).toFixed(1)}L`
  if (n >= 1000)     return `${v < 0 ? '−' : ''}₹${(n/1000).toFixed(1)}k`
  return `${v < 0 ? '−' : ''}₹${n}`
}

function formatDayMonth(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en', { month: 'short' })}`
}

export default function Dashboard() {
  const { state, getCategory, getMonthlyStats } = useApp()
  const [editTx, setEditTx] = useState(null)
  const [filterTab, setFilterTab] = useState('all') // all | bank | cards | invest
  const privacy = state.privacyMode

  const month = currentMonthYear()
  const { income, expenses, balance } = getMonthlyStats(month)

  // Last month for trend
  const prevDate = new Date(); prevDate.setDate(1); prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const { income: prevIncome, expenses: prevExpenses } = getMonthlyStats(prevMonth)

  const netWorthData = useMemo(() => calculateNetWorth(state), [state])
  const healthScore = useMemo(() => calculateHealthScore(state), [state])
  const insights = useMemo(() => generateInsights(state), [state])

  // Trend
  const prevNet = prevIncome - prevExpenses
  const curNet = income - expenses
  const trendPct = prevNet > 0 ? ((curNet - prevNet) / Math.abs(prevNet) * 100) : 0
  const trendUp = trendPct >= 0

  // 6-month flow
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

  // Category spend (this month)
  const categorySpend = {}
  state.transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(month))
    .forEach(t => { categorySpend[t.categoryId] = (categorySpend[t.categoryId] || 0) + t.amount })
  const pieData = Object.entries(categorySpend)
    .map(([id, value]) => ({ name: getCategory(id)?.name || 'Other', value }))
    .sort((a, b) => b.value - a.value).slice(0, 6)

  // Recent activity — date grouped
  const recent = [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12)
  const recentGrouped = useMemo(() => groupTransactionsByDate(recent), [recent])

  // Asset tiles (filterable)
  const allAssetTiles = useMemo(() => {
    const tiles = []
    // Bank accounts
    for (const a of (state.accounts || [])) {
      tiles.push({
        kind: 'bank',
        id: a.id,
        title: a.bank || a.name,
        sub: a.accountNumber ? `•••• ${String(a.accountNumber).slice(-4)}` : a.name,
        icon: '🏛️',
        value: a.balance || 0,
        labelText: 'Available Balance',
      })
    }
    // Credit cards
    for (const c of (state.creditCards || [])) {
      tiles.push({
        kind: 'creditcard',
        id: c.id,
        title: c.name,
        sub: c.last4 ? `•••• ${c.last4}` : '',
        icon: '💳',
        value: c.outstanding || 0,
        labelText: 'Total Outstanding',
        statusLabel: (c.outstanding || 0) === 0 ? '✓ All Paid' : null,
      })
    }
    // Mutual funds (combined)
    const mfTotal = (state.mutualFunds || []).reduce((s, m) => s + (m.units * m.currentNav), 0)
    if (mfTotal > 0) {
      tiles.push({
        kind: 'mf',
        id: 'mf-all',
        title: 'Mutual Funds',
        sub: `${(state.mutualFunds || []).length} schemes`,
        icon: '📊',
        value: mfTotal,
        labelText: 'Current Value',
        link: '/investments',
      })
    }
    // Stocks
    const stockTotal = (state.stocks || []).reduce((s, st) => s + (st.shares * st.currentPrice), 0)
    if (stockTotal > 0) {
      tiles.push({
        kind: 'stocks',
        id: 'stocks-all',
        title: 'Stocks',
        sub: `${(state.stocks || []).length} holdings`,
        icon: '📈',
        value: stockTotal,
        labelText: 'Market Value',
        link: '/investments',
      })
    }
    // Retirement
    const retireTotal = (state.retirementAccounts || []).filter(r => r.active !== false).reduce((s, r) => s + (r.currentBalance || 0), 0)
    if (retireTotal > 0) {
      tiles.push({
        kind: 'retirement',
        id: 'retire-all',
        title: 'Retirement',
        sub: `${(state.retirementAccounts || []).length} accounts`,
        icon: '🏦',
        value: retireTotal,
        labelText: 'Corpus',
        link: '/retirement',
      })
    }
    return tiles
  }, [state])

  const filteredTiles = useMemo(() => {
    if (filterTab === 'all') return allAssetTiles
    if (filterTab === 'bank') return allAssetTiles.filter(t => t.kind === 'bank')
    if (filterTab === 'cards') return allAssetTiles.filter(t => t.kind === 'creditcard')
    if (filterTab === 'invest') return allAssetTiles.filter(t => ['mf','stocks','retirement'].includes(t.kind))
    return allAssetTiles
  }, [allAssetTiles, filterTab])

  // Filter chip counts
  const counts = {
    all:    allAssetTiles.length,
    bank:   allAssetTiles.filter(t => t.kind === 'bank').length,
    cards:  allAssetTiles.filter(t => t.kind === 'creditcard').length,
    invest: allAssetTiles.filter(t => ['mf','stocks','retirement'].includes(t.kind)).length,
  }

  // Health ring as conic gradient
  const ringStyle = {
    background: `conic-gradient(var(--primary) 0% ${healthScore.total}%, var(--primary-light) ${healthScore.total}% 100%)`,
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      {/* ── HERO: Net Worth ────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: 'var(--r-2xl)',
          background: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>
              Total Net Worth
            </div>
            <div style={{ marginTop: 6 }}>
              <ViewBalance
                value={`₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(netWorthData.netWorth)}`}
                size="lg"
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <span className={trendUp ? 'chip-success' : 'chip-danger'} style={{ padding: '4px 10px', fontSize: 11 }}>
                {trendUp ? '↑' : '↓'} {Math.abs(trendPct).toFixed(1)}% this month
              </span>
            </div>
          </div>
          {/* Health ring */}
          <Link to="/health" className="flex-shrink-0">
            <div className="ring" style={ringStyle}>
              <span>{healthScore.total}</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Filter chips ──────────────────────────── */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{ marginLeft: -4, marginRight: -4, padding: '0 4px', scrollbarWidth: 'none' }}
      >
        {[
          { id: 'all',    label: 'All' },
          { id: 'bank',   label: 'Bank' },
          { id: 'cards',  label: 'Credit Cards' },
          { id: 'invest', label: 'Investments' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilterTab(t.id)}
            className={`chip ${filterTab === t.id ? 'chip-active' : ''}`}
            style={{ flexShrink: 0 }}
          >
            {filterTab === t.id && <span>✓</span>}
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>

      {/* ── Asset cards (Money Split tinted style) ── */}
      {filteredTiles.length > 0 ? (
        <section>
          <div className="section-header">
            <span className="section-title">
              {filterTab === 'all' ? 'Assets' :
               filterTab === 'bank' ? 'Bank' :
               filterTab === 'cards' ? 'Credit Cards' : 'Investments'}
            </span>
            <span className="section-count">{filteredTiles.length} {filteredTiles.length === 1 ? 'account' : 'accounts'}</span>
          </div>
          <div
            className="flex gap-3 overflow-x-auto"
            style={{ marginLeft: -4, marginRight: -4, padding: '0 4px 4px', scrollbarWidth: 'none' }}
          >
            {filteredTiles.map(tile => (
              <AssetTile key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Monthly stats: 3 chips ──────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Income" value={income} tone="income" icon="↑" />
        <MiniStat label="Spent"  value={expenses} tone="expense" icon="↓" />
        <MiniStat label="Saved"  value={balance} tone={balance >= 0 ? 'income' : 'expense'} icon="◆" />
      </div>

      {/* ── Charts: 6-month flow ───────────────────── */}
      <section>
        <div className="section-header">
          <span className="section-title">Monthly Flow</span>
          <span className="section-count">Last 6 months</span>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5856D6" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#5856D6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,26,46,0.04)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-light)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => shortINR(v)} width={42} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: 'none', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={v => formatINR(v)} />
              <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} fill="url(#incGrad)" name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#5856D6" strokeWidth={2.5} fill="url(#expGrad)" name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Paycheck Flow Sankey ───────────────────── */}
      {pieData.length > 0 && income > 0 && (
        <PaycheckFlowChart income={income} pieData={pieData} />
      )}

      {/* ── Recent Activity (date-grouped) ────────── */}
      <section>
        <div className="section-header">
          <span className="section-title">Recent Activity</span>
          <Link to="/transactions" className="section-count" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            View All →
          </Link>
        </div>
        {recentGrouped.length > 0 ? (
          <div className="space-y-1">
            {recentGrouped.map(group => (
              <div key={group.key}>
                <div className="date-group">
                  <span className="group-label">{group.label}</span>
                  {group.total !== 0 && !privacy && (
                    <span className="group-total"
                      style={{ color: group.total >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {(group.total > 0 ? '+' : '−') + formatINR(Math.abs(group.total)).replace(/^[+−-]/, '')}
                    </span>
                  )}
                </div>
                <div className="txn-list">
                  {group.items.map(tx => {
                    const cat = getCategory(tx.categoryId)
                    const isIncome = tx.type === 'income'
                    const isTransfer = tx.type === 'transfer'
                    const sign = isIncome ? '+' : isTransfer ? '↔' : '−'
                    return (
                      <div key={tx.id} className="txn tr-hover" style={{ cursor: 'pointer' }} onClick={() => setEditTx(tx)}>
                        <div className="txn-ico">{cat?.icon || '💳'}</div>
                        <div className="txn-info">
                          <div className="txn-name">{tx.description || cat?.name}</div>
                          <div className="txn-meta">{formatDayMonth(tx.date)} · {cat?.name || 'Other'}</div>
                        </div>
                        <div
                          className={`txn-amt ${isIncome ? 'up' : isTransfer ? '' : 'down'}`}
                          style={{ color: isTransfer ? 'var(--info)' : undefined }}
                        >
                          {privacy ? '••••' : `${sign}${formatINR(tx.amount).replace(/^[+−-]/, '')}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <div className="emoji">🌱</div>
            <p className="message">No activity yet.</p>
            <p className="hint">Tap + to add your first transaction.</p>
          </div>
        )}
      </section>

      {/* ── Insights ────────────────────────────────── */}
      {insights.length > 0 && (
        <section>
          <div className="section-header">
            <span className="section-title">Insights</span>
            <Link to="/ai-insights" className="section-count" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              All →
            </Link>
          </div>
          <div className="space-y-3">
            {insights.slice(0, 3).map(i => <InsightCard key={i.id} insight={i} />)}
          </div>
        </section>
      )}

      {editTx && <TransactionModal existing={editTx} onClose={() => setEditTx(null)} />}
    </div>
  )
}

// ── Asset Tile (pastel, Money Split style) ──────────────────────────
function AssetTile({ tile }) {
  return (
    <div
      className={`tile tile-${tile.kind}`}
      style={{
        flex: '0 0 76%',
        maxWidth: 320,
        minWidth: 260,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="tile-icon">{tile.icon}</div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {tile.title}
          </p>
          {tile.sub && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
              {tile.sub}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4">
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {tile.labelText}
        </p>
        <div style={{ marginTop: 8 }}>
          <ViewBalance value={formatINR(tile.value)} size="md" />
        </div>
        {tile.statusLabel && (
          <span className="chip-success" style={{ marginTop: 12, padding: '4px 10px', fontSize: 11 }}>
            {tile.statusLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Mini stat for monthly summary ──────────────────────────────────
function MiniStat({ label, value, tone, icon }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon} {label}
      </p>
      <div style={{ marginTop: 6 }}>
        <ViewBalance
          value={formatINR(value)}
          size="md"
        />
      </div>
    </div>
  )
}

// ── Paycheck Flow Sankey ───────────────────────────────────────────
function PaycheckFlowChart({ income, pieData }) {
  const data = useMemo(() => {
    const totalSpent = pieData.reduce((s, p) => s + p.value, 0)
    const saved = Math.max(0, income - totalSpent)
    const nodes = [
      { name: 'Income' },
      ...pieData.map(p => ({ name: p.name })),
      ...(saved > 0 ? [{ name: 'Saved' }] : []),
    ]
    const links = [
      ...pieData.map((p, i) => ({ source: 0, target: i + 1, value: p.value })),
      ...(saved > 0 ? [{ source: 0, target: nodes.length - 1, value: saved }] : []),
    ]
    return { nodes, links, saved }
  }, [income, pieData])

  return (
    <section>
      <div className="section-header">
        <span className="section-title">Paycheck Flow</span>
        <span className="section-count">This month</span>
      </div>
      <div className="card" style={{ padding: 14 }}>
        <ResponsiveContainer width="100%" height={Math.max(220, pieData.length * 38)}>
          <Sankey
            data={data}
            node={<SankeyNode />}
            link={<SankeyLink />}
            nodePadding={20}
            nodeWidth={6}
            margin={{ left: 0, right: 100, top: 6, bottom: 6 }}
          >
            <Tooltip
              formatter={v => formatINR(v)}
              contentStyle={{ background: 'var(--bg-surface)', border: 'none', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function SankeyNode({ x, y, width, height, index, payload }) {
  const isFirst = index === 0
  const fill = isFirst ? '#5856D6' : SANKEY_COLORS[(index - 1) % SANKEY_COLORS.length]
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={[3,3,3,3]} />
      <text
        x={x + width + 6}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="middle"
        style={{ fontSize: 11, fill: 'var(--text-primary)', fontWeight: 700 }}
      >
        {payload.name}
      </text>
      <text
        x={x + width + 6}
        y={y + height / 2 + 13}
        textAnchor="start"
        dominantBaseline="middle"
        style={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }}
      >
        {formatINR(payload.value)}
      </text>
    </Layer>
  )
}

function SankeyLink({ sourceX, sourceY, sourceControlX, targetControlX, targetX, targetY, linkWidth, index }) {
  const fill = SANKEY_COLORS[index % SANKEY_COLORS.length]
  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={fill}
      strokeWidth={Math.max(1, linkWidth)}
      strokeOpacity={0.35}
    />
  )
}
