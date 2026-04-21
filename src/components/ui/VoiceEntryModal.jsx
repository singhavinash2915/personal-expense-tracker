import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { parseNLTransaction } from '../../lib/nlParser'
import { formatINR, generateId } from '../../lib/utils'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

const EXAMPLES = [
  'Spent 350 on lunch at Swiggy',
  'Got salary 75000 credit',
  'Paid 1200 for Uber yesterday',
  'Netflix 499 subscription',
]

export default function VoiceEntryModal({ onClose }) {
  const { state, dispatch, getCategory } = useApp()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function startListening() {
    if (!SpeechRecognition) { alert('Speech recognition not supported in this browser'); return }
    const rec = new SpeechRecognition()
    rec.lang = 'en-IN'
    rec.interimResults = true
    rec.continuous = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => {
      let final = '', interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      setInterimText(interim)
      if (final) {
        setText(prev => (prev ? prev + ' ' : '') + final)
        setInterimText('')
      }
    }
    recognitionRef.current = rec
    rec.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function handleParse() {
    const p = parseNLTransaction(text, { accounts: state.accounts })
    setParsed(p)
  }

  function confirm() {
    if (!parsed || parsed.error) return
    const tx = {
      id: generateId(),
      accountId: parsed.accountId,
      categoryId: parsed.categoryId,
      date: parsed.date,
      amount: parsed.amount,
      type: parsed.type,
      description: parsed.description,
      source: 'voice',
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: tx })
    onClose()
  }

  const cat = parsed && !parsed.error ? getCategory(parsed.categoryId) : null
  const account = parsed && !parsed.error ? state.accounts.find(a => a.id === parsed.accountId) : null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end md:items-center md:justify-center"
      style={{ background: 'rgba(3,17,13,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full md:w-[520px] md:max-w-[90vw] max-h-[92vh] overflow-y-auto p-5 md:p-6 animate-sheet-up md:animate-fadeIn"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
          backgroundImage: 'radial-gradient(400px 250px at 85% 0%, rgba(52,211,153,0.12), transparent 60%)',
        }}
      >
        <div className="md:hidden w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border-default)' }} />

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label-mono" style={{ fontSize: 10 }}>— Quick Add</div>
            <h2 className="heading" style={{ fontSize: 22, marginTop: 4 }}>
              Say it. <em style={{ fontStyle: 'italic', color: 'var(--gold)', fontWeight: 400 }}>Save it.</em>
            </h2>
          </div>
          <button onClick={onClose} className="text-2xl leading-none px-2"
            style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Input */}
        <div className="relative mb-3">
          <textarea
            ref={inputRef}
            value={text + (interimText ? ` ${interimText}` : '')}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. 'Spent 350 on lunch at Swiggy yesterday'"
            rows={3}
            className="input textarea"
            style={{
              paddingRight: 60,
              resize: 'none',
              borderRadius: 'var(--r-xl)',
              fontFamily: 'var(--font-body)',
            }}
          />
          <button
            onClick={listening ? stopListening : startListening}
            className={`absolute right-2 bottom-2 w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95 ${listening ? 'animate-pulse' : ''}`}
            style={{
              background: listening ? 'var(--danger-dim)' : 'var(--gradient-fab)',
              color: listening ? 'var(--danger)' : 'var(--bg-base)',
              boxShadow: listening ? 'none' : 'var(--glow-gold)',
              border: listening ? '1px solid rgba(252,165,165,0.3)' : 'none',
            }}
            aria-label={listening ? 'Stop' : 'Start recording'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v2a7 7 0 01-14 0v-2m7 9v-3m-4 0h8m-4-12a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z"/>
            </svg>
          </button>
        </div>

        {/* Examples */}
        {!text && (
          <div className="mb-3">
            <p className="label-mono mb-2" style={{ fontSize: 10 }}>— Try saying</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e, i) => (
                <button key={i} onClick={() => setText(e)} className="chip" type="button">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parse button */}
        {text && !parsed && (
          <button onClick={handleParse} className="btn btn-primary w-full" style={{ padding: 14 }}>
            Parse →
          </button>
        )}

        {/* Parsed output */}
        {parsed?.error && (
          <div className="mt-2 p-3 rounded-xl"
            style={{ background: 'var(--danger-dim)', border: '1px solid rgba(252,165,165,0.3)', color: 'var(--danger)', fontSize: 14 }}>
            {parsed.error}
          </div>
        )}
        {parsed && !parsed.error && (
          <div className="space-y-3 mt-2">
            <div
              className="p-4"
              style={{
                borderRadius: 'var(--r-xl)',
                background: parsed.type === 'income' ? 'var(--emerald-dim)' : parsed.type === 'transfer' ? 'var(--gold-dim)' : 'var(--danger-dim)',
                border: `1px solid ${parsed.type === 'income' ? 'rgba(52,211,153,0.3)' : parsed.type === 'transfer' ? 'rgba(251,191,36,0.3)' : 'rgba(252,165,165,0.3)'}`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span style={{ fontSize: 26 }}>{cat?.icon || '💳'}</span>
                  <div className="min-w-0">
                    <p className="font-display truncate" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{parsed.description}</p>
                    <p className="label-mono" style={{ fontSize: 10 }}>— {cat?.name || 'Unknown'}</p>
                  </div>
                </div>
                <p
                  className="font-display"
                  style={{
                    fontSize: 22,
                    fontWeight: 400,
                    color: parsed.type === 'income' ? 'var(--emerald)' : 'var(--danger)',
                    letterSpacing: '-0.02em',
                    flexShrink: 0,
                  }}
                >
                  {parsed.type === 'income' ? '+' : '\u2212'}{formatINR(parsed.amount).replace('\u2212','')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <p className="label-mono" style={{ fontSize: 9 }}>— Date</p>
                  <p className="body-primary" style={{ fontSize: 12, marginTop: 2 }}>{parsed.date}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <p className="label-mono" style={{ fontSize: 9 }}>— Account</p>
                  <p className="body-primary truncate" style={{ fontSize: 12, marginTop: 2 }}>{account?.name || '—'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setParsed(null)} className="btn btn-secondary flex-1">← Edit</button>
              <button onClick={confirm} className="btn btn-primary flex-1">✓ Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
