import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, BarChart2, Wallet, CreditCard, RefreshCw, TrendingUp, Settings, Landmark } from 'lucide-react'
import { useApp } from '../../context/AppContext'

function PiggyBankIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="13" cy="16" rx="9" ry="7.5" fill="white" fillOpacity="0.92"/>
      {/* Ear */}
      <ellipse cx="7" cy="10" rx="2.5" ry="2" fill="white" fillOpacity="0.85"/>
      {/* Snout */}
      <ellipse cx="21" cy="17" rx="2.8" ry="2.2" fill="white" fillOpacity="0.78"/>
      {/* Nostrils */}
      <circle cx="20.2" cy="17" r="0.5" fill="rgba(236,72,153,0.75)"/>
      <circle cx="21.8" cy="17" r="0.5" fill="rgba(236,72,153,0.75)"/>
      {/* Eye */}
      <circle cx="16.5" cy="13" r="0.9" fill="rgba(30,27,75,0.65)"/>
      {/* Coin slot */}
      <rect x="10" y="8.5" width="5" height="1.2" rx="0.6" fill="rgba(124,58,237,0.55)"/>
      {/* ₹ on coin slot */}
      <text x="11.2" y="8" fontSize="5.5" fontWeight="bold" fill="white" fillOpacity="0.95" fontFamily="sans-serif">₹</text>
      {/* Legs */}
      <rect x="8.5"  cy="22" width="2.2" height="3" rx="1.1" fill="white" fillOpacity="0.82" y="22"/>
      <rect x="12.5" cy="22" width="2.2" height="3" rx="1.1" fill="white" fillOpacity="0.82" y="22"/>
      <rect x="16.5" cy="22" width="2.2" height="3" rx="1.1" fill="white" fillOpacity="0.82" y="22"/>
    </svg>
  )
}

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/transactions',  icon: Receipt,         label: 'Transactions'  },
  { to: '/accounts',      icon: Landmark,        label: 'Accounts'      },
  { to: '/analytics',     icon: BarChart2,        label: 'Analytics'    },
  { to: '/budgets',       icon: Wallet,           label: 'Budgets'      },
  { to: '/credit',        icon: CreditCard,       label: 'Credit Cards' },
  { to: '/subscriptions', icon: RefreshCw,        label: 'Subscriptions'},
  { to: '/investments',   icon: TrendingUp,       label: 'Investments'  },
]

export default function Sidebar() {
  const { state, dispatch } = useApp()

  return (
    <aside className="sidebar fixed left-0 top-0 h-full w-64 z-20 flex flex-col"
      style={{ background: '#1a1a1a', borderRight: '1px solid rgba(239,68,68,0.18)' }}>

      {/* Logo */}
      <div className="p-6" style={{ borderBottom: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ec4899,#7c3aed)' }}>
            <PiggyBankIcon />
          </div>
          <div>
            <h1 className="text-lg font-extrabold gradient-text">ExpenseFlow</h1>
            <p className="text-xs" style={{ color: 'rgba(167,139,250,0.5)' }}>Personal Finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="my-3" style={{ borderTop: '1px solid rgba(239,68,68,0.15)' }} />

        <NavLink to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </NavLink>
      </nav>

      {/* User */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(239,68,68,0.15)' }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>A</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold gradient-text truncate">Avinash</p>
            <p className="text-xs truncate" style={{ color: 'rgba(167,139,250,0.5)' }}>Personal Account</p>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' })}
            className="ml-auto p-1.5 rounded-lg btn-ghost flex-shrink-0" title="Toggle theme">
            {state.theme === 'dark'
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              : <svg className="w-4 h-4 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            }
          </button>
        </div>
      </div>
    </aside>
  )
}
