import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  parseISO,
  subDays,
} from 'date-fns'
import { formatINR } from './utils'

/**
 * generateInsights(state) → array of insight objects (up to 6, sorted by priority)
 *
 * Each insight: { id, type, title, message, icon, color, priority }
 * type:  'warning' | 'success' | 'tip' | 'info'
 * color: Tailwind text-* class
 */
export function generateInsights(state) {
  const { transactions = [], budgets = [], accounts = [], subscriptions = [] } = state

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const sevenDaysAgo = subDays(now, 7)

  // Helper: filter transactions within a date interval
  const inInterval = (tx, start, end) => {
    try {
      const d = parseISO(tx.date)
      return isWithinInterval(d, { start, end })
    } catch {
      return false
    }
  }

  const thisMonthTx = transactions.filter(tx => inInterval(tx, thisMonthStart, thisMonthEnd))
  const lastMonthTx = transactions.filter(tx => inInterval(tx, lastMonthStart, lastMonthEnd))

  const thisMonthExpenses = thisMonthTx.filter(tx => tx.type === 'expense')
  const thisMonthIncome   = thisMonthTx.filter(tx => tx.type === 'income')
  const lastMonthExpenses = lastMonthTx.filter(tx => tx.type === 'expense')

  const sum = (arr) => arr.reduce((s, t) => s + (t.amount || 0), 0)

  const totalThisExpenses  = sum(thisMonthExpenses)
  const totalThisIncome    = sum(thisMonthIncome)
  const totalLastExpenses  = sum(lastMonthExpenses)

  const insights = []

  // ── 1. Top spending category this month ──────────────────────────────────
  if (thisMonthExpenses.length > 0) {
    const byCategory = {}
    thisMonthExpenses.forEach(tx => {
      byCategory[tx.categoryId] = (byCategory[tx.categoryId] || 0) + tx.amount
    })
    const topCatId = Object.keys(byCategory).reduce((a, b) => byCategory[a] > byCategory[b] ? a : b)
    const topAmount = byCategory[topCatId]
    const cat = (state.categories || []).find(c => c.id === topCatId)
    const catName = cat?.name || 'Unknown'
    const catIcon = cat?.icon || '📊'
    insights.push({
      id: 'top-category',
      type: 'info',
      title: 'Top Spending Category',
      message: `You spent ${formatINR(topAmount)} on ${catName} this month — your highest category`,
      icon: catIcon,
      color: 'text-cyan-400',
      priority: 3,
    })
  }

  // ── 2. Month-over-month change ───────────────────────────────────────────
  if (totalLastExpenses > 0 && totalThisExpenses > 0) {
    const pctChange = ((totalThisExpenses - totalLastExpenses) / totalLastExpenses) * 100
    const absPct = Math.abs(pctChange).toFixed(1)
    const isUp = pctChange > 0
    if (Math.abs(pctChange) >= 1) {
      insights.push({
        id: 'mom-change',
        type: isUp ? (pctChange > 10 ? 'warning' : 'info') : 'success',
        title: 'Spending Change',
        message: `Your spending is ${isUp ? 'up' : 'down'} ${absPct}% compared to last month`,
        icon: isUp ? '📈' : '📉',
        color: isUp ? (pctChange > 10 ? 'text-amber-400' : 'text-cyan-400') : 'text-emerald-400',
        priority: isUp && pctChange > 10 ? 2 : 4,
      })
    }
  }

  // ── 3. Budget alerts (>80% used) ─────────────────────────────────────────
  if (budgets.length > 0) {
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    budgets.forEach(budget => {
      const spent = transactions
        .filter(tx => tx.type === 'expense' && tx.categoryId === budget.categoryId && tx.date.startsWith(thisMonthKey))
        .reduce((s, tx) => s + tx.amount, 0)
      const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0
      if (pct >= 80) {
        const cat = (state.categories || []).find(c => c.id === budget.categoryId)
        const catName = cat?.name || 'Unknown'
        insights.push({
          id: `budget-alert-${budget.id}`,
          type: pct >= 100 ? 'warning' : 'warning',
          title: 'Budget Alert',
          message: `You've used ${Math.round(pct)}% of your ${catName} budget`,
          icon: '⚠️',
          color: pct >= 100 ? 'text-rose-400' : 'text-amber-400',
          priority: pct >= 100 ? 1 : 2,
        })
      }
    })
  }

  // ── 4. Savings streak (income > expenses 3 consecutive months) ───────────
  let streakCount = 0
  for (let i = 1; i <= 3; i++) {
    const mStart = startOfMonth(subMonths(now, i))
    const mEnd   = endOfMonth(subMonths(now, i))
    const mTx    = transactions.filter(tx => inInterval(tx, mStart, mEnd))
    const mInc   = sum(mTx.filter(tx => tx.type === 'income'))
    const mExp   = sum(mTx.filter(tx => tx.type === 'expense'))
    if (mInc > mExp) streakCount++
    else break
  }
  if (streakCount >= 3) {
    insights.push({
      id: 'savings-streak',
      type: 'success',
      title: 'Savings Streak',
      message: "Great job! You've saved money for 3 months in a row",
      icon: '🏆',
      color: 'text-emerald-400',
      priority: 3,
    })
  }

  // ── 5. Unusual large transaction (last 7 days, >3× average) ─────────────
  const recentTx = transactions.filter(tx => {
    try {
      return parseISO(tx.date) >= sevenDaysAgo
    } catch {
      return false
    }
  })
  if (transactions.length > 1) {
    const avgAmount = sum(transactions) / transactions.length
    const unusual = recentTx.find(tx => tx.type === 'expense' && tx.amount > 3 * avgAmount)
    if (unusual) {
      insights.push({
        id: 'unusual-transaction',
        type: 'warning',
        title: 'Unusual Transaction',
        message: `Unusual spend: ${formatINR(unusual.amount)} on ${unusual.description} — 3× your average`,
        icon: '🚨',
        color: 'text-rose-400',
        priority: 2,
      })
    }
  }

  // ── 6. No transactions in last 7 days ────────────────────────────────────
  if (recentTx.length === 0 && transactions.length > 0) {
    insights.push({
      id: 'no-recent-tx',
      type: 'tip',
      title: 'Records Up to Date?',
      message: 'No transactions recorded in 7 days. Are your records up to date?',
      icon: '📋',
      color: 'text-cyan-400',
      priority: 5,
    })
  }

  // ── 7. Subscription reminder ─────────────────────────────────────────────
  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'variable')
  if (activeSubs.length > 0) {
    const totalSubCost = activeSubs.reduce((s, sub) => {
      // Only count monthly subscriptions; skip yearly ones to keep monthly cost accurate
      if (sub.billingCycle === 'yearly') return s + Math.round(sub.amount / 12)
      return s + (sub.amount || 0)
    }, 0)
    insights.push({
      id: 'subscriptions',
      type: 'info',
      title: 'Active Subscriptions',
      message: `You have ${activeSubs.length} subscription${activeSubs.length > 1 ? 's' : ''} costing ${formatINR(totalSubCost)}/month`,
      icon: '🔄',
      color: 'text-cyan-400',
      priority: 5,
    })
  }

  // ── 8. Emergency fund check ───────────────────────────────────────────────
  const savingsAccounts = accounts.filter(a => a.type === 'savings' || a.type === 'cash')
  if (savingsAccounts.length > 0 && totalThisExpenses > 0) {
    const totalSavings = savingsAccounts.reduce((s, a) => s + (a.balance || 0), 0)
    const threeMonthsExpenses = totalThisExpenses * 3
    if (totalSavings < threeMonthsExpenses) {
      insights.push({
        id: 'emergency-fund',
        type: 'warning',
        title: 'Emergency Fund',
        message: `Your emergency fund may be low. Aim for 3 months of expenses (${formatINR(threeMonthsExpenses)})`,
        icon: '🛡️',
        color: 'text-amber-400',
        priority: 3,
      })
    }
  }

  // ── 9. Income received this month ────────────────────────────────────────
  if (totalThisIncome > 0) {
    insights.push({
      id: 'income-received',
      type: 'success',
      title: 'Income This Month',
      message: `You received ${formatINR(totalThisIncome)} in income this month`,
      icon: '💸',
      color: 'text-emerald-400',
      priority: 4,
    })
  }

  // ── 10. Positive month (savings rate > 20%) ───────────────────────────────
  if (totalThisIncome > 0) {
    const savingsRate = ((totalThisIncome - totalThisExpenses) / totalThisIncome) * 100
    if (savingsRate > 20) {
      insights.push({
        id: 'positive-month',
        type: 'success',
        title: 'Excellent Month!',
        message: `Excellent month! You saved ${savingsRate.toFixed(1)}% of your income`,
        icon: '✅',
        color: 'text-emerald-400',
        priority: 2,
      })
    }
  }

  // Sort by priority ascending, then return top 6
  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6)
}
