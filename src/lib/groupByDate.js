// Date-based transaction grouping.
//
// Two modes:
//   groupTransactionsByDate(txs)        — buckets: Today, Yesterday, This Week, This Month, Earlier
//   groupTransactionsByDay(txs, [opts]) — one bucket per day:
//                                          Today / Yesterday / "Wed, 16 Apr" / "12 Mar 2025"
//
// Both return: [{ key, label, items[], total, count }]

const MS_DAY = 24 * 60 * 60 * 1000

function startOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function diffDays(a, b) {
  return Math.round((startOf(a).getTime() - startOf(b).getTime()) / MS_DAY)
}

function dateLabel(d, today) {
  const days = diffDays(today, d)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  // Same year
  if (d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Per-day grouping (for Transactions page) ─────────────────────────
export function groupTransactionsByDay(transactions) {
  if (!transactions?.length) return []
  const today = startOf(new Date())
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const buckets = new Map()

  for (const tx of sorted) {
    const d = startOf(tx.date)
    const key = d.toISOString().slice(0, 10)
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        date: d,
        label: dateLabel(d, today),
        items: [],
        total: 0,
        income: 0,
        expense: 0,
        count: 0,
      })
    }
    const bucket = buckets.get(key)
    bucket.items.push(tx)
    bucket.count++
    if (tx.type === 'expense') { bucket.total -= tx.amount; bucket.expense += tx.amount }
    else if (tx.type === 'income') { bucket.total += tx.amount; bucket.income += tx.amount }
  }

  return Array.from(buckets.values())
}

// ── Coarse grouping (for Dashboard's Recent Activity preview) ────────
export function groupTransactionsByDate(transactions) {
  if (!transactions?.length) return []
  const today = startOf(new Date())
  const yest  = startOf(new Date(today.getTime() - MS_DAY))
  const dayOfWeek = today.getDay()
  const sinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = startOf(new Date(today.getTime() - sinceMon * MS_DAY))
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const buckets = {
    today:    { key: 'today',    label: 'Today',       items: [], total: 0, count: 0 },
    yest:     { key: 'yest',     label: 'Yesterday',   items: [], total: 0, count: 0 },
    week:     { key: 'week',     label: 'This Week',   items: [], total: 0, count: 0 },
    month:    { key: 'month',    label: 'This Month',  items: [], total: 0, count: 0 },
    earlier:  { key: 'earlier',  label: 'Earlier',     items: [], total: 0, count: 0 },
  }
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  for (const tx of sorted) {
    const d = startOf(tx.date)
    const t = d.getTime()
    let k
    if (t === today.getTime()) k = 'today'
    else if (t === yest.getTime()) k = 'yest'
    else if (t >= weekStart.getTime()) k = 'week'
    else if (t >= monthStart.getTime()) k = 'month'
    else k = 'earlier'

    buckets[k].items.push(tx)
    buckets[k].count++
    if (tx.type === 'expense') buckets[k].total -= tx.amount
    else if (tx.type === 'income') buckets[k].total += tx.amount
  }

  return Object.values(buckets).filter(b => b.items.length > 0)
}
