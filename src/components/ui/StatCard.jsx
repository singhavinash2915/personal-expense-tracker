export default function StatCard({ gradient, icon, label, value, trend, trendUp, badge }) {
  return (
    <div className={`hover-lift rounded-2xl p-3 md:p-6 ${gradient} shadow-lg`}>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white/20 flex items-center justify-center text-lg md:text-2xl">
          {icon}
        </div>
        {badge && (
          <span className="text-[9px] md:text-xs font-medium text-white/70 bg-white/15 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full">{badge}</span>
        )}
      </div>
      <p className="text-xs md:text-sm text-white/70 font-medium">{label}</p>
      <p className="text-xl md:text-3xl font-bold text-white mt-0.5 md:mt-1 truncate">{value}</p>
      {trend && (
        <p className={`text-[10px] md:text-sm mt-1 md:mt-2 flex items-center gap-1 ${trendUp ? 'text-white/80' : 'text-white/60'}`}>
          <svg className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
