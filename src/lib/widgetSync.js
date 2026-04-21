// Writes app snapshot data to shared storage for native widgets.
// iOS: persisted via Capacitor Preferences → bridged to App Group UserDefaults
// Android: persisted via Capacitor Preferences → bridged to SharedPreferences

import { Capacitor } from '@capacitor/core'
import { formatINR, currentMonthYear } from './utils'
import { calculateNetWorth } from './netWorth'

const WIDGET_KEY = 'ef_widget_snapshot'

export async function writeWidgetSnapshot(state) {
  try {
    const month = currentMonthYear()
    const monthTxs = (state.transactions || []).filter(t => t.date?.startsWith(month))
    const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = (state.accounts || []).reduce((s, a) => s + (a.balance || 0), 0)
    const net = calculateNetWorth(state)

    const todayKey = new Date().toISOString().slice(0, 10)
    const todayExpense = (state.transactions || [])
      .filter(t => t.date === todayKey && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)

    const snapshot = {
      updatedAt: new Date().toISOString(),
      balance,
      balanceFormatted: formatINR(balance),
      netWorth: net.netWorth,
      netWorthFormatted: formatINR(net.netWorth),
      income,
      incomeFormatted: formatINR(income),
      expenses,
      expensesFormatted: formatINR(expenses),
      todayExpense,
      todayExpenseFormatted: formatINR(todayExpense),
      month,
    }

    const json = JSON.stringify(snapshot)

    // Persist via Preferences (available on all platforms)
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key: WIDGET_KEY, value: json })

    // Also write to localStorage as fallback
    try { localStorage.setItem(WIDGET_KEY, json) } catch {}

    // On native platforms, trigger widget refresh
    if (Capacitor.isNativePlatform()) {
      try {
        // iOS: reload widgets via WidgetCenter (needs native bridge plugin; for now, update on app foreground)
        // Android: broadcast intent to update widget (handled by native AppWidgetProvider)
        // For now, just saving the data — native widget reads on its own schedule.
      } catch {}
    }

    return snapshot
  } catch (err) {
    console.warn('widget snapshot write failed:', err)
    return null
  }
}
