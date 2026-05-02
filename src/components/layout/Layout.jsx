import { useState } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, Wallet, MoreHorizontal, Plus } from 'lucide-react'
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
  '/goals':         { title: 'Savings Goals',  subtitle: 'Track progress towards your financial goals.' },
  '/digest':        { title: 'Monthly Wrap',   subtitle: 'Your shareable monthly financial digest.' },
  '/forecast':      { title: 'Spend Forecast', subtitle: 'Month-end projection based on your pace.' },
  '/achievements':  { title: 'Achievements',   subtitle: 'Streaks, XP, and badges you\u2019ve earned.' },
  '/loans':         { title: 'Loans & EMI',    subtitle: 'Track loans with automatic principal/interest split.' },
  '/retirement':    { title: 'Retirement',     subtitle: 'PPF, NPS, EPF & Sukanya — with monthly auto-contributions.' },
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
  const [showVoice, setShowVoice] = useState(false)

  const subtitle = pathname === '/'
    ? `Welcome back${state.userName ? ', ' + state.userName : ''}. Here's your financial overview.`
    : meta.subtitle

  useNAVScheduler()

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(3,17,13,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 z-50"
            style={{ animation: 'slideInLeft 0.22s ease' }}>
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}>
        <Header
          title={meta.title}
          subtitle={subtitle}
          onMenuOpen={() => setDrawerOpen(true)}
          onAddTx={() => setShowAddTx(true)}
          onScan={() => setShowScanner(true)}
          onVoice={() => setShowVoice(true)}
        />
        <div className="flex-1 px-4 pt-3 pb-4 md:p-8 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile: Floating bottom nav with FAB (per design system) */}
      <div
        className="fixed left-0 right-0 z-30 md:hidden flex justify-center"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 14px)', paddingLeft: 14, paddingRight: 14 }}
      >
        <div className="bnav w-full" style={{ maxWidth: 460, position: 'relative' }}>
          {/* Left items */}
          {BOTTOM_NAV_LEFT.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ flex: 1 }}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* FAB — overflows 30px above */}
          <div style={{ flex: '0 0 auto', transform: 'translateY(-22px)' }}>
            <button
              onClick={() => setShowAddTx(true)}
              className="fab"
              aria-label="Add transaction"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right items */}
          {BOTTOM_NAV_RIGHT.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={{ flex: 1 }}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* More */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="nav-item"
            style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </div>

      {showAddTx && <TransactionModal onClose={() => setShowAddTx(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
      {showVoice && <VoiceEntryModal onClose={() => setShowVoice(false)} />}
    </div>
  )
}
