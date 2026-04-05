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
  theme:         loadFromStorage('ef_theme',         'dark'),
  currency:      loadFromStorage('ef_currency',      'INR'),
  privacyMode:   false,
}

function reducer(state, action) {
  switch (action.type) {
    // Transactions
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [{ ...action.payload, id: generateId() }, ...state.transactions] }
    case 'UPDATE_TRANSACTION':
      return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) }

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

    // Accounts
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, { ...action.payload, id: generateId() }] }
    case 'UPDATE_ACCOUNT':
      return { ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a) }
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter(a => a.id !== action.payload) }

    // Settings
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'TOGGLE_PRIVACY':
      return { ...state, privacyMode: !state.privacyMode }
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
      }
    case 'IMPORT_DATA':
      return { ...state, transactions: action.payload }
    case 'IMPORT_STATEMENT': {
      // Prepend imported transactions, skip duplicates by date+amount+description
      const existing = new Set(state.transactions.map(t => `${t.date}|${t.amount}|${t.description}`))
      const newTxs = action.payload.filter(t => !existing.has(`${t.date}|${t.amount}|${t.description}`))
      return { ...state, transactions: [...newTxs, ...state.transactions] }
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
      }
    }

    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Persist to localStorage
  useEffect(() => { localStorage.setItem('ef_transactions',  JSON.stringify(state.transactions)) },  [state.transactions])
  useEffect(() => { localStorage.setItem('ef_budgets',       JSON.stringify(state.budgets)) },       [state.budgets])
  useEffect(() => { localStorage.setItem('ef_categories',    JSON.stringify(state.categories)) },    [state.categories])
  useEffect(() => { localStorage.setItem('ef_credit_cards',  JSON.stringify(state.creditCards)) },   [state.creditCards])
  useEffect(() => { localStorage.setItem('ef_subscriptions', JSON.stringify(state.subscriptions)) }, [state.subscriptions])
  useEffect(() => { localStorage.setItem('ef_mutual_funds',  JSON.stringify(state.mutualFunds)) },   [state.mutualFunds])
  useEffect(() => { localStorage.setItem('ef_stocks',        JSON.stringify(state.stocks)) },        [state.stocks])
  useEffect(() => { localStorage.setItem('ef_accounts',      JSON.stringify(state.accounts)) },      [state.accounts])
  useEffect(() => {
    localStorage.setItem('ef_theme', JSON.stringify(state.theme))
    document.documentElement.classList.toggle('light', state.theme === 'light')
  }, [state.theme])

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
