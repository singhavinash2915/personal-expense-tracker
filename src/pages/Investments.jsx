import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, RefreshCw, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, formatINRDecimal, generateId } from '../lib/utils'
import { fetchNAV, searchSchemes, isValidSchemeCode, sanitiseSchemeCode } from '../lib/mfapi'

const EMPTY_MF = { name: '', category: '', units: '', avgNav: '', currentNav: '', schemeCode: '' }
const EMPTY_ST = { symbol: '', name: '', exchange: 'NSE', shares: '', avgCost: '', currentPrice: '' }

const MF_CATEGORIES = ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'ELSS', 'Debt', 'Index', 'International']

function formatNavDate(dateStr) {
  if (!dateStr) return ''
  // AMFI returns dates like "05-Apr-2026" — parse directly
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }
    const d = parseInt(parts[0], 10)
    const m = months[parts[1]]
    const y = parseInt(parts[2], 10)
    if (!isNaN(d) && m !== undefined && !isNaN(y)) {
      return new Date(y, m, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }
  }
  // Fallback: try native parse
  const dt = new Date(dateStr)
  if (!isNaN(dt)) return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return dateStr
}

export default function Investments() {
  const { state, dispatch } = useApp()
  const mfs    = state.mutualFunds || []
  const stocks = state.stocks || []

  const [activeTab, setActiveTab] = useState('mf')
  const [showMFForm, setShowMFForm]   = useState(false)
  const [showSTForm, setShowSTForm]   = useState(false)
  const [editMF, setEditMF]   = useState(null)
  const [editST, setEditST]   = useState(null)
  const [mfForm, setMFForm]   = useState(EMPTY_MF)
  const [stForm, setSTForm]   = useState(EMPTY_ST)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [navRefreshingId, setNavRefreshingId] = useState(null)

  // Scheme search state: { mfId, query, results, loading, error }
  const [schemeSearch, setSchemeSearch] = useState(null)
  const schemeSearchRef = useRef(null)

  // Fund name autocomplete state (in Add/Edit form)
  const [nameSuggestions, setNameSuggestions] = useState([])
  const [nameSearching, setNameSearching]     = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nameDebounceRef = useRef(null)

  // Debounced AMFI search whenever fund name changes in the form
  useEffect(() => {
    const query = mfForm.name.trim()
    if (query.length < 3) { setNameSuggestions([]); setShowSuggestions(false); return }
    clearTimeout(nameDebounceRef.current)
    nameDebounceRef.current = setTimeout(async () => {
      setNameSearching(true)
      try {
        const results = await searchSchemes(query)
        setNameSuggestions(results.slice(0, 8))
        setShowSuggestions(results.length > 0)
      } catch {
        setNameSuggestions([])
        setShowSuggestions(false)
      } finally {
        setNameSearching(false)
      }
    }, 350)
    return () => clearTimeout(nameDebounceRef.current)
  }, [mfForm.name])

  // MF calculations
  const mfData = mfs.map(mf => {
    const invested  = mf.units * mf.avgNav
    const current   = mf.units * mf.currentNav
    const gain      = current - invested
    const gainPct   = invested > 0 ? (gain / invested * 100) : 0
    return { ...mf, invested, current, gain, gainPct }
  })
  const totalMFInvested = mfData.reduce((s, m) => s + m.invested, 0)
  const totalMFCurrent  = mfData.reduce((s, m) => s + m.current,  0)
  const totalMFGain     = totalMFCurrent - totalMFInvested

  // Stock calculations
  const stockData = stocks.map(st => {
    const invested  = st.shares * st.avgCost
    const current   = st.shares * st.currentPrice
    const gain      = current - invested
    const gainPct   = invested > 0 ? (gain / invested * 100) : 0
    return { ...st, invested, current, gain, gainPct }
  })
  const totalSTInvested = stockData.reduce((s, st) => s + st.invested, 0)
  const totalSTCurrent  = stockData.reduce((s, st) => s + st.current,  0)
  const totalSTGain     = totalSTCurrent - totalSTInvested

  const totalPortfolio  = totalMFCurrent + totalSTCurrent
  const totalInvested   = totalMFInvested + totalSTInvested
  const totalGain       = totalPortfolio - totalInvested

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Refresh all MF NAVs that have a schemeCode
  async function handleRefreshAllNAV() {
    const fundsWithCode = mfs.filter(mf => mf.schemeCode)
    if (!fundsWithCode.length) {
      showToast('No funds have an AMFI Scheme Code linked yet.')
      return
    }
    setRefreshing(true)
    const results = await Promise.allSettled(
      fundsWithCode.map(mf =>
        fetchNAV(mf.schemeCode).then(navData => ({ mf, navData }))
      )
    )
    let updated = 0
    const errors = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        dispatch({
          type: 'UPDATE_INVESTMENT_NAV',
          payload: { id: r.value.mf.id, nav: r.value.navData.nav, date: r.value.navData.date }
        })
        updated++
      } else {
        errors.push(`${fundsWithCode[i].name}: ${r.reason?.message || 'failed'}`)
      }
    })
    const total = fundsWithCode.length
    if (updated === total) {
      showToast(`✅ NAV updated for ${updated} fund${updated !== 1 ? 's' : ''}`)
    } else if (updated === 0) {
      showToast(`❌ ${errors[0] || 'Failed to update NAV. Check scheme codes.'}`)
    } else {
      showToast(`⚠️ Updated ${updated}/${total} — ${errors[0]}`)
    }
    setRefreshing(false)
  }

  // Refresh NAV for a single MF card
  async function handleRefreshSingleNAV(mf) {
    if (!mf.schemeCode) return
    setNavRefreshingId(mf.id)
    try {
      const navData = await fetchNAV(mf.schemeCode)
      dispatch({ type: 'UPDATE_INVESTMENT_NAV', payload: { id: mf.id, nav: navData.nav, date: navData.date } })
      showToast(`✅ NAV updated: ₹${navData.nav} (${navData.date})`)
    } catch (err) {
      showToast(`❌ ${err.message}`)
    }
    setNavRefreshingId(null)
  }

  // Stocks price refresh
  async function handleRefresh() {
    if (!stocks.length) return
    setRefreshing(true)
    setRefreshError('')

    const fetchOne = async (st) => {
      const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${st.symbol}.NS?range=1d&interval=1d`
      const proxies = [
        `https://corsproxy.io/?${chartUrl}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(chartUrl)}`,
      ]
      for (const proxy of proxies) {
        try {
          const res = await fetch(proxy, { signal: AbortSignal.timeout(12000) })
          if (!res.ok) continue
          const raw = await res.json()
          const body = raw?.contents ? JSON.parse(raw.contents) : raw
          const meta = body?.chart?.result?.[0]?.meta
          const price = meta?.regularMarketPrice || meta?.chartPreviousClose
          if (price) return parseFloat(price.toFixed(2))
        } catch { /* try next proxy */ }
      }
      return null
    }

    const results = await Promise.allSettled(stocks.map(st => fetchOne(st).then(price => ({ st, price }))))
    let updated = 0
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.price) {
        dispatch({ type: 'UPDATE_STOCK', payload: { ...r.value.st, currentPrice: r.value.price } })
        updated++
      }
    })

    if (updated > 0) {
      setLastRefreshed(new Date())
    } else {
      setRefreshError('Could not fetch prices. Update manually using ✏️.')
    }
    setRefreshing(false)
  }

  function openAddMF() { setMFForm(EMPTY_MF); setEditMF(null); setShowMFForm(true); setNameSuggestions([]); setShowSuggestions(false) }
  function openEditMF(mf) {
    setMFForm({
      ...mf,
      units: String(mf.units),
      avgNav: String(mf.avgNav),
      currentNav: String(mf.currentNav),
      schemeCode: mf.schemeCode || ''
    })
    setEditMF(mf); setShowMFForm(true); setNameSuggestions([]); setShowSuggestions(false)
  }
  function openAddST() { setSTForm(EMPTY_ST); setEditST(null); setShowSTForm(true) }
  function openEditST(st) {
    setSTForm({ ...st, shares: String(st.shares), avgCost: String(st.avgCost), currentPrice: String(st.currentPrice) })
    setEditST(st); setShowSTForm(true)
  }

  function handleMFSubmit(e) {
    e.preventDefault()
    const payload = {
      ...mfForm,
      units: parseFloat(mfForm.units),
      avgNav: parseFloat(mfForm.avgNav),
      currentNav: parseFloat(mfForm.currentNav),
      schemeCode: mfForm.schemeCode ? mfForm.schemeCode.trim() : ''
    }
    if (editMF) {
      dispatch({ type: 'UPDATE_MUTUAL_FUND', payload })
    } else {
      dispatch({ type: 'ADD_MUTUAL_FUND', payload: { ...payload, id: generateId() } })
    }
    setShowMFForm(false)
  }

  function handleSTSubmit(e) {
    e.preventDefault()
    const payload = { ...stForm, shares: parseFloat(stForm.shares), avgCost: parseFloat(stForm.avgCost), currentPrice: parseFloat(stForm.currentPrice) }
    if (editST) {
      dispatch({ type: 'UPDATE_STOCK', payload })
    } else {
      dispatch({ type: 'ADD_STOCK', payload: { ...payload, id: generateId() } })
    }
    setShowSTForm(false)
  }

  // Scheme search handlers
  async function openSchemeSearch(mfId) {
    const mf = mfs.find(m => m.id === mfId)
    setSchemeSearch({ mfId, query: mf?.name || '', results: [], loading: false, error: '' })
  }

  async function runSchemeSearch() {
    if (!schemeSearch?.query.trim()) return
    setSchemeSearch(s => ({ ...s, loading: true, error: '', results: [] }))
    try {
      const results = await searchSchemes(schemeSearch.query)
      setSchemeSearch(s => ({ ...s, loading: false, results: results.slice(0, 10) }))
    } catch {
      setSchemeSearch(s => ({ ...s, loading: false, error: 'Search failed. Try again.' }))
    }
  }

  function linkSchemeCode(mfId, schemeCode, schemeName) {
    const mf = mfs.find(m => m.id === mfId)
    if (!mf) return
    dispatch({ type: 'UPDATE_MUTUAL_FUND', payload: { ...mf, schemeCode: String(schemeCode) } })
    showToast(`Linked: ${schemeName}`)
    setSchemeSearch(null)
  }

  function GainBadge({ gain, gainPct }) {
    const up = gain >= 0
    return (
      <div className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}{formatINR(gain)} ({up ? '+' : ''}{gainPct.toFixed(2)}%)
      </div>
    )
  }

  const mfsWithCode = mfs.filter(m => m.schemeCode).length

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-sm font-medium text-white shadow-xl"
          style={{ background: 'rgba(109,40,217,0.92)', border: '1px solid rgba(139,92,246,0.5)', backdropFilter: 'blur(8px)' }}>
          {toastMsg}
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Total Portfolio',  value: formatINR(totalPortfolio), icon: '💼', color: 'text-violet-300' },
          { label: 'Total Invested',   value: formatINR(totalInvested),  icon: '💰', color: 'text-cyan-400'   },
          { label: 'Total Gain/Loss',  value: formatINR(totalGain),      icon: totalGain >= 0 ? '📈' : '📉', color: totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400' },
          { label: 'Overall Return',   value: `${totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : 0}%`, icon: '🏆', color: totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-xl">{icon}</div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[{ id: 'mf', label: `Mutual Funds (${mfs.length})` }, { id: 'stocks', label: `Stocks (${stocks.length})` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
        {activeTab === 'stocks' && (
          <div className="flex flex-wrap items-center gap-2 md:ml-auto mt-1 md:mt-0">
            {lastRefreshed && !refreshError && (
              <span className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>
                Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {refreshError && (
              <span className="text-xs text-amber-400">{refreshError}</span>
            )}
            <button onClick={handleRefresh} disabled={refreshing}
              className="btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl text-sm">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Fetching live prices...' : 'Refresh NSE Prices'}</span>
              <span className="sm:hidden">{refreshing ? 'Fetching...' : 'Refresh'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mutual Funds Tab */}
      {activeTab === 'mf' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
              Invested: <span className="text-white font-semibold">{formatINR(totalMFInvested)}</span>
              &nbsp;·&nbsp; Current: <span className="text-white font-semibold">{formatINR(totalMFCurrent)}</span>
              &nbsp;·&nbsp; <span className={totalMFGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {totalMFGain >= 0 ? '+' : ''}{formatINR(totalMFGain)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshAllNAV}
                disabled={refreshing}
                title={mfsWithCode ? `Refresh NAV for ${mfsWithCode} linked fund${mfsWithCode !== 1 ? 's' : ''}` : 'Link AMFI scheme codes to funds first'}
                className="btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh NAV'}</span>
              </button>
              <button onClick={openAddMF} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
                <Plus className="w-4 h-4" /> Add Fund
              </button>
            </div>
          </div>

          {mfs.length === 0 ? (
            <div className="card p-10 md:p-16 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-white font-semibold mb-1">No mutual funds added</p>
              <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Track your SIP investments here</p>
              <button onClick={openAddMF} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Fund</button>
            </div>
          ) : (
            <div className="card overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(109,40,217,0.2)' }}>
                    {['Fund', 'Category', 'Units', 'Avg NAV', 'Current NAV', 'Invested', 'Current Value', 'Gain/Loss', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(196,181,253,0.5)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mfData.map(mf => (
                    <tr key={mf.id} className="tr-hover" style={{ borderBottom: '1px solid rgba(109,40,217,0.08)' }}>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-white">{mf.name}</p>
                        {mf.schemeCode ? (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {isValidSchemeCode(mf.schemeCode) ? (
                              <span className="text-xs font-mono" style={{ color: 'rgba(196,181,253,0.4)' }}>#{sanitiseSchemeCode(mf.schemeCode)}</span>
                            ) : (
                              <span className="text-xs font-mono text-amber-400" title="Invalid AMFI code — use Search to fix">⚠️ {mf.schemeCode}</span>
                            )}
                            {mf.navDate && isValidSchemeCode(mf.schemeCode) && (
                              <span className="text-xs" style={{ color: 'rgba(196,181,253,0.35)' }}>
                                · NAV as of {formatNavDate(mf.navDate)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openSchemeSearch(mf.id)}
                            className="mt-1 flex items-center gap-1 text-xs"
                            style={{ color: 'rgba(139,92,246,0.7)' }}
                            title="Link AMFI scheme code"
                          >
                            <Search className="w-3 h-3" /> Link scheme
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><span className="badge-violet text-xs">{mf.category}</span></td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>{mf.units.toFixed(3)}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>{formatINRDecimal(mf.avgNav)}</td>
                      <td className="px-4 py-3.5 text-sm text-white font-medium">{formatINRDecimal(mf.currentNav)}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>{formatINR(mf.invested)}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-white">{formatINR(mf.current)}</td>
                      <td className="px-4 py-3.5"><GainBadge gain={mf.gain} gainPct={mf.gainPct} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          {mf.schemeCode && (
                            <button
                              onClick={() => handleRefreshSingleNAV(mf)}
                              disabled={navRefreshingId === mf.id}
                              title="Refresh NAV from AMFI"
                              className="btn-ghost p-1.5 rounded-lg text-cyan-400"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${navRefreshingId === mf.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          {mf.schemeCode && (
                            <button
                              onClick={() => openSchemeSearch(mf.id)}
                              title="Change linked scheme"
                              className="btn-ghost p-1.5 rounded-lg"
                              style={{ color: 'rgba(139,92,246,0.7)' }}
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => openEditMF(mf)} className="btn-ghost p-1.5 rounded-lg text-violet-300"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDelete({ id: mf.id, type: 'mf' })} className="btn-ghost p-1.5 rounded-lg text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stocks Tab */}
      {activeTab === 'stocks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
              Invested: <span className="text-white font-semibold">{formatINR(totalSTInvested)}</span>
              &nbsp;·&nbsp; Current: <span className="text-white font-semibold">{formatINR(totalSTCurrent)}</span>
              &nbsp;·&nbsp; <span className={totalSTGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {totalSTGain >= 0 ? '+' : ''}{formatINR(totalSTGain)}
              </span>
            </div>
            <button onClick={openAddST} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
              <Plus className="w-4 h-4" /> Add Stock
            </button>
          </div>

          {stocks.length === 0 ? (
            <div className="card p-10 md:p-16 text-center">
              <p className="text-4xl mb-3">📈</p>
              <p className="text-white font-semibold mb-1">No stocks added</p>
              <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Add your NSE/BSE equity holdings</p>
              <button onClick={openAddST} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Stock</button>
            </div>
          ) : (
            <div className="card overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(109,40,217,0.2)' }}>
                    {['Symbol', 'Company', 'Exchange', 'Shares', 'Avg Cost', 'CMP', 'Invested', 'Current', 'Gain/Loss', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(196,181,253,0.5)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockData.map(st => (
                    <tr key={st.id} className="tr-hover" style={{ borderBottom: '1px solid rgba(109,40,217,0.08)' }}>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-sm text-violet-300">{st.symbol}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-white">{st.name}</td>
                      <td className="px-4 py-3.5"><span className="badge-info text-xs">{st.exchange}</span></td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>{st.shares}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>{formatINRDecimal(st.avgCost)}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-white">{formatINRDecimal(st.currentPrice)}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(196,181,253,0.7)' }}>{formatINR(st.invested)}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-white">{formatINR(st.current)}</td>
                      <td className="px-4 py-3.5"><GainBadge gain={st.gain} gainPct={st.gainPct} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEditST(st)} className="btn-ghost p-1.5 rounded-lg text-violet-300"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDelete({ id: st.id, type: 'stock' })} className="btn-ghost p-1.5 rounded-lg text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MF Form */}
      {showMFForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative w-full md:w-[480px] h-auto md:h-full max-h-[90vh] md:max-h-full flex flex-col animate-slide-in overflow-y-auto rounded-t-2xl md:rounded-none"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-5 pb-4 md:p-8 md:pb-4">
              <h3 className="text-xl font-semibold text-white">{editMF ? 'Edit' : 'Add'} Mutual Fund</h3>
              <button onClick={() => setShowMFForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleMFSubmit} className="flex-1 px-5 pb-5 md:px-8 md:pb-8 space-y-4">
              {/* Fund Name with AMFI autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-violet-200 mb-1.5">
                  Fund Name
                  {nameSearching && (
                    <span className="ml-2 text-xs font-normal" style={{ color: 'rgba(196,181,253,0.45)' }}>
                      <RefreshCw className="inline w-3 h-3 animate-spin mr-1" />searching AMFI…
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HDFC Flexi Cap — type to search AMFI"
                  value={mfForm.name}
                  autoComplete="off"
                  onChange={e => {
                    setMFForm(f => ({ ...f, name: e.target.value }))
                    setShowSuggestions(true)
                  }}
                  onFocus={() => nameSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  className="input-field"
                />
                {/* Suggestions dropdown */}
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 z-50 mt-1 rounded-xl overflow-hidden shadow-2xl"
                    style={{ background: 'rgba(13,10,35,0.99)', border: '1px solid rgba(109,40,217,0.35)' }}
                  >
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(196,181,253,0.4)', borderBottom: '1px solid rgba(109,40,217,0.15)' }}>
                      AMFI matches — tap to auto-fill scheme code
                    </p>
                    {nameSuggestions.map(s => (
                      <button
                        key={s.schemeCode}
                        type="button"
                        onMouseDown={() => {
                          setMFForm(f => ({
                            ...f,
                            name: s.schemeName,
                            schemeCode: String(s.schemeCode),
                          }))
                          setShowSuggestions(false)
                          showToast(`✅ Linked: ${s.schemeName} (#${s.schemeCode})`)
                        }}
                        className="w-full text-left px-3 py-2.5 transition-colors"
                        style={{ borderBottom: '1px solid rgba(109,40,217,0.08)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(109,40,217,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <p className="text-xs text-white leading-snug">{s.schemeName}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(139,92,246,0.7)' }}>
                          #{s.schemeCode}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Category</label>
                <select required value={mfForm.category} onChange={e => setMFForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                  <option value="">Select category</option>
                  {MF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {[
                { label: 'Units Held', key: 'units', placeholder: '1000.000', step: '0.001' },
                { label: 'Avg NAV (₹)', key: 'avgNav', placeholder: '0.00', step: '0.01' },
                { label: 'Current NAV (₹)', key: 'currentNav', placeholder: '0.00', step: '0.01' },
              ].map(({ label, key, placeholder, step }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">{label}</label>
                  <input type="number" min="0" step={step} required placeholder={placeholder}
                    value={mfForm[key]} onChange={e => setMFForm(f => ({ ...f, [key]: e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">
                  AMFI Scheme Code <span style={{ color: 'rgba(196,181,253,0.4)', fontWeight: 400 }}>(optional — for auto NAV fetch)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 120503"
                  value={mfForm.schemeCode}
                  onChange={e => setMFForm(f => ({ ...f, schemeCode: sanitiseSchemeCode(e.target.value) }))}
                  className="input-field font-mono"
                  maxLength={6}
                />
                {mfForm.schemeCode && !isValidSchemeCode(mfForm.schemeCode) && (
                  <p className="text-xs mt-1.5 text-amber-400">
                    ⚠️ AMFI codes are 5–6 digits (e.g. 120503). Use 🔍 Search on the fund card to find yours.
                  </p>
                )}
                {mfForm.schemeCode && isValidSchemeCode(mfForm.schemeCode) && (
                  <p className="text-xs mt-1.5 text-emerald-400">✓ Valid AMFI scheme code format</p>
                )}
                {!mfForm.schemeCode && (
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(196,181,253,0.35)' }}>
                    Find it at <strong>mfapi.in</strong> — or use 🔍 Search button on the fund card
                  </p>
                )}
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                {editMF ? 'Update' : 'Add'} Fund
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Form */}
      {showSTForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative w-full md:w-[480px] h-auto md:h-full max-h-[90vh] md:max-h-full flex flex-col animate-slide-in overflow-y-auto rounded-t-2xl md:rounded-none"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-5 pb-4 md:p-8 md:pb-4">
              <h3 className="text-xl font-semibold text-white">{editST ? 'Edit' : 'Add'} Stock</h3>
              <button onClick={() => setShowSTForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSTSubmit} className="flex-1 px-5 pb-5 md:px-8 md:pb-8 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Symbol</label>
                  <input type="text" required placeholder="RELIANCE" value={stForm.symbol}
                    onChange={e => setSTForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} className="input-field uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Exchange</label>
                  <select value={stForm.exchange} onChange={e => setSTForm(f => ({ ...f, exchange: e.target.value }))} className="input-field">
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Company Name</label>
                <input type="text" required placeholder="e.g., Reliance Industries" value={stForm.name}
                  onChange={e => setSTForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              {[
                { label: 'Shares Held',     key: 'shares',       placeholder: '10',    step: '1'    },
                { label: 'Avg Cost (₹)',    key: 'avgCost',      placeholder: '0.00',  step: '0.01' },
                { label: 'Current Price (₹)', key: 'currentPrice', placeholder: '0.00', step: '0.01' },
              ].map(({ label, key, placeholder, step }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">{label}</label>
                  <input type="number" min="0" step={step} required placeholder={placeholder}
                    value={stForm[key]} onChange={e => setSTForm(f => ({ ...f, [key]: e.target.value }))} className="input-field" />
                </div>
              ))}
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                {editST ? 'Update' : 'Add'} Stock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scheme Search Modal */}
      {schemeSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(5,3,20,0.8)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{ background: 'rgba(13,10,35,0.98)', border: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Search AMFI Scheme</h3>
              <button onClick={() => setSchemeSearch(null)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>
              Search by fund name to find and link the AMFI scheme code for live NAV fetching.
            </p>
            <div className="flex gap-2">
              <input
                ref={schemeSearchRef}
                type="text"
                placeholder="e.g., Mirae Asset Large Cap"
                value={schemeSearch.query}
                onChange={e => setSchemeSearch(s => ({ ...s, query: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && runSchemeSearch()}
                className="input-field flex-1"
                autoFocus
              />
              <button
                onClick={runSchemeSearch}
                disabled={schemeSearch.loading}
                className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                {schemeSearch.loading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
            {schemeSearch.error && (
              <p className="text-xs text-rose-400">{schemeSearch.error}</p>
            )}
            {schemeSearch.results.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {schemeSearch.results.map(scheme => (
                  <button
                    key={scheme.schemeCode}
                    onClick={() => linkSchemeCode(schemeSearch.mfId, scheme.schemeCode, scheme.schemeName)}
                    className="w-full text-left px-3 py-2.5 rounded-xl transition-colors"
                    style={{ background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.15)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(109,40,217,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(109,40,217,0.08)'}
                  >
                    <p className="text-sm text-white font-medium leading-snug">{scheme.schemeName}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(196,181,253,0.4)' }}>#{scheme.schemeCode}</p>
                  </button>
                ))}
              </div>
            )}
            {!schemeSearch.loading && schemeSearch.results.length === 0 && schemeSearch.query && !schemeSearch.error && (
              <p className="text-xs text-center py-2" style={{ color: 'rgba(196,181,253,0.4)' }}>
                Type to search and press Search or Enter
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)' }}>
          <div className="card p-6 w-80 text-center">
            <p className="text-2xl mb-3">🗑️</p>
            <p className="text-white font-semibold mb-1">Remove {confirmDelete.type === 'mf' ? 'Fund' : 'Stock'}?</p>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={() => {
                dispatch({ type: confirmDelete.type === 'mf' ? 'DELETE_MUTUAL_FUND' : 'DELETE_STOCK', payload: confirmDelete.id })
                setConfirmDelete(null)
              }} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
