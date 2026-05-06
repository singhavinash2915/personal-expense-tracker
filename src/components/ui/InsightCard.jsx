/**
 * InsightCard — Money Split style: clean card with colored left bar.
 */
export default function InsightCard({ insight }) {
  const { title, message, icon, type, color } = insight

  let toneClass = ''
  if (type === 'success' || color === 'text-emerald-400') toneClass = 'positive'
  else if (type === 'warning' || color === 'text-rose-400') toneClass = 'warning'

  return (
    <div className={`insight ${toneClass}`} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {icon && (
        <span
          style={{
            fontSize: 24,
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
