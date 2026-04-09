/**
 * investmentAI.js — Pure financial calculation utilities.
 * No React imports. No side effects.
 */

/**
 * Calculate CAGR (Compound Annual Growth Rate).
 * Returns a percentage like 18.4, or null if holding period < 1 month.
 *
 * @param {number} avgCost - Average cost / NAV at purchase
 * @param {number} currentPrice - Current price / NAV
 * @param {number} yearsHeld - Number of years held (can be fractional)
 * @returns {number|null}
 */
export function calcCAGR(avgCost, currentPrice, yearsHeld) {
  if (!avgCost || !currentPrice || avgCost <= 0 || currentPrice <= 0) return null
  if (yearsHeld < 1 / 12) return null // less than 1 month
  const cagr = (Math.pow(currentPrice / avgCost, 1 / yearsHeld) - 1) * 100
  return parseFloat(cagr.toFixed(2))
}

/**
 * Calculate Simple Moving Average (SMA) over a rolling window.
 * Returns an array of the same length; first (period-1) entries are null.
 *
 * @param {number[]} prices - Array of price values
 * @param {number} period - Window size
 * @returns {(number|null)[]}
 */
export function calcSMA(prices, period) {
  if (!prices || prices.length === 0 || period <= 0) return []
  return prices.map((_, i) => {
    if (i < period - 1) return null
    const slice = prices.slice(i - period + 1, i + 1)
    const sum = slice.reduce((a, b) => a + (b ?? 0), 0)
    return parseFloat((sum / period).toFixed(4))
  })
}

/**
 * Calculate RSI-14 (Relative Strength Index).
 * Returns an array of the same length; first `period` entries are null.
 *
 * @param {number[]} prices - Array of closing prices
 * @param {number} [period=14]
 * @returns {(number|null)[]}
 */
export function calcRSI(prices, period = 14) {
  if (!prices || prices.length <= period) return prices.map(() => null)

  const result = new Array(prices.length).fill(null)

  // Build initial gains/losses over first `period` intervals
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) avgGain += diff
    else avgLoss += Math.abs(diff)
  }
  avgGain /= period
  avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result[period] = parseFloat((100 - 100 / (1 + rs)).toFixed(2))

  // Wilder smoothing for remaining entries
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss
    result[i] = parseFloat((100 - 100 / (1 + rs2)).toFixed(2))
  }

  return result
}

/**
 * Interpret an RSI value into a human-readable signal with a Tailwind colour class.
 *
 * @param {number|null} rsi
 * @returns {{ label: string, color: string }}
 */
export function rsiSignal(rsi) {
  if (rsi === null || rsi === undefined) return { label: 'N/A', color: 'text-violet-400' }
  if (rsi > 70) return { label: 'Overbought', color: 'text-rose-400' }
  if (rsi < 30) return { label: 'Oversold', color: 'text-emerald-400' }
  return { label: 'Neutral', color: 'text-cyan-400' }
}

/**
 * Calculate CAGR from an AMFI NAV history array.
 * Each element: { date: string (DD-Mon-YYYY), nav: string|number }
 * Uses the oldest and newest data points in the array.
 *
 * @param {{ date: string, nav: string|number }[]} navHistory
 * @returns {number|null}
 */
export function calcMFCAGR(navHistory) {
  if (!navHistory || navHistory.length < 2) return null

  // AMFI returns newest first — reverse to get chronological order
  const sorted = [...navHistory].reverse()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const firstNav = parseFloat(first.nav)
  const lastNav = parseFloat(last.nav)

  if (!firstNav || !lastNav || firstNav <= 0) return null

  // Parse DD-Mon-YYYY
  const parseAMFIDate = (str) => {
    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }
    const parts = str.split('-')
    if (parts.length !== 3) return null
    const d = parseInt(parts[0], 10)
    const m = months[parts[1]]
    const y = parseInt(parts[2], 10)
    if (isNaN(d) || m === undefined || isNaN(y)) return null
    return new Date(y, m, d)
  }

  const startDate = parseAMFIDate(first.date)
  const endDate   = parseAMFIDate(last.date)
  if (!startDate || !endDate) return null

  const diffMs = endDate - startDate
  const yearsHeld = diffMs / (1000 * 60 * 60 * 24 * 365.25)

  return calcCAGR(firstNav, lastNav, yearsHeld)
}
