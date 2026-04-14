import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { useApp } from '../context/AppContext'
import { formatINR, getMonthYear } from '../lib/utils'
import { generateMonthlyReport } from '../lib/reportGenerator'

const COLORS = ['#7c3aed','#06b6d4','#f59e0b','#e11d48','#10b981','#f97316','#8b5cf6','#0ea5e9']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-4 py-3 text-sm">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatINR(p.value)}</p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { state, getCategory } = useApp()
  const [activeTab, setActiveTab] = useState('overview')

  // Month for PDF export & heatmap
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [heatmapMonth, setHeatmapMonth] = useState(currentMonth)

  // Build monthly data from transactions (last 6 months)
  const monthlyMap = {}
  state.transactions.forEach(t => {
    const m = getMonthYear(t.date)
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, income: 0, expense: 0 }
    if (t.type === 'income') monthlyMap[m].income += t.amount
    else if (t.type === 'expense') monthlyMap[m].expense += t.amount
    // transfers are excluded from income/expense charts
  })
  const monthlyData = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(d => ({
      ...d,
      month: new Date(d.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      savings: d.income - d.expense
    }))

  // Category breakdown
  const catSpend = {}
  state.transactions.filter(t => t.type === 'expense').forEach(t => {
    catSpend[t.categoryId] = (catSpend[t.categoryId] || 0) + t.amount
  })
  const pieData = Object.entries(catSpend)
    .map(([id, value]) => ({ name: getCategory(id)?.name || 'Other', value, icon: getCategory(id)?.icon || '📦' }))
    .sort((a, b) => b.value - a.value)

  const totalExpenses = pieData.reduce((s, d) => s + d.value, 0)

  // Day of week pattern
  const dayPattern = Array(7).fill(0).map((_, i) => ({
    day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i], amount: 0, count: 0
  }))
  state.transactions.filter(t => t.type === 'expense').forEach(t => {
    const d = new Date(t.date).getDay()
    dayPattern[d].amount += t.amount
    dayPattern[d].count++
  })

  // Top spending categories with % and bar
  const top5 = pieData.slice(0, 5)

  // Heatmap data
  const heatmapMonthLabel = new Date(heatmapMonth + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const heatmapDays = useMemo(() => {
    const [y, m] = heatmapMonth.split('-').map(Number)
    const firstDay = new Date(y, m - 1, 1)
    const daysInMonth = new Date(y, m, 0).getDate()

    // Calculate daily spending
    const dailySpend = {}
    state.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(heatmapMonth))
      .forEach(t => {
        const day = parseInt(t.date.split('-')[2])
        dailySpend[day] = (dailySpend[day] || 0) + t.amount
      })

    const maxSpend = Math.max(...Object.values(dailySpend), 1)

    // Offset for first day (Mon=0)
    let startOffset = (firstDay.getDay() + 6) % 7

    const days = []
    for (let i = 0; i < startOffset; i++) days.push({ empty: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const spent = dailySpend[d] || 0
      const intensity = spent / maxSpend
      let color = 'rgba(109,40,217,0.05)'
      if (spent > 0) {
        if (intensity > 0.75) color = '#7c3aed'
        else if (intensity > 0.5) color = 'rgba(124,58,237,0.65)'
        else if (intensity > 0.25) color = 'rgba(124,58,237,0.4)'
        else color = 'rgba(109,40,217,0.2)'
      }
      days.push({ day: d, date: `${heatmapMonth}-${String(d).padStart(2, '0')}`, spent, color, empty: false })
    }
    return days
  }, [heatmapMonth, state.transactions])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'categories', label: 'Categories' },
    { id: 'trends', label: 'Trends' },
  ]

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === t.id ? 'btn-primary' : 'btn-ghost'
            }`}>{t.label}</button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => generateMonthlyReport(state, heatmapMonth, state.userName)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl"
        >
          Export PDF
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Monthly Income vs Expense Bar Chart */}
          <div className="card p-4 md:p-6">
            <h3 className="text-base font-semibold text-white mb-1">Monthly Income vs Expenses</h3>
            <p className="text-xs mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Last 6 months comparison</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} barGap={4}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                <Legend wrapperStyle={{ paddingTop: 16, color: 'rgba(196,181,253,0.6)', fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#34d399" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="Expense" fill="#fb7185" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Savings Line */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-white mb-1">Monthly Savings Trend</h3>
            <p className="text-xs mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Net savings per month</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="savings" name="Savings" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Spending by Day of Week */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-white mb-1">Spending by Day of Week</h3>
            <p className="text-xs mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Average spend per day</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dayPattern}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                <Bar dataKey="amount" name="Amount" radius={[4,4,0,0]}>
                  {dayPattern.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Pie Chart */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-white mb-1">Expense Breakdown</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(196,181,253,0.5)' }}>All time by category</p>
            {pieData.length > 0 ? (
              <>
                <div className="flex justify-center mb-4">
                  <ResponsiveContainer width={220} height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: '#1e1b3a', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, color: '#e2d9f3' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {pieData.slice(0, 6).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{d.icon} {d.name}</span>
                      </span>
                      <span className="font-medium text-white">{formatINR(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center py-12 text-sm" style={{ color: 'rgba(196,181,253,0.4)' }}>No expense data</p>
            )}
          </div>

          {/* Category % Bars */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-white mb-1">Category Share</h3>
            <p className="text-xs mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>% of total spending</p>
            <div className="space-y-4">
              {top5.map((d, i) => {
                const pct = totalExpenses > 0 ? (d.value / totalExpenses * 100).toFixed(1) : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-white">{d.icon} {d.name}</span>
                      <span style={{ color: 'rgba(196,181,253,0.6)' }}>{formatINR(d.value)} · {pct}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-5">
          <div className="card p-6">
            <h3 className="text-base font-semibold text-white mb-1">Income vs Expense Trend</h3>
            <p className="text-xs mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Monthly flow over time</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 16, color: 'rgba(196,181,253,0.6)', fontSize: 12 }} />
                <Line type="monotone" dataKey="income"  name="Income"  stroke="#34d399" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#fb7185" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="savings" name="Savings" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {[
              { label: 'Avg Monthly Income',  value: formatINR(monthlyData.length ? monthlyData.reduce((s,d)=>s+d.income,0)/monthlyData.length : 0), color: 'text-emerald-400' },
              { label: 'Avg Monthly Expense', value: formatINR(monthlyData.length ? monthlyData.reduce((s,d)=>s+d.expense,0)/monthlyData.length : 0), color: 'text-rose-400' },
              { label: 'Avg Monthly Savings', value: formatINR(monthlyData.length ? monthlyData.reduce((s,d)=>s+d.savings,0)/monthlyData.length : 0), color: 'text-cyan-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-5">
                <p className="text-xs mb-1" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spending Heatmap */}
      <div className="card p-5">
        <h3 className="text-base font-semibold text-white mb-4">Spending Heatmap</h3>
        {/* Month navigation */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setHeatmapMonth(prev => { const d = new Date(prev + '-01'); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })}
            className="btn-ghost px-3 py-1 rounded-xl text-sm">&larr;</button>
          <span className="text-sm font-medium text-white">{heatmapMonthLabel}</span>
          <button onClick={() => setHeatmapMonth(next => { const d = new Date(next + '-01'); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })}
            className="btn-ghost px-3 py-1 rounded-xl text-sm">&rarr;</button>
        </div>
        {/* Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold pb-1" style={{ color: 'rgba(196,181,253,0.4)' }}>{d}</div>
          ))}
          {heatmapDays.map((day, i) => (
            <div key={i}
              className="aspect-square rounded-md flex items-center justify-center text-[10px] font-medium relative group cursor-default"
              style={{
                background: day.empty ? 'transparent' : day.color,
                color: day.empty ? 'transparent' : day.spent > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(196,181,253,0.3)',
              }}
              title={day.empty ? '' : `${day.date}: ${day.spent > 0 ? formatINR(day.spent) : 'No spending'}`}
            >
              {!day.empty && day.day}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px]" style={{ color: 'rgba(196,181,253,0.4)' }}>Less</span>
          {['rgba(109,40,217,0.08)', 'rgba(109,40,217,0.2)', 'rgba(124,58,237,0.4)', 'rgba(124,58,237,0.65)', '#7c3aed'].map((c, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
          ))}
          <span className="text-[10px]" style={{ color: 'rgba(196,181,253,0.4)' }}>More</span>
        </div>
      </div>
    </div>
  )
}
