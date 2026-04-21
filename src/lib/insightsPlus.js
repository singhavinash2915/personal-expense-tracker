// Advanced insights engine
// Detects: anomalies, subscription creep, spending velocity, silent debits, weekend patterns

import { formatINR } from './utils'

const DAY = 24 * 60 * 60 * 1000

function toDate(s) { return s ? new Date(s) : new Date() }
function daysBetween(a, b) { return Math.floor((b - a) / DAY) }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

// ── 1. Anomaly: category spend this week vs 4-week avg ──
function detectAnomalies(state) {
  const out = []
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * DAY)
  const prev4WStart = new Date(now.getTime() - 35 * DAY)

  const expenses = state.transactions.filter(t => t.type === 'expense')
  const byCat = {}
  for (const t of expenses) {
    const d = toDate(t.date)
    if (d >= weekStart) {
      byCat[t.categoryId] ??= { thisWeek: 0, prior4W: 0 }
      byCat[t.categoryId].thisWeek += t.amount
    } else if (d >= prev4WStart) {
      byCat[t.categoryId] ??= { thisWeek: 0, prior4W: 0 }
      byCat[t.categoryId].prior4W += t.amount
    }
  }

  for (const [catId, { thisWeek, prior4W }] of Object.entries(byCat)) {
    if (thisWeek < 500) continue  // too small to matter
    const avgWeek = prior4W / 4
    if (avgWeek === 0) continue
    const ratio = thisWeek / avgWeek
    if (ratio >= 2) {
      const cat = state.categories.find(c => c.id === catId)
      out.push({
        id: `anom_${catId}`,
        type: 'warning',
        priority: 90,
        icon: '⚠️',
        tone: 'rose',
        title: `${cat?.name || 'Unknown'} spending spike`,
        message: `${formatINR(thisWeek)} this week vs ${formatINR(avgWeek)} avg (${ratio.toFixed(1)}x)`,
      })
    }
  }
  return out
}

// ── 2. Subscription creep: total subs growing over time ──
function detectSubscriptionCreep(state) {
  const out = []
  const subs = state.subscriptions || []
  if (!subs.length) return out
  const activeSubs = subs.filter(s => s.active !== false)
  const monthly = activeSubs.reduce((s, x) => s + (x.frequency === 'monthly' ? x.amount : (x.amount / 12)), 0)

  // Count how many started in the last 180 days
  const recent = activeSubs.filter(s => {
    if (!s.startDate) return false
    return daysBetween(toDate(s.startDate), new Date()) <= 180
  })
  if (recent.length >= 3) {
    const recentMonthly = recent.reduce((s, x) => s + (x.frequency === 'monthly' ? x.amount : (x.amount / 12)), 0)
    out.push({
      id: 'sub_creep',
      type: 'warning',
      priority: 80,
      icon: '🔁',
      tone: 'amber',
      title: 'Subscription creep detected',
      message: `${recent.length} new subs in 6 months = +${formatINR(recentMonthly)}/mo. Current total: ${formatINR(monthly)}/mo`,
    })
  }
  return out
}

// ── 3. Spending velocity: pace vs month elapsed ──
function detectVelocity(state) {
  const out = []
  const now = new Date()
  const month = monthKey(now)
  const daysElapsed = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthProgress = daysElapsed / daysInMonth

  const budgets = state.budgets || []
  for (const b of budgets) {
    const spent = state.transactions
      .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date?.startsWith(month))
      .reduce((s, t) => s + t.amount, 0)
    if (!b.monthlyLimit) continue
    const burnRate = spent / b.monthlyLimit
    const projected = spent / monthProgress
    if (burnRate > monthProgress + 0.15 && projected > b.monthlyLimit) {
      const cat = state.categories.find(c => c.id === b.categoryId)
      out.push({
        id: `velocity_${b.id}`,
        type: 'warning',
        priority: 85,
        icon: '🚨',
        tone: 'rose',
        title: `${cat?.name} budget on fire`,
        message: `At ${(burnRate * 100).toFixed(0)}% with ${daysInMonth - daysElapsed} days left. Projected: ${formatINR(projected)} (budget: ${formatINR(b.monthlyLimit)})`,
      })
    }
  }
  return out
}

