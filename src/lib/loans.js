// Loan & EMI calculations — amortization schedule, principal/interest split

/**
 * Calculate monthly EMI given principal, annual rate %, tenure in months.
 * Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  if (!principal || !tenureMonths) return 0
  const r = annualRate / 12 / 100
  if (r === 0) return principal / tenureMonths
  const pow = Math.pow(1 + r, tenureMonths)
  return (principal * r * pow) / (pow - 1)
}

/**
 * Build full amortization schedule.
 * Returns array of { month, date, emi, principal, interest, balance }
 */
export function amortizationSchedule(loan) {
  const { principal, annualRate, tenureMonths, startDate } = loan
  const emi = calculateEMI(principal, annualRate, tenureMonths)
  const r = annualRate / 12 / 100
  const schedule = []
  let balance = principal
  const start = new Date(startDate)
  for (let m = 1; m <= tenureMonths; m++) {
    const interest = balance * r
    const principalPart = emi - interest
    balance = Math.max(0, balance - principalPart)
    const d = new Date(start)
    d.setMonth(d.getMonth() + m - 1)
    schedule.push({
      month: m,
      date: d.toISOString().slice(0, 10),
      emi,
      principal: principalPart,
      interest,
      balance,
    })
  }
  return schedule
}

/**
 * Given a loan, how many EMIs are paid, remaining, and current outstanding?
 */
export function loanStatus(loan, paidTransactions = []) {
  const schedule = amortizationSchedule(loan)
  // EMIs already paid BEFORE you started tracking (existing loan support)
  const preExistingPaid = parseInt(loan.preExistingPaid || 0, 10) || 0
  // EMIs paid via the app
  const newlyPaid = paidTransactions.length
  const paidCount = preExistingPaid + newlyPaid

  const paidPrincipal = schedule.slice(0, paidCount).reduce((s, x) => s + x.principal, 0)
  const paidInterest = schedule.slice(0, paidCount).reduce((s, x) => s + x.interest, 0)
  const remaining = Math.max(0, schedule.length - paidCount)
  const outstanding = Math.max(0, loan.principal - paidPrincipal)
  const nextDue = schedule[paidCount] || null
  return {
    schedule,
    paidCount,
    preExistingPaid,
    newlyPaid,
    remaining,
    outstanding,
    paidPrincipal,
    paidInterest,
    nextDue,
    totalPaid: paidPrincipal + paidInterest,
    totalInterest: schedule.reduce((s, x) => s + x.interest, 0),
  }
}

/**
 * When user marks an EMI paid: create 2 linked transactions:
 * 1. TRANSFER from bank → loan account (principal portion) — reduces debt
 * 2. EXPENSE in Finance/Interest category (interest portion)
 */
export function buildEMITransactions(loan, scheduleRow, paymentDate, fromAccountId, financeCatId = 'c1') {
  const base = {
    date: paymentDate,
    source: 'emi',
    linkedLoanId: loan.id,
    emiMonth: scheduleRow.month,
  }
  return [
    {
      ...base,
      id: `emi_p_${loan.id}_${scheduleRow.month}_${Date.now()}`,
      accountId: fromAccountId,
      toAccountId: loan.id,
      amount: Math.round(scheduleRow.principal * 100) / 100,
      type: 'transfer',
      description: `EMI #${scheduleRow.month} Principal — ${loan.name}`,
      categoryId: null,
    },
    {
      ...base,
      id: `emi_i_${loan.id}_${scheduleRow.month}_${Date.now()}`,
      accountId: fromAccountId,
      amount: Math.round(scheduleRow.interest * 100) / 100,
      type: 'expense',
      description: `EMI #${scheduleRow.month} Interest — ${loan.name}`,
      categoryId: financeCatId,
    },
  ]
}
