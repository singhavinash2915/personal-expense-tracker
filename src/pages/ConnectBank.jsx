import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Link } from 'react-router-dom'

// Account Aggregator (AA) framework UI flow — Setu / Finvu style.
// NOTE: Wiring to a real AA (Setu / Finvu / OneMoney / CAMSFinserv) requires a
// registered backend — this screen is the consent flow UI, ready to connect.

const POPULAR_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', icon: '🏦', color: '#004990' },
  { id: 'icici', name: 'ICICI Bank', icon: '🏦', color: '#F58220' },
  { id: 'sbi', name: 'SBI', icon: '🏦', color: '#23408F' },
  { id: 'axis', name: 'Axis Bank', icon: '🏦', color: '#97144D' },
  { id: 'kotak', name: 'Kotak', icon: '🏦', color: '#E8232F' },
  { id: 'indusind', name: 'IndusInd', icon: '🏦', color: '#A41E36' },
  { id: 'yesbank', name: 'YES Bank', icon: '🏦', color: '#00518F' },
  { id: 'idfc', name: 'IDFC First', icon: '🏦', color: '#8B1538' },
]

export default function ConnectBank() {
  const [step, setStep] = useState('select') // select | consent | connecting | success | error
  const [selectedBanks, setSelectedBanks] = useState([])
  const [phone, setPhone] = useState('')

  function toggleBank(b) {
    if (selectedBanks.find(x => x.id === b.id)) {
      setSelectedBanks(selectedBanks.filter(x => x.id !== b.id))
    } else {
      setSelectedBanks([...selectedBanks, b])
    }
  }

  function startConsent() {
    if (!phone || phone.length < 10) { alert('Enter a valid mobile number'); return }
    if (selectedBanks.length === 0) { alert('Select at least one bank'); return }
    setStep('consent')
  }

  async function grantConsent() {
    setStep('connecting')
    // Simulate AA consent flow (in production, would redirect to AA webview)
    await new Promise(r => setTimeout(r, 2500))
    setStep('success')
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Hero */}
      <div className="rounded-2xl p-5 md:p-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b, #1e40af)',
      }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔗</span>
            <h2 className="text-lg md:text-xl font-bold text-white">Connect Your Banks</h2>
          </div>
          <p className="text-sm text-indigo-200/80 mb-3">
            Securely sync all your accounts in one place using India's Account Aggregator framework.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🔒 RBI Regulated</span>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">🔐 Encrypted</span>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">✓ Read-only</span>
          </div>
        </div>
      </div>

      {step === 'select' && (
        <>
          {/* Phone input */}
          <div className="card p-4">
            <label className="text-xs font-medium text-slate-400 mb-1 block">Your registered mobile number</label>
            <div className="flex gap-2">
              <span className="px-3 py-2 rounded-lg bg-slate-800/40 border border-indigo-500/20 text-white text-sm">+91</span>
              <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit mobile"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800/40 border border-indigo-500/20 text-white text-sm" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Used to find linked bank accounts via AA network</p>
          </div>

          {/* Bank picker */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Select banks to connect</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {POPULAR_BANKS.map(b => {
                const sel = selectedBanks.find(x => x.id === b.id)
                return (
                  <button key={b.id} onClick={() => toggleBank(b)}
                    className={`p-3 rounded-xl border transition ${
                      sel ? 'border-indigo-400 bg-indigo-500/15' : 'border-white/10 bg-white/5'
                    }`}>
                    <div className="text-2xl mb-1">{b.icon}</div>
                    <p className="text-[11px] font-semibold text-white truncate">{b.name}</p>
                    {sel && <p className="text-[9px] text-indigo-300 mt-0.5">✓ Selected</p>}
                  </button>
                )
              })}
            </div>
            <button onClick={startConsent} disabled={selectedBanks.length === 0 || !phone}
              className="w-full mt-4 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Continue with {selectedBanks.length} bank{selectedBanks.length !== 1 ? 's' : ''} →
            </button>
          </div>
        </>
      )}

      {step === 'consent' && (
        <div className="card p-4 space-y-4">
          <h3 className="text-base font-semibold text-white">Grant Consent</h3>
          <p className="text-sm text-slate-300">ExpenseFlow is requesting consent to access:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-emerald-400">✓</span><span className="text-slate-300">Transaction history (last 12 months)</span></li>
            <li className="flex gap-2"><span className="text-emerald-400">✓</span><span className="text-slate-300">Account balance (read-only)</span></li>
            <li className="flex gap-2"><span className="text-emerald-400">✓</span><span className="text-slate-300">Account profile details</span></li>
            <li className="flex gap-2"><span className="text-rose-400">✗</span><span className="text-slate-300">No ability to transfer funds</span></li>
          </ul>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-200">
              <strong>⏱️ Consent valid for 1 year.</strong> You can revoke anytime from Settings → Connected Banks.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('select')} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white text-sm">Cancel</button>
            <button onClick={grantConsent} className="flex-1 py-2.5 rounded-xl font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>Grant Consent</button>
          </div>
        </div>
      )}

      {step === 'connecting' && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-spin" style={{
            background: 'conic-gradient(from 0deg, #6366f1, #8b5cf6, #6366f1)',
          }}>
            <div className="w-14 h-14 rounded-full bg-slate-900" />
          </div>
          <h3 className="text-base font-semibold text-white">Syncing with banks…</h3>
          <p className="text-xs text-slate-400 mt-2">Fetching transactions via AA network</p>
        </div>
      )}

      {step === 'success' && (
        <div className="card p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
          }}>
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Demo flow complete!</h3>
          <p className="text-sm text-slate-300 mb-4">
            This is a UI preview of the Account Aggregator flow. Wire your backend to Setu / Finvu to enable real sync.
          </p>
          <Link to="/accounts" className="inline-block px-6 py-2.5 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            Go to Accounts
          </Link>
        </div>
      )}
    </div>
  )
}
