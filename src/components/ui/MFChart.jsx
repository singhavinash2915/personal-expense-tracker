import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { calcMFCAGR } from '../../lib/investmentAI'

const RANGE_DAYS = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }

/**
 * Parse AMFI date string DD-Mon-YYYY to a JS Date.
 */
function parseAMFIDate(str) {
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }
  const parts = str.split('-')
  if (parts.length !== 3) return null
  const d = parseInt(parts[0], 10)
  const m = months[parts[1]]
  const y = parseInt(parts[2], 10)
  if (isNaN(d) || m === undefined || isNaN(y)) return null
  return new Date(y, m, d)
}

function fmtShort(dateObj) {
  return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

const NavTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-xs rounded-xl px-3 py-2 shadow-xl"
      style={{ background: 'rgba(13,10,35,0.97)', border: '1px solid rgba(109,40,217,0.3)' }}>
      <p className="text-violet-300 font-semibold mb-0.5">{label}</p>
      <p className="text-white">NAV: ₹{Number(payload[0].value).toFixed(4)}</p>
    </div>
  )
}

export default function MFChart({ mf, onClose }) {
  const [range, setRange]       = useState('1Y')
  const [allData, setAllData]   = useState(null)   // full history from AMFI
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!mf.schemeCode) { setLoading(false); return }
    let cancelled = false
    async function fetchHistory() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${mf.schemeCode}`, {
          signal: AbortSignal.timeout(15000)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        // data comes newest-first; reverse for chronological
        const raw = (json.data || []).reverse()
        if (!cancelled) setAllData(raw)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to fetch NAV history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchHistory()
    return () => { cancelled = true }
  }, [mf.schemeCode])

  // Filter by selected range
  const chartData = (() => {
    if (!allData) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range])
    return allData
      .filter(item => {
        const d = parseAMFIDate(item.date)
        return d && d >= cutoff
      })
      .map(item => ({
        date: fmtShort(parseAMFIDate(item.date)),
        nav:  parseFloat(parseFloat(item.nav).toFixed(4)),
      }))
  })()

  // Stats for selected range
  const navValues = chartData.map(d => d.nav).filter(Boolean)
  const minNAV = navValues.length ? Math.min(...navValues) : null
  const maxNAV = navValues.length ? Math.max(...navValues) : null

  // CAGR using the slice visible in this range
  const sliceHistory = allData
    ? (() => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range])
        return allData.filter(item => {
          const d = parseAMFIDate(item.date)
          return d && d >= cutoff
        })
      })()
    : []
  const cagr = sliceHistory.length >= 2 ? calcMFCAGR(sliceHistory.slice().reverse()) : null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-4"
      style={{ background: 'rgba(5,3,20,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(13,10,35,0.98)',
          border: '1px solid rgba(109,40,217,0.35)',
          maxHeight: '92vh',
        }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(109,40,217,0.18)' }}>
          <div>
            <p className="text-base font-bold text-white leading-snug">{mf.name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="badge-violet text-xs">{mf.category}</span>
              {mf.schemeCode && (
                <span className="text-xs font-mono" style={{ color: 'rgba(196,181,253,0.4)' }}>
                  #{mf.schemeCode}
                </span>
              )}
              {cagr !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                  cagr >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                }`}>
                  CAGR {cagr >= 0 ? '+' : ''}{cagr}%
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-xl flex-shrink-0">
            <X className="w-5 h-5 text-violet-300" />
          </button>
        </div>

        {/* No scheme code */}
        {!mf.schemeCode && (
          <div className="flex items-center justify-center py-14">
            <div className="text-center">
              <p className="text-3xl mb-2">🔗</p>
              <p className="text-sm text-white font-medium">Link an AMFI scheme code to view NAV history</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(196,181,253,0.4)' }}>
                Use the Search button on the fund row to link a scheme code.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {mf.schemeCode && (
          <div className="flex-1 overflow-y-auto">
            {/* Range selector */}
            <div className="flex gap-1.5 px-5 pt-3">
              {Object.keys(RANGE_DAYS).map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    range === r ? 'btn-primary' : 'btn-ghost text-violet-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>

            {/* Stats row */}
            {!loading && !error && chartData.length > 0 && (
              <div className="flex flex-wrap gap-4 px-5 pt-3">
                {[
                  { label: 'Min NAV', value: minNAV != null ? `₹${minNAV.toFixed(4)}` : '—' },
                  { label: 'Max NAV', value: maxNAV != null ? `₹${maxNAV.toFixed(4)}` : '—' },
                  { label: 'Current NAV', value: `₹${parseFloat(mf.currentNav).toFixed(4)}` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(196,181,253,0.4)' }}>{label}</p>
                    <p className="text-sm font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-3 px-5 pt-4 pb-4">
                {[180, 60].map((h, i) => (
                  <div key={i} className="rounded-xl animate-pulse"
                    style={{ height: h, background: 'rgba(109,40,217,0.08)' }} />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center justify-center py-10">
                <div className="text-center">
                  <p className="text-3xl mb-2">📡</p>
                  <p className="text-sm text-rose-400 font-medium">Failed to load NAV history</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(196,181,253,0.4)' }}>{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && chartData.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
                  No NAV data available for this range.
                </p>
              </div>
            )}

            {!loading && !error && chartData.length > 0 && (
              <div className="pt-2 pb-4" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(109,40,217,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(196,181,253,0.45)' }}
                      tickLine={false} axisLine={false}
                      interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(196,181,253,0.45)' }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => `₹${v}`}
                      domain={['auto', 'auto']} width={72} />
                    <Tooltip content={<NavTooltip />} />
                    <Line type="monotone" dataKey="nav" name="NAV" dot={false}
                      stroke="#a78bfa" strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
