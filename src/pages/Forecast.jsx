import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import { useApp } from '../context/AppContext'
import { forecastMonthEnd } from '../lib/forecast'
import { formatINR, currentMonthYear } from '../lib/utils'

export default function Forecast() {
  const { state } = useApp()
  const [monthKey, setMonthKey] = useState(currentMonthYear())
  const f = useMemo(() => forecastMonthEnd(state, monthKey), [state, monthKey])

  const status = f.projectedEndBalance > 0 ? 'positive' : 'negative'
  const margin = Math.abs(f.projectedEndBalance)

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero */}
      <div className="rounded-3xl overflow-hidden relative p-5 md:p-6" style={{
        background: status === 'positive'
          ? 'linear-gradient(135deg, #0f172a, #065f46, #10b981)'
          : 'linear-gradient(135deg, #0f172a, #7f1d1d, #e11d48)'
      }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Projected End of Month</p>
          <p className="text-3xl md:text-5xl font-extrabold text-white mt-1">{formatINR(f.projectedEndBalance)}</p>
          <p className="text-sm text-white/70 mt-1">
            {status === 'positive' ? '✓ You\'ll end positive' : '⚠️ Projected deficit'} · {f.daysRemaining} days left
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-3 md:p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Balance Trajectory</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={f.timeline}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
            <XAxis dataKey="day" tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(196,181,253,0.4)', fontSize: 9 }} axisLine={false} tickLine={false}
              tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={40} />
            <Tooltip
              contentStyle={{ background: '#161b2d', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => v != null ? formatINR(v) : null}
              labelFormatter={d => `Day ${d}`} />
            <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} fill="url(#actualGrad)" name="Actual" connectNulls={false} />
            <Line type="monotone" dataKey="projected" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Projected" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Breakdown</h3>
        <div className="space-y-2 text-sm">
          <Row label="Current balance" value={f.currentBalance} tone="neutral" />
          <Row label="Actual income this month" value={f.actualIncome} tone="good" prefix="+" />
          <Row label="Expected income" value={f.predictedIncome} tone="good" prefix="+" />
          <Row label="Actual expenses" value={-f.actualExpense} tone="bad" />
          <Row label="Upcoming subscriptions" value={-f.committed} tone="bad" />
          <Row label="Credit card bills" value={-f.ccBills} tone="bad" />
          <Row label="Predicted discretionary" value={-f.predictedDiscretionary} tone="bad" sub={`~${formatINR(f.avgDaily)}/day × ${f.daysRemaining} days`} />
          <div className="border-t border-white/10 pt-2 mt-2">
            <Row label="Projected end balance" value={f.projectedEndBalance} tone={status === 'positive' ? 'good' : 'bad'} bold />
          </div>
        </div>
      </div>

      {/* Tips */}
      {status === 'negative' && (
        <div className="card p-4" style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.25)' }}>
          <p className="text-sm font-semibold text-rose-300 mb-2">💡 Suggestions</p>
          <ul className="space-y-1.5 text-xs text-rose-200/80">
            <li>• Reduce daily spending to {formatINR((f.currentBalance + f.predictedIncome - f.committed - f.ccBills) / f.daysRemaining)} or less</li>
            <li>• Review {formatINR(f.committed)} in upcoming subscriptions</li>
            <li>• Consider postponing non-essential CC payments (only partial)</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, tone, prefix = '', sub, bold }) {
  const color = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-white'
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`${bold ? 'font-bold text-white' : 'text-white/70'}`}>{label}</p>
        {sub && <p className="text-[10px] text-white/40">{sub}</p>}
      </div>
      <p className={`${color} font-semibold ${bold ? 'text-base' : 'text-sm'} tabular-nums`}>
        {prefix}{formatINR(value)}
      </p>
    </div>
  )
}
