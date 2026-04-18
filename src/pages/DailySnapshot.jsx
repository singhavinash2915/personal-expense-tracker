import { useRef, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatINR, currentMonthYear } from '../lib/utils'
import { calculateNetWorth } from '../lib/netWorth'

// A shareable daily snapshot — an alternative to native home-screen widgets.
// User can save/share this as an image to their home screen or social.

export default function DailySnapshot() {
  const { state, getMonthlyStats } = useApp()
  const shareRef = useRef(null)
  const [sharing, setSharing] = useState(false)

  const today = new Date()
  const month = currentMonthYear()
  const { income, expenses } = getMonthlyStats(month)
  const net = useMemo(() => calculateNetWorth(state), [state])

  // Today's transactions
  const todayKey = today.toISOString().slice(0, 10)
  const todayTx = state.transactions.filter(t => t.date === todayKey)
  const todayExpense = todayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Daily budget burn — % of month elapsed vs % of expenses
  const day = today.getDate()
  const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const monthProgress = (day / totalDays) * 100
  const burnRate = income > 0 ? (expenses / income) * 100 : 0
  const daysLeft = totalDays - day

  async function shareSnapshot() {
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(shareRef.current, { backgroundColor: null, scale: 2, useCORS: true })
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'snap.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], `expenseflow-snap.png`, { type: 'image/png' })],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'expenseflow-snap.png'; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) { alert('Share failed: ' + err.message) }
    setSharing(false)
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Today's Snapshot</h2>
          <p className="text-xs text-slate-400">Save as wallpaper or share with friends</p>
        </div>
        <button onClick={shareSnapshot} disabled={sharing}
          className="px-4 py-2 rounded-lg font-semibold text-sm text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {sharing ? 'Sharing…' : '📤 Share'}
        </button>
      </div>

      {/* Square format snapshot — optimized for 1:1 share */}
      <div ref={shareRef} className="rounded-3xl overflow-hidden relative aspect-square max-w-md mx-auto" style={{
        background: 'linear-gradient(135deg, #0c0f1a 0%, #1e1b4b 40%, #4338ca 100%)',
      }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <div className="relative z-10 p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
                {today.toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <p className="text-xs text-indigo-200/70">
                {today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">💰</p>
              <p className="text-[10px] text-indigo-200/60">ExpenseFlow</p>
            </div>
          </div>

          {/* Net worth center */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200/60 mb-1">Net Worth</p>
            <p className={`text-3xl md:text-5xl font-black mb-2 ${net.netWorth >= 0 ? 'text-white' : 'text-rose-300'}`}
              style={{ textShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
              {formatINR(net.netWorth)}
            </p>

            {/* Today chip */}
            {todayExpense > 0 && (
              <div className="mt-3 px-3 py-1.5 rounded-full" style={{ background: 'rgba(225,29,72,0.15)', border: '1px solid rgba(225,29,72,0.3)' }}>
                <p className="text-xs text-rose-300">Today: −{formatINR(todayExpense)}</p>
              </div>
            )}
          </div>

          {/* Bottom stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] text-indigo-200/70 uppercase">Income</p>
              <p className="text-xs font-bold text-emerald-300 truncate">{formatINR(income)}</p>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] text-indigo-200/70 uppercase">Spent</p>
              <p className="text-xs font-bold text-rose-300 truncate">{formatINR(expenses)}</p>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[9px] text-indigo-200/70 uppercase">Burn</p>
              <p className={`text-xs font-bold truncate ${burnRate > monthProgress ? 'text-rose-300' : 'text-emerald-300'}`}>
                {burnRate.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Progress footer */}
          <div className="mt-3">
            <div className="flex justify-between text-[9px] text-indigo-200/60 mb-1">
              <span>Day {day} of {totalDays}</span>
              <span>{daysLeft} days left</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full"
                style={{
                  width: `${monthProgress}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #6366f1, #8b5cf6)'
                }} />
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        💡 Tip: Save this as your wallpaper for an always-visible "widget"
      </p>
    </div>
  )
}
