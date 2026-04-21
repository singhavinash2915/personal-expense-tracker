import { useState, useRef, useCallback } from 'react'
import { Camera as CameraIcon, Upload, X, Check, RefreshCw, Loader2, ScanLine } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useApp } from '../../context/AppContext'
import { parseReceipt } from '../../lib/receiptParser'
import { generateId, formatINR } from '../../lib/utils'

const STAGES = { idle: 'idle', scanning: 'scanning', review: 'review', done: 'done' }
const isNative = Capacitor.isNativePlatform()

export default function ReceiptScanner({ onClose }) {
  const { state, dispatch } = useApp()
  const [stage, setStage]       = useState(STAGES.idle)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview]   = useState(null)
  const [parsed, setParsed]     = useState(null)
  const [form, setForm]         = useState({
    description: '', amount: '', date: '', type: 'expense', categoryId: 'c10', accountId: '', notes: '',
  })
  const [error, setError]       = useState('')
  const fileRef                 = useRef()
  const cameraRef               = useRef()

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
      console.error('OCR error', e)
      setError('Could not read the image. Please try a clearer photo.')
      setStage(STAGES.idle)
    }
  }

  // ── Native: use Capacitor Camera plugin (prevents crash, proper permissions) ──
  async function pickNativeImage(source) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const src = source === 'camera' ? CameraSource.Camera : CameraSource.Photos
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: src,
        allowEditing: false,
        correctOrientation: true,
        saveToGallery: false,
      })
      if (photo?.dataUrl) {
        setPreview(photo.dataUrl)
        runOCR(photo.dataUrl)
      }
    } catch (err) {
      // User cancelled or permission denied
      if (err?.message && !/cancel/i.test(err.message)) {
        setError(err.message || 'Could not open camera. Check permissions in Settings.')
      }
    }
  }

  // ── Web fallback: HTML file input ────────────────────────────────────────
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

  function openCamera() {
    setError('')
    if (isNative) pickNativeImage('camera')
    else cameraRef.current?.click()
  }

  function openGallery() {
    setError('')
    if (isNative) pickNativeImage('photos')
    else fileRef.current?.click()
  }

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
      style={{ background: 'rgba(3,17,13,0.85)', backdropFilter: 'blur(10px)' }}>
      <div
        className="w-full md:max-w-lg md:mx-4 flex flex-col overflow-hidden animate-sheet-up md:animate-fadeIn"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-fab)', boxShadow: 'var(--glow-gold)' }}
            >
              <ScanLine className="w-4 h-4" style={{ color: 'var(--bg-base)' }} />
            </div>
            <div>
              <div className="label-mono" style={{ fontSize: 10 }}>— Receipt</div>
              <h3 className="heading" style={{ fontSize: 18, marginTop: 2 }}>Scan it.</h3>
              <p className="body-secondary" style={{ fontSize: 11, marginTop: 2 }}>
                {stage === STAGES.idle     && 'Take a photo or upload an image'}
                {stage === STAGES.scanning && 'Reading your receipt…'}
                {stage === STAGES.review   && 'Review & confirm the details'}
                {stage === STAGES.done     && 'Transaction added!'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* IDLE */}
          {stage === STAGES.idle && (
            <div className="p-5 space-y-3">
              {error && (
                <div className="rounded-xl p-3"
                  style={{ background: 'var(--danger-dim)', border: '1px solid rgba(252,165,165,0.3)', color: 'var(--danger)', fontSize: 13 }}>
                  {error}
                </div>
              )}

              {/* Take Photo */}
              <button
                onClick={openCamera}
                className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all"
                style={{ background: 'var(--gold-dim)', border: '1px solid rgba(251,191,36,0.3)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--gradient-fab)', boxShadow: 'var(--glow-gold)' }}>
                  <CameraIcon className="w-6 h-6" style={{ color: 'var(--bg-base)' }} />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                    Take a <em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>photo</em>
                  </p>
                  <p className="body-secondary" style={{ fontSize: 12, marginTop: 2 }}>
                    Open camera and snap the bill or receipt
                  </p>
                </div>
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                onChange={handleFile} className="hidden" />

              {/* Upload Image */}
              <button
                onClick={openGallery}
                className="w-full flex items-center gap-4 p-5 rounded-2xl transition-all"
                style={{ background: 'var(--emerald-dim)', border: '1px solid rgba(52,211,153,0.25)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <Upload className="w-6 h-6" style={{ color: 'var(--emerald)' }} />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                    Upload image
                  </p>
                  <p className="body-secondary" style={{ fontSize: 12, marginTop: 2 }}>
                    Choose from gallery or files
                  </p>
                </div>
              </button>
              <input ref={fileRef} type="file" accept="image/*,.pdf"
                onChange={handleFile} className="hidden" />

              <p className="label-mono text-center" style={{ fontSize: 9, marginTop: 8 }}>
                — All processing on your device — nothing uploaded
              </p>
            </div>
          )}

          {/* SCANNING */}
          {stage === STAGES.scanning && (
            <div className="p-8 flex flex-col items-center gap-5">
              {preview && (
                <img src={preview} alt="Receipt"
                  className="w-full max-h-48 object-contain rounded-xl opacity-60"
                  style={{ border: '1px solid var(--border-accent)' }} />
              )}
              <div className="flex flex-col items-center gap-3 w-full">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--gold)' }} />
                <p className="font-display" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Reading receipt…</p>
                <div className="progress-track w-full">
                  <div className="progress-fill warn" style={{ width: `${progress}%` }} />
                </div>
                <p className="label-mono" style={{ fontSize: 10 }}>{progress}%</p>
              </div>
            </div>
          )}

          {/* REVIEW */}
          {stage === STAGES.review && (
            <div className="p-5 space-y-4">
              {preview && (
                <div className="relative">
                  <img src={preview} alt="Receipt"
                    className="w-full max-h-36 object-contain rounded-xl"
                    style={{ border: '1px solid var(--border-accent)' }} />
                  <button onClick={reset} className="absolute top-2 right-2 btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: 11 }}>
                    <RefreshCw className="w-3 h-3" /> Rescan
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-xl p-3"
                  style={{ background: 'var(--danger-dim)', border: '1px solid rgba(252,165,165,0.3)', color: 'var(--danger)', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <Field label="Merchant / Description *">
                <input className="input" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Big Basket" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (₹) *">
                  <input className="input" type="number"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0" />
                </Field>
                <Field label="Type">
                  <div className="flex gap-2">
                    {['expense','income'].map(t => (
                      <button key={t} type="button"
                        onClick={() => setForm(f => ({ ...f, type: t, categoryId: t === 'expense' ? 'c10' : 'i4' }))}
                        className={`chip ${form.type === t ? 'active' : ''} flex-1`}
                        style={{ justifyContent: 'center' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Date *">
                <input className="input" type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </Field>

              <Field label="Category">
                <select className="input select" value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <optgroup label="Expense">
                    {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </optgroup>
                  <optgroup label="Income">
                    {incomeCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </optgroup>
                </select>
              </Field>

              {state.accounts.length > 0 && (
                <Field label="Account">
                  <select className="input select" value={form.accountId}
                    onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                    <option value="">— None —</option>
                    {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
              )}

              <Field label="Notes (optional)">
                <input className="input" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes" />
              </Field>
            </div>
          )}

          {/* DONE */}
          {stage === STAGES.done && (
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'var(--gradient-fab)', boxShadow: 'var(--glow-gold)' }}>
                <Check className="w-8 h-8" style={{ color: 'var(--bg-base)' }} />
              </div>
              <div>
                <div className="label-mono" style={{ fontSize: 10 }}>— Added</div>
                <h3 className="heading" style={{ fontSize: 20, marginTop: 4 }}>
                  <em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>Transaction saved.</em>
                </h3>
              </div>
              <p className="body-secondary" style={{ fontSize: 13 }}>
                {form.description} · {formatINR(parseFloat(form.amount) || 0)}
              </p>
              <div className="flex gap-3 mt-2">
                <button onClick={reset} className="btn btn-secondary">Scan Another</button>
                <button onClick={onClose} className="btn btn-primary">Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions (review stage) */}
        {stage === STAGES.review && (
          <div className="px-5 py-4 flex gap-3 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border-subtle)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
            <button onClick={reset} className="btn btn-secondary flex-1">Rescan</button>
            <button onClick={handleSave} className="btn btn-primary flex-1">
              <Check className="w-4 h-4" /> Add Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-mono" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>— {label}</label>
      {children}
    </div>
  )
}
