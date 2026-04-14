export function calculateNetWorth(state) {
  // Assets
  const bankBalance = (state.accounts || []).reduce((s, a) => s + (a.balance || 0), 0)
  const mfValue = (state.mutualFunds || []).reduce((s, m) => s + (m.units * m.currentNav), 0)
  const stockValue = (state.stocks || []).reduce((s, st) => s + (st.shares * st.currentPrice), 0)
  const totalAssets = bankBalance + mfValue + stockValue

  // Liabilities
  const ccDebt = (state.creditCards || []).reduce((s, c) => s + (c.outstanding || 0), 0)
  const totalLiabilities = ccDebt

  const netWorth = totalAssets - totalLiabilities

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    breakdown: {
      bankBalance,
      mfValue,
      stockValue,
      ccDebt,
    }
  }
}
