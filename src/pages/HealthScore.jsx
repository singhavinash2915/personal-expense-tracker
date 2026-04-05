import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { calculateHealthScore } from '../lib/healthScore'

// SVG circular progress arc
function ScoreCircle({ total, color }) {
  const radius       = 80
  const stroke       = 10
  const size         = (radius + stroke) * 2
  const circumference = 2 * Math.PI * radius
  const offset       = circumference - (total / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

function gradeExplanation(grade) {
  switch (grade) {
    case 'Excellent': return 'Your finances are in outstanding shape. You\'re saving well, managing debt wisely, and building long-term wealth.'
    case 'Good':      return 'You\'re on solid ground financially. A few targeted improvements can push you into excellent territory.'
    case 'Fair':      return 'You have a reasonable foundation, but there are clear gaps. Focus on the lowest-scoring pillars first.'
    case 'Needs Work':return 'Your financial health needs attention. Start with one pillar at a time — small, consistent changes matter most.'
    default:          return 'Your finances are under significant stress. Prioritise cutting expenses and eliminating high-interest debt immediately.'
  }
}

export default function HealthScore() {
  const { state } = useApp()

  const score = useMemo(() => calculateHealthScore(state), [state])

  // Sort pillars by score ascending to surface the weakest ones first for action steps
  const weakPillars = [...score.pillars].sort((a, b) => (a.score / a.max) - (b.score / b.max)).slice(0, 3)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Top: circular score display ── */}
      <div className="card p-6 md:p-8 flex flex-col items-center gap-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

        <p className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(196,181,253,0.5)' }}>
          Your financial health score
        </p>

        {/* Circle + centered text */}
        <div className="relative" style={{ width: 180, height: 180 }}>
          <ScoreCircle total={score.total} color={score.color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-5xl font-extrabold text-white leading-none">{score.total}</span>
            <span className="text-xl">{score.emoji}</span>
            <span className="text-sm font-semibold mt-0.5" style={{ color: score.color }}>{score.grade}</span>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: 'rgba(196,181,253,0.45)' }}>
          Score out of 100 · Based on 5 financial pillars
        </p>
      </div>

      {/* ── Middle: pillar cards ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white px-1">Score Breakdown</h2>

        {score.pillars.map(pillar => {
          const pct         = Math.round((pillar.score / pillar.max) * 100)
          const barColor    = pct === 100 ? '#10b981' : pct >= 60 ? '#06b6d4' : pct >= 30 ? '#f59e0b' : '#e11d48'

          return (
            <div key={pillar.name} className="card p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{pillar.icon}</span>
                  <span className="text-sm font-semibold text-white">{pillar.name}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: barColor }}>
                  {pillar.score} <span className="text-xs font-normal" style={{ color: 'rgba(196,181,253,0.4)' }}>/ {pillar.max}</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="progress-track mb-2">
                <div
                  className="progress-fill"
                  style={{
                    width: `${pct}%`,
                    background: barColor,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>

              {/* Tip */}
              <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{pillar.tip}</p>
            </div>
          )
        })}
      </div>

      {/* ── Bottom: "What this means" card ── */}
      <div className="card p-5 md:p-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${score.color}30` }}>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{score.emoji}</span>
          <h2 className="text-sm font-semibold text-white">What "{score.grade}" means</h2>
        </div>

        <p className="text-sm mb-4" style={{ color: 'rgba(196,181,253,0.65)' }}>
          {gradeExplanation(score.grade)}
        </p>

        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'rgba(196,181,253,0.4)' }}>
          Recommended next steps
        </h3>

        <ul className="space-y-2">
          {weakPillars.map(p => (
            <li key={p.name} className="flex items-start gap-2 text-sm"
              style={{ color: 'rgba(196,181,253,0.7)' }}>
              <span className="mt-0.5 flex-shrink-0">{p.icon}</span>
              <span>
                <span className="font-medium text-white">{p.name}: </span>
                {p.tip}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" className="btn-ghost text-xs">← Back to Dashboard</Link>
        </div>
      </div>

    </div>
  )
}
