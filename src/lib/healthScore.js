/**
 * Financial Health Score calculator.
 * Accepts the full AppContext `state` object and returns a score object (0-100).
 */

// ---------- helpers ----------

function monthKey(offsetMonths = 0) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - offsetMonths)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthStats(transactions, key) {
  const txs = transactions.filter(t => t.date.startsWith(key))
  const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expenses }
}

// ---------- Pillar 1: Savings Rate ----------

function calcSavings(transactions) {
  // Average savings rate over last 3 completed months
  let totalIncome = 0
  let totalExpenses = 0
  for (let i = 1; i <= 3; i++) {
    const key = monthKey(i)
    const { income, expenses } = monthStats(transactions, key)
    totalIncome   += income
    totalExpenses += expenses
  }
  const rate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0
  const pct  = rate * 100

  let score
  let tip
  if (pct > 30) {
    score = 20
    tip   = `You're saving ${pct.toFixed(1)}% on average — excellent! Keep it up.`
  } else if (pct > 20) {
    score = 15
    tip   = `You're saving ${pct.toFixed(1)}%. Aim for 30%+ to reach the top score.`
  } else if (pct > 10) {
    score = 10
    tip   = `You're saving ${pct.toFixed(1)}%. Try cutting one expense category to push above 20%.`
  } else if (pct > 0) {
    score = 5
    tip   = `You're saving ${pct.toFixed(1)}%. Even small changes add up — target 10% first.`
  } else {
    score = 0
    tip   = `Your expenses exceeded income over the last 3 months. Review your biggest spend categories.`
  }
  return { score, tip, rate: pct }
}

// ---------- Pillar 2: Budget Adherence ----------

function calcBudget(state) {
  const { budgets, transactions } = state
  if (!budgets.length) {
    return { score: 0, tip: 'No budgets set. Create budgets to track and score your adherence.' }
  }

  const current = monthKey(0)
  let under = 0
  budgets.forEach(b => {
    const spent = transactions
      .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(current))
      .reduce((s, t) => s + t.amount, 0)
    if (spent <= b.monthlyLimit) under++
  })
  const ratio = under / budgets.length

  let score, tip
  if (ratio === 1) {
    score = 20
    tip   = 'All budgets are within limit — great discipline!'
  } else if (ratio >= 0.8) {
    score = 15
    tip   = `${under} of ${budgets.length} budgets are under limit. Fix the remaining ${budgets.length - under} to score higher.`
  } else if (ratio >= 0.6) {
    score = 10
    tip   = `${under} of ${budgets.length} budgets are on track. Review the over-budget categories.`
  } else if (ratio >= 0.4) {
    score = 5
    tip   = `Only ${under} of ${budgets.length} budgets are under limit. Consider tightening your spending.`
  } else {
    score = 0
    tip   = `Most budgets are exceeded this month. Revisit your limits or reduce discretionary spending.`
  }
  return { score, tip }
}

// ---------- Pillar 3: Emergency Fund ----------

function calcEmergency(state) {
  const { accounts, transactions } = state

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  // Average monthly expenses over last 3 months
  let totalExpenses = 0
  for (let i = 1; i <= 3; i++) {
    const { expenses } = monthStats(transactions, monthKey(i))
    totalExpenses += expenses
  }
  const avgMonthlyExpenses = totalExpenses / 3

  let score, tip
  if (avgMonthlyExpenses <= 0) {
    // No expense data — give benefit of the doubt if balance exists
    score = totalBalance > 0 ? 10 : 0
    tip   = 'Add expense transactions so we can calculate your emergency fund coverage.'
    return { score, tip }
  }

  const months = totalBalance / avgMonthlyExpenses

  if (months >= 6) {
    score = 20
    tip   = `Your balance covers ${months.toFixed(1)} months of expenses — excellent emergency fund!`
  } else if (months >= 3) {
    score = 15
    tip   = `You have ${months.toFixed(1)} months of expenses saved. Target 6 months for full score.`
  } else if (months >= 1) {
    score = 10
    tip   = `You have ${months.toFixed(1)} months of expenses covered. Build up to 3 months next.`
  } else if (totalBalance > 0) {
    score = 5
    tip   = `Your emergency fund covers less than a month. Prioritise building it up.`
  } else {
    score = 0
    tip   = `No balance detected. Start an emergency fund with even a small amount each month.`
  }
  return { score, tip }
}

