/**
 * InsightCard — Glassmorphic emerald/gold insight per design system.
 *
 * Props:
 *   insight: { id, type, title, message, icon, color, priority }
 *   type: 'warning' | 'success' | 'tip' | 'info'
 */
export default function InsightCard({ insight }) {
  const { title, message, icon, type, color } = insight

  // Determine left border color based on type or legacy color class
  let accentClass = ''
  if (type === 'success' || color === 'text-emerald-400') accentClass = 'positive'
  else if (type === 'warning' || color === 'text-rose-400') accentClass = 'warning'
  // default = gold (from CSS)

  return (
    <div className={`insight ${accentClass}`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {icon && (
        <span
          style={{
            fontSize: 22,
            lineHeight: 1,
            flexShrink: 0,
            marginTop: 2,
            userSelect: 'none',
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    </div>
  )
}
