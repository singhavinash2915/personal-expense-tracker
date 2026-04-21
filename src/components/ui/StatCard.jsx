export default function StatCard({ gradient, icon, label, value, trend, trendUp, badge }) {
  // `gradient` (legacy) is ignored — we now use consistent glass treatment.
  // Pass `tone` prop for semantic tint: 'default' | 'income' | 'expense' | 'gold'
  return (
    <div
      className="p-3 md:p-5"
      style={{
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-xl)',
      }}
    >
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div
          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-lg md:text-xl"
          style={{
            borderRadius: 'var(--r-md)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {icon}
        </div>
        {badge && (
          <span className="label-mono" style={{ fontSize: 9 }}>
            {badge}
          </span>
        )}
      </div>

      <p className="label-mono" style={{ fontSize: 10 }}>— {label}</p>
      <p
        className="font-display mt-1 truncate"
        style={{
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </p>

      {trend && (
        <p
          className="mt-2 flex items-center gap-1"
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-body)',
            color: trendUp ? 'var(--emerald)' : 'var(--danger)',
            fontWeight: 500,
          }}
        >
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  )
}
