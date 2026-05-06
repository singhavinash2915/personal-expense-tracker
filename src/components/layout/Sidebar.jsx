import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Receipt, BarChart2, Wallet, CreditCard, RefreshCw,
  TrendingUp, Settings as SettingsIcon, Landmark, HeartPulse, Brain, Target,
  Sparkles, LineChart, Trophy, Building2, PiggyBank
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/transactions',  icon: Receipt,         label: 'Transactions'  },
  { to: '/accounts',      icon: Landmark,        label: 'Accounts'      },
  { to: '/analytics',     icon: BarChart2,       label: 'Analytics'     },
  { to: '/budgets',       icon: Wallet,          label: 'Budgets'       },
  { to: '/credit',        icon: CreditCard,      label: 'Credit Cards'  },
  { to: '/subscriptions', icon: RefreshCw,       label: 'Subscriptions' },
  { to: '/investments',   icon: TrendingUp,      label: 'Investments'   },
  { to: '/health',        icon: HeartPulse,      label: 'Health Score'  },
  { to: '/ai-insights',   icon: Brain,           label: 'AI Insights'   },
  { to: '/goals',         icon: Target,          label: 'Goals'         },
  { to: '/loans',         icon: Building2,       label: 'Loans & EMI'   },
  { to: '/retirement',    icon: PiggyBank,       label: 'Retirement'    },
  { to: '/forecast',      icon: LineChart,       label: 'Forecast'      },
  { to: '/achievements',  icon: Trophy,          label: 'Achievements'  },
  { to: '/digest',        icon: Sparkles,        label: 'Monthly Wrap'  },
]

export default function Sidebar({ onClose }) {
  const { state } = useApp()

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 z-20 flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 18 }}
          >
            ₹
          </div>
          <div className="flex-1 min-w-0">
            <h1
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              ExpenseFlow
            </h1>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-light)', marginTop: 2 }}>
              Personal Finance
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--primary-light)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            })}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="my-3" style={{ borderTop: '1px solid var(--border-subtle)' }} />

        <NavLink
          to="/settings"
          onClick={onClose}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 14px',
            borderRadius: 'var(--r-md)',
            fontSize: 14,
            fontWeight: 600,
            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--primary-light)' : 'transparent',
            textDecoration: 'none',
          })}
        >
          <SettingsIcon className="w-4 h-4 flex-shrink-0" />
          Settings
        </NavLink>
      </nav>

      {/* User chip */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 16 }}
          >
            {state.userName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {state.userName || 'My Account'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 1 }}>
              Personal
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
