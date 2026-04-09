import { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { privateValue } from '../lib/privacy'
import { formatINR, currentMonthYear } from '../lib/utils'
import {
  forecastMonthEnd,
  detectAnomalies,
  getDayOfWeekPattern,
  detectRecurring,
  getCategoryDrift,
} from '../lib/expenseAI'

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
      style={{
        background: active ? 'rgba(239,68,68,0.18)' : 'transparent',
        color: active ? '#f87171' : 'rgba(196,181,253,0.5)',
        border: active ? '1px solid rgba(239,68,68,0.35)' : '1px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest px-1 mb-3"
      style={{ color: 'rgba(196,181,253,0.45)' }}>
      {children}
    </h2>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`card p-4 ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Z-score badge ────────────────────────────────────────────────────────────
function ZBadge({ score }) {
  const color = score >= 4 ? '#e11d48' : score >= 3 ? '#f59e0b' : '#06b6d4'
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {score.toFixed(1)}σ
    </span>
  )
}

// ─── Spending Tab ─────────────────────────────────────────────────────────────
function SpendingTab({ transactions, categories, subscriptions, privacyMode }) {
  const anomalies = useMemo(() => detectAnomalies(transactions), [transactions])
  const drift = useMemo(() => getCategoryDrift(transactions, categories), [transactions, categories])
  const recurring = useMemo(() => detectRecurring(transactions), [transactions])

  // Known subscription names for filtering untracked recurring
  const knownSubs = new Set(subscriptions.map(s => s.name.toLowerCase().trim()))
  const untrackedRecurring = recurring.filter(
    r => !knownSubs.has(r.description.toLowerCase().trim())
  )

  const getCat = id => categories.find(c => c.id === id)

  return (
    <div className="space-y-6">

      {/* Anomalies */}
      <div>
        <SectionHeading>Unusual Transactions</SectionHeading>
        {anomalies.length === 0 ? (
          <Card>
            <p className="text-sm text-center py-4" style={{ color: 'rgba(196,181,253,0.45)' }}>
              No unusual transactions detected this period.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {anomalies.slice(0, 5).map((a, i) => {
              const cat = getCat(a.transaction.categoryId)
              return (
                <Card key={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{cat?.icon || '📦'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {a.transaction.description}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                          {new Date(a.transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {cat ? ` · ${cat.name}` : ''}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(196,181,253,0.45)' }}>
                          {privateValue(
                            `${a.zScore.toFixed(1)}σ above your average`,
                            privacyMode
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-sm font-bold" style={{ color: '#f87171' }}>
                        {privateValue(a.transaction.amount, privacyMode, formatINR)}
                      </span>
                      <ZBadge score={a.zScore} />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Category Drift */}
      <div>
        <SectionHeading>Category Drift vs 3-Month Average</SectionHeading>
        {drift.length === 0 ? (
          <Card>
            <p className="text-sm text-center py-4" style={{ color: 'rgba(196,181,253,0.45)' }}>
              Not enough historical data to compute drift.
            </p>
          </Card>
        ) : (
          <Card>
            <div className="space-y-4">
              {drift.map((d, i) => {
                const cat = getCat(d.categoryId)
                const isUp = d.changePct > 0
                const badgeColor = isUp ? '#e11d48' : '#10b981'
                const barPct = Math.min(Math.abs(d.changePct), 100)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{cat?.icon || '📦'}</span>
                        <span className="text-sm font-medium text-white truncate">{cat?.name || d.categoryId}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>
                          {privateValue(d.thisMonth, privacyMode, formatINR)}
                          <span className="mx-1" style={{ color: 'rgba(196,181,253,0.3)' }}>vs</span>
                          {privateValue(d.avgLast3, privacyMode, v => formatINR(Math.round(v)))} avg
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44` }}
                        >
                          {isUp ? '+' : ''}{d.changePct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          background: isUp
                            ? 'linear-gradient(90deg,#e11d48,#f59e0b)'
                            : 'linear-gradient(90deg,#10b981,#06b6d4)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Untracked Recurring */}
      <div>
        <SectionHeading>Possible Untracked Recurring</SectionHeading>
        {untrackedRecurring.length === 0 ? (
          <Card>
            <p className="text-sm text-center py-4" style={{ color: 'rgba(196,181,253,0.45)' }}>
              No untracked recurring payments detected.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {untrackedRecurring.map((r, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                      Around day {r.dayOfMonth} each month · {r.occurrences} occurrences found
                    </p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: '#a78bfa' }}>
                    {privateValue(r.amount, privacyMode, formatINR)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Forecast Tab ─────────────────────────────────────────────────────────────
function ForecastTab({ transactions, privacyMode }) {
  const monthYear = currentMonthYear()
  const [year, month] = monthYear.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const thisMonthTxs = transactions.filter(t => t.date.startsWith(monthYear))
  const result = useMemo(() => forecastMonthEnd(thisMonthTxs, monthYear), [thisMonthTxs, monthYear])

  const currentSpend = thisMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const income = thisMonthTxs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  // 3-month avg for comparison
  const now = new Date()
  let last3Total = 0
  let last3Count = 0
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const my = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(my))
      .reduce((s, t) => s + t.amount, 0)
    if (monthExpenses > 0) { last3Total += monthExpenses; last3Count++ }
  }
  const avg3Month = last3Count > 0 ? last3Total / last3Count : 0
  const diffVsAvg = result.forecast - avg3Month

  // Build chart data: actual cumulative + projected trend
  const dailyTotals = {}
  thisMonthTxs.filter(t => t.type === 'expense').forEach(t => {
    const day = parseInt(t.date.split('-')[2], 10)
    dailyTotals[day] = (dailyTotals[day] || 0) + t.amount
  })

  const today = now.getMonth() + 1 === month && now.getFullYear() === year
    ? now.getDate()
    : daysInMonth

  const chartData = []
  let cumulative = 0
  for (let d = 1; d <= daysInMonth; d++) {
    cumulative += dailyTotals[d] || 0
    const actual = d <= today ? cumulative : null
    // Linear projection from day 1 to daysInMonth
    const projected = result.dailyAvg > 0
      ? Math.round(result.dailyAvg * d)
      : null
    chartData.push({ day: d, actual, projected })
  }

  const forecastPct = income > 0 ? Math.min((result.forecast / income) * 100, 100) : 0
  const currentPct = income > 0 ? Math.min((currentSpend / income) * 100, 100) : 0

  const trendIcon = result.trend === 'up' ? '↑' : result.trend === 'down' ? '↓' : '→'
  const trendColor = result.trend === 'up' ? '#e11d48' : result.trend === 'down' ? '#10b981' : '#06b6d4'

  return (
    <div className="space-y-5">

      {/* Big number */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'rgba(196,181,253,0.45)' }}>
          Predicted Month-End Spend
        </p>
        <div className="flex items-end gap-3 mb-1">
          <span className="text-4xl font-extrabold text-white">
            {privateValue(result.forecast, privacyMode, v => formatINR(Math.round(v)))}
          </span>
          <span className="text-base font-bold mb-1" style={{ color: trendColor }}>
            {trendIcon} {result.trend}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'rgba(196,181,253,0.45)' }}>
          Daily average: {privateValue(result.dailyAvg, privacyMode, v => formatINR(Math.round(v)))}
          {' · '}{result.daysLeft} days remaining
        </p>
      </Card>

      {/* Insight text */}
      {avg3Month > 0 && (
        <Card style={{ border: `1px solid ${diffVsAvg > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
          <p className="text-sm font-medium" style={{ color: 'rgba(196,181,253,0.8)' }}>
            At this pace, you'll spend{' '}
            <span className="font-bold text-white">
              {privateValue(result.forecast, privacyMode, v => formatINR(Math.round(v)))}
            </span>{' '}
            this month —{' '}
            <span className="font-bold" style={{ color: diffVsAvg > 0 ? '#f87171' : '#34d399' }}>
              {privateValue(Math.abs(diffVsAvg), privacyMode, v => formatINR(Math.round(v)))}{' '}
              {diffVsAvg > 0 ? 'over' : 'under'}
            </span>{' '}
            your 3-month average of{' '}
            {privateValue(avg3Month, privacyMode, v => formatINR(Math.round(v)))}.
          </p>
        </Card>
      )}

      {/* Progress bar */}
      {income > 0 && (
        <Card>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(196,181,253,0.5)' }}>
            <span>Spend vs Income</span>
            <span>{privateValue(income, privacyMode, formatINR)} income</span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {/* Current spend */}
            <div
              className="absolute left-0 top-0 h-3 rounded-full transition-all"
              style={{
                width: `${currentPct}%`,
                background: 'linear-gradient(90deg,#7c3aed,#06b6d4)',
              }}
            />
            {/* Forecast marker */}
            <div
              className="absolute top-0 h-3 w-0.5"
              style={{
                left: `${Math.min(forecastPct, 99)}%`,
                background: '#f59e0b',
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5" style={{ color: 'rgba(196,181,253,0.4)' }}>
            <span>Current: {privateValue(currentSpend, privacyMode, formatINR)}</span>
            <span style={{ color: '#f59e0b' }}>Forecast: {privateValue(result.forecast, privacyMode, v => formatINR(Math.round(v)))}</span>
          </div>
        </Card>
      )}

      {/* Line chart */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'rgba(196,181,253,0.45)' }}>
          Cumulative Spend This Month
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: 'rgba(196,181,253,0.4)' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(196,181,253,0.4)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => privacyMode ? '••••' : `₹${(v / 1000).toFixed(0)}k`}
              width={42}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: 'rgba(196,181,253,0.6)', fontSize: 11 }}
              itemStyle={{ fontSize: 12 }}
              formatter={(value, name) => [
                privacyMode ? '••••••' : formatINR(value),
                name === 'actual' ? 'Actual' : 'Projected',
              ]}
              labelFormatter={d => `Day ${d}`}
            />
            <ReferenceLine x={today} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name="actual"
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls={false}
              name="projected"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ background: '#7c3aed' }} />
            <span className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ background: '#f59e0b', borderTop: '1px dashed #f59e0b' }} />
            <span className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Projected</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── Patterns Tab ─────────────────────────────────────────────────────────────
function PatternsTab({ transactions, privacyMode }) {
  const pattern = useMemo(() => getDayOfWeekPattern(transactions), [transactions])

  const maxAvg = Math.max(...pattern.map(p => p.avg), 1)
  const totalAvg = pattern.reduce((s, p) => s + p.avg, 0) / 7 || 1
  const peakDay = pattern.reduce((best, p) => p.avg > best.avg ? p : best, pattern[0])
  const peakPct = totalAvg > 0 ? Math.round(((peakDay.avg - totalAvg) / totalAvg) * 100) : 0

  const hasTimeData = transactions.some(t => t.time || (t.date && t.date.includes('T')))

  return (
    <div className="space-y-5">

      {/* Day-of-week chart */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'rgba(196,181,253,0.45)' }}>
          Average Spend by Day of Week
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pattern} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: 'rgba(196,181,253,0.5)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(196,181,253,0.4)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => privacyMode ? '••••' : `₹${(v / 1000).toFixed(0)}k`}
              width={42}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: 'rgba(196,181,253,0.6)', fontSize: 11 }}
              itemStyle={{ fontSize: 12 }}
              formatter={(value, name) => [
                privacyMode ? '••••••' : formatINR(value),
                name === 'avg' ? 'Avg per transaction' : 'Count',
              ]}
            />
            <Bar
              dataKey="avg"
              radius={[4, 4, 0, 0]}
              name="avg"
              fill="#7c3aed"
              // Highlight peak day
              label={false}
            >
              {pattern.map((entry, index) => (
                <rect
                  key={`bar-${index}`}
                  fill={entry.day === peakDay.day ? '#e11d48' : '#7c3aed'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Inline bars with peak highlighting (recharts Bar doesn't support per-cell fills cleanly in v2, so we show a separate visual) */}
        <div className="flex gap-1 mt-4">
          {pattern.map((p, i) => {
            const pct = maxAvg > 0 ? (p.avg / maxAvg) * 100 : 0
            const isPeak = p.day === peakDay.day
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse" style={{ height: 60 }}>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${pct}%`,
                      background: isPeak
                        ? 'linear-gradient(180deg,#e11d48,#f59e0b)'
                        : 'linear-gradient(180deg,#7c3aed,#06b6d4)',
                      minHeight: p.avg > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isPeak ? '#f87171' : 'rgba(196,181,253,0.45)' }}
                >
                  {p.day}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Peak day insight */}
      {peakDay.avg > 0 && (
        <Card style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: 'rgba(239,68,68,0.12)' }}
            >
              📊
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                You spend {peakPct > 0 ? `${peakPct}% more` : 'the most'} on {peakDay.day}s
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                Average of {privateValue(peakDay.avg, privacyMode, formatINR)} per transaction
                {' · '}{peakDay.count} transaction{peakDay.count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Day-of-week stats list */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(196,181,253,0.45)' }}>
          Full Breakdown
        </p>
        <div className="space-y-2">
          {[...pattern].sort((a, b) => b.avg - a.avg).map((p, i) => {
            const pct = totalAvg > 0 ? Math.round(((p.avg - totalAvg) / totalAvg) * 100) : 0
            const isPeak = p.day === peakDay.day
            return (
              <div key={i} className="flex items-center justify-between">
                <span
                  className="text-sm w-10 font-medium"
                  style={{ color: isPeak ? '#f87171' : 'rgba(196,181,253,0.7)' }}
                >
                  {p.day}
                </span>
                <div className="flex-1 mx-3 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${(p.avg / maxAvg) * 100}%`,
                      background: isPeak ? '#e11d48' : '#7c3aed',
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-xs font-semibold text-white w-20 text-right">
                    {privateValue(p.avg, privacyMode, formatINR)}
                  </span>
                  {p.count > 0 && (
                    <span
                      className="text-xs w-12 text-right"
                      style={{ color: pct > 0 ? '#f87171' : pct < 0 ? '#34d399' : 'rgba(196,181,253,0.4)' }}
                    >
                      {pct > 0 ? '+' : ''}{pct}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Hour-of-day: placeholder if no time data */}
      <div>
        <SectionHeading>Hour of Day</SectionHeading>
        <Card>
          {hasTimeData ? (
            <p className="text-sm" style={{ color: 'rgba(196,181,253,0.6)' }}>
              Hourly breakdown available when transactions include time data.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="text-2xl">🕐</span>
              <p className="text-sm text-center" style={{ color: 'rgba(196,181,253,0.45)' }}>
                Hour-of-day analysis requires transactions with time data.
                Import bank statements with timestamps to unlock this insight.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ['Spending', 'Forecast', 'Patterns']

export default function AIInsights() {
  const { state } = useApp()
  const [activeTab, setActiveTab] = useState('Spending')

  const { transactions, categories, subscriptions, privacyMode } = state

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Tab bar */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => (
          <Tab key={tab} label={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Spending' && (
        <SpendingTab
          transactions={transactions}
          categories={categories}
          subscriptions={subscriptions}
          privacyMode={privacyMode}
        />
      )}
      {activeTab === 'Forecast' && (
        <ForecastTab
          transactions={transactions}
          privacyMode={privacyMode}
        />
      )}
      {activeTab === 'Patterns' && (
        <PatternsTab
          transactions={transactions}
          privacyMode={privacyMode}
        />
      )}
    </div>
  )
}
