import { formatINR } from './utils'

// Returns a human-readable "time" label based on a JS Date or a plain string
function relativeTime(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Format a future due label given days until it's due (>=0)
function dueLabel(daysUntil) {
  if (daysUntil === 0) return 'Due today'
  if (daysUntil === 1) return 'Due tomorrow'
  return `Due in ${daysUntil} days`
}

// Current month/year string e.g. '2026-04'
function currentMonthYear() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Previous month/year string
function prevMonthYear() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function generateNotifications(state) {
  const notifications = []
  const now = new Date()
  const today = now.getDate()
  const thisMonth = currentMonthYear()
  const prevMonth = prevMonthYear()

  // ── helpers ──────────────────────────────────────────────────────────────

  // Find category name by id, searching state.categories
  const getCategoryName = (categoryId) => {
    const cat = (state.categories || []).find(c => c.id === categoryId)
    return cat ? cat.name : categoryId
  }

  // Compute budget usage inline (mirrors getBudgetUsage in AppContext)
  const budgetUsage = (state.budgets || []).map(b => {
    const spent = (state.transactions || [])
      .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(thisMonth))
      .reduce((s, t) => s + t.amount, 0)
    return { ...b, spent, percentage: b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0 }
  })

  // ── 1. Budget exceeded (>= 100%) ─────────────────────────────────────────
  budgetUsage
    .filter(b => b.percentage >= 100)
    .forEach(b => {
      const catName = getCategoryName(b.categoryId)
      notifications.push({
        id: `budget-exceeded-${b.id}-${thisMonth}`,
        type: 'warning',
        title: `${catName} budget exceeded`,
        message: `Spent ${formatINR(b.spent)} of ${formatINR(b.monthlyLimit)} limit`,
        icon: '🚨',
        color: 'text-rose-400',
        priority: 1,
        time: 'This month',
        read: false,
      })
    })

  // ── 2. Budget near limit (80%–99%) ───────────────────────────────────────
  budgetUsage
    .filter(b => b.percentage >= 80 && b.percentage < 100)
    .forEach(b => {
      const catName = getCategoryName(b.categoryId)
      const remaining = b.monthlyLimit - b.spent
      notifications.push({
        id: `budget-near-${b.id}-${thisMonth}`,
        type: 'warning',
        title: `${catName} budget almost full`,
        message: `Only ${formatINR(remaining)} remaining (${Math.round(b.percentage)}% used)`,
        icon: '⚠️',
        color: 'text-amber-400',
        priority: 2,
        time: 'This month',
        read: false,
      })
    })

  // ── 3. Subscription due in ≤ 3 days ──────────────────────────────────────
  const activeSubscriptions = (state.subscriptions || []).filter(s => s.status === 'active' || s.status === 'variable')
  activeSubscriptions.forEach(sub => {
    const billingDay = sub.billingDay
    if (!billingDay) return

    // Days until next billing within this month or wrapping to next
    let daysUntil
    if (billingDay >= today) {
      daysUntil = billingDay - today
    } else {
      // Already passed this month — calculate days to billing day next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, billingDay)
      daysUntil = Math.round((nextMonth - now) / (1000 * 60 * 60 * 24))
    }

    if (daysUntil <= 3) {
      const whenLabel =
        daysUntil === 0 ? 'today' :
        daysUntil === 1 ? 'tomorrow' :
        `in ${daysUntil} days`
      notifications.push({
        id: `sub-due-${sub.id}-${thisMonth}-${billingDay}`,
        type: 'reminder',
        title: `${sub.name} renews ${whenLabel}`,
        message: `${formatINR(sub.amount)} will be charged on day ${billingDay}`,
        icon: '🔔',
        color: 'text-cyan-400',
        priority: 2,
        time: dueLabel(daysUntil),
        read: false,
      })
    }
  })

  // ── 4. Unusual transaction (> 3× avg of last 7-day expenses) ─────────────
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

  const allExpenses = (state.transactions || []).filter(t => t.type === 'expense')
  const recentExpenses = allExpenses.filter(t => t.date >= sevenDaysAgoStr)

  if (allExpenses.length > 0) {
    const avgAmount = allExpenses.reduce((s, t) => s + t.amount, 0) / allExpenses.length
    const threshold = avgAmount * 3

    recentExpenses
      .filter(t => t.amount > threshold)
      .forEach(t => {
        notifications.push({
          id: `unusual-tx-${t.id}`,
          type: 'warning',
          title: 'Unusual spending detected',
          message: `${formatINR(t.amount)} on "${t.description}" — ${Math.round(t.amount / avgAmount)}× your average`,
          icon: '📊',
          color: 'text-rose-400',
          priority: 2,
          time: relativeTime(t.date),
          read: false,
        })
      })
  }

  // ── 5. No transactions in last 7 days ────────────────────────────────────
  const hasRecentTx = (state.transactions || []).some(t => t.date >= sevenDaysAgoStr)
  if (!hasRecentTx) {
    notifications.push({
      id: `no-tx-7d-${thisMonth}`,
      type: 'info',
      title: 'No recent transactions',
      message: 'No transactions logged in the last 7 days. Are your records up to date?',
      icon: '📋',
      color: 'text-cyan-400',
      priority: 4,
      time: '7 days',
      read: false,
    })
  }

  // ── 6. Monthly budget summary (1st–3rd of month) ──────────────────────────
  if (today >= 1 && today <= 3) {
    const prevTxs = (state.transactions || []).filter(t => t.date.startsWith(prevMonth))
    const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const saved = prevIncome - prevExpenses

    if (prevIncome > 0) {
      const savePct = Math.round((saved / prevIncome) * 100)
      const prevMonthName = new Date(prevMonth + '-01').toLocaleString('en-IN', { month: 'long' })
      notifications.push({
        id: `monthly-summary-${prevMonth}`,
        type: 'info',
        title: `${prevMonthName} recap`,
        message: `Spent ${formatINR(prevExpenses)}, saved ${formatINR(Math.max(0, saved))} (${Math.max(0, savePct)}% of income)`,
        icon: '📅',
        color: 'text-violet-400',
        priority: 3,
        time: 'Last month',
        read: false,
      })
    }
  }

  // ── 7. Positive savings this month (> 20% savings rate) ──────────────────
  const thisTxs = (state.transactions || []).filter(t => t.date.startsWith(thisMonth))
  const thisIncome = thisTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const thisExpenses = thisTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  if (thisIncome > 0) {
    const savingsRate = ((thisIncome - thisExpenses) / thisIncome) * 100
    if (savingsRate > 20) {
      notifications.push({
        id: `positive-savings-${thisMonth}`,
        type: 'success',
        title: 'Great savings this month!',
        message: `You're saving ${Math.round(savingsRate)}% of your income — keep it up!`,
        icon: '🎉',
        color: 'text-emerald-400',
        priority: 3,
        time: 'This month',
        read: false,
      })
    }
  }

  // ── Sort by priority, cap at 10 ───────────────────────────────────────────
  return notifications
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 10)
}
