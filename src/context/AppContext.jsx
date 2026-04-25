import { createContext, useContext, useReducer, useEffect } from 'react'
import { generateId, currentMonthYear } from '../lib/utils'
import {
  DEFAULT_CATEGORIES, SAMPLE_TRANSACTIONS, SAMPLE_BUDGETS,
  SAMPLE_CREDIT_CARDS, SAMPLE_SUBSCRIPTIONS, SAMPLE_MUTUAL_FUNDS, SAMPLE_STOCKS, SAMPLE_ACCOUNTS
} from '../lib/constants'

const AppContext = createContext(null)

function loadFromStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch { return fallback }
}

const initialState = {
  transactions:  loadFromStorage('ef_transactions',  SAMPLE_TRANSACTIONS),
  budgets:       loadFromStorage('ef_budgets',       SAMPLE_BUDGETS),
  categories:    loadFromStorage('ef_categories',    DEFAULT_CATEGORIES),
  creditCards:   loadFromStorage('ef_credit_cards',  SAMPLE_CREDIT_CARDS),
  subscriptions: loadFromStorage('ef_subscriptions', SAMPLE_SUBSCRIPTIONS),
  mutualFunds:   loadFromStorage('ef_mutual_funds',  SAMPLE_MUTUAL_FUNDS),
  stocks:        loadFromStorage('ef_stocks',        SAMPLE_STOCKS),
  accounts:      loadFromStorage('ef_accounts',      SAMPLE_ACCOUNTS),
  savingsGoals:  loadFromStorage('ef_savings_goals', []),
  splits:        loadFromStorage('ef_splits',        []),
  theme:         loadFromStorage('ef_theme',         'dark'),
  currency:      loadFromStorage('ef_currency',      'INR'),
  privacyMode:   false,
  userName:      loadFromStorage('ef_user_name',     ''),
  onboarded:     loadFromStorage('ef_onboarded',     false),
  biometricLock: loadFromStorage('ef_biometric_lock', false),
  loans:         loadFromStorage('ef_loans',          []),
}

// ─── Account-balance helpers ───────────────────────────────────────────
// Single source of truth: every transaction with an accountId adjusts that
// account's balance. Transfers move money between two accounts atomically.
function applyTxToAccounts(accounts, tx, sign = 1) {
  if (!tx) return accounts
  const amt = (parseFloat(tx.amount) || 0) * sign
  return accounts.map(a => {
    if (tx.type === 'transfer') {
      // Money leaves accountId, enters toAccountId
      if (a.id === tx.accountId)   return { ...a, balance: (a.balance || 0) - amt }
      if (a.id === tx.toAccountId) return { ...a, balance: (a.balance || 0) + amt }
      return a
    }
    if (a.id === tx.accountId) {
      const delta = tx.type === 'income' ? amt : -amt
      return { ...a, balance: (a.balance || 0) + delta }
    }
    return a
  })
}

