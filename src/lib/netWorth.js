export function calculateNetWorth(state) {
  // Assets
  const bankBalance = (state.accounts || []).reduce((s, a) => s + (a.balance || 0), 0)
  const mfValue = (state.mutualFunds || []).reduce((s, m) => s + (m.units * m.currentNav), 0)
  const stockValue = (state.stocks || []).reduce((s, st) => s + (st.shares * st.currentPrice), 0)
  const retirementValue = (state.retirementAccounts || [])
    .filter(r => r.active !== false)
    .reduce((s, r) => s + (r.currentBalance || 0), 0)
  const totalAssets = bankBalance + mfValue + stockValue + retirementValue

  // Liabilities
  const ccDebt = (state.creditCards || []).reduce((s, c) => s + (c.outstanding || 0), 0)
  const loanOutstanding = (state.loans || []).reduce(
    (s, l) => s + (l.monthlyEMI || 0) * Math.max(0, (l.totalEMIs || 0) - (l.paidEMIs || 0)),
    0
  )
  const totalLiabilities = ccDebt + loanOutstanding

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
      loanOutstanding,
    }
  }
}
