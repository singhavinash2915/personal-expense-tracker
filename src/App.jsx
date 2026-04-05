import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/layout/Layout'
import PWAInstallBanner from './components/ui/PWAInstallBanner'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'
import Budgets from './pages/Budgets'
import Accounts from './pages/Accounts'
import CreditCards from './pages/CreditCards'
import Subscriptions from './pages/Subscriptions'
import Investments from './pages/Investments'
import Settings from './pages/Settings'
import PrivacyPolicy from './pages/PrivacyPolicy'
import HealthScore from './pages/HealthScore'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="credit" element={<CreditCards />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="investments" element={<Investments />} />
            <Route path="settings" element={<Settings />} />
            <Route path="privacy" element={<PrivacyPolicy />} />
            <Route path="health" element={<HealthScore />} />
          </Route>
        </Routes>
        <PWAInstallBanner />
      </HashRouter>
    </AppProvider>
  )
}
