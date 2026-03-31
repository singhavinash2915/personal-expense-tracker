import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

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
}

export default function Layout() {
  const { pathname } = useLocation()
  const meta = pageMeta[pathname] || { title: 'ExpenseFlow', subtitle: '' }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <div className="flex-1 p-8 page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
