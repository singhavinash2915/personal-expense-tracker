/**
 * Net Worth — "liquid net worth" model
 *
 * Loans (especially long-term home loans) are NOT subtracted from net worth,
 * because:
 *   - They're typically offset by a real asset (home/car) we don't track
 *   - Subtracting a 25-year ₹40L home loan would push every middle-class
 *     user into deep negative — demoralizing & not actionable
 *
 * Instead:
 *   - Net worth = liquid assets + investments + retirement − credit-card debt
 *   - Loans are shown separately (Dashboard tile + dedicated /loans page)
 */
export function calculateNetWorth(state) {
  // Assets
  const bankBalance = (state.accounts || []).reduce((s, a) => s + (a.balance || 0), 0)
  const mfValue = (state.mutualFunds || []).reduce((s, m) => s + (m.units * m.currentNav), 0)
  const stockValue = (state.stocks || []).reduce((s, st) => s + (st.shares * st.currentPrice), 0)
  const retirementValue = (state.retirementAccounts || [])
    .filter(r => r.active !== false)
    .reduce((s, r) => s + (r.currentBalance || 0), 0)
  const totalAssets = bankBalance + mfValue + stockValue + retirementValue

  // Short-term liabilities (subtracted from net worth)
  const ccDebt = (state.creditCards || []).reduce((s, c) => s + (c.outstanding || 0), 0)
  const totalLiabilities = ccDebt

  // Long-term obligations (informational only — NOT subtracted)
  const loanOutstanding = (state.loans || []).reduce(
    (s, l) => s + (l.monthlyEMI || 0) * Math.max(0, (l.totalEMIs || 0) - (l.paidEMIs || 0)),
    0
  )

  const netWorth = totalAssets - totalLiabilities

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    breakdown: {
      bankBalance,
      mfValue,
      stockValue,
      retirementValue,
      ccDebt,
      loanOutstanding, // shown on Dashboard separately, not deducted
    }
  }
}
