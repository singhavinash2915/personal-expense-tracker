// Gamification engine — streaks, XP, levels, badges

const DAY = 24 * 60 * 60 * 1000

export const LEVELS = [
  { n: 1, min: 0,     name: 'Newbie',        color: '#94a3b8' },
  { n: 2, min: 100,   name: 'Tracker',       color: '#06b6d4' },
  { n: 3, min: 300,   name: 'Saver',         color: '#10b981' },
  { n: 4, min: 700,   name: 'Silver Saver',  color: '#cbd5e1' },
  { n: 5, min: 1500,  name: 'Gold Saver',    color: '#fbbf24' },
  { n: 6, min: 3000,  name: 'Diamond Saver', color: '#a78bfa' },
  { n: 7, min: 6000,  name: 'Platinum',      color: '#f472b6' },
  { n: 8, min: 12000, name: 'Legendary',     color: '#fb7185' },
]

export const BADGES = [
  { id: 'first_tx',    icon: '🎯', name: 'First Step',      desc: 'Log your first transaction',                xp: 50 },
  { id: 'streak_7',    icon: '🔥', name: 'Week Warrior',    desc: '7-day logging streak',                      xp: 150 },
  { id: 'streak_30',   icon: '⚡',  name: 'Month Master',    desc: '30-day logging streak',                     xp: 500 },
  { id: 'streak_100',  icon: '💎', name: 'Streak Legend',   desc: '100-day logging streak',                    xp: 2000 },
  { id: 'budget_win',  icon: '🎯', name: 'On Target',       desc: 'Stay under budget in all categories',       xp: 300 },
  { id: 'save_20',     icon: '🏆', name: 'Smart Saver',     desc: 'Save 20% of income in a month',             xp: 200 },
  { id: 'save_40',     icon: '👑', name: 'Super Saver',     desc: 'Save 40% of income in a month',             xp: 500 },
  { id: 'no_spend',    icon: '🧘', name: 'Zen Day',         desc: 'Complete a day with zero spending',         xp: 100 },
  { id: 'debt_slayer', icon: '⚔️',  name: 'Debt Slayer',     desc: 'Pay off a credit card fully',               xp: 400 },
  { id: 'goal_hit',    icon: '🎉', name: 'Goal Crusher',    desc: 'Complete a savings goal',                   xp: 300 },
  { id: 'voice_user',  icon: '🎤', name: 'Voice Pioneer',   desc: 'Add a transaction with voice',              xp: 50 },
  { id: 'analyzer',    icon: '📊', name: 'Analyzer',        desc: 'View insights 10 times',                    xp: 100 },
  { id: 'net_positive',icon: '📈', name: 'Net Positive',    desc: 'Maintain positive net worth for 90 days',   xp: 500 },
  { id: 'early_bird',  icon: '🌅', name: 'Early Bird',      desc: 'Log a transaction before 9 AM',             xp: 50 },
  { id: 'week_clean',  icon: '✨', name: 'Clean Week',      desc: 'Under-budget full week',                    xp: 250 },
]

export function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) {
      const next = LEVELS[i + 1]
      const progress = next ? ((xp - LEVELS[i].min) / (next.min - LEVELS[i].min)) * 100 : 100
      return { ...LEVELS[i], progress, nextMin: next?.min ?? null }
    }
  }
  return LEVELS[0]
}

export function calculateStreak(transactions) {
  if (!transactions || transactions.length === 0) return { current: 0, longest: 0 }
  const days = new Set()
  for (const t of transactions) {
    if (t.date) days.add(t.date.slice(0, 10))
  }

  const sortedDays = [...days].sort().reverse()
  // Current streak from today
  let current = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 400; i++) {
    const k = cursor.toISOString().slice(0, 10)
    if (days.has(k)) current++
    else if (i > 0) break  // allow missing today but not more
    cursor.setTime(cursor.getTime() - DAY)
  }

  // Longest streak
  const sortedAsc = [...days].sort()
  let longest = 0, run = 0
  let prev = null
  for (const d of sortedAsc) {
    if (prev && daysBetween(prev, d) === 1) run++
    else run = 1
    longest = Math.max(longest, run)
    prev = d
  }

  return { current, longest }
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / DAY)
}

export function evaluateBadges(state) {
  const { transactions = [], budgets = [], creditCards = [], savingsGoals = [] } = state
  const unlocked = []

  // first_tx
  if (transactions.length > 0) unlocked.push('first_tx')

  // streaks
  const { current } = calculateStreak(transactions)
  if (current >= 7) unlocked.push('streak_7')
  if (current >= 30) unlocked.push('streak_30')
  if (current >= 100) unlocked.push('streak_100')

  // savings rate (last complete month)
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const m = now.getMonth() - 1
  const prevDate = new Date(now.getFullYear(), m, 1)
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  for (const mk of [thisMonthKey, prevMonthKey]) {
    const mtx = transactions.filter(t => t.date?.startsWith(mk))
    const inc = mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const exp = mtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    if (inc > 0) {
      const rate = (inc - exp) / inc * 100
      if (rate >= 20) unlocked.push('save_20')
      if (rate >= 40) unlocked.push('save_40')
    }
  }

  // budget_win: all budgets under limit this month
  if (budgets.length > 0) {
    const allUnder = budgets.every(b => {
      const spent = transactions.filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date?.startsWith(thisMonthKey))
        .reduce((s, t) => s + t.amount, 0)
      return spent <= (b.monthlyLimit || Infinity)
    })
    if (allUnder) unlocked.push('budget_win')
  }

  // debt_slayer
  if (creditCards.some(cc => (cc.outstandingBalance || 0) === 0 && (cc.lastBillAmount || 0) > 0)) {
    unlocked.push('debt_slayer')
  }

  // goal_hit
  if (savingsGoals.some(g => (g.savedAmount || 0) >= (g.targetAmount || Infinity))) {
    unlocked.push('goal_hit')
  }

  // voice_user
  if (transactions.some(t => t.source === 'voice')) unlocked.push('voice_user')

  // early_bird
  if (transactions.some(t => {
    if (!t.createdAt) return false
    const d = new Date(t.createdAt)
    return d.getHours() < 9
  })) unlocked.push('early_bird')

  // no_spend (a day with no expenses in last 30 days but at least one "savings" or income)
  const days30 = new Set()
  for (const t of transactions.filter(t => t.date && new Date(t.date) > new Date(Date.now() - 30 * DAY))) {
    days30.add(t.date)
  }
  // If there are 30 days & some have no expense but have income, consider it
  for (const d of days30) {
    const dayTx = transactions.filter(t => t.date === d)
    const hasExp = dayTx.some(t => t.type === 'expense')
    const hasInc = dayTx.some(t => t.type === 'income')
    if (!hasExp && hasInc) { unlocked.push('no_spend'); break }
  }

  return [...new Set(unlocked)]
}

export function calculateXP(state, unlockedBadges = []) {
  let xp = 0
  // XP from transactions
  xp += (state.transactions?.length || 0) * 5
  // XP from badges
  for (const bId of unlockedBadges) {
    const b = BADGES.find(x => x.id === bId)
    if (b) xp += b.xp
  }
  // Bonus for streaks
  const { current } = calculateStreak(state.transactions || [])
  xp += current * 10
  return xp
}
