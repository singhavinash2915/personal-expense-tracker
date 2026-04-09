import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend
} from 'recharts'
import { calcSMA, calcRSI, rsiSignal } from '../../lib/investmentAI'

const RANGES = { '1W': '5d', '1M': '1mo', '3M': '3mo', '1Y': '1y' }

function getInterval(range) {
  if (range === '1W' || range === '1M') return '1d'
  return '1wk'
}

function fmtDate(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="text-xs rounded-xl px-3 py-2 shadow-xl"
      style={{ background: 'rgba(13,10,35,0.97)', border: '1px solid rgba(109,40,217,0.3)' }}>
      <p className="text-violet-300 font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        p.value != null && (
          <p key={i} style={{ color: p.color }}>
            {p.name}: ₹{Number(p.value).toFixed(2)}
          </p>
        )
      ))}
    </div>
  )
}

const RSITooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length || payload[0].value == null) return null
  const sig = rsiSignal(payload[0].value)
  return (
    <div className="text-xs rounded-xl px-3 py-2 shadow-xl"
      style={{ background: 'rgba(13,10,35,0.97)', border: '1px solid rgba(109,40,217,0.3)' }}>
      <p className="text-violet-300 font-semibold mb-0.5">{label}</p>
      <p className={sig.color}>RSI: {payload[0].value?.toFixed(1)} · {sig.label}</p>
    </div>
  )
}

export default function StockChart({ stock, onClose }) {
  const [range, setRange] = useState('1M')
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPrice, setCurrentPrice] = useState(stock.currentPrice)
  const [changePct, setChangePct] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchHistory() {
      setLoading(true)
      setError('')
      try {
        const yhRange = RANGES[range]
        const interval = getInterval(range)
        // Try query2 first (less rate-limited), then query1
        const baseUrls = [
          `https://query2.finance.yahoo.com/v8/finance/chart/${stock.symbol}.NS?range=${yhRange}&interval=${interval}&includePrePost=false`,
          `https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}.NS?range=${yhRange}&interval=${interval}&includePrePost=false`,
        ]
        const proxies = baseUrls.flatMap(u => [
          `https://corsproxy.io/?${encodeURIComponent(u)}`,
          `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        ])

        let json = null
        let lastErr = ''
        for (const proxy of proxies) {
          try {
            const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) })
            if (!res.ok) { lastErr = `HTTP ${res.status}`; continue }
            const raw = await res.json()
            // allorigins wraps in { contents: '...' }
            json = raw?.contents ? JSON.parse(raw.contents) : raw
            if (json?.chart?.result?.[0]) break
            json = null
          } catch { /* try next */ }
        }
        if (!json) throw new Error(`Could not fetch price history (${lastErr || 'all proxies failed'})`)

        const result = json?.chart?.result?.[0]
        if (!result) throw new Error('No data returned')

        const timestamps = result.timestamp || []
        const closes = result.indicators?.quote?.[0]?.close || []

        // Filter out null closes
        const paired = timestamps
          .map((ts, i) => ({ ts, close: closes[i] }))
          .filter(p => p.close != null)

        if (paired.length < 2) throw new Error('Insufficient data')

        const prices = paired.map(p => p.close)
        const sma20  = calcSMA(prices, 20)
        const sma50  = calcSMA(prices, 50)
        const rsi14  = calcRSI(prices, 14)

        const data = paired.map((p, i) => ({
          date:  fmtDate(p.ts),
          price: parseFloat(p.close.toFixed(2)),
          sma20: sma20[i] != null ? parseFloat(sma20[i].toFixed(2)) : null,
          sma50: sma50[i] != null ? parseFloat(sma50[i].toFixed(2)) : null,
          rsi:   rsi14[i],
        }))

        if (!cancelled) {
          setChartData(data)
          const last  = prices[prices.length - 1]
          const first = prices[0]
          setCurrentPrice(parseFloat(last.toFixed(2)))
          setChangePct(parseFloat(((last - first) / first * 100).toFixed(2)))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to fetch price history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchHistory()
    return () => { cancelled = true }
  }, [stock.symbol, range])

  const lastRSI  = chartData.length ? chartData[chartData.length - 1]?.rsi : null
  const signal   = rsiSignal(lastRSI)
  const showSMA50 = range === '3M' || range === '1Y'
  const up       = changePct !== null ? changePct >= 0 : true

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
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(109,40,217,0.18)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <span className="text-lg font-bold text-violet-300">{stock.symbol}</span>
              <span className="ml-2 text-sm text-white/60">{stock.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">₹{currentPrice.toFixed(2)}</span>
              {changePct !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${up ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                  {up ? '+' : ''}{changePct}%
                </span>
              )}
            </div>
            {lastRSI != null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${signal.color} border-current/20`}
                style={{ background: 'rgba(109,40,217,0.08)' }}>
                RSI {lastRSI.toFixed(1)} · {signal.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-xl flex-shrink-0">
            <X className="w-5 h-5 text-violet-300" />
          </button>
        </div>

        {/* Range selector */}
        <div className="flex gap-1.5 px-5 pt-3">
          {Object.keys(RANGES).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                range === r ? 'btn-primary' : 'btn-ghost text-violet-300'
              }`}>
              {r}
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading && (
            <div className="flex flex-col gap-3 px-3 pt-4">
              {[140, 100, 80].map((h, i) => (
                <div key={i} className="rounded-xl animate-pulse"
                  style={{ height: h, background: 'rgba(109,40,217,0.08)' }} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center justify-center py-10">
              <div className="text-center">
                <p className="text-3xl mb-2">📡</p>
                <p className="text-sm text-rose-400 font-medium">Failed to load price history</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(196,181,253,0.4)' }}>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && chartData.length > 0 && (
            <>
              {/* Price + SMA chart */}
              <div className="pt-3" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(109,40,217,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(196,181,253,0.45)' }}
                      tickLine={false} axisLine={false}
                      interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(196,181,253,0.45)' }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => `₹${v}`}
                      domain={['auto', 'auto']} width={62} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="plainline"
                      wrapperStyle={{ fontSize: 10, color: 'rgba(196,181,253,0.6)', paddingTop: 4 }} />
                    <Line type="monotone" dataKey="price" name="Price" dot={false}
                      stroke="#a78bfa" strokeWidth={1.8} connectNulls />
                    <Line type="monotone" dataKey="sma20" name="SMA 20" dot={false}
                      stroke="#22d3ee" strokeWidth={1.2} strokeDasharray="4 3" connectNulls />
                    {showSMA50 && (
                      <Line type="monotone" dataKey="sma50" name="SMA 50" dot={false}
                        stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="4 3" connectNulls />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* RSI chart */}
              <div className="px-3 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'rgba(196,181,253,0.4)' }}>RSI (14)</p>
              </div>
              <div style={{ height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(109,40,217,0.08)" />
                    <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(196,181,253,0.35)' }}
                      tickLine={false} axisLine={false} width={30}
                      ticks={[0, 30, 50, 70, 100]} />
                    <Tooltip content={<RSITooltip />} />
                    <ReferenceLine y={70} stroke="rgba(244,63,94,0.45)" strokeDasharray="4 2"
                      label={{ value: '70', position: 'right', fontSize: 9, fill: 'rgba(244,63,94,0.6)' }} />
                    <ReferenceLine y={30} stroke="rgba(52,211,153,0.45)" strokeDasharray="4 2"
                      label={{ value: '30', position: 'right', fontSize: 9, fill: 'rgba(52,211,153,0.6)' }} />
                    <Line type="monotone" dataKey="rsi" name="RSI" dot={false}
                      stroke="#818cf8" strokeWidth={1.4} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
