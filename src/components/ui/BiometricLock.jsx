import { useEffect, useState } from 'react'
import { authenticateBiometric, checkBiometryAvailable, getBiometryLabel } from '../../lib/biometric'

export default function BiometricLock({ onUnlock }) {
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')
  const [biometryType, setBiometryType] = useState(null)

  async function attemptUnlock() {
    setStatus('checking')
    setError('')
    const info = await checkBiometryAvailable()
    setBiometryType(info.type)
    if (!info.available) {
      if (info.reason === 'web') { onUnlock(); return }
      setStatus('error')
      setError('Biometric authentication not available. Please disable in Settings.')
      return
    }
    const result = await authenticateBiometric('Unlock ExpenseFlow to view your finances')
    if (result.success) {
      onUnlock()
    } else {
      setStatus('locked')
      setError(result.error || 'Tap to try again')
    }
  }

  useEffect(() => { attemptUnlock() }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: 'var(--bg-base)',
        backgroundImage:
          'radial-gradient(900px 600px at 85% 0%, rgba(52,211,153,0.18), transparent 60%), radial-gradient(800px 600px at 0% 100%, rgba(251,191,36,0.12), transparent 60%), linear-gradient(180deg, #03110d 0%, #050a08 100%)'
      }}
    >
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Logo mark */}
        <div
          className="w-20 h-20 mb-6 flex items-center justify-center"
          style={{
            borderRadius: 'var(--r-2xl)',
            background: 'var(--gradient-brand)',
            boxShadow: 'var(--glow-gold)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 38, color: 'var(--bg-base)' }}>₹</span>
        </div>

        <div className="label-mono" style={{ fontSize: 10 }}>— ExpenseFlow</div>
        <h1
          className="font-display"
          style={{
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            marginTop: 6,
            color: 'var(--text-primary)',
          }}
        >
          Your finances, <em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>locked.</em>
        </h1>
        <p className="body-secondary" style={{ marginTop: 8, fontSize: 13 }}>
          Authenticate to continue
        </p>

        {/* Biometric icon */}
        <button
          onClick={attemptUnlock}
          disabled={status === 'checking'}
          className="relative w-24 h-24 rounded-full flex items-center justify-center mt-10 mb-4 transition-transform active:scale-95 disabled:opacity-50"
          style={{
            background: 'var(--emerald-dim)',
            border: '1px solid var(--border-accent)',
            boxShadow: '0 0 40px rgba(52,211,153,0.25)',
          }}
          aria-label="Unlock with biometric"
        >
          {status === 'checking' ? (
            <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--emerald)' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 30" />
            </svg>
          ) : (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--emerald)' }}>
              {biometryType === 2 || biometryType === 4 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 3.5H5.5A2 2 0 003.5 5.5V9M21 9V5.5A2 2 0 0019 3.5H15M15 20.5H19A2 2 0 0021 18.5V15M3.5 15V18.5A2 2 0 005.5 20.5H9M9 9v.01M15 9v.01M9 15c1.5 1 4.5 1 6 0M12 9v4l-1.5.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 11c0 3 0 6 2 9M7 10c0-3 2-5 5-5s5 2 5 5c0 1-.5 3-.5 5M4 13c0-5 3-9 8-9s8 3 8 8M12 15v3M9.5 14c0 2 .5 4 1.5 6" />
              )}
            </svg>
          )}
        </button>

        <p className="label-mono" style={{ fontSize: 10 }}>
          {status === 'checking' ? 'Authenticating…' : `Tap to unlock with ${getBiometryLabel(biometryType)}`}
        </p>
        {error && (
          <p className="body-secondary" style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
