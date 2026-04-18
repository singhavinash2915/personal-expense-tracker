import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import { formatINR, formatDate, currentMonthYear } from '../lib/utils'
import { privateValue } from '../lib/privacy'
import StatCard from '../components/ui/StatCard'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import TransactionModal from '../components/ui/TransactionModal'
import { calculateHealthScore } from '../lib/healthScore'
import { calculateNetWorth } from '../lib/netWorth'
import { generateInsights } from '../lib/insights'
import InsightCard from '../components/ui/InsightCard'

const COLORS = ['#6366f1','#06b6d4','#f59e0b','#e11d48','#10b981','#f97316']

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
  const privacyMode = state.privacyMode
  const [editTx, setEditTx] = useState(null)

  const month = currentMonthYear()
  const { income, expenses, balance } = getMonthlyStats(month)

  // Last month key
  const prevDate = new Date(); prevDate.setDate(1); prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const { income: prevIncome, expenses: prevExpenses, balance: prevBalance } = getMonthlyStats(prevMonth)

  function trendInfo(current, previous) {
    if (previous === 0 && current === 0) return { text: 'No data yet', up: null }
    if (previous === 0) return { text: 'New this month', up: true }
    const pct = ((current - previous) / Math.abs(previous) * 100).toFixed(1)
    return { text: `${pct > 0 ? '+' : ''}${pct}% from last month`, up: parseFloat(pct) >= 0 }
  }
  const balanceTrend  = trendInfo(balance, prevBalance)
  const incomeTrend   = trendInfo(income, prevIncome)
  const expenseTrend  = trendInfo(expenses, prevExpenses)
  const prevSavings   = prevIncome > 0 ? (prevIncome - prevExpenses) / prevIncome * 100 : 0
  const curSavings    = income > 0 ? (income - expenses) / income * 100 : 0
  const savingsTrend  = trendInfo(curSavings, prevSavings)

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
  const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0
  const budgets = getBudgetUsage(month)
  const healthScore = useMemo(() => calculateHealthScore(state), [state])
  const netWorthData = useMemo(() => calculateNetWorth(state), [state])

  // Category spending breakdown
  const categorySpend = {}
  state.transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(month))
    .forEach(t => { categorySpend[t.categoryId] = (categorySpend[t.categoryId] || 0) + t.amount })
  const pieData = Object.entries(categorySpend)
    .map(([id, value]) => ({ name: getCategory(id)?.name || 'Other', value }))
    .sort((a, b) => b.value - a.value).slice(0, 6)

  const recent = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6)
  const insights = useMemo(() => generateInsights(state), [state])

  return (
    <div className="space-y-3 md:space-y-6 overflow-x-hidden">
      {/* Combined Net Worth + Health Score Card — compact on mobile */}
      <div className="card p-3 md:p-5">
        {/* Top row: Net Worth + Health Score */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgba(196,181,253,0.5)' }}>Net Worth</p>
            <p className={`text-xl md:text-3xl font-bold ${netWorthData.netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {privacyMode ? '••••••' : <AnimatedNumber value={netWorthData.netWorth} formatter={formatINR} />}
            </p>
          </div>
          {/* Mini Health Score — tappable */}
          <Link to="/health" className="flex-shrink-0">
            <div className="relative w-11 h-11">
              <svg className="w-11 h-11" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke={healthScore.color} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 - (healthScore.total / 100) * 2 * Math.PI * 22}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-extrabold text-white">{healthScore.total}</span>
              </div>
            </div>
          </Link>
        </div>
        {/* Asset breakdown — 2x2 grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {[
            { label: 'Bank', value: netWorthData.breakdown.bankBalance, icon: '🏦', color: 'text-violet-300' },
            { label: 'Mutual Funds', value: netWorthData.breakdown.mfValue, icon: '📊', color: 'text-cyan-400' },
            { label: 'Stocks', value: netWorthData.breakdown.stockValue, icon: '📈', color: 'text-emerald-400' },
            { label: 'CC Debt', value: -netWorthData.breakdown.ccDebt, icon: '💳', color: 'text-rose-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-sm md:text-lg">{icon}</span>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] truncate" style={{ color: 'rgba(196,181,253,0.4)' }}>{label}</p>
                <p className={`text-xs md:text-sm font-semibold ${color}`}>
                  {privacyMode ? '••••' : formatINR(Math.abs(value))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Summary — Premium Wallet Card */}
      <div className="wallet-card rounded-2xl overflow-hidden relative">
        {/* Decorative glow circles */}
        <div className="wallet-glow-1 absolute -top-10 -right-10 w-40 h-40 rounded-full" />
        <div className="wallet-glow-2 absolute -bottom-8 -left-8 w-32 h-32 rounded-full" />

        {/* Balance Hero */}
        <div className="px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 text-center relative z-10">
          <div className="absolute top-3 right-3 md:top-4 md:right-5">
            <span className="text-[10px] md:text-xs font-medium wallet-badge px-2.5 py-0.5 rounded-full">This Month</span>
          </div>
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.15em] wallet-label mb-1">Total Balance</p>
          <p className="text-[26px] md:text-4xl font-extrabold wallet-value mb-1.5">
            {privacyMode ? '••••••' : <AnimatedNumber value={balance} formatter={formatINR} />}
          </p>
          <p className={`text-[11px] md:text-sm inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${balanceTrend.up ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {balanceTrend.up
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
              }
            </svg>
            {balanceTrend.text}
          </p>
        </div>

        {/* Income & Expense Row */}
        <div className="grid grid-cols-2 gap-2 mx-3 mb-2.5 md:mx-5 md:mb-4 relative z-10">
          {/* Income */}
          <div className="wallet-income rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m-7 7l7-7 7 7"/>
                </svg>
              </div>
              <span className="text-[11px] md:text-xs font-semibold wallet-income-label">Income</span>
            </div>
            <p className="text-[17px] md:text-xl font-bold wallet-value truncate">
              {privacyMode ? '••••••' : <AnimatedNumber value={income} formatter={formatINR} />}
            </p>
            <p className={`text-[10px] md:text-xs mt-1 font-medium ${incomeTrend.up ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
              {incomeTrend.text}
            </p>
          </div>
          {/* Expense */}
          <div className="wallet-expense rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e11d48, #8b5cf6)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m7-7l-7 7-7-7"/>
                </svg>
              </div>
              <span className="text-[11px] md:text-xs font-semibold wallet-expense-label">Expenses</span>
            </div>
            <p className="text-[17px] md:text-xl font-bold wallet-value truncate">
              {privacyMode ? '••••••' : <AnimatedNumber value={expenses} formatter={formatINR} />}
            </p>
            <p className={`text-[10px] md:text-xs mt-1 font-medium ${!expenseTrend.up ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
              {expenseTrend.text}
            </p>
          </div>
        </div>

        {/* Savings Rate Bar */}
        <div className="wallet-savings mx-3 mb-3 md:mx-5 md:mb-4 rounded-xl p-3 md:p-4 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🏆</span>
              <span className="text-[11px] md:text-xs font-semibold wallet-label">Savings Rate</span>
            </div>
            <span className="text-sm md:text-base font-extrabold" style={{ color: parseFloat(savingsRate) >= 20 ? '#34d399' : parseFloat(savingsRate) >= 10 ? '#fbbf24' : '#f87171' }}>
              {privacyMode ? '••••' : <><AnimatedNumber value={parseFloat(savingsRate)} />%</>}
            </span>
          </div>
          <div className="wallet-bar-track h-2.5 md:h-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(Math.max(parseFloat(savingsRate) || 0, 0), 100)}%`,
                background: parseFloat(savingsRate) >= 20 ? 'linear-gradient(90deg, #059669, #10b981, #34d399)' : parseFloat(savingsRate) >= 10 ? 'linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #be123c, #e11d48, #f87171)',
                boxShadow: parseFloat(savingsRate) >= 20 ? '0 0 12px rgba(52,211,153,0.4)' : parseFloat(savingsRate) >= 10 ? '0 0 12px rgba(251,191,36,0.4)' : '0 0 12px rgba(248,113,113,0.4)'
              }}
            />
          </div>
          <p className={`text-[10px] md:text-xs mt-1.5 font-medium ${savingsTrend.up ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
            {savingsTrend.text}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        {/* Bar Chart */}
        <div className="card md:col-span-2 p-3 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-5">
            <div>
              <h3 className="text-sm md:text-base font-semibold text-white">Monthly Overview</h3>
              <p className="text-[10px] md:text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>Last 6 months</p>
            </div>
            <div className="flex gap-3 text-[10px] md:text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/> Income</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block"/> Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(196,181,253,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={35} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
              <Area type="monotone" dataKey="expense" stroke="#e11d48" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card p-3 md:p-6">
          <h3 className="text-sm md:text-base font-semibold text-white mb-0.5">Spending by Category</h3>
          <p className="text-[10px] md:text-xs mb-3 md:mb-4" style={{ color: 'rgba(196,181,253,0.5)' }}>This month</p>
          {pieData.length > 0 ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="relative w-36 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#161b2d', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-white">{privateValue(expenses, privacyMode, formatINR)}</span>
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
                    <span className="font-medium">{privateValue(d.value, privacyMode, formatINR)}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        {/* Recent Transactions */}
        <div className="card md:col-span-2 p-3 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-5">
            <h3 className="text-sm md:text-base font-semibold text-white">Recent Transactions</h3>
            <Link to="/transactions" className="text-xs text-cyan-400 hover:text-cyan-300 transition">View All →</Link>
          </div>
          <div className="space-y-1">
            {recent.map(tx => {
              const cat = getCategory(tx.categoryId)
              return (
                <div key={tx.id} className="tr-hover flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition active:bg-white/5"
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
                    {privacyMode ? '••••••' : `${tx.type === 'income' ? '+' : '-'}${formatINR(tx.amount)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Budget Progress */}
        <div className="card p-3 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-5">
            <h3 className="text-sm md:text-base font-semibold text-white">Budget Progress</h3>
            <Link to="/budgets" className="text-xs text-cyan-400 hover:text-cyan-300 transition">Manage →</Link>
          </div>
          <div className="space-y-3 md:space-y-4">
            {budgets.slice(0, 6).map(b => {
              const cat = getCategory(b.categoryId)
              const over = b.percentage >= 100
              const warn = b.percentage >= 85 && !over
              const barColor = over ? '#e11d48' : warn ? '#f59e0b' : '#6366f1'
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-[11px] md:text-xs mb-1.5 gap-1">
                    <span className="font-medium text-white truncate">{cat?.icon} {cat?.name}</span>
                    <span className="flex-shrink-0" style={{ color: 'rgba(196,181,253,0.6)' }}>{privateValue(b.spent, privacyMode, formatINR)} / {privateValue(b.monthlyLimit, privacyMode, formatINR)}</span>
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

      {/* Insights */}
      <div className="card p-3 md:p-5">
        <h3 className="text-sm md:text-base font-semibold text-white mb-3 md:mb-4">💡 Insights</h3>
        {insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.slice(0, 4).map(i => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(196,181,253,0.4)' }}>
            No insights available yet. Add more transactions to get personalized tips.
          </p>
        )}
      </div>

      {editTx && <TransactionModal existing={editTx} onClose={() => setEditTx(null)} />}
    </div>
  )
}
