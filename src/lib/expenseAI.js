import { formatINR } from './utils'

/**
 * Linear regression month-end forecast.
 * Takes this month's expense transactions, fits a line to cumulative daily spend,
 * projects to month end.
 * Returns: { forecast, dailyAvg, daysLeft, trend }
 *   forecast: predicted total expenses by month end (number)
 *   dailyAvg: average daily spend so far
 *   daysLeft: days remaining in month
 *   trend: 'up' | 'down' | 'steady'
 */
export function forecastMonthEnd(transactions, monthYear) {
  const expenses = transactions.filter(t => t.type === 'expense')
  if (expenses.length === 0) {
    return { forecast: 0, dailyAvg: 0, daysLeft: 0, trend: 'steady' }
  }

  // Parse monthYear like '2026-03'
  const [year, month] = monthYear.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const dayToday = isCurrentMonth ? today.getDate() : daysInMonth

  // Build cumulative daily spend map
  const dailyTotals = {}
  for (const t of expenses) {
    const day = parseInt(t.date.split('-')[2], 10)
    dailyTotals[day] = (dailyTotals[day] || 0) + t.amount
  }

  // Build array of (day, cumulativeSpend) points
  const points = []
  let cumulative = 0
  for (let d = 1; d <= dayToday; d++) {
    cumulative += dailyTotals[d] || 0
    if (dailyTotals[d] !== undefined || points.length > 0) {
      points.push({ x: d, y: cumulative })
    }
  }

  if (points.length < 2) {
    const totalSpent = cumulative
    const dailyAvg = dayToday > 0 ? totalSpent / dayToday : 0
    const daysLeft = daysInMonth - dayToday
    return {
      forecast: totalSpent + dailyAvg * daysLeft,
      dailyAvg,
      daysLeft,
      trend: 'steady',
    }
  }

  // Linear regression: y = mx + b
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumXX - sumX * sumX
  const m = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
  const b = (sumY - m * sumX) / n

  const forecast = Math.max(0, m * daysInMonth + b)
  const dailyAvg = cumulative / dayToday
  const daysLeft = daysInMonth - dayToday

  // Trend: compare slope to baseline daily average
  const expectedSlope = dailyAvg
  let trend = 'steady'
  if (m > expectedSlope * 1.1) trend = 'up'
  else if (m < expectedSlope * 0.9) trend = 'down'

  return { forecast, dailyAvg, daysLeft, trend }
}

/**
 * Z-score anomaly detection on expense transactions.
 * Computes mean and stddev of all expense amounts.
 * Returns top anomalies (z-score > 2.0) sorted by severity.
 * Each: { transaction, zScore, message }
 */
export function detectAnomalies(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense')
  if (expenses.length < 3) return []

  const amounts = expenses.map(t => t.amount)
  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length
  const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length
  const stddev = Math.sqrt(variance)

  if (stddev === 0) return []

  const anomalies = expenses
    .map(t => {
      const zScore = (t.amount - mean) / stddev
      return { transaction: t, zScore, message: '' }
    })
    .filter(a => a.zScore > 2.0)
    .sort((a, b) => b.zScore - a.zScore)
    .map(a => ({
      ...a,
      message: `${formatINR(a.transaction.amount)} is ${a.zScore.toFixed(1)}σ above your average spend of ${formatINR(mean)}`,
    }))

  return anomalies
}

/**
 * Day-of-week spending pattern.
 * Returns array of 7 items (Mon-Sun):
 * [{ day: 'Mon', avg: 1200, total: 14400, count: 12 }, ...]
 */
export function getDayOfWeekPattern(transactions) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const buckets = dayNames.map(day => ({ day, total: 0, count: 0 }))

  const expenses = transactions.filter(t => t.type === 'expense')
  for (const t of expenses) {
    const d = new Date(t.date)
    // getDay(): 0=Sun, 1=Mon … 6=Sat → remap to Mon=0 … Sun=6
    const dow = (d.getDay() + 6) % 7
    buckets[dow].total += t.amount
    buckets[dow].count += 1
  }

  return buckets.map(b => ({
    ...b,
    avg: b.count > 0 ? Math.round(b.total / b.count) : 0,
  }))
}

/**
 * Detect possible untracked recurring payments.
 * Find expense transactions that appear monthly (same amount ±5%, day ±3).
 * Returns array of { description, amount, dayOfMonth, occurrences }
 */
export function detectRecurring(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense')

  // Group by description (case-insensitive)
  const groups = {}
  for (const t of expenses) {
    const key = t.description.toLowerCase().trim()
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }

  const recurring = []

  for (const [, txs] of Object.entries(groups)) {
    if (txs.length < 2) continue

    // Sort by date
    const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date))

    // Check if amounts are within ±5% of the median
    const amounts = sorted.map(t => t.amount)
    const medianAmount = amounts.slice().sort((a, b) => a - b)[Math.floor(amounts.length / 2)]
    const allSimilarAmount = amounts.every(a => Math.abs(a - medianAmount) / medianAmount <= 0.05)
    if (!allSimilarAmount) continue

    // Check if day of month is consistent within ±3
    const days = sorted.map(t => parseInt(t.date.split('-')[2], 10))
    const medianDay = days.slice().sort((a, b) => a - b)[Math.floor(days.length / 2)]
    const allSimilarDay = days.every(d => Math.abs(d - medianDay) <= 3)
    if (!allSimilarDay) continue

    // Check months are spread across different months
    const months = new Set(sorted.map(t => t.date.slice(0, 7)))
    if (months.size < 2) continue

    recurring.push({
      description: sorted[0].description,
      amount: medianAmount,
      dayOfMonth: medianDay,
      occurrences: sorted.length,
    })
  }

  return recurring.sort((a, b) => b.occurrences - a.occurrences)
}

/**
 * Category drift: MoM change per category vs 3-month average.
 * Returns top 5 categories with biggest absolute change.
 * Each: { categoryId, thisMonth, avgLast3, changePct }
 */
export function getCategoryDrift(transactions, categories) {
  const expenses = transactions.filter(t => t.type === 'expense')

  // Determine current month
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Build per-month per-category totals
  const monthCatTotals = {}
  for (const t of expenses) {
    const month = t.date.slice(0, 7)
    if (!monthCatTotals[month]) monthCatTotals[month] = {}
    monthCatTotals[month][t.categoryId] = (monthCatTotals[month][t.categoryId] || 0) + t.amount
  }

  // Get previous 3 months
  const prev3 = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    prev3.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const catIds = [...new Set(expenses.map(t => t.categoryId))]
  const drifts = []

  for (const catId of catIds) {
    const thisMonth = (monthCatTotals[currentMonthStr] || {})[catId] || 0
    const last3Values = prev3.map(m => (monthCatTotals[m] || {})[catId] || 0)
    const last3WithData = last3Values.filter(v => v > 0)
    if (last3WithData.length === 0) continue

    const avgLast3 = last3Values.reduce((s, v) => s + v, 0) / 3
    if (avgLast3 === 0) continue

    const changePct = ((thisMonth - avgLast3) / avgLast3) * 100
    drifts.push({ categoryId: catId, thisMonth, avgLast3, changePct })
  }

  return drifts
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 5)
}
