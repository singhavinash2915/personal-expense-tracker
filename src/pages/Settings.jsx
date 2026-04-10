import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit2, X, Download, Upload, Moon, Sun, Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId } from '../lib/utils'

const EMPTY_CAT = { name: '', icon: '📦', color: '#7c3aed', type: 'expense' }

export default function Settings() {
  const { state, dispatch } = useApp()
  const [activeTab, setActiveTab] = useState('categories')
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [catForm, setCatForm] = useState(EMPTY_CAT)
  const [confirmClear, setConfirmClear] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [backupMsg, setBackupMsg] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(null)  // holds parsed backup data
  const [profileName, setProfileName] = useState(state.userName || '')
  const [profileSaved, setProfileSaved] = useState(false)

  function openAddCat() { setCatForm(EMPTY_CAT); setEditCat(null); setShowCatForm(true) }
  function openEditCat(cat) { setCatForm({ ...cat }); setEditCat(cat); setShowCatForm(true) }

  function handleCatSubmit(e) {
    e.preventDefault()
    if (editCat) {
      dispatch({ type: 'UPDATE_CATEGORY', payload: catForm })
    } else {
      dispatch({ type: 'ADD_CATEGORY', payload: { ...catForm, id: generateId() } })
    }
    setShowCatForm(false)
  }

  // ── JSON full backup / restore ───────────────────────────────────────────────
  function exportJSON() {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'ExpenseFlow',
      transactions:  state.transactions,
      accounts:      state.accounts,
      budgets:       state.budgets,
      creditCards:   state.creditCards,
      subscriptions: state.subscriptions,
      mutualFunds:   state.mutualFunds,
      stocks:        state.stocks,
      categories:    state.categories,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    a.href = url; a.download = `expenseflow-backup-${date}.json`; a.click()
    URL.revokeObjectURL(url)
    setBackupMsg('✅ Backup downloaded!')
    setTimeout(() => setBackupMsg(''), 3000)
  }

  function importJSON(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.transactions || !data.accounts) {
          setBackupMsg('❌ Invalid backup file — missing required fields.')
          setTimeout(() => setBackupMsg(''), 4000)
          return
        }
        // Ask for confirmation before overwriting
        setConfirmRestore(data)
      } catch {
        setBackupMsg('❌ Could not read file. Make sure it is a valid ExpenseFlow backup.')
        setTimeout(() => setBackupMsg(''), 4000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function doRestore() {
    dispatch({ type: 'IMPORT_BACKUP', payload: confirmRestore })
    setConfirmRestore(null)
    setBackupMsg('✅ Data restored successfully!')
    setTimeout(() => setBackupMsg(''), 3000)
  }

  // CSV Export
  function exportCSV() {
    const headers = ['Date', 'Type', 'Amount', 'Category', 'Description', 'Notes']
    const rows = state.transactions.map(t => {
      const cat = state.categories.find(c => c.id === t.categoryId)
      return [t.date, t.type, t.amount, cat?.name || '', `"${t.description}"`, `"${t.notes || ''}"`]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'expenseflow_transactions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // CSV Import
  function importCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const lines = ev.target.result.split('\n').slice(1).filter(Boolean)
        const imported = lines.map(line => {
          const [date, type, amount, , description, notes] = line.split(',')
          return {
            id: generateId(),
            date: date?.trim(),
            type: type?.trim(),
            amount: parseFloat(amount?.trim()) || 0,
            categoryId: 'c10',
            description: description?.replace(/"/g, '').trim() || '',
            notes: notes?.replace(/"/g, '').trim() || ''
          }
        }).filter(t => t.date && t.type && t.amount)
        dispatch({ type: 'IMPORT_DATA', payload: imported })
        setImportMsg(`Imported ${imported.length} transactions successfully!`)
        setTimeout(() => setImportMsg(''), 3000)
      } catch {
        setImportMsg('Error reading CSV. Please check the format.')
        setTimeout(() => setImportMsg(''), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'categories', label: 'Categories' },
    { id: 'data', label: 'Data & Export' },
    { id: 'appearance', label: 'Appearance' },
  ]

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-5">
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Your Profile</h3>
            <div>
              <label className="block text-sm font-medium text-violet-200 mb-1.5">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="input-field"
                maxLength={40}
              />
            </div>
            <button
              onClick={() => {
                dispatch({ type: 'SET_USER_NAME', payload: profileName.trim() })
                setProfileSaved(true)
                setTimeout(() => setProfileSaved(false), 2000)
              }}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              {profileSaved ? '✅ Saved!' : 'Save Name'}
            </button>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>Manage income and expense categories</p>
            <button onClick={openAddCat} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          {['expense', 'income'].map(type => (
            <div key={type} className="card p-5">
              <h4 className="text-sm font-semibold text-white mb-3 capitalize">{type} Categories</h4>
              <div className="grid grid-cols-2 gap-2">
                {state.categories.filter(c => c.type === type).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(109,40,217,0.08)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                        style={{ background: `${cat.color}20` }}>{cat.icon}</div>
                      <span className="text-sm font-medium text-white">{cat.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditCat(cat)} className="btn-ghost p-1.5 rounded-lg text-violet-300">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => dispatch({ type: 'DELETE_CATEGORY', payload: cat.id })}
                        className="btn-ghost p-1.5 rounded-lg text-rose-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Data & Export Tab */}
      {activeTab === 'data' && (
        <div className="space-y-4">

          {/* ── JSON Full Backup ── */}
          <div className="card p-5 md:p-6" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                style={{ background: 'rgba(245,158,11,0.12)' }}>💾</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-white mb-0.5">Full Backup (JSON)</h4>
                <p className="text-sm mb-3" style={{ color: 'rgba(196,181,253,0.55)' }}>
                  Downloads <strong className="text-white">all your data</strong> — transactions, accounts, budgets, credit cards,
                  subscriptions &amp; investments — as a single JSON file. Restore it on any device.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <button onClick={exportJSON}
                    className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
                    <Download className="w-4 h-4" /> Download Backup
                  </button>
                  <label className="btn-ghost flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer">
                    <Upload className="w-4 h-4" /> Restore from Backup
                    <input type="file" accept=".json" onChange={importJSON} className="hidden" />
                  </label>
                </div>
                {backupMsg && (
                  <p className={`mt-3 text-sm font-semibold ${backupMsg.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {backupMsg}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── CSV (transactions only) ── */}
          <div className="card p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl flex-shrink-0">📤</div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-white mb-1">Export Transactions (CSV)</h4>
                <p className="text-sm mb-4" style={{ color: 'rgba(196,181,253,0.5)' }}>
                  Download transactions only as a CSV file — useful for spreadsheets or accountants.
                </p>
                <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* ── CSV Import ── */}
          <div className="card p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-2xl flex-shrink-0">📥</div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-white mb-1">Import Transactions (CSV)</h4>
                <p className="text-sm mb-4" style={{ color: 'rgba(196,181,253,0.5)' }}>
                  Import from CSV with columns: Date, Type, Amount, Category, Description, Notes.
                  Adds to existing data without overwriting.
                </p>
                <label className="btn-ghost flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer w-fit">
                  <Upload className="w-4 h-4" /> Import CSV
                  <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
                </label>
                {importMsg && (
                  <p className={`mt-3 text-sm font-medium ${importMsg.includes('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {importMsg}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Clear Data */}
          <div className="card p-6" style={{ borderColor: 'rgba(225,29,72,0.2)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-2xl flex-shrink-0">🗑️</div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-white mb-1">Clear All Data</h4>
                <p className="text-sm mb-4" style={{ color: 'rgba(196,181,253,0.5)' }}>
                  Permanently delete all transactions, budgets, and investment data. Categories will be reset to defaults.
                  This action cannot be undone.
                </p>
                <button onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition">
                  Clear All Data
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-5">
            <h4 className="text-sm font-semibold text-white mb-3">Data Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Transactions',  count: state.transactions.length  },
                { label: 'Budgets',       count: state.budgets.length       },
                { label: 'Subscriptions', count: state.subscriptions.length },
                { label: 'Investments',   count: (state.mutualFunds.length + state.stocks.length) },
              ].map(({ label, count }) => (
                <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(109,40,217,0.08)' }}>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,253,0.5)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h4 className="text-base font-semibold text-white mb-1">Theme</h4>
            <p className="text-sm mb-5" style={{ color: 'rgba(196,181,253,0.5)' }}>Choose between dark and light mode</p>
            <div className="flex gap-3">
              {[
                { id: 'dark',  label: 'Dark Mode',  icon: <Moon  className="w-5 h-5" /> },
                { id: 'light', label: 'Light Mode', icon: <Sun   className="w-5 h-5" /> },
              ].map(({ id, label, icon }) => (
                <button key={id} onClick={() => dispatch({ type: 'SET_THEME', payload: id })}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    state.theme === id ? 'btn-primary' : 'btn-ghost'
                  }`}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h4 className="text-base font-semibold text-white mb-1">Currency</h4>
            <p className="text-sm mb-3" style={{ color: 'rgba(196,181,253,0.5)' }}>All amounts displayed in Indian Rupees (₹ INR)</p>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl w-fit" style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.2)' }}>
              <span className="text-2xl font-bold text-violet-300">₹</span>
              <span className="text-sm font-medium text-white">Indian Rupee (INR)</span>
              <span className="badge-violet text-xs">Active</span>
            </div>
          </div>

          <div className="card p-6">
            <h4 className="text-base font-semibold text-white mb-1">About ExpenseFlow</h4>
            <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
              Version 1.0.0 · Built with React + Vite + Tailwind CSS<br />
              Data stored locally in your browser · No server, no sync
            </p>
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="card p-6 w-96">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">{editCat ? 'Edit' : 'Add'} Category</h3>
              <button onClick={() => setShowCatForm(false)} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-4 h-4 text-violet-300" />
              </button>
            </div>
            <form onSubmit={handleCatSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Name</label>
                <input type="text" required placeholder="Category name" value={catForm.name}
                  onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Icon (emoji)</label>
                  <input type="text" placeholder="📦" maxLength={2} value={catForm.icon}
                    onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} className="input-field text-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-200 mb-1.5">Color</label>
                  <input type="color" value={catForm.color}
                    onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                    className="input-field h-10 p-1 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-200 mb-1.5">Type</label>
                <div className="flex gap-2">
                  {['expense', 'income'].map(t => (
                    <button key={t} type="button" onClick={() => setCatForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                        catForm.type === t ? 'btn-primary' : 'btn-ghost'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCatForm(false)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold">
                  {editCat ? 'Update' : 'Add'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Backup Confirm */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5,3,20,0.88)' }}>
          <div className="card p-6 w-full max-w-sm text-center">
            <p className="text-3xl mb-3">📂</p>
            <p className="text-white font-semibold text-lg mb-2">Restore Backup?</p>
            <p className="text-sm mb-1" style={{ color: 'rgba(196,181,253,0.6)' }}>
              This will <strong className="text-white">replace all current data</strong> with the backup from:
            </p>
            <p className="text-xs font-mono text-amber-400 mb-2">
              {new Date(confirmRestore.exportedAt).toLocaleString()}
            </p>
            <p className="text-xs mb-5" style={{ color: 'rgba(196,181,253,0.45)' }}>
              {confirmRestore.transactions?.length ?? 0} transactions · {confirmRestore.accounts?.length ?? 0} accounts · {confirmRestore.budgets?.length ?? 0} budgets
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestore(null)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={doRestore} className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold">Yes, Restore</button>
            </div>
          </div>
        </div>
      )}

      {/* App Info footer */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="ExpenseFlow" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <p className="text-sm font-semibold text-white">ExpenseFlow</p>
            <p className="text-xs" style={{ color: 'rgba(196,181,253,0.4)' }}>Version 1.0.0 · All data stored on your device</p>
          </div>
        </div>
        <Link to="/privacy" className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl btn-ghost"
          style={{ color: 'rgba(196,181,253,0.6)' }}>
          <Shield className="w-3.5 h-3.5" /> Privacy Policy
        </Link>
      </div>

      {/* Clear Data Confirm */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5,3,20,0.85)' }}>
          <div className="card p-6 w-96 text-center">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="text-white font-semibold text-lg mb-2">Clear All Data?</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(196,181,253,0.5)' }}>
              All transactions, budgets, subscriptions, investments, and credit cards will be permanently deleted.
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={() => { dispatch({ type: 'CLEAR_ALL_DATA' }); setConfirmClear(false) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition">
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
