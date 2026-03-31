import { useState } from 'react'
import { Plus, Trash2, Edit2, X, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatINR, formatINRDecimal, generateId } from '../lib/utils'

const EMPTY_MF = { name: '', category: '', units: '', avgNav: '', currentNav: '' }
const EMPTY_ST = { symbol: '', name: '', exchange: 'NSE', shares: '', avgCost: '', currentPrice: '' }

const MF_CATEGORIES = ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'ELSS', 'Debt', 'Index', 'International']

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

  // Fetch last closing / live NSE prices via Yahoo Finance v8/chart + corsproxy.io
  // Works both during and outside market hours (uses previousClose as fallback)
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
          // allorigins /get wraps body in {contents:"..."}; corsproxy returns directly
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

  function openAddMF() { setMFForm(EMPTY_MF); setEditMF(null); setShowMFForm(true) }
  function openEditMF(mf) {
    setMFForm({ ...mf, units: String(mf.units), avgNav: String(mf.avgNav), currentNav: String(mf.currentNav) })
    setEditMF(mf); setShowMFForm(true)
  }
  function openAddST() { setSTForm(EMPTY_ST); setEditST(null); setShowSTForm(true) }
  function openEditST(st) {
    setSTForm({ ...st, shares: String(st.shares), avgCost: String(st.avgCost), currentPrice: String(st.currentPrice) })
    setEditST(st); setShowSTForm(true)
  }

  function handleMFSubmit(e) {
    e.preventDefault()
    const payload = { ...mfForm, units: parseFloat(mfForm.units), avgNav: parseFloat(mfForm.avgNav), currentNav: parseFloat(mfForm.currentNav) }
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

  function GainBadge({ gain, gainPct }) {
    const up = gain >= 0
    return (
      <div className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}{formatINR(gain)} ({up ? '+' : ''}{gainPct.toFixed(2)}%)
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-4 gap-4">
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
      <div className="flex items-center gap-2">
        {[{ id: 'mf', label: `Mutual Funds (${mfs.length})` }, { id: 'stocks', label: `Stocks (${stocks.length})` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
        {activeTab === 'stocks' && (
          <div className="ml-auto flex items-center gap-3">
            {lastRefreshed && !refreshError && (
              <span className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>
                Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {refreshError && (
              <span className="text-xs text-amber-400">{refreshError}</span>
            )}
            <button onClick={handleRefresh} disabled={refreshing}
              className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Fetching live prices...' : 'Refresh NSE Prices'}
            </button>
          </div>
        )}
      </div>

      {/* Mutual Funds Tab */}
      {activeTab === 'mf' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
              Invested: <span className="text-white font-semibold">{formatINR(totalMFInvested)}</span>
              &nbsp;·&nbsp; Current: <span className="text-white font-semibold">{formatINR(totalMFCurrent)}</span>
              &nbsp;·&nbsp; <span className={totalMFGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {totalMFGain >= 0 ? '+' : ''}{formatINR(totalMFGain)}
              </span>
            </div>
            <button onClick={openAddMF} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
              <Plus className="w-4 h-4" /> Add Fund
            </button>
          </div>

          {mfs.length === 0 ? (
            <div className="card p-16 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-white font-semibold mb-1">No mutual funds added</p>
              <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Track your SIP investments here</p>
              <button onClick={openAddMF} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Fund</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
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
            <div className="card p-16 text-center">
              <p className="text-4xl mb-3">📈</p>
              <p className="text-white font-semibold mb-1">No stocks added</p>
              <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Add your NSE/BSE equity holdings</p>
              <button onClick={openAddST} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">Add Stock</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
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
        <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative h-full w-[480px] flex flex-col animate-slide-in overflow-y-auto"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-8 pb-4">
              <h3 className="text-xl font-semibold text-white">{editMF ? 'Edit' : 'Add'} Mutual Fund</h3>
              <button onClick={() => setShowMFForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleMFSubmit} className="flex-1 px-8 pb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Fund Name</label>
                <input type="text" required placeholder="e.g., Mirae Asset Large Cap" value={mfForm.name}
                  onChange={e => setMFForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
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
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-semibold text-sm mt-2">
                {editMF ? 'Update' : 'Add'} Fund
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Form */}
      {showSTForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" style={{ background: 'rgba(5,3,20,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="relative h-full w-[480px] flex flex-col animate-slide-in overflow-y-auto"
            style={{ background: 'rgba(13,10,35,0.98)', borderLeft: '1px solid rgba(109,40,217,0.2)' }}>
            <div className="flex items-center justify-between p-8 pb-4">
              <h3 className="text-xl font-semibold text-white">{editST ? 'Edit' : 'Add'} Stock</h3>
              <button onClick={() => setShowSTForm(false)} className="btn-ghost p-2 rounded-xl">
                <X className="w-5 h-5 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleSTSubmit} className="flex-1 px-8 pb-8 space-y-4">
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