// ---------- Pillar 4: Debt Ratio ----------

function calcDebt(state) {
  const { creditCards, accounts } = state

  const totalOutstanding = creditCards.reduce((s, c) => s + (c.outstanding || 0), 0)
  const totalBalance     = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  let score, tip
  if (totalBalance <= 0 && totalOutstanding <= 0) {
    score = 20
    tip   = 'No debt detected. Keep it that way!'
    return { score, tip }
  }

  const ratio = totalBalance > 0 ? totalOutstanding / totalBalance : totalOutstanding > 0 ? 1 : 0
  const pct   = ratio * 100

  if (pct === 0) {
    score = 20
    tip   = 'Zero credit card outstanding — perfect debt position!'
  } else if (pct < 10) {
    score = 15
    tip   = `Outstanding is ${pct.toFixed(1)}% of your total balance — very healthy. Pay off fully each month.`
  } else if (pct < 25) {
    score = 10
    tip   = `Outstanding is ${pct.toFixed(1)}% of your balance. Try to pay more than the minimum each month.`
  } else if (pct < 50) {
    score = 5
    tip   = `Outstanding is ${pct.toFixed(1)}% of your balance — getting high. Focus on reducing credit card debt.`
  } else {
    score = 0
    tip   = `Outstanding exceeds 50% of your balance. Make debt reduction your #1 priority.`
  }
  return { score, tip }
}

// ---------- Pillar 5: Investment Habit ----------

function calcInvestment(state) {
  const { mutualFunds, stocks, accounts } = state

  const mfValue     = mutualFunds.reduce((s, m) => s + (m.units || 0) * (m.currentNav || 0), 0)
  const stockValue  = stocks.reduce((s, st) => s + (st.shares || 0) * (st.currentPrice || 0), 0)
  const portfolioValue = mfValue + stockValue

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const netWorth     = totalBalance + portfolioValue

  let score, tip
  if (portfolioValue === 0) {
    score = 0
    tip   = 'No investments tracked. Start a SIP or buy stocks to improve this score.'
  } else if (netWorth > 0 && portfolioValue / netWorth > 0.10) {
    score = 20
    tip   = `Investments are ${((portfolioValue / netWorth) * 100).toFixed(1)}% of your net worth — great habit!`
  } else {
    score = 10
    tip   = `You have investments, but they're below 10% of your net worth. Consider increasing your SIP or equity allocation.`
  }
  return { score, tip }
}

// ---------- Grade / Color / Emoji ----------

function getGrade(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  if (score >= 20) return 'Needs Work'
  return 'Critical'
}

function getColor(score) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#06b6d4'
  if (score >= 40) return '#f59e0b'
  if (score >= 20) return '#f97316'
  return '#e11d48'
}

function getEmoji(score) {
  if (score >= 80) return '🏆'
  if (score >= 60) return '😊'
  if (score >= 40) return '😐'
  if (score >= 20) return '😟'
  return '🚨'
}

// ---------- Main export ----------

export function calculateHealthScore(state) {
  const savingsResult    = calcSavings(state.transactions)
  const budgetResult     = calcBudget(state)
  const emergencyResult  = calcEmergency(state)
  const debtResult       = calcDebt(state)
  const investmentResult = calcInvestment(state)

  const scores = {
    savings:    savingsResult.score,
    budget:     budgetResult.score,
    emergency:  emergencyResult.score,
    debt:       debtResult.score,
    investment: investmentResult.score,
  }

  const total = Object.values(scores).reduce((s, v) => s + v, 0)

  return {
    total,
    grade: getGrade(total),
    color: getColor(total),
    emoji: getEmoji(total),
    scores,
    pillars: [
      { name: 'Savings Rate',     score: scores.savings,    max: 20, icon: '💰', tip: savingsResult.tip    },
      { name: 'Budget Adherence', score: scores.budget,     max: 20, icon: '📋', tip: budgetResult.tip     },
      { name: 'Emergency Fund',   score: scores.emergency,  max: 20, icon: '🛡️', tip: emergencyResult.tip  },
      { name: 'Debt Management',  score: scores.debt,       max: 20, icon: '💳', tip: debtResult.tip       },
      { name: 'Investment Habit', score: scores.investment, max: 20, icon: '📈', tip: investmentResult.tip },
    ],
  }
}
