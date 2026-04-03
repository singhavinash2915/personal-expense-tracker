import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, RefreshCw, Loader2, ScanLine } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { parseReceipt } from '../../lib/receiptParser'
import { generateId, formatINR } from '../../lib/utils'

const STAGES = { idle: 'idle', scanning: 'scanning', review: 'review', done: 'done' }

export default function ReceiptScanner({ onClose }) {
  const { state, dispatch } = useApp()
  const [stage, setStage]     = useState(STAGES.idle)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)   // base64 image
  const [parsed, setParsed]   = useState(null)   // { amount, date, merchant, categoryId }
  const [form, setForm]       = useState({
    description: '', amount: '', date: '', type: 'expense', categoryId: 'c10', accountId: '', notes: '',
  })
  const [error, setError]     = useState('')
  const fileRef               = useRef()
  const cameraRef             = useRef()

  // ── Run Tesseract OCR ────────────────────────────────────────────────────
  async function runOCR(imageData) {
    setStage(STAGES.scanning)
    setProgress(0)
    setError('')
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const { data: { text } } = await worker.recognize(imageData)
      await worker.terminate()

      const result = parseReceipt(text)
      setParsed({ ...result, rawText: text })
      setForm({
        description: result.merchant || '',
        amount:      result.amount ? String(result.amount) : '',
        date:        result.date   || new Date().toISOString().split('T')[0],
        type:        'expense',
        categoryId:  result.categoryId || 'c10',
        accountId:   state.accounts[0]?.id || '',
        notes:       '',
      })
      setStage(STAGES.review)
    } catch (e) {
      setError('Could not read the image. Please try a clearer photo.')
      setStage(STAGES.idle)
    }
  }

  // ── Handle file / camera input ───────────────────────────────────────────
  const handleFile = useCallback(e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target.result
      setPreview(src)
      runOCR(src)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  // ── Save transaction ─────────────────────────────────────────────────────
  function handleSave() {
    if (!form.description || !form.amount || !form.date) {
      setError('Please fill in description, amount, and date.')
      return
    }
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id:          generateId(),
        description: form.description.trim(),
        amount:      parseFloat(form.amount) || 0,
        date:        form.date,
        type:        form.type,
        categoryId:  form.categoryId,
        accountId:   form.accountId,
        notes:       form.notes.trim(),
      },
    })
    setStage(STAGES.done)
  }

  function reset() {
    setStage(STAGES.idle)
    setPreview(null)
    setParsed(null)
    setError('')
    setProgress(0)
  }

  const expenseCats = state.categories.filter(c => c.type === 'expense')
  const incomeCats  = state.categories.filter(c => c.type === 'income')

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(5,3,20,0.88)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full md:max-w-lg md:mx-4 rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: '#1a1a1a', border: '1px solid rgba(239,68,68,0.18)', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#e53935,#f59e0b)' }}>
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Scan Receipt</h3>
              <p className="text-[11px]" style={{ color: 'rgba(196,181,253,0.5)' }}>
                {stage === STAGES.idle     ? 'Take a photo or upload an image'     : ''}
                {stage === STAGES.scanning ? 'Reading your receipt…'               : ''}
                {stage === STAGES.review   ? 'Review & confirm the details'        : ''}
                {stage === STAGES.done     ? 'Transaction added!'                  : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── IDLE: capture options ── */}
          {stage === STAGES.idle && (
            <div className="p-6 space-y-4">
              {error && (
                <div className="rounded-xl p-3 text-sm text-rose-300"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              {/* Camera — opens rear camera on mobile */}
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all"
                style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.22)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#e53935,#f59e0b)' }}>
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">Take Photo</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                    Open camera and snap the bill or receipt
                  </p>
                </div>
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                onChange={handleFile} className="hidden" />

              {/* Upload from gallery / files */}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <Upload className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">Upload Image</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.5)' }}>
                    Choose from gallery or files (JPG, PNG, PDF)
                  </p>
                </div>
              </button>
              <input ref={fileRef} type="file" accept="image/*,.pdf"
                onChange={handleFile} className="hidden" />

              <p className="text-center text-xs" style={{ color: 'rgba(196,181,253,0.35)' }}>
                All processing happens on your device — nothing is uploaded.
              </p>
            </div>
          )}

          {/* ── SCANNING: progress ── */}
          {stage === STAGES.scanning && (
            <div className="p-8 flex flex-col items-center gap-5">
              {preview && (
                <img src={preview} alt="Receipt"
                  className="w-full max-h-48 object-contain rounded-xl opacity-60"
                  style={{ border: '1px solid rgba(239,68,68,0.18)' }} />
              )}
              <div className="flex flex-col items-center gap-3 w-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#e53935' }} />
                <p className="text-white font-medium text-sm">Reading receipt…</p>
                <div className="w-full rounded-full h-2" style={{ background: 'rgba(239,68,68,0.12)' }}>
                  <div className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#e53935,#f59e0b)' }} />
                </div>
                <p className="text-xs" style={{ color: 'rgba(196,181,253,0.5)' }}>{progress}%</p>
              </div>
            </div>
          )}

          {/* ── REVIEW: editable form ── */}
          {stage === STAGES.review && (
            <div className="p-5 space-y-4">
              {/* Receipt thumbnail */}
              {preview && (
                <div className="relative">
                  <img src={preview} alt="Receipt"
                    className="w-full max-h-36 object-contain rounded-xl"
                    style={{ border: '1px solid rgba(239,68,68,0.15)' }} />
                  <button onClick={reset}
                    className="absolute top-2 right-2 btn-ghost p-1.5 rounded-lg text-xs flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Rescan
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-xl p-3 text-sm text-rose-300"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              {/* Merchant / Description */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(196,181,253,0.7)' }}>
                  Merchant / Description *
                </label>
                <input className="input-field w-full px-4 py-2.5 text-sm"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Big Basket, Electricity Bill" />
              </div>

              {/* Amount + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(196,181,253,0.7)' }}>
                    Amount (₹) *
                  </label>
                  <input className="input-field w-full px-4 py-2.5 text-sm" type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(196,181,253,0.7)' }}>
                    Type
                  </label>
                  <div className="flex gap-2 h-[42px]">
                    {['expense','income'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setForm(f => ({ ...f, type: t,
                          categoryId: t === 'expense' ? 'c10' : 'i4' }))}
                        className={`flex-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                          form.type === t ? 'btn-primary' : 'btn-ghost'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(196,181,253,0.7)' }}>
                  Date *
                </label>
                <input className="input-field w-full px-4 py-2.5 text-sm" type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(196,181,253,0.7)' }}>
                  Category
                </label>
                <select className="input-field w-full px-4 py-2.5 text-sm"
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <optgroup label="Expense">
                    {expenseCats.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Income">
                    {incomeCats.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Account */}
              {state.accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(196,181,253,0.7)' }}>
                    Account
                  </label>
                  <select className="input-field w-full px-4 py-2.5 text-sm"
                    value={form.accountId}
                    onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                    <option value="">— None —</option>
                    {state.accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(196,181,253,0.7)' }}>
                  Notes (optional)
                </label>
                <input className="input-field w-full px-4 py-2.5 text-sm"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes" />
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {stage === STAGES.done && (
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#e53935,#f59e0b)' }}>
                <Check className="w-8 h-8 text-white" />
              </div>
              <p className="text-white font-semibold text-lg">Transaction Added!</p>
              <p className="text-sm" style={{ color: 'rgba(196,181,253,0.6)' }}>
                {form.description} · {formatINR(parseFloat(form.amount) || 0)}
              </p>
              <div className="flex gap-3 mt-2">
                <button onClick={reset} className="btn-ghost px-5 py-2.5 rounded-xl text-sm font-semibold">
                  Scan Another
                </button>
                <button onClick={onClose} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {stage === STAGES.review && (
          <div className="px-5 py-4 flex gap-3 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(239,68,68,0.12)' }}>
            <button onClick={reset} className="btn-ghost flex-1 py-3 rounded-xl text-sm font-semibold">
              Rescan
            </button>
            <button onClick={handleSave}
              className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Add Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
