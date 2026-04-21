// Spend forecasting — project month-end balance

const DAY = 24 * 60 * 60 * 1000

export function forecastMonthEnd(state, monthKey) {
  const now = new Date()
  const targetMonth = monthKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [y, m] = targetMonth.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m, 0)
  const today = now.getTime() > monthEnd.getTime() ? monthEnd : now
  const todayDay = Math.min(today.getDate(), monthEnd.getDate())
  const totalDays = monthEnd.getDate()
  const daysRemaining = totalDays - todayDay

  const monthTxs = state.transactions.filter(t => t.date?.startsWith(targetMonth))

  // Already happened
  const actualIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const actualExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Committed (future recurring)
  const subs = state.subscriptions || []
  const upcomingSubs = subs
    .filter(s => s.active !== false)
    .map(s => ({
      amount: s.frequency === 'monthly' ? s.amount : (s.frequency === 'yearly' ? s.amount / 12 : s.amount),
      name: s.name,
    }))
  const remainingSubsDue = upcomingSubs.filter(s => {
    // naive: if we've already counted it this month, skip
    const hit = monthTxs.find(t => Math.abs(t.amount - s.amount) < 1 && (t.description || '').toLowerCase().includes((s.name || '').toLowerCase().slice(0, 8)))
    return !hit
  })
  const committed = remainingSubsDue.reduce((s, x) => s + x.amount, 0)

  // Credit card bills due
  const ccBills = (state.creditCards || []).reduce((s, cc) => {
    const dueThisMonth = cc.dueDate && new Date(cc.dueDate).getMonth() === m - 1 && new Date(cc.dueDate) > today
    return dueThisMonth ? s + (cc.outstandingBalance || 0) : s
  }, 0)

  // Predicted discretionary: avg daily spend over last 60 days × remaining days
  const last60Start = new Date(now.getTime() - 60 * DAY)
  const recentExp = state.transactions
    .filter(t => t.type === 'expense' && t.date && new Date(t.date) >= last60Start)
    .reduce((s, t) => s + t.amount, 0)
  const avgDaily = recentExp / 60
  const predictedDiscretionary = avgDaily * daysRemaining

  // Predicted income (salary assumption: if salary in state, project it)
  const incomeHistory = state.transactions
    .filter(t => t.type === 'income' && t.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const lastMonthIncome = incomeHistory
    .filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === (m - 2 + 12) % 12 && d.getFullYear() === (m === 1 ? y - 1 : y)
    })
    .reduce((s, t) => s + t.amount, 0)
  const predictedIncome = actualIncome < lastMonthIncome * 0.9 ? (lastMonthIncome - actualIncome) : 0

  // Current balance (from accounts)
  const currentBalance = (state.accounts || []).reduce((s, a) => s + (a.balance || 0), 0)

  // Project
  const projectedEndBalance = currentBalance + predictedIncome - committed - predictedDiscretionary - ccBills

  // Build daily timeline for chart (already happened + projected)
  const timeline = []
  let runningBalance = currentBalance - (actualIncome - actualExpense) // back to month-start
  let runningActual = runningBalance
  for (let day = 1; day <= totalDays; day++) {
    const dStr = `${targetMonth}-${String(day).padStart(2, '0')}`
    const dayTx = monthTxs.filter(t => t.date === dStr)
    const dayIn = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const dayOut = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    if (day <= todayDay) {
      runningActual += (dayIn - dayOut)
      timeline.push({ day, actual: runningActual, projected: null })
    } else {
      // projection: linear burn
      const lastActual = timeline[timeline.length - 1]?.actual ?? runningActual
      const daysFromNow = day - todayDay
      const projection = lastActual + (predictedIncome / daysRemaining) * daysFromNow - avgDaily * daysFromNow
      timeline.push({ day, actual: null, projected: projection })
    }
  }

  return {
    currentBalance,
    actualIncome,
    actualExpense,
    committed,
    predictedDiscretionary,
    predictedIncome,
    ccBills,
    projectedEndBalance,
    avgDaily,
    daysRemaining,
    timeline,
    targetMonth,
  }
}