function reducer(state, action) {
  switch (action.type) {
    // Transactions
    case 'ADD_TRANSACTION': {
      const tx = { ...action.payload, id: action.payload.id || generateId() }
      return {
        ...state,
        transactions: [tx, ...state.transactions],
        accounts: applyTxToAccounts(state.accounts, tx, 1),
      }
    }
    case 'UPDATE_TRANSACTION': {
      const newTx = action.payload
      const oldTx = state.transactions.find(t => t.id === newTx.id)
      // revert old, apply new
      let nextAccounts = applyTxToAccounts(state.accounts, oldTx, -1)
      nextAccounts = applyTxToAccounts(nextAccounts, newTx, 1)
      return {
        ...state,
        transactions: state.transactions.map(t => t.id === newTx.id ? newTx : t),
        accounts: nextAccounts,
      }
    }
    case 'DELETE_TRANSACTION': {
      const tx = state.transactions.find(t => t.id === action.payload)
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
        accounts: applyTxToAccounts(state.accounts, tx, -1),
      }
    }

    // Budgets
    case 'ADD_BUDGET':
      return { ...state, budgets: [...state.budgets, { ...action.payload, id: generateId() }] }
    case 'UPDATE_BUDGET':
      return { ...state, budgets: state.budgets.map(b => b.id === action.payload.id ? action.payload : b) }
    case 'DELETE_BUDGET':
      return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload) }

    // Categories
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, { ...action.payload, id: generateId() }] }
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) }
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.payload) }

    // Credit Cards
    case 'ADD_CREDIT_CARD':
      return { ...state, creditCards: [...state.creditCards, { ...action.payload, id: generateId() }] }
    case 'UPDATE_CREDIT_CARD':
      return { ...state, creditCards: state.creditCards.map(c => c.id === action.payload.id ? action.payload : c) }
    case 'DELETE_CREDIT_CARD':
      return { ...state, creditCards: state.creditCards.filter(c => c.id !== action.payload) }
    case 'PAY_CREDIT_CARD': {
      const { cardId, accountId, amount, date, note } = action.payload
      const newTx = {
        id: generateId(),
        type: 'transfer',
        categoryId: 'tr17',  // Credit Card Payment
        accountId,
        toAccountId: cardId,
        description: note || `Credit Card Payment`,
        amount,
        date,
        notes: '',
      }
      return {
        ...state,
        transactions: [newTx, ...state.transactions],
        accounts: state.accounts.map(a =>
          a.id === accountId ? { ...a, balance: Math.max(0, a.balance - amount) } : a
        ),
        creditCards: state.creditCards.map(c =>
          c.id === cardId ? { ...c, outstanding: Math.max(0, c.outstanding - amount) } : c
        ),
      }
    }

    // Subscriptions
    case 'ADD_SUBSCRIPTION':
      return { ...state, subscriptions: [...state.subscriptions, { ...action.payload, id: generateId() }] }
    case 'UPDATE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.map(s => s.id === action.payload.id ? action.payload : s) }
    case 'DELETE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== action.payload) }

    // Mutual Funds
    case 'ADD_MUTUAL_FUND':
      return { ...state, mutualFunds: [...state.mutualFunds, { ...action.payload, id: generateId() }] }
    case 'UPDATE_MUTUAL_FUND':
      return { ...state, mutualFunds: state.mutualFunds.map(m => m.id === action.payload.id ? action.payload : m) }
    case 'DELETE_MUTUAL_FUND':
      return { ...state, mutualFunds: state.mutualFunds.filter(m => m.id !== action.payload) }
    case 'UPDATE_INVESTMENT_NAV':
      return {
        ...state,
        mutualFunds: state.mutualFunds.map(inv =>
          inv.id === action.payload.id
            ? { ...inv, currentNav: action.payload.nav, navDate: action.payload.date, lastNavUpdate: new Date().toISOString() }
            : inv
        )
      }

    // Stocks
    case 'ADD_STOCK':
      return { ...state, stocks: [...state.stocks, { ...action.payload, id: generateId() }] }
    case 'UPDATE_STOCK':
      return { ...state, stocks: state.stocks.map(s => s.id === action.payload.id ? action.payload : s) }
    case 'DELETE_STOCK':
      return { ...state, stocks: state.stocks.filter(s => s.id !== action.payload) }

    // Compound: invest in MF (transfer from bank → MF, increase units)
    case 'INVEST_MF': {
      // payload: { mfId, amount, units, navAtPurchase, fromAccountId, date }
      const { mfId, amount, units, navAtPurchase, fromAccountId, date } = action.payload
      const tx = {
        id: generateId(),
        type: 'transfer',
        amount,
        accountId: fromAccountId,
        toAccountId: mfId,
        description: `MF Buy — ${state.mutualFunds.find(m => m.id === mfId)?.name || 'Investment'}`,
        date: date || new Date().toISOString().slice(0, 10),
        categoryId: 'tr1',
        source: 'invest',
        linkedMfId: mfId,
      }
      const updatedMFs = state.mutualFunds.map(m =>
        m.id === mfId
          ? {
              ...m,
              units: (m.units || 0) + units,
              // weighted average NAV
              avgNav: ((m.units || 0) * (m.avgNav || 0) + units * navAtPurchase) / ((m.units || 0) + units || 1),
            }
          : m
      )
      return {
        ...state,
        transactions: [tx, ...state.transactions],
        accounts: applyTxToAccounts(state.accounts, tx, 1),
        mutualFunds: updatedMFs,
      }
    }
    // Compound: redeem MF (transfer from MF → bank, reduce units)
    case 'REDEEM_MF': {
      const { mfId, amount, units, toAccountId, date } = action.payload
      const tx = {
        id: generateId(),
        type: 'transfer',
        amount,
        accountId: mfId,
        toAccountId,
        description: `MF Redeem — ${state.mutualFunds.find(m => m.id === mfId)?.name || 'Investment'}`,
        date: date || new Date().toISOString().slice(0, 10),
        categoryId: 'tr2',
        source: 'redeem',
        linkedMfId: mfId,
      }
      const updatedMFs = state.mutualFunds.map(m =>
        m.id === mfId ? { ...m, units: Math.max(0, (m.units || 0) - units) } : m
      )
      return {
        ...state,
        transactions: [tx, ...state.transactions],
        accounts: applyTxToAccounts(state.accounts, { ...tx, type: 'income', amount }, 1),  // money returns to bank as income-flow
        mutualFunds: updatedMFs,
      }
    }
    // Compound: buy stock
    case 'BUY_STOCK': {
      const { stockId, shares, price, fromAccountId, date } = action.payload
      const amount = shares * price
      const tx = {
        id: generateId(),
        type: 'transfer',
        amount,
        accountId: fromAccountId,
        toAccountId: stockId,
        description: `Stock Buy — ${state.stocks.find(s => s.id === stockId)?.symbol || 'Equity'}`,
        date: date || new Date().toISOString().slice(0, 10),
        categoryId: 'tr3',
        source: 'invest',
        linkedStockId: stockId,
      }
      const updatedStocks = state.stocks.map(s =>
        s.id === stockId
          ? {
              ...s,
              shares: (s.shares || 0) + shares,
              avgCost: ((s.shares || 0) * (s.avgCost || 0) + shares * price) / ((s.shares || 0) + shares || 1),
            }
          : s
      )
      return {
        ...state,
        transactions: [tx, ...state.transactions],
        accounts: applyTxToAccounts(state.accounts, tx, 1),
        stocks: updatedStocks,
      }
    }
    // Compound: sell stock
    case 'SELL_STOCK': {
      const { stockId, shares, price, toAccountId, date } = action.payload
      const amount = shares * price
      const tx = {
        id: generateId(),
        type: 'transfer',
        amount,
        accountId: stockId,
        toAccountId,
        description: `Stock Sell — ${state.stocks.find(s => s.id === stockId)?.symbol || 'Equity'}`,
        date: date || new Date().toISOString().slice(0, 10),
        categoryId: 'tr4',
        source: 'redeem',
        linkedStockId: stockId,
      }
      const updatedStocks = state.stocks.map(s =>
        s.id === stockId ? { ...s, shares: Math.max(0, (s.shares || 0) - shares) } : s
      )
      return {
        ...state,
        transactions: [tx, ...state.transactions],
        accounts: applyTxToAccounts(state.accounts, { ...tx, type: 'income', amount }, 1),
        stocks: updatedStocks,
      }
    }

    // Accounts
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, { ...action.payload, id: generateId() }] }
    case 'UPDATE_ACCOUNT':
      return { ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a) }
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter(a => a.id !== action.payload) }

    // Savings Goals
    case 'ADD_SAVINGS_GOAL':
      return { ...state, savingsGoals: [...state.savingsGoals, { ...action.payload, id: generateId() }] }
    case 'UPDATE_SAVINGS_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.map(g => g.id === action.payload.id ? action.payload : g) }
    case 'DELETE_SAVINGS_GOAL':
      return { ...state, savingsGoals: state.savingsGoals.filter(g => g.id !== action.payload) }
    case 'ADD_GOAL_DEPOSIT': {
      const { goalId, amount, date } = action.payload
      return {
        ...state,
        savingsGoals: state.savingsGoals.map(g =>
          g.id === goalId
            ? { ...g, saved: (g.saved || 0) + amount, deposits: [...(g.deposits || []), { amount, date, id: generateId() }] }
            : g
        )
      }
    }

    // Splits
    case 'ADD_SPLIT':
      return { ...state, splits: [{ ...action.payload, id: generateId(), createdAt: new Date().toISOString() }, ...state.splits] }
    case 'UPDATE_SPLIT':
      return { ...state, splits: state.splits.map(s => s.id === action.payload.id ? action.payload : s) }
    case 'DELETE_SPLIT':
      return { ...state, splits: state.splits.filter(s => s.id !== action.payload) }
    case 'SETTLE_SPLIT_MEMBER': {
      const { splitId, memberName } = action.payload
      return {
        ...state,
        splits: state.splits.map(s =>
          s.id === splitId
            ? { ...s, members: s.members.map(m => m.name === memberName ? { ...m, settled: true } : m) }
            : s
        )
      }
    }

    // Settings
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'SET_USER_NAME':
      return { ...state, userName: action.payload }
    case 'SET_ONBOARDED':
      return { ...state, onboarded: action.payload }
    case 'TOGGLE_PRIVACY':
      return { ...state, privacyMode: !state.privacyMode }
    case 'SET_BIOMETRIC_LOCK':
      return { ...state, biometricLock: action.payload }
    case 'ADD_LOAN':
      return { ...state, loans: [action.payload, ...(state.loans || [])] }
    case 'UPDATE_LOAN':
      return { ...state, loans: (state.loans || []).map(l => l.id === action.payload.id ? action.payload : l) }
    case 'DELETE_LOAN':
      return { ...state, loans: (state.loans || []).filter(l => l.id !== action.payload) }
    case 'CLEAR_ALL_DATA':
      return {
        ...state,
        transactions: [],
        budgets: [],
        creditCards: [],
        subscriptions: [],
        mutualFunds: [],
        stocks: [],
        accounts: [],
        categories: DEFAULT_CATEGORIES,
        savingsGoals: [],
        splits: [],
      }
    case 'IMPORT_DATA':
      return { ...state, transactions: action.payload }
    case 'IMPORT_STATEMENT': {
      // Prepend imported transactions, skip duplicates by date+amount+description
      const existing = new Set(state.transactions.map(t => `${t.date}|${t.amount}|${t.description}`))
      const newTxs = action.payload.filter(t => !existing.has(`${t.date}|${t.amount}|${t.description}`))
      // Apply each new tx to account balances
      let nextAccounts = state.accounts
      for (const tx of newTxs) nextAccounts = applyTxToAccounts(nextAccounts, tx, 1)
      return { ...state, transactions: [...newTxs, ...state.transactions], accounts: nextAccounts }
    }
    case 'IMPORT_BACKUP': {
      // Full restore from JSON backup — replaces all data
      const d = action.payload
      return {
        ...state,
        transactions:  Array.isArray(d.transactions)  ? d.transactions  : state.transactions,
        accounts:      Array.isArray(d.accounts)      ? d.accounts      : state.accounts,
        budgets:       Array.isArray(d.budgets)        ? d.budgets       : state.budgets,
        creditCards:   Array.isArray(d.creditCards)   ? d.creditCards   : state.creditCards,
        subscriptions: Array.isArray(d.subscriptions) ? d.subscriptions : state.subscriptions,
        mutualFunds:   Array.isArray(d.mutualFunds)   ? d.mutualFunds   : state.mutualFunds,
        stocks:        Array.isArray(d.stocks)        ? d.stocks        : state.stocks,
        categories:    Array.isArray(d.categories)    ? d.categories    : state.categories,
        savingsGoals:  Array.isArray(d.savingsGoals)  ? d.savingsGoals  : state.savingsGoals,
        splits:        Array.isArray(d.splits)        ? d.splits        : state.splits,
      }
    }

    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Refresh widget snapshot when data changes
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { writeWidgetSnapshot } = await import('../lib/widgetSync')
        if (!cancelled) await writeWidgetSnapshot(state)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [state.transactions, state.accounts, state.mutualFunds, state.stocks, state.creditCards])

  // Persist to localStorage
  useEffect(() => { localStorage.setItem('ef_transactions',  JSON.stringify(state.transactions)) },  [state.transactions])
  useEffect(() => { localStorage.setItem('ef_budgets',       JSON.stringify(state.budgets)) },       [state.budgets])
  useEffect(() => { localStorage.setItem('ef_categories',    JSON.stringify(state.categories)) },    [state.categories])
  useEffect(() => { localStorage.setItem('ef_credit_cards',  JSON.stringify(state.creditCards)) },   [state.creditCards])
  useEffect(() => { localStorage.setItem('ef_subscriptions', JSON.stringify(state.subscriptions)) }, [state.subscriptions])
  useEffect(() => { localStorage.setItem('ef_mutual_funds',  JSON.stringify(state.mutualFunds)) },   [state.mutualFunds])
  useEffect(() => { localStorage.setItem('ef_stocks',        JSON.stringify(state.stocks)) },        [state.stocks])
  useEffect(() => { localStorage.setItem('ef_accounts',      JSON.stringify(state.accounts)) },      [state.accounts])
  useEffect(() => { localStorage.setItem('ef_splits',        JSON.stringify(state.splits)) },        [state.splits])
  useEffect(() => { localStorage.setItem('ef_savings_goals', JSON.stringify(state.savingsGoals)) },  [state.savingsGoals])
  useEffect(() => {
    localStorage.setItem('ef_theme', JSON.stringify(state.theme))
    document.documentElement.classList.toggle('light', state.theme === 'light')
  }, [state.theme])
  useEffect(() => { localStorage.setItem('ef_user_name', JSON.stringify(state.userName)) }, [state.userName])
  useEffect(() => { localStorage.setItem('ef_onboarded', JSON.stringify(state.onboarded)) }, [state.onboarded])
  useEffect(() => { localStorage.setItem('ef_biometric_lock', JSON.stringify(state.biometricLock)) }, [state.biometricLock])
  useEffect(() => { localStorage.setItem('ef_loans', JSON.stringify(state.loans || [])) }, [state.loans])

  // Derived helpers
  const getCategory = (id) => state.categories.find(c => c.id === id)

  const getMonthlyStats = (monthYear = currentMonthYear()) => {
    const txs = state.transactions.filter(t => t.date.startsWith(monthYear))
    const income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance: income - expenses }
  }

  const getBudgetUsage = (monthYear = currentMonthYear()) => {
    return state.budgets.map(b => {
      const spent = state.transactions
        .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(monthYear))
        .reduce((s, t) => s + t.amount, 0)
      return { ...b, spent, percentage: Math.min(Math.round((spent / b.monthlyLimit) * 100), 999) }
    })
  }

  return (
    <AppContext.Provider value={{ state, dispatch, getCategory, getMonthlyStats, getBudgetUsage }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
