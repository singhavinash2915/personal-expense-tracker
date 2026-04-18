// Generates a "Wrapped"-style monthly digest
// Pulls highlights, milestones, fun stats, and a shareable summary.

import { formatINR } from './utils'

export function generateMonthlyDigest(state, monthKey) {
  const month = monthKey || new Date().toISOString().slice(0, 7)
  const txs = state.transactions.filter(t => t.date?.startsWith(month))
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0

  // Category breakdown
  const byCat = {}
  for (const t of txs.filter(t => t.type === 'expense')) {
    byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount
  }
  const topCats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cid, amt]) => {
      const c = state.categories.find(x => x.id === cid)
      return { name: c?.name || 'Other', icon: c?.icon || '💳', amount: amt, pct: expenses > 0 ? (amt / expenses * 100).toFixed(0) : 0 }
    })

  // Most expensive transaction
  const bigTx = txs.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0]
  const bigCat = bigTx ? state.categories.find(c => c.id === bigTx.categoryId) : null

  // Days tracked
  const uniqueDays = new Set(txs.map(t => t.date)).size
  const daysInMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate()

  // Compare with previous month
  const prevDate = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)) - 2, 1)
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevTxs = state.transactions.filter(t => t.date?.startsWith(prevKey))
  const prevExp = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const expDelta = prevExp > 0 ? ((expenses - prevExp) / prevExp * 100).toFixed(0) : 0

  // Daily averages
  const avgPerDay = uniqueDays > 0 ? expenses / uniqueDays : 0

  // Streaks & milestones
  const achievements = []
  if (savingsRate >= 30) achievements.push({ icon: '🏆', text: `You saved ${savingsRate.toFixed(0)}% — excellent!`, tone: 'gold' })
  else if (savingsRate >= 20) achievements.push({ icon: '⭐', text: `You saved ${savingsRate.toFixed(0)}% — strong month!`, tone: 'silver' })
  else if (savingsRate >= 10) achievements.push({ icon: '👍', text: `You saved ${savingsRate.toFixed(0)}% — decent start`, tone: 'bronze' })
  if (uniqueDays >= daysInMonth - 2) achievements.push({ icon: '🔥', text: `Logged ${uniqueDays}/${daysInMonth} days — perfect streak!`, tone: 'fire' })
  if (expDelta < -10 && prevExp > 0) achievements.push({ icon: '📉', text: `Spent ${Math.abs(expDelta)}% less than last month`, tone: 'gold' })
  if (txs.length >= 50) achievements.push({ icon: '📊', text: `${txs.length} transactions tracked`, tone: 'silver' })

  // Fun facts
  const funFacts = []
  if (bigTx) {
    funFacts.push({
      label: 'Biggest Spend',
      value: formatINR(bigTx.amount),
      sub: `${bigCat?.icon || '💳'} ${bigTx.description || bigCat?.name || 'Unknown'}`,
    })
  }
  if (avgPerDay > 0) {
    funFacts.push({
      label: 'Daily Average',
      value: formatINR(avgPerDay),
      sub: `across ${uniqueDays} active days`,
    })
  }
  if (topCats.length) {
    funFacts.push({
      label: 'Top Spending',
      value: topCats[0].name,
      sub: `${topCats[0].icon} ${formatINR(topCats[0].amount)} (${topCats[0].pct}%)`,
    })
  }

  // Monthname
  const monthName = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })

  return {
    month,
    monthName,
    income,
    expenses,
    balance,
    savingsRate,
    topCats,
    bigTx: bigTx ? { ...bigTx, cat: bigCat } : null,
    uniqueDays,
    daysInMonth,
    avgPerDay,
    expDelta: parseFloat(expDelta),
    txCount: txs.length,
    achievements,
    funFacts,
  }
}
