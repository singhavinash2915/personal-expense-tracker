import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import { formatINR, formatDate, currentMonthYear } from '../lib/utils'
import StatCard from '../components/ui/StatCard'
import TransactionModal from '../components/ui/TransactionModal'

const COLORS = ['#7c3aed','#06b6d4','#f59e0b','#e11d48','#10b981','#f97316']
const MONTHS_LABELS = ['Oct','Nov','Dec','Jan','Feb','Mar']
const MOCK_MONTHLY = [
  { month:'Oct', income:85000, expense:42000 },
  { month:'Nov', income:92000, expense:48000 },
  { month:'Dec', income:88000, expense:55000 },
  { month:'Jan', income:110000, expense:45000 },
  { month:'Feb', income:125000, expense:52000 },
  { month:'Mar', income:142500, expense:57000 },
]

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

export default function Dashboard() {
  const { state, getCategory, getMonthlyStats, getBudgetUsage } = useApp()
  const [editTx, setEditTx] = useState(null)

  const month = currentMonthYear()
  const { income, expenses, balance } = getMonthlyStats(month)
  const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0
  const budgets = getBudgetUsage(month)

  // Category spending breakdown
  const categorySpend = {}
  state.transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(month))
    .forEach(t => { categorySpend[t.categoryId] = (categorySpend[t.categoryId] || 0) + t.amount })
  const pieData = Object.entries(categorySpend)
    .map(([id, value]) => ({ name: getCategory(id)?.name || 'Other', value }))
    .sort((a, b) => b.value - a.value).slice(0, 6)

  const recent = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard gradient="stat-1" icon="💰" label="Total Balance" value={formatINR(balance)} trend="+12.5% from last month" trendUp badge="This Month" />
        <StatCard gradient="stat-2" icon="📈" label="Total Income"  value={formatINR(income)}   trend="+8.2% from last month"  trendUp badge="This Month" />
        <StatCard gradient="stat-3" icon="📉" label="Total Expenses" value={formatINR(expenses)} trend="-3.1% from last month" trendUp={false} badge="This Month" />
        <StatCard gradient="stat-4" icon="🏆" label="Savings Rate"  value={`${savingsRate}%`}   trend="+5.4% from last month"  trendUp badge="This Month" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Bar Chart */}
        <div className="card col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-white">Monthly Overview</h3>
              <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Income vs Expenses (last 6 months)</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"/> Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"/> Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_MONTHLY} barGap={4}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 12 }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
              <Bar dataKey="income"  name="Income"  fill="#34d399" radius={[4,4,0,0]} />
              <Bar dataKey="expense" name="Expenses" fill="#fb7185" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-1">Spending by Category</h3>
          <p className="text-xs mb-4" style={{ color: 'rgba(196,181,253,0.5)' }}>This month</p>
          {pieData.length > 0 ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="relative w-36 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#1e1b3a', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, color: '#e2d9f3' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-white">{formatINR(expenses)}</span>
                    <span className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Total Spent</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                      {d.name}
                    </span>
                    <span className="font-medium">{formatINR(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-sm py-8" style={{ color: 'rgba(196,181,253,0.4)' }}>No expenses this month</p>
          )}
        </div>
      </div>

      {/* Transactions + Budgets */}
      <div className="grid grid-cols-3 gap-5">
        {/* Recent Transactions */}
        <div className="card col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">Recent Transactions</h3>
            <Link to="/transactions" className="text-xs text-cyan-400 hover:text-cyan-300 transition">View All →</Link>
          </div>
          <div className="space-y-1">
            {recent.map(tx => {
              const cat = getCategory(tx.categoryId)
              return (
                <div key={tx.id} className="tr-hover flex items-center justify-between p-3 rounded-xl cursor-pointer transition"
                  onClick={() => setEditTx(tx)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                    }`}>{cat?.icon || '💳'}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(196,181,253,0.5)' }}>
                        {formatDate(tx.date)} · {cat?.name}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ml-4 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Budget Progress */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">Budget Progress</h3>
            <Link to="/budgets" className="text-xs text-cyan-400 hover:text-cyan-300 transition">Manage →</Link>
          </div>
          <div className="space-y-4">
            {budgets.slice(0, 6).map(b => {
              const cat = getCategory(b.categoryId)
              const over = b.percentage >= 100
              const warn = b.percentage >= 85 && !over
              const barColor = over ? '#e11d48' : warn ? '#f59e0b' : '#7c3aed'
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-white">{cat?.icon} {cat?.name}</span>
                    <span style={{ color: 'rgba(196,181,253,0.6)' }}>{formatINR(b.spent)} / {formatINR(b.monthlyLimit)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(b.percentage, 100)}%`, background: barColor }} />
                  </div>
                  {over && <p className="text-xs text-rose-400 mt-0.5">Over budget!</p>}
                  {warn && <p className="text-xs text-amber-400 mt-0.5">Almost at limit!</p>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editTx && <TransactionModal existing={editTx} onClose={() => setEditTx(null)} />}
    </div>
  )
}
