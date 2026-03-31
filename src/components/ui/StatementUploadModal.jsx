import { useState } from 'react'
import { X, Upload, CheckCircle, AlertCircle, FileText, Loader } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { BANK_PARSERS, detectBank, autoCategory } from '../../lib/bankParsers'
import { generateId, formatINR } from '../../lib/utils'

export default function StatementUploadModal({ account, onClose }) {
  const { state, dispatch } = useApp()
  const [bank, setBank] = useState(detectBank('', account.bank) || '')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    setParsed(null)
    setLoading(true)

    try {
      const isPDF = file.name.toLowerCase().endsWith('.pdf')
      const selectedBank = bank || detectBank('', account.bank)

      if (!selectedBank || !BANK_PARSERS[selectedBank]) {
        setError('Could not detect bank. Please select your bank from the dropdown.')
        setLoading(false)
        return
      }

      const parser = BANK_PARSERS[selectedBank]
      let rawTxs

      if (isPDF) {
        if (!parser.parsePDF) {
          setError(`PDF parsing is not supported for ${parser.label} yet. Please export as CSV from your bank's netbanking portal.`)
          setLoading(false)
          return
        }
        rawTxs = await parser.parsePDF(file)
      } else {
        const text = await file.text()
        rawTxs = parser.parse(text)
      }

      if (!rawTxs.length) {
        setError('No transactions found in the file. Make sure you uploaded the correct statement.')
        setLoading(false)
        return
      }

      // Enrich with category, account, id
      const enriched = rawTxs.map(t => ({
        ...t,
        id: generateId(),
        accountId: account.id,
        categoryId: autoCategory(t.description, t.type),
        notes: '',
      }))
      setParsed(enriched)
    } catch (err) {
      setError(`Failed to parse: ${err.message}`)
    }
    setLoading(false)
    e.target.value = ''
  }

  function handleImport() {
    if (!parsed?.length) return
    setImporting(true)
    dispatch({ type: 'IMPORT_STATEMENT', payload: parsed })
    setTimeout(() => { setImporting(false); setDone(true) }, 500)
  }

  const incomeTotal  = parsed?.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0) || 0
  const expenseTotal = parsed?.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(5,3,20,0.88)', backdropFilter: 'blur(6px)' }}>
      <div className="card w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
          <div>
            <h3 className="text-base font-semibold text-white">Upload Bank Statement</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(240,240,240,0.45)' }}>
              {account.name} · {account.bank}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center justify-center p-10 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-semibold text-lg">Import Complete</p>
            <p className="text-sm" style={{ color: 'rgba(240,240,240,0.5)' }}>
              {parsed.length} transactions added to {account.name}
            </p>
            <button onClick={onClose} className="btn-primary px-8 py-2.5 rounded-xl text-sm font-semibold mt-2">
              Done
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6 overflow-y-auto">

            {/* Bank selector */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(240,240,240,0.6)' }}>
                Bank Format
              </label>
              <select value={bank} onChange={e => { setBank(e.target.value); setParsed(null); setError('') }}
                className="input-field">
                <option value="">— Select Bank —</option>
                {Object.entries(BANK_PARSERS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Drop zone */}
            <label className="relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all"
              style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.04)' }}>
              {loading
                ? <Loader className="w-8 h-8 animate-spin" style={{ color: 'rgba(239,68,68,0.7)' }} />
                : <Upload className="w-8 h-8" style={{ color: 'rgba(239,68,68,0.6)' }} />
              }
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  {fileName || (loading ? 'Parsing…' : 'Click to upload statement')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(240,240,240,0.4)' }}>
                  Supports PDF and CSV · ICICI, HDFC, SBI, Axis, Kotak
                </p>
              </div>
              <input type="file" accept=".pdf,.csv,.txt" onChange={handleFile} className="hidden" disabled={loading} />
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Preview */}
            {parsed && (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <p className="text-base font-bold text-emerald-400">{formatINR(incomeTotal)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(240,240,240,0.5)' }}>
                      Income ({parsed.filter(t => t.type === 'income').length})
                    </p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-base font-bold text-red-400">{formatINR(expenseTotal)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(240,240,240,0.5)' }}>
                      Expense ({parsed.filter(t => t.type === 'expense').length})
                    </p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(109,40,217,0.08)', border: '1px solid rgba(109,40,217,0.15)' }}>
                    <p className="text-base font-bold text-white">{parsed.length}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(240,240,240,0.5)' }}>Total Transactions</p>
                  </div>
                </div>

                {/* Transaction list */}
                <div className="space-y-1 overflow-y-auto" style={{ maxHeight: '260px' }}>
                  {parsed.slice(0, 60).map((t, i) => {
                    const cat = state.categories.find(c => c.id === t.categoryId)
                    return (
                      <div key={i} className="tr-hover flex items-center justify-between px-3 py-2.5 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">{cat?.icon || '💳'}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{t.description}</p>
                            <p className="text-xs" style={{ color: 'rgba(240,240,240,0.4)' }}>
                              {t.date} · {cat?.name}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ml-3 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatINR(t.amount)}
                        </span>
                      </div>
                    )
                  })}
                  {parsed.length > 60 && (
                    <p className="text-center text-xs py-2" style={{ color: 'rgba(240,240,240,0.35)' }}>
                      +{parsed.length - 60} more transactions
                    </p>
                  )}
                </div>

                <button onClick={handleImport} disabled={importing}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {importing
                    ? <><Loader className="w-4 h-4 animate-spin" /> Importing…</>
                    : <><CheckCircle className="w-4 h-4" /> Import {parsed.length} Transactions to {account.name}</>
                  }
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
