import { Eye, EyeOff } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function PrivacyToggle({ className = '' }) {
  const { state, dispatch } = useApp()
  return (
    <button
      onClick={() => dispatch({ type: 'TOGGLE_PRIVACY' })}
      className={`btn-ghost p-2 rounded-xl transition-all ${className}`}
      title={state.privacyMode ? 'Show values' : 'Hide values'}
    >
      {state.privacyMode
        ? <EyeOff className="w-4 h-4 text-amber-400" />
        : <Eye className="w-4 h-4" style={{ color: 'rgba(196,181,253,0.6)' }} />
      }
    </button>
  )
}
