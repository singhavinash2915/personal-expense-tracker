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
        background: 'linear-gradient(180deg, #03110d 0%, #050a08 100%)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Decorative top-right emerald glow */}
      <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top right, rgba(52,211,153,0.18), transparent 60%)' }} />

      {/* Logo */}
      <div className="relative px-4 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--glow-gold)' }}>
            <span style={{ color: 'var(--bg-base)', fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>₹</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="heading" style={{ fontSize: 18, lineHeight: 1.1 }}>
              Expense<em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>Flow</em>
            </h1>
            <p className="label-mono" style={{ fontSize: 9, marginTop: 2 }}>Personal Finance</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: isActive ? 'var(--gold)' : 'var(--text-muted)',
              background: isActive ? 'var(--sidebar-nav-active)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
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
            padding: '10px 12px',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: isActive ? 'var(--gold)' : 'var(--text-muted)',
            background: isActive ? 'var(--sidebar-nav-active)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
            textDecoration: 'none',
          })}
        >
          <SettingsIcon className="w-4 h-4 flex-shrink-0" />
          Settings
        </NavLink>
      </nav>

      {/* User */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            style={{
              background: 'var(--gradient-brand)',
              color: 'var(--bg-base)',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
            }}>
            {state.userName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-display" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              {state.userName || 'My Account'}
            </p>
            <p className="label-mono" style={{ fontSize: 9, marginTop: 2 }}>Personal</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
