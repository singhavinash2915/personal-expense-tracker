import { useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { generateMonthlyDigest } from '../lib/monthlyDigest'
import { formatINR, currentMonthYear } from '../lib/utils'

export default function MonthlyDigest() {
  const { state } = useApp()
  const [monthKey, setMonthKey] = useState(currentMonthYear())
  const shareRef = useRef(null)
  const [sharing, setSharing] = useState(false)

  const digest = useMemo(() => generateMonthlyDigest(state, monthKey), [state, monthKey])

  // Last 12 months for picker
  const months = useMemo(() => {
    const out = []
    const d = new Date(); d.setDate(1)
    for (let i = 0; i < 12; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' })
      out.push({ key, label })
      d.setMonth(d.getMonth() - 1)
    }
    return out
  }, [])

  async function shareDigest() {
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(shareRef.current, { backgroundColor: null, scale: 2, useCORS: true })
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'digest.png', { type: 'image/png' })] })) {
        await navigator.share({
          title: `My ${digest.monthName} Wrap — ExpenseFlow`,
          text: `I saved ${digest.savingsRate.toFixed(0)}% in ${digest.monthName}! 💰`,
          files: [new File([blob], `expenseflow-${digest.month}.png`, { type: 'image/png' })],
        })
      } else {
        // Fallback — download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `expenseflow-${digest.month}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      alert('Share failed: ' + err.message)
    }
    setSharing(false)
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Month picker */}
      <div className="flex items-center justify-between gap-2">
        <select value={monthKey} onChange={e => setMonthKey(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800/40 border border-indigo-500/20 text-white text-sm">
          {months.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <button onClick={shareDigest} disabled={sharing}
          className="px-4 py-2 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {sharing ? 'Sharing…' : '📤 Share'}
        </button>
      </div>

      {/* Shareable card */}
      <div ref={shareRef} className="rounded-3xl overflow-hidden relative" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #4338ca 75%, #6366f1 100%)',
      }}>
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 p-5 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/80">Your Monthly Wrap</p>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white mt-1">{digest.monthName}</h1>
          </div>

          {/* Big savings rate */}
          <div className="text-center mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200/70 mb-1">You Saved</p>
            <p className="text-5xl md:text-7xl font-black text-white" style={{ textShadow: '0 0 40px rgba(139,92,246,0.6)' }}>
              {digest.savingsRate.toFixed(0)}%
            </p>
            <p className="text-sm text-indigo-200 mt-1">
              {formatINR(digest.balance)} of {formatINR(digest.income)}
            </p>
          </div>

          {/* Achievements */}
          {digest.achievements.length > 0 && (
            <div className="space-y-2 mb-6">
              {digest.achievements.slice(0, 3).map((a, i) => (
                <div key={i} className="rounded-xl p-3 backdrop-blur-sm flex items-center gap-3"
                  style={{
                    background: a.tone === 'gold' ? 'rgba(251,191,36,0.15)'
                      : a.tone === 'silver' ? 'rgba(203,213,225,0.12)'
                      : a.tone === 'fire' ? 'rgba(249,115,22,0.15)'
                      : 'rgba(245,158,11,0.12)',
                    border: `1px solid ${a.tone === 'gold' ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.15)'}`,
                  }}>
                  <span className="text-2xl">{a.icon}</span>
                  <p className="text-sm font-semibold text-white flex-1">{a.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Fun facts */}
          <div className="grid grid-cols-1 gap-2 mb-6">
            {digest.funFacts.map((f, i) => (
              <div key={i} className="rounded-xl p-3 flex items-center justify-between" style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/70">{f.label}</p>
                  <p className="text-base font-bold text-white mt-0.5">{f.value}</p>
                </div>
                <p className="text-xs text-indigo-200/80 text-right max-w-[50%] truncate">{f.sub}</p>
              </div>
            ))}
          </div>

          {/* Top categories */}
          {digest.topCats.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200/70 mb-2">Top Spending</p>
              <div className="space-y-1.5">
                {digest.topCats.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-base">{c.icon}</span>
                    <span className="text-sm text-white flex-1 truncate">{c.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden max-w-[100px]">
                      <div className="h-full rounded-full"
                        style={{ width: `${c.pct}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
                    </div>
                    <span className="text-xs font-bold text-amber-300 w-12 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div>
              <p className="text-xs text-indigo-200/60">Tracked {digest.uniqueDays}/{digest.daysInMonth} days</p>
              <p className="text-xs text-indigo-200/60">{digest.txCount} transactions</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">💰 ExpenseFlow</p>
              <p className="text-[10px] text-indigo-200/60">Your finance companion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed breakdown (not shared) */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-[10px] text-emerald-300/70 uppercase">Income</p>
            <p className="text-base font-bold text-white">{formatINR(digest.income)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)' }}>
            <p className="text-[10px] text-rose-300/70 uppercase">Expenses</p>
            <p className="text-base font-bold text-white">{formatINR(digest.expenses)}</p>
          </div>
          <div className="rounded-xl p-3 col-span-2" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-[10px] text-indigo-300/70 uppercase">vs Last Month</p>
            <p className="text-base font-bold text-white">
              {digest.expDelta > 0 ? '📈' : '📉'} {digest.expDelta > 0 ? '+' : ''}{digest.expDelta}% spending
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