// ── 4. Silent recurring debits ──
function detectSilentDebits(state) {
  const out = []
  // Find expenses with same amount + description in 3+ consecutive months
  const byKey = {}
  for (const t of state.transactions.filter(t => t.type === 'expense')) {
    const key = `${Math.round(t.amount)}|${(t.description || '').trim().toLowerCase().slice(0, 30)}`
    byKey[key] ??= []
    byKey[key].push(t)
  }
  const silent = []
  for (const [key, list] of Object.entries(byKey)) {
    if (list.length < 3) continue
    const months = new Set(list.map(t => t.date?.slice(0, 7)))
    if (months.size >= 3) silent.push({ list, months: months.size })
  }
  if (silent.length >= 2) {
    const totalMo = silent.reduce((s, x) => s + x.list[0].amount, 0)
    out.push({
      id: 'silent',
      type: 'tip',
      priority: 70,
      icon: '👻',
      tone: 'amber',
      title: `${silent.length} silent recurring debits`,
      message: `Costing ~${formatINR(totalMo)}/mo. Review if you still need these.`,
    })
  }
  return out
}

// ── 5. Weekend vs weekday ──
function detectWeekendSpend(state) {
  const out = []
  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * DAY)
  const expenses = state.transactions
    .filter(t => t.type === 'expense' && toDate(t.date) >= last30)

  let wkEnd = 0, wkDay = 0, wkEndDays = 0, wkDayDays = 0
  const seenDays = new Set()
  for (const t of expenses) {
    const d = toDate(t.date)
    const isWknd = d.getDay() === 0 || d.getDay() === 6
    if (isWknd) wkEnd += t.amount
    else wkDay += t.amount
    const dk = t.date
    if (!seenDays.has(dk)) {
      seenDays.add(dk)
      if (isWknd) wkEndDays++; else wkDayDays++
    }
  }
  if (wkEndDays === 0 || wkDayDays === 0) return out
  const avgWk = wkEnd / wkEndDays
  const avgDay = wkDay / wkDayDays
  if (avgWk > avgDay * 2 && avgWk > 1000) {
    out.push({
      id: 'weekend',
      type: 'info',
      priority: 60,
      icon: '🎉',
      tone: 'violet',
      title: 'Weekend warrior',
      message: `You spend ${(avgWk / avgDay).toFixed(1)}x more on weekends (${formatINR(avgWk)}/day vs ${formatINR(avgDay)}/day)`,
    })
  }
  return out
}

// ── 6. Positive reinforcement: under budget, better than last month ──
function detectPositives(state) {
  const out = []
  const now = new Date()
  const thisMonth = monthKey(now)
  const prev = new Date(now); prev.setMonth(prev.getMonth() - 1)
  const prevMonth = monthKey(prev)
  const thisExp = state.transactions.filter(t => t.type === 'expense' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0)
  const prevExp = state.transactions.filter(t => t.type === 'expense' && t.date?.startsWith(prevMonth)).reduce((s, t) => s + t.amount, 0)
  if (prevExp > 0 && thisExp < prevExp * 0.85) {
    const saved = prevExp - thisExp
    out.push({
      id: 'less_than_last',
      type: 'success',
      priority: 75,
      icon: '🎉',
      tone: 'emerald',
      title: 'Great savings this month!',
      message: `Spending ${formatINR(saved)} less than last month (−${((1 - thisExp / prevExp) * 100).toFixed(0)}%)`,
    })
  }
  return out
}

export function generateAdvancedInsights(state) {
  const all = [
    ...detectAnomalies(state),
    ...detectSubscriptionCreep(state),
    ...detectVelocity(state),
    ...detectSilentDebits(state),
    ...detectWeekendSpend(state),
    ...detectPositives(state),
  ]
  return all.sort((a, b) => (b.priority || 0) - (a.priority || 0))
}
