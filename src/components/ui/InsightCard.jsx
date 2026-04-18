/**
 * InsightCard — displays a single financial insight.
 *
 * Props:
 *   insight: { id, type, title, message, icon, color, priority }
 */
export default function InsightCard({ insight }) {
  const { title, message, icon, color } = insight

  // Left accent border color derived from the text color class
  const accentMap = {
    'text-amber-400':   '#fbbf24',
    'text-emerald-400': '#34d399',
    'text-rose-400':    '#fb7185',
    'text-cyan-400':    '#22d3ee',
    'text-violet-400':  '#a78bfa',
  }
  const accentColor = accentMap[color] || '#6366f1'

  return (
    <div
      style={{
        background: 'rgba(22,27,45,0.6)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: '0.75rem',
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: '1.375rem',
          lineHeight: 1,
          flexShrink: 0,
          marginTop: '0.1rem',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Text content */}
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.03em',
            marginBottom: '0.2rem',
          }}
          className={color}
        >
          {title}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: 'rgba(148,163,184,0.85)',
          }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}
