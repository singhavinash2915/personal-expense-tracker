import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function Onboarding() {
  const { dispatch } = useApp()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [choice, setChoice] = useState('fresh')
  const [animating, setAnimating] = useState(false)

  function goToStep2(e) {
    e.preventDefault()
    if (!name.trim()) return
    setAnimating(true)
    setTimeout(() => {
      setStep(2)
      setAnimating(false)
    }, 200)
  }

  function handleGetStarted() {
    dispatch({ type: 'SET_USER_NAME', payload: name.trim() })
    if (choice === 'fresh') {
      dispatch({ type: 'CLEAR_ALL_DATA' })
    }
    dispatch({ type: 'SET_ONBOARDED', payload: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 50%, #0d1a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'inherit',
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: step >= 1 ? '#7c3aed' : 'rgba(124,58,237,0.3)',
          transition: 'background 0.3s',
        }} />
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: step >= 2 ? '#7c3aed' : 'rgba(124,58,237,0.3)',
          transition: 'background 0.3s',
        }} />
      </div>

      {/* Content container */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          opacity: animating ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* Step 1 — Welcome + name */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px', lineHeight: 1 }}>💰</div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '8px',
              letterSpacing: '-0.5px',
            }}>
              Welcome to ExpenseFlow
            </h1>
            <p style={{
              fontSize: '15px',
              color: 'rgba(167,139,250,0.7)',
              marginBottom: '40px',
            }}>
              Your personal finance companion
            </p>

            <form onSubmit={goToStep2} style={{ textAlign: 'left' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(196,181,253,0.9)',
                marginBottom: '8px',
              }}>
                What's your name?
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={40}
                autoFocus
                className="input-field"
                style={{ width: '100%', marginBottom: '20px', boxSizing: 'border-box' }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Continue →
              </button>
            </form>
          </div>
        )}

        {/* Step 2 — Choose data */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '8px',
              letterSpacing: '-0.5px',
            }}>
              How would you like to start?
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'rgba(167,139,250,0.6)',
              marginBottom: '28px',
            }}>
              Hey {name}, choose how to begin your journey
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px', textAlign: 'left' }}>
              {/* Start Fresh card */}
              <button
                onClick={() => setChoice('fresh')}
                style={{
                  background: 'rgba(109,40,217,0.08)',
                  border: choice === 'fresh' ? '2px solid #7c3aed' : '2px solid rgba(109,40,217,0.3)',
                  boxShadow: choice === 'fresh' ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span style={{ fontSize: '32px', lineHeight: 1, flexShrink: 0 }}>🚀</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                        Start Fresh
                      </p>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: 'rgba(124,58,237,0.25)',
                        color: '#a78bfa',
                        letterSpacing: '0.5px',
                      }}>RECOMMENDED</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(196,181,253,0.6)', margin: 0, lineHeight: '1.4' }}>
                      Clean slate, no sample data. Add your real accounts and transactions.
                    </p>
                  </div>
                </div>
              </button>

              {/* Load Demo Data card */}
              <button
                onClick={() => setChoice('demo')}
                style={{
                  background: 'rgba(109,40,217,0.08)',
                  border: choice === 'demo' ? '2px solid #7c3aed' : '2px solid rgba(109,40,217,0.3)',
                  boxShadow: choice === 'demo' ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span style={{ fontSize: '32px', lineHeight: 1, flexShrink: 0 }}>🎯</span>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: '0 0 4px 0' }}>
                      Load Demo Data
                    </p>
                    <p style={{ fontSize: '13px', color: 'rgba(196,181,253,0.6)', margin: 0, lineHeight: '1.4' }}>
                      Explore with sample data. You can clear it anytime from Settings.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={handleGetStarted}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Get Started →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
