import { Eye, EyeOff } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function PrivacyToggle({ className = '' }) {
  const { state, dispatch } = useApp()
  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_PRIVACY' })}
      className={`w-9 h-9 rounded-xl flex items-center justify-center ${className}`}
      style={{
        background: state.privacyMode ? 'var(--gold-dim)' : 'var(--bg-elevated)',
        border: `1px solid ${state.privacyMode ? 'rgba(251,191,36,0.3)' : 'var(--border-default)'}`,
        color: state.privacyMode ? 'var(--gold)' : 'var(--text-secondary)',
      }}
      title={state.privacyMode ? 'Show values' : 'Hide values'}
      aria-label="Toggle privacy"
    >
      {state.privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )
}
