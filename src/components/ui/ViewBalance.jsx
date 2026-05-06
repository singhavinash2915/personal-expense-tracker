import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Privacy-first balance pill.
 * Shows "View Balance" until tapped, then reveals the value.
 *
 * Usage:
 *   <ViewBalance value={formatINR(account.balance)} />
 */
export default function ViewBalance({ value, label = 'View Balance', size = 'sm' }) {
  const [revealed, setRevealed] = useState(false)
  const fontSize = size === 'lg' ? 22 : size === 'md' ? 18 : 14

  return revealed ? (
    <button
      onClick={() => setRevealed(false)}
      className="inline-flex items-center gap-2"
      style={{
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
      }}
      aria-label="Hide balance"
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
      <EyeOff className="w-4 h-4" style={{ color: 'var(--text-light)' }} />
    </button>
  ) : (
    <button
      onClick={() => setRevealed(true)}
      className="btn-eye"
      aria-label="View balance"
    >
      <Eye className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
