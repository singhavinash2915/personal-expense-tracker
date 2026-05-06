import { useState } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, Wallet, Landmark, MoreHorizontal, Plus } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import TransactionModal from '../ui/TransactionModal'
import ReceiptScanner from '../ui/ReceiptScanner'
import VoiceEntryModal from '../ui/VoiceEntryModal'
import { useNAVScheduler } from '../../hooks/useNAVScheduler'
import { useApp } from '../../context/AppContext'

const pageMeta = {
  '/':              { title: 'Dashboard',     subtitle: '' },
  '/transactions':  { title: 'Transactions',  subtitle: 'View and manage all your transactions.' },
  '/accounts':      { title: 'Accounts',      subtitle: 'Manage bank, credit cards, wallets.' },
  '/analytics':     { title: 'Analytics',     subtitle: 'Insights and trends about your spending.' },
  '/budgets':       { title: 'Budgets',       subtitle: 'Set and track your monthly limits.' },
  '/credit':        { title: 'Credit Cards',  subtitle: 'Manage your credit cards.' },
  '/subscriptions': { title: 'Subscriptions', subtitle: 'Track recurring monthly subscriptions.' },
  '/investments':   { title: 'Investments',   subtitle: 'Mutual funds & equity portfolio.' },
  '/settings':      { title: 'Settings',      subtitle: 'Customize and manage data.' },
  '/privacy':       { title: 'Privacy Policy',subtitle: 'How we handle your data.' },
  '/health':        { title: 'Health Score',  subtitle: 'How financially healthy are you?' },
  '/ai-insights':   { title: 'AI Insights',   subtitle: 'Smart analysis of your patterns.' },
  '/goals':         { title: 'Goals',         subtitle: 'Track progress to your goals.' },
  '/digest':        { title: 'Monthly Wrap',  subtitle: 'Shareable monthly digest.' },
  '/forecast':      { title: 'Forecast',      subtitle: 'Month-end projection.' },
  '/achievements':  { title: 'Achievements',  subtitle: 'Streaks, XP, badges.' },
  '/loans':         { title: 'Loans & EMI',   subtitle: 'Track loans & EMIs.' },
  '/retirement':    { title: 'Retirement',    subtitle: 'PPF, NPS, EPF, Sukanya.' },
}

const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: Receipt,         label: 'Activity'  },
  { to: '/budgets',      icon: Wallet,          label: 'Budget'    },
  { to: '/accounts',     icon: Landmark,        label: 'Accounts'  },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { state } = useApp()
  const meta = pageMeta[pathname] || { title: 'ExpenseFlow', subtitle: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showVoice, setShowVoice] = useState(false)

  const subtitle = pathname === '/'
    ? `Here's your financial overview.`
    : meta.subtitle

  useNAVScheduler()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(15,26,46,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute left-0 top-0 h-full w-64 z-50"
            style={{ animation: 'slideInLeft 0.22s ease' }}
          >
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <main
        className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      >
        <Header
          title={meta.title}
          subtitle={subtitle}
          onMenuOpen={() => setDrawerOpen(true)}
          onAddTx={() => setShowAddTx(true)}
          onScan={() => setShowScanner(true)}
          onVoice={() => setShowVoice(true)}
        />
        <div className="flex-1 px-4 pb-6 md:px-8 md:py-6 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav — clean, no FAB inside */}
      <nav
        className="fixed left-0 right-0 z-30 md:hidden bnav"
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-5 h-5" strokeWidth={2.2} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setDrawerOpen(true)}
          className="nav-item"
          aria-label="More menu"
        >
          <MoreHorizontal className="w-5 h-5" strokeWidth={2.2} />
          <span>More</span>
        </button>
      </nav>

      {/* Floating FAB — bottom-right (separate from nav) */}
      <button
        onClick={() => setShowAddTx(true)}
        className="fab fixed md:hidden z-40"
        style={{
          right: 16,
          bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        }}
        aria-label="Add transaction"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
        Add
      </button>

      {showAddTx && <TransactionModal onClose={() => setShowAddTx(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
      {showVoice && <VoiceEntryModal onClose={() => setShowVoice(false)} />}
    </div>
  )
}
