import { useState } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, Wallet, MoreHorizontal, Plus, ScanLine } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import TransactionModal from '../ui/TransactionModal'
import ReceiptScanner from '../ui/ReceiptScanner'
import { useNAVScheduler } from '../../hooks/useNAVScheduler'
import { useApp } from '../../context/AppContext'

const pageMeta = {
  '/':              { title: 'Dashboard',     subtitle: '' },
  '/transactions':  { title: 'Transactions',  subtitle: 'View and manage all your transactions.' },
  '/accounts':      { title: 'Accounts',      subtitle: 'Manage your bank accounts, wallets, and cash.' },
  '/analytics':     { title: 'Analytics',     subtitle: 'Insights and trends about your spending habits.' },
  '/budgets':       { title: 'Budgets',        subtitle: 'Set and track your monthly spending limits.' },
  '/credit':        { title: 'Credit Cards',   subtitle: 'Manage your credit cards and outstanding balances.' },
  '/subscriptions': { title: 'Subscriptions', subtitle: 'Track your recurring monthly subscriptions.' },
  '/investments':   { title: 'Investments',   subtitle: 'Track your mutual funds and equity portfolio.' },
  '/settings':      { title: 'Settings',      subtitle: 'Customize your experience and manage data.' },
  '/privacy':       { title: 'Privacy Policy', subtitle: 'How we handle your data.' },
  '/health':        { title: 'Health Score',   subtitle: 'How financially healthy are you?' },
  '/ai-insights':   { title: 'AI Insights',    subtitle: 'Smart analysis of your financial patterns.' },
  '/splits':         { title: 'Split Bills',    subtitle: 'Split expenses with friends and track settlements.' },
  '/goals':          { title: 'Savings Goals',  subtitle: 'Track progress towards your financial goals.' },
  '/sms-import':     { title: 'SMS Auto-Import',subtitle: 'Automatically capture transactions from bank SMS.' },
  '/digest':         { title: 'Monthly Wrap',   subtitle: 'Your shareable monthly financial digest.' },
  '/connect-bank':   { title: 'Connect Bank',   subtitle: 'Securely link accounts via Account Aggregator.' },
  '/snapshot':       { title: 'Daily Snapshot', subtitle: 'Shareable today-at-a-glance summary.' },
}

const BOTTOM_NAV_LEFT = [
  { to: '/',             icon: LayoutDashboard, label: 'Home' },
  { to: '/transactions', icon: Receipt,         label: 'Txns' },
]

const BOTTOM_NAV_RIGHT = [
  { to: '/budgets',      icon: Wallet,          label: 'Budget' },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { state } = useApp()
  const meta = pageMeta[pathname] || { title: 'ExpenseFlow', subtitle: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const subtitle = pathname === '/'
    ? `Welcome back${state.userName ? ', ' + state.userName : ''}. Here's your financial overview.`
    : meta.subtitle

  // Auto-refresh MF NAVs daily at 9 PM IST
  useNAVScheduler()

  return (
    <div className="flex min-h-screen">

      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 z-50"
            style={{ animation: 'slideInLeft 0.22s ease' }}>
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen pb-20 md:pb-0 overflow-x-hidden">
        <Header
          title={meta.title}
          subtitle={subtitle}
          onMenuOpen={() => setDrawerOpen(true)}
          onAddTx={() => setShowAddTx(true)}
          onScan={() => setShowScanner(true)}
        />
        <div className="flex-1 px-3 pt-3 pb-4 md:p-8 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
        style={{
          background: '#0c0f1a',
          borderTop: '1px solid rgba(99,102,241,0.12)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center h-16 px-1 pb-1 relative">
          {/* Left nav items */}
          {BOTTOM_NAV_LEFT.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all ${
                  isActive ? 'text-indigo-400 font-bold' : 'text-white/40'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-6 h-6" />
                  <span className={`text-[10px] font-semibold ${isActive ? 'font-bold' : ''}`}>{label}</span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
                </>
              )}
            </NavLink>
          ))}

          {/* Center FAB — Add button */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setShowAddTx(true)}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl -mt-8"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.5)' }}
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          </div>

          {/* Right nav items */}
          {BOTTOM_NAV_RIGHT.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all ${
                  isActive ? 'text-indigo-400 font-bold' : 'text-white/40'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-6 h-6" />
                  <span className={`text-[10px] font-semibold ${isActive ? 'font-bold' : ''}`}>{label}</span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
                </>
              )}
            </NavLink>
          ))}

          {/* More — opens drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all text-white/40"
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      {showAddTx && <TransactionModal onClose={() => setShowAddTx(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
    </div>
  )
}
