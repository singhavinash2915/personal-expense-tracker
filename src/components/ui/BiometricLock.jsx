import { useEffect, useState } from 'react'
import { authenticateBiometric, checkBiometryAvailable, getBiometryLabel } from '../../lib/biometric'

export default function BiometricLock({ onUnlock }) {
  const [status, setStatus] = useState('checking') // checking | locked | error
  const [error, setError] = useState('')
  const [biometryType, setBiometryType] = useState(null)

  async function attemptUnlock() {
    setStatus('checking')
    setError('')
    const info = await checkBiometryAvailable()
    setBiometryType(info.type)
    if (!info.available) {
      // No biometry — let user through (or they'll see error)
      if (info.reason === 'web') { onUnlock(); return }
      setStatus('error')
      setError('Biometric authentication not available on this device. Please disable it in Settings.')
      return
    }
    const result = await authenticateBiometric('Unlock ExpenseFlow to view your finances')
    if (result.success) {
      onUnlock()
    } else {
      setStatus('locked')
      setError(result.error || 'Authentication cancelled. Tap to try again.')
    }
  }

  useEffect(() => { attemptUnlock() }, [])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)'
    }}>
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* App Logo */}
        <div className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center shadow-2xl" style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 10px 40px rgba(99,102,241,0.4)',
        }}>
          <span className="text-4xl">💰</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">ExpenseFlow</h1>
        <p className="text-sm text-slate-400 mb-8">Your finances, locked tight</p>

        {/* Biometric Icon */}
        <button
          onClick={attemptUnlock}
          disabled={status === 'checking'}
          className="relative w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-transform active:scale-95 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
            border: '2px solid rgba(139,92,246,0.35)',
            boxShadow: '0 0 30px rgba(139,92,246,0.3)',
          }}
        >
          {status === 'checking' ? (
            <svg className="w-10 h-10 text-indigo-300 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 30" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {biometryType === 2 || biometryType === 4 ? (
                // Face ID icon
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3.5H5.5A2 2 0 003.5 5.5V9M21 9V5.5A2 2 0 0019 3.5H15M15 20.5H19A2 2 0 0021 18.5V15M3.5 15V18.5A2 2 0 005.5 20.5H9M9 9v.01M15 9v.01M9 15c1.5 1 4.5 1 6 0M12 9v4l-1.5.5" />
              ) : (
                // Fingerprint icon
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3 0 6 2 9M7 10c0-3 2-5 5-5s5 2 5 5c0 1-.5 3-.5 5M4 13c0-5 3-9 8-9s8 3 8 8M12 15v3M9.5 14c0 2 .5 4 1.5 6" />
              )}
            </svg>
          )}
        </button>

        <p className="text-sm text-indigo-200 mb-1">
          {status === 'checking' ? 'Authenticating…' : `Tap to unlock with ${getBiometryLabel(biometryType)}`}
        </p>
        {error && (
          <p className="text-xs text-rose-400 mt-2 max-w-xs">{error}</p>
        )}
      </div>
    </div>
  )
}
