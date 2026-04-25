import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatINR } from '../../lib/utils'

/**
 * InvestModal — handles BUY / SELL for both Mutual Funds and Stocks.
 * Maintains atomic state: bank balance moves, holdings update, transaction logged.
 *
 * Props:
 *   asset: { kind: 'mf'|'stock', id, name?, symbol?, units?, shares?, currentNav?, currentPrice? }
 *   action: 'buy' | 'sell'
 *   onClose: () => void
 */
export default function InvestModal({ asset, action, onClose }) {
  const { state, dispatch } = useApp()
  const today = new Date().toISOString().slice(0, 10)
  const isBuy = action === 'buy'
  const isMF = asset.kind === 'mf'

  const [accountId, setAccountId] = useState(state.accounts[0]?.id || '')
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')        // for MF buy or sell-by-amount
  const [units, setUnits] = useState('')          // for MF (or shares for stock)
  const [price, setPrice] = useState(             // current NAV / price (editable)
    isMF ? (asset.currentNav || 0) : (asset.currentPrice || 0)
  )

  const computedUnits = useMemo(() => {
    if (units) return parseFloat(units) || 0
    if (amount && price) return parseFloat(amount) / parseFloat(price)
    return 0
  }, [units, amount, price])

  const computedAmount = useMemo(() => {
    if (amount) return parseFloat(amount) || 0
    if (units && price) return parseFloat(units) * parseFloat(price)
    return 0
  }, [units, amount, price])

  const heldUnits = isMF ? (asset.units || 0) : (asset.shares || 0)

  function submit() {
    if (!accountId) { alert('Select an account'); return }
    if (!computedAmount || !computedUnits) { alert('Enter amount or units'); return }
    if (!isBuy && computedUnits > heldUnits) {
      alert(`You only hold ${heldUnits.toFixed(4)} ${isMF ? 'units' : 'shares'}.`)
      return
    }

    if (isMF) {
      dispatch({
        type: isBuy ? 'INVEST_MF' : 'REDEEM_MF',
        payload: {
          mfId: asset.id,
          amount: computedAmount,
          units: computedUnits,
          navAtPurchase: parseFloat(price),
          [isBuy ? 'fromAccountId' : 'toAccountId']: accountId,
          date,
        },
      })
    } else {
      dispatch({
        type: isBuy ? 'BUY_STOCK' : 'SELL_STOCK',
        payload: {
          stockId: asset.id,
          shares: computedUnits,
          price: parseFloat(price),
          [isBuy ? 'fromAccountId' : 'toAccountId']: accountId,
          date,
        },
      })
    }
    onClose()
  }

  const acct = state.accounts.find(a => a.id === accountId)
  const balanceAfter = acct ? (acct.balance || 0) + (isBuy ? -computedAmount : +computedAmount) : 0

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
      style={{ background: 'rgba(3,17,13,0.85)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full md:w-[460px] md:max-w-[92vw] max-h-[92vh] overflow-y-auto p-5 md:p-6 animate-sheet-up md:animate-fadeIn"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
        }}
      >
        <div className="md:hidden w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border-default)' }} />

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label-mono" style={{ fontSize: 10 }}>— {isBuy ? 'Buy' : 'Sell'}</div>
            <h2 className="heading" style={{ fontSize: 20, marginTop: 4 }}>
              {asset.symbol || asset.name}
            </h2>
            <p className="body-secondary" style={{ fontSize: 12 }}>
              {isMF ? `${(asset.units || 0).toFixed(4)} units held` : `${(asset.shares || 0)} shares held`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label={isMF ? 'NAV / Price' : 'Price per share'}>
            <input type="number" step="0.0001" className="input"
              value={price}
              onChange={e => setPrice(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Amount (₹)">
              <input
                type="number"
                placeholder="auto-calc"
                className="input"
                value={amount}
                onChange={e => { setAmount(e.target.value); setUnits('') }}
              />
            </Field>
            <Field label={isMF ? 'Units' : 'Shares'}>
              <input
                type="number"
                step="0.0001"
                placeholder="auto-calc"
                className="input"
                value={units}
                onChange={e => { setUnits(e.target.value); setAmount('') }}
              />
            </Field>
          </div>

          <Field label={isBuy ? 'Pay from account' : 'Credit to account'}>
            <select className="input select" value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">Select account</option>
              {state.accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {formatINR(a.balance || 0)}</option>
              ))}
            </select>
          </Field>

          <Field label="Date">
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </Field>

          {/* Preview */}
          <div className="rounded-2xl p-3 mt-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>{isMF ? 'Units' : 'Shares'}</span>
              <span className="font-display" style={{ color: 'var(--text-primary)' }}>{computedUnits.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
              <span className="font-display" style={{ color: 'var(--text-primary)' }}>{formatINR(computedAmount)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Account balance after</span>
              <span className="font-display" style={{ color: balanceAfter >= 0 ? 'var(--emerald)' : 'var(--danger)' }}>
                {formatINR(balanceAfter)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button onClick={submit} className="btn btn-primary flex-1">
              {isBuy ? 'Confirm Buy' : 'Confirm Sell'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-mono" style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>— {label}</label>
      {children}
    </div>
  )
}
