import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { BADGES, LEVELS, getLevel, calculateStreak, evaluateBadges, calculateXP } from '../lib/gamification'

export default function Achievements() {
  const { state } = useApp()
  const unlocked = useMemo(() => evaluateBadges(state), [state])
  const xp = useMemo(() => calculateXP(state, unlocked), [state, unlocked])
  const level = getLevel(xp)
  const { current, longest } = useMemo(() => calculateStreak(state.transactions || []), [state.transactions])

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero Level Card */}
      <div className="rounded-3xl overflow-hidden relative p-5 md:p-6" style={{
        background: `linear-gradient(135deg, #0f172a 0%, ${level.color}33 60%, ${level.color}88 100%)`
      }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${level.color}, transparent 70%)` }} />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Level {level.n}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{level.name}</h1>
          <p className="text-sm text-white/80 mt-1">{xp.toLocaleString()} XP</p>

          {/* Level progress */}
          {level.nextMin && (
            <>
              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${level.progress}%`, background: level.color }} />
              </div>
              <p className="text-[10px] text-white/60 mt-1">
                {level.nextMin - xp} XP to next level
              </p>
            </>
          )}
        </div>
      </div>

      {/* Streak + Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile icon="🔥" label="Streak" value={current} suffix="days" />
        <StatTile icon="🏆" label="Longest" value={longest} suffix="days" />
        <StatTile icon="🎖️" label="Badges" value={unlocked.length} suffix={`/${BADGES.length}`} />
      </div>

      {/* Badges grid */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Achievements</h3>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map(b => {
            const done = unlocked.includes(b.id)
            return (
              <div key={b.id} className={`rounded-2xl p-3 text-center transition ${done ? '' : 'opacity-40'}`}
                style={{
                  background: done
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))'
                    : 'rgba(255,255,255,0.04)',
                  border: done ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: done ? '0 4px 16px rgba(139,92,246,0.25)' : 'none'
                }}>
                <div className={`text-3xl mb-1 ${done ? '' : 'grayscale'}`}>{b.icon}</div>
                <p className="text-[11px] font-semibold text-white truncate">{b.name}</p>
                <p className="text-[9px] text-white/50 line-clamp-2 min-h-[20px] mt-0.5">{b.desc}</p>
                <p className="text-[9px] font-bold text-amber-300 mt-1">+{b.xp} XP</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Levels preview */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Journey</h3>
        <div className="space-y-2">
          {LEVELS.map(l => {
            const reached = xp >= l.min
            return (
              <div key={l.n} className={`flex items-center gap-3 p-2.5 rounded-xl ${reached ? '' : 'opacity-40'}`}
                style={{
                  background: reached ? `${l.color}15` : 'rgba(255,255,255,0.03)',
                  border: reached ? `1px solid ${l.color}44` : '1px solid rgba(255,255,255,0.06)',
                }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: l.color }}>
                  {l.n}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{l.name}</p>
                  <p className="text-[10px] text-white/50">{l.min.toLocaleString()} XP required</p>
                </div>
                {reached && <span className="text-emerald-400 text-sm">✓</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value, suffix }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xl">{icon}</p>
      <p className="text-xl font-extrabold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-white/50">{label} {suffix}</p>
    </div>
  )
}
