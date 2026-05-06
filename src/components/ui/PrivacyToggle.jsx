import { Eye, EyeOff } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function PrivacyToggle({ className = '' }) {
  const { state, dispatch } = useApp()
  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_PRIVACY' })}
      className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform ${className}`}
      style={{ color: 'var(--text-primary)' }}
      title={state.privacyMode ? 'Show all values' : 'Hide all values'}
      aria-label="Privacy toggle"
    >
      {state.privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  )
}
