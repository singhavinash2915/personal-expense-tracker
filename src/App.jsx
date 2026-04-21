import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import PWAInstallBanner from './components/ui/PWAInstallBanner'
import BiometricLock from './components/ui/BiometricLock'
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
import AIInsights from './pages/AIInsights'
import Goals from './pages/Goals'
import Onboarding from './pages/Onboarding'
import MonthlyDigest from './pages/MonthlyDigest'
import Forecast from './pages/Forecast'
import Achievements from './pages/Achievements'
import Loans from './pages/Loans'

function AppRoutes() {
  const { state } = useApp()
  const [unlocked, setUnlocked] = useState(false)

  // Lock the app when it goes to background (if biometric is enabled)
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden' && state.biometricLock) {
        setUnlocked(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [state.biometricLock])

  if (!state.onboarded) return <Onboarding />
  if (state.biometricLock && !unlocked) return <BiometricLock onUnlock={() => setUnlocked(true)} />

  return (
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
          <Route path="ai-insights" element={<AIInsights />} />
          <Route path="goals" element={<Goals />} />
          <Route path="digest" element={<MonthlyDigest />} />
          <Route path="forecast" element={<Forecast />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="loans" element={<Loans />} />
        </Route>
      </Routes>
      <PWAInstallBanner />
    </HashRouter>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
