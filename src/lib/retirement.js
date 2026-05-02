// Retirement / long-term savings accounts: PPF, NPS, EPF, Sukanya, etc.

export const RETIREMENT_TYPES = [
  { id: 'ppf',     icon: '🏛️',  label: 'PPF',     defaultRate: 7.1,  taxSection: '80C',         categoryId: 'tr3',  annualLimit: 150000 },
  { id: 'epf',     icon: '🏛️',  label: 'EPF',     defaultRate: 8.25, taxSection: '80C',         categoryId: 'tr18', annualLimit: null   },
  { id: 'nps',     icon: '🎯',  label: 'NPS',     defaultRate: 10.0, taxSection: '80CCD(1B)',   categoryId: 'tr5',  annualLimit: null   },
  { id: 'sukanya', icon: '👧',  label: 'Sukanya', defaultRate: 8.2,  taxSection: '80C',         categoryId: 'tr19', annualLimit: 150000 },
  { id: 'other',   icon: '🪙',  label: 'Other',   defaultRate: 7.0,  taxSection: null,          categoryId: 'tr14', annualLimit: null   },
]

export function getRetirementType(typeId) {
  return RETIREMENT_TYPES.find(t => t.id === typeId) || RETIREMENT_TYPES[4]
}

// ── YTD contributions for an account ──────────────────────────────────────
// Indian Financial Year: April 1 – March 31
function fyStart(date = new Date()) {
  const y = date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear()
  return new Date(y, 3, 1) // April 1
}

export function ytdContributed(account, transactions) {
  const start = fyStart()
  const startISO = start.toISOString().slice(0, 10)
  return transactions
    .filter(t => t.linkedRetirementId === account.id && t.type === 'transfer' && t.date >= startISO)
    .reduce((s, t) => s + (t.amount || 0), 0)
}

// ── Months remaining until maturity ───────────────────────────────────────
export function monthsToMaturity(account) {
  if (!account.maturityDate) return null
  const m = new Date(account.maturityDate)
  const now = new Date()
  return Math.max(0, (m.getFullYear() - now.getFullYear()) * 12 + (m.getMonth() - now.getMonth()))
}

// ── Project corpus at maturity (compound monthly) ─────────────────────────
export function projectMaturity(account) {
  const months = monthsToMaturity(account)
  if (months == null) return null
  const m = account.monthlyContribution || 0
  const employer = account.employerContribution || 0
  const r = (account.annualRate || 0) / 12 / 100
  const totalMonthly = m + employer
  const balance = account.currentBalance || 0
  // FV = P*(1+r)^n + PMT*((1+r)^n - 1)/r
  if (r === 0) return balance + totalMonthly * months
  const factor = Math.pow(1 + r, months)
  return balance * factor + totalMonthly * ((factor - 1) / r)
}

// ── Should auto-contribute today? (for accounts with autoContribute=true) ──
export function shouldAutoContribute(account, today = new Date()) {
  if (!account.autoContribute || !account.active) return false
  if (!account.dueDay || !account.fromAccountId || !account.monthlyContribution) return false

  const day = today.getDate()
  if (day < account.dueDay) return false

  // Has it already been contributed this calendar month?
  const lastDate = account.lastContributionDate ? new Date(account.lastContributionDate) : null
  if (lastDate &&
      lastDate.getFullYear() === today.getFullYear() &&
      lastDate.getMonth() === today.getMonth()) {
    return false
  }
  return true
}

// ── Sum of retirement balances (used in net worth) ────────────────────────
export function totalRetirementValue(retirementAccounts = []) {
  return retirementAccounts
    .filter(a => a.active !== false)
    .reduce((s, a) => s + (a.currentBalance || 0), 0)
}

// ── 80C tracking helper ───────────────────────────────────────────────────
export function eightyCTotal(retirementAccounts = [], transactions = []) {
  const ids80C = ['ppf', 'epf', 'sukanya']
  return retirementAccounts
    .filter(a => ids80C.includes(a.type))
    .reduce((s, a) => s + ytdContributed(a, transactions), 0)
}
