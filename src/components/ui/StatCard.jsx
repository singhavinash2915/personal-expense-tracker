export default function StatCard({ gradient, icon, label, value, trend, trendUp, badge }) {
  return (
    <div className={`hover-lift rounded-2xl p-6 ${gradient} shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
          {icon}
        </div>
        {badge && (
          <span className="text-xs font-medium text-white/70 bg-white/15 px-2.5 py-1 rounded-full">{badge}</span>
        )}
      </div>
      <p className="text-sm text-white/70 font-medium">{label}</p>
      <p className="text-3xl font-bold text-white mt-1 truncate">{value}</p>
      {trend && (
        <p className={`text-sm mt-2 flex items-center gap-1 ${trendUp ? 'text-white/80' : 'text-white/60'}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {trendUp
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
            }
          </svg>
          {trend}
        </p>
      )}
    </div>
  )
}
