import { useState } from 'react'
import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, Landmark, BarChart2, Plus, ScanLine } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import TransactionModal from '../ui/TransactionModal'
import ReceiptScanner from '../ui/ReceiptScanner'
import { useNAVScheduler } from '../../hooks/useNAVScheduler'

const pageMeta = {
  '/':              { title: 'Dashboard',     subtitle: "Welcome back, Avinash. Here's your financial overview." },
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
}

const BOTTOM_NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Home'     },
  { to: '/transactions', icon: Receipt,         label: 'Txns'     },
  { to: '/accounts',     icon: Landmark,        label: 'Accounts' },
  { to: '/analytics',    icon: BarChart2,       label: 'Analytics'},
]

export default function Layout() {
  const { pathname } = useLocation()
  const meta = pageMeta[pathname] || { title: 'ExpenseFlow', subtitle: '' }
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

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
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen pb-16 md:pb-0">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuOpen={() => setDrawerOpen(true)}
          onAddTx={() => setShowAddTx(true)}
        />
        <div className="flex-1 p-4 md:p-8 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden"
        style={{
          background: '#1a1a1a',
          borderTop: '1px solid rgba(239,68,68,0.18)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center h-14 px-1">
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${
                  isActive ? 'text-red-400' : 'text-white/40'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold">{label}</span>
            </NavLink>
          ))}

          {/* Scan button */}
          <button
            onClick={() => setShowScanner(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#e53935,#f59e0b)' }}
            >
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <span className="text-[9px] font-semibold text-white/40">Scan</span>
          </button>

          {/* Add button */}
          <button
            onClick={() => setShowAddTx(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <Plus className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-[9px] font-semibold text-white/40">Add</span>
          </button>
        </div>
      </nav>

      {showAddTx && <TransactionModal onClose={() => setShowAddTx(false)} />}
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} />}
    </div>
  )
}
