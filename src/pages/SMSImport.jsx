import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fetchRecentBankSMS } from '../lib/smsParser'
import { formatINR, formatDate } from '../lib/utils'
import { Capacitor } from '@capacitor/core'

export default function SMSImport() {
  const { state, dispatch, getCategory } = useApp()
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState([])
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [accountId, setAccountId] = useState(state.accounts[0]?.id || '')
  const [days, setDays] = useState(30)
  const isAndroid = Capacitor.getPlatform() === 'android'

  async function scan() {
    setLoading(true); setStatus('')
    const result = await fetchRecentBankSMS({ days })
    setLoading(false)
    if (!result.supported) { setStatus(`Not supported: ${result.reason}`); return }
    if (!result.granted) { setStatus(`Permission denied: ${result.reason || 'User declined'}`); return }
    // Filter duplicates — already-imported transactions
    const existing = new Set(state.transactions.map(t => `${t.date}|${t.amount}|${(t.description || '').slice(0, 30)}`))
    const fresh = result.transactions.filter(
      t => !existing.has(`${t.date}|${t.amount}|${(t.description || '').slice(0, 30)}`)
    )
    setParsed(fresh)
    setSelected(new Set(fresh.map(t => t.smsId)))
    setStatus(`Found ${fresh.length} new transactions (scanned ${result.raw} SMS)`)
  }

  function toggle(id) {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  function selectAll() { setSelected(new Set(parsed.map(t => t.smsId))) }
  function deselectAll() { setSelected(new Set()) }

  function importSelected() {
    if (!accountId) { setStatus('Please select an account first'); return }
    const txsToImport = parsed
      .filter(t => selected.has(t.smsId))
      .map(t => ({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        accountId,
        categoryId: t.categoryId,
        date: t.date,
        amount: t.amount,
        type: t.type,
        description: t.description,
        source: 'sms',
      }))
    dispatch({ type: 'IMPORT_STATEMENT', payload: txsToImport })
    setStatus(`✓ Imported ${txsToImport.length} transactions`)
    setParsed(parsed.filter(t => !selected.has(t.smsId)))
    setSelected(new Set())
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero card */}
      <div className="rounded-2xl p-4 md:p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)',
      }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💬</span>
            <h2 className="text-lg md:text-xl font-bold text-white">SMS Auto-Import</h2>
          </div>
          <p className="text-sm text-indigo-200/80 mb-4">
            Automatically capture transactions from bank and UPI SMS. Zero-effort expense tracking.
          </p>
          {!isAndroid && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
              ⚠️ SMS reading is only supported on Android. Use bank statement upload on iOS.
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-400 mb-1 block">Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800/40 border border-indigo-500/20 text-white text-sm">
              <option value="">Select account…</option>
              {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Scan last</label>
            <select value={days} onChange={e => setDays(+e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800/40 border border-indigo-500/20 text-white text-sm">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
        <button onClick={scan} disabled={loading || !isAndroid}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          {loading ? 'Scanning SMS inbox…' : '🔍 Scan SMS Inbox'}
        </button>
        {status && <p className="text-xs text-center text-indigo-200/70">{status}</p>}
      </div>

      {/* Parsed transactions */}
      {parsed.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Review & Import ({selected.size}/{parsed.length})</h3>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-cyan-400">All</button>
              <button onClick={deselectAll} className="text-slate-400">None</button>
            </div>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {parsed.map(tx => {
              const cat = getCategory(tx.categoryId)
              const isSel = selected.has(tx.smsId)
              return (
                <label key={tx.smsId}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${
                    isSel ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-white/5 border-transparent'
                  }`}>
                  <input type="checkbox" checked={isSel} onChange={() => toggle(tx.smsId)}
                    className="w-5 h-5 rounded accent-indigo-500 flex-shrink-0" />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}>{cat?.icon || '💳'}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                    <p className="text-[11px] text-slate-400 truncate">{formatDate(tx.date)} · {cat?.name} · {tx.sender}</p>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                  </span>
                </label>
              )
            })}
          </div>
          <button onClick={importSelected} disabled={selected.size === 0 || !accountId}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            Import {selected.size} Transaction{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
