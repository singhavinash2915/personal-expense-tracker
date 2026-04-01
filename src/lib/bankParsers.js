// ── Shared helpers ────────────────────────────────────────────────────────────

function parseDateDMY(str) {
  if (!str) return null
  // DD/MM/YYYY  DD-MM-YYYY  DD.MM.YYYY
  const m1 = str.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
  // "01 Mar 2026" or "01-Mar-2026"
  const m2 = str.trim().match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{4})$/)
  if (m2) {
    const mo = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                 jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' }[m2[2].toLowerCase()]
    if (mo) return `${m2[3]}-${mo}-${m2[1].padStart(2,'0')}`
  }
  return null
}

function parseAmt(str) {
  if (!str?.trim() || str.trim() === '-') return 0
  return parseFloat(str.replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0
}

function splitCSV(line) {
  const result = []; let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') inQ = !inQ
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else cur += ch
  }
  result.push(cur.trim())
  return result
}

function toRow(headers, cols) {
  const row = {}
  headers.forEach((h, i) => { row[h] = (cols[i] || '').replace(/"/g, '').trim() })
  return row
}

function findHeaderLine(lines, keywords) {
  return lines.findIndex(l => keywords.every(kw => l.toLowerCase().includes(kw.toLowerCase())))
}

// ── ICICI Bank PDF parser ─────────────────────────────────────────────────────
// Uses pdfjs-dist word positions to correctly parse ICICI account statement PDFs.
// Column X boundaries (PDF user units, measured from actual statement):
//   S.No     : x <  60
//   Date     : 60 ≤ x < 120
//   Remarks  : 190 ≤ x < 390   (includes Cheque Number column)
//   Amount   : 390 ≤ x < 525   (withdrawal OR deposit — resolved via balance delta)
//   Balance  : x ≥ 525

async function parseICICIPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  // Worker file is served from /public/pdf.worker.min.mjs (copied from pdfjs-dist).
  // This runs in a Web Worker so Vite's pre-bundled pdfjs main module can talk to it.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  function colOf(x) {
    if (x <  60)  return 'sno'
    if (x < 120)  return 'date'
    if (x < 190)  return 'cheque'   // ignored — overlaps with remarks visually
    if (x < 390)  return 'remarks'
    if (x < 525)  return 'amount'   // withdrawal OR deposit
    return 'balance'
  }

  // Collect every text item across all pages with absolute top-down Y
  const items = []
  for (let pn = 1; pn <= pdf.numPages; pn++) {
    const page = await pdf.getPage(pn)
    const vp   = page.getViewport({ scale: 1 })
    const tc   = await page.getTextContent()
    for (const item of tc.items) {
      const text = item.str?.trim()
      if (!text) continue
      items.push({
        text,
        x:   item.transform[4],
        y:   pn * 10000 + Math.round(vp.height - item.transform[5]), // page-offset top-down
        col: colOf(item.transform[4]),
      })
    }
  }

  // Group items into rows (Y tolerance ±3 units)
  const rowMap = new Map()
  for (const item of items) {
    let key = null
    for (const k of rowMap.keys()) {
      if (Math.abs(k - item.y) <= 3) { key = k; break }
    }
    if (key === null) { key = item.y; rowMap.set(key, []) }
    rowMap.get(key).push(item)
  }

  // Build structured rows sorted by Y
  const DATE_RE = /^\d{2}\.\d{2}\.\d{4}$/
  const AMT_RE  = /^[\d,]+\.\d{2}$/

  const rows = [...rowMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([yKey, its]) => {
      const byCol = {}
      for (const it of its.sort((a, b) => a.x - b.x)) {
        if (!byCol[it.col]) byCol[it.col] = []
        byCol[it.col].push(it.text)
      }
      const dateStr = (byCol.date || []).find(t => DATE_RE.test(t)) || null
      const amtStr  = (byCol.amount || []).find(t => AMT_RE.test(t)) || null
      const balStr  = (byCol.balance || []).find(t => AMT_RE.test(t)) || null
      const remarks = [...(byCol.cheque || []), ...(byCol.remarks || [])].join(' ').trim()
      const sno     = (byCol.sno || []).find(t => /^\d+$/.test(t)) || null
      return { yKey, date: dateStr, amount: amtStr, balance: balStr, remarks, sno }
    })

  // Identify data rows (have a valid date) vs remark-only rows
  const dataRows = rows.filter(r => r.date && DATE_RE.test(r.date))

  if (!dataRows.length) return []

  // Filter out header/legend rows that shouldn't be part of any transaction description
  const SKIP_WORDS = ['cheque number', 'transaction remarks', 'value date', 'transaction date',
    'legends for', 'please call', 'www.icici', 'dial your bank', 'pavc', 'imps -', 'vat/mat']
  const remarksRows = rows.filter(r =>
    !r.date && r.remarks &&
    !SKIP_WORDS.some(w => r.remarks.toLowerCase().includes(w))
  )

  // Max distance (in Y units) to look above/below a data row for its description lines.
  // ICICI format: prefix at ≈y−5, suffix1 at ≈y+5, suffix2 at ≈y+10 → cap at 12.
  const MAX_DESC_DIST = 12

  function midpoint(a, b) { return (a + b) / 2 }

  const txs = dataRows.map((dr, i) => {
    const prevY = i > 0 ? dataRows[i - 1].yKey : -Infinity
    const nextY = i < dataRows.length - 1 ? dataRows[i + 1].yKey : Infinity
    // Midpoint boundaries keep adjacent-txn remarks separate
    const mpLo = i > 0 ? midpoint(prevY, dr.yKey) : -Infinity
    const mpHi = i < dataRows.length - 1 ? midpoint(dr.yKey, nextY) : Infinity
    // Cap at MAX_DESC_DIST to exclude page headers/footers on first/last transactions
    const lo = Math.max(mpLo, dr.yKey - MAX_DESC_DIST)
    const hi = Math.min(mpHi, dr.yKey + MAX_DESC_DIST)

    // Collect all remarks in this transaction's territory, sorted by Y.
    // Prefix: (lo, dr.yKey)  — strictly after lower bound so boundary belongs to suffix of prev txn
    // Suffix: (dr.yKey, hi]  — up to and including upper bound
    const descParts = [
      ...remarksRows.filter(r => r.yKey > lo && r.yKey < dr.yKey).map(r => r.remarks),
      dr.remarks,
      ...remarksRows.filter(r => r.yKey > dr.yKey && r.yKey <= hi).map(r => r.remarks),
    ].filter(Boolean)

    return {
      date:    parseDateDMY(dr.date),
      amount:  parseAmt(dr.amount || '0'),
      balance: parseAmt(dr.balance || '0'),
      description: descParts.join(' ').replace(/\s+/g, ' ').trim() || 'Bank Transaction',
    }
  }).filter(t => t.date && t.amount > 0)

  // Determine withdrawal vs deposit using running balance delta
  // (balance column gives the post-transaction balance, so:
  //   balance[i] > balance[i-1] → deposit  |  balance[i] < balance[i-1] → withdrawal)
  return txs.map((t, i) => {
    let type = 'expense'
    if (i > 0 && txs[i - 1].balance > 0) {
      type = t.balance > txs[i - 1].balance ? 'income' : 'expense'
    }
    return { date: t.date, amount: t.amount, description: t.description, type }
  })
}

// ── CSV parser factory ────────────────────────────────────────────────────────

function csvParser(config) {
  return {
    label: config.label,
    parse(text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      const hi = findHeaderLine(lines, config.headerKeywords)
      if (hi === -1) throw new Error(
        `Cannot find ${config.label} statement header. Upload the correct bank's CSV.`
      )
      const headers = splitCSV(lines[hi]).map(h => h.toLowerCase().trim())
      const txs = []
      for (let i = hi + 1; i < lines.length; i++) {
        const cols = splitCSV(lines[i])
        if (cols.length < 4) continue
        const row = toRow(headers, cols)
        const date = parseDateDMY(
          row[config.dateCol] || row[config.dateCol2] || row['value date'] || row['date']
        ) || (() => { const d = new Date(row[config.dateCol] || ''); return isNaN(d) ? null : d.toISOString().slice(0, 10) })()
        if (!date) continue
        const withdrawal = parseAmt(config.withdrawalCols.map(c => row[c]).find(v => v) || '')
        const deposit    = parseAmt(config.depositCols.map(c => row[c]).find(v => v) || '')
        if (withdrawal === 0 && deposit === 0) continue
        const description = (config.descCols.map(c => row[c]).find(v => v) || '').replace(/\s+/g, ' ')
        txs.push({ type: deposit > 0 ? 'income' : 'expense', amount: deposit > 0 ? deposit : withdrawal, description: description || 'Bank Transaction', date })
      }
      return txs
    },
  }
}

// ── Exported parsers ──────────────────────────────────────────────────────────

export const BANK_PARSERS = {
  icici: {
    label: 'ICICI Bank',
    // PDF parsing — primary method for ICICI statements
    async parsePDF(file) { return parseICICIPDF(file) },
    // CSV fallback (ICICI CSV export from netbanking)
    parse(text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      let hi = findHeaderLine(lines, ['Value Date', 'Withdrawal'])
      if (hi === -1) hi = findHeaderLine(lines, ['Transaction Date', 'Withdrawal'])
      if (hi === -1) throw new Error(
        'Cannot find ICICI statement header. Expected "Value Date" and "Withdrawal Amount" columns.'
      )
      const headers = splitCSV(lines[hi]).map(h => h.toLowerCase().trim())
      const txs = []
      for (let i = hi + 1; i < lines.length; i++) {
        const cols = splitCSV(lines[i])
        if (cols.length < 5) continue
        const row = toRow(headers, cols)
        const date = parseDateDMY(row['value date'] || row['transaction date'])
        if (!date) continue
        const withdrawal = parseAmt(
          row['withdrawal amount (inr )'] || row['withdrawal amount(inr)'] ||
          row['withdrawal amt.'] || row['debit amount'] || row['debit'] || ''
        )
        const deposit = parseAmt(
          row['deposit amount (inr )'] || row['deposit amount(inr)'] ||
          row['deposit amt.'] || row['credit amount'] || row['credit'] || ''
        )
        if (withdrawal === 0 && deposit === 0) continue
        const description = (
          row['transaction remarks'] || row['remarks'] || row['narration'] || ''
        ).replace(/\s+/g, ' ')
        txs.push({ type: deposit > 0 ? 'income' : 'expense', amount: deposit > 0 ? deposit : withdrawal, description: description || 'Bank Transaction', date })
      }
      return txs
    },
  },

  hdfc: csvParser({
    label: 'HDFC Bank',
    headerKeywords: ['Narration', 'Withdrawal'],
    dateCol: 'date', dateCol2: 'value dt',
    withdrawalCols: ['withdrawal amt.', 'withdrawal amount', 'debit'],
    depositCols:    ['deposit amt.',    'deposit amount',    'credit'],
    descCols:       ['narration', 'description', 'particulars'],
  }),

  sbi: {
    label: 'State Bank of India',
    parse(text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      let hi = findHeaderLine(lines, ['Debit', 'Credit', 'Description'])
      if (hi === -1) hi = findHeaderLine(lines, ['Txn Date', 'Debit'])
      if (hi === -1) throw new Error('Cannot find SBI statement header row.')
      const headers = splitCSV(lines[hi]).map(h => h.toLowerCase().trim())
      const txs = []
      for (let i = hi + 1; i < lines.length; i++) {
        const cols = splitCSV(lines[i])
        if (cols.length < 4) continue
        const row = toRow(headers, cols)
        const rawDate = row['txn date'] || row['value date'] || row['date']
        const date = parseDateDMY(rawDate) ||
          (() => { const d = new Date(rawDate); return isNaN(d) ? null : d.toISOString().slice(0, 10) })()
        if (!date) continue
        const debit  = parseAmt(row['debit']  || row['withdrawal'] || '')
        const credit = parseAmt(row['credit'] || row['deposit']    || '')
        if (debit === 0 && credit === 0) continue
        const description = (row['description'] || row['narration'] || '').replace(/\s+/g, ' ')
        txs.push({ type: credit > 0 ? 'income' : 'expense', amount: credit > 0 ? credit : debit, description: description || 'Bank Transaction', date })
      }
      return txs
    },
  },

  axis: csvParser({
    label: 'Axis Bank',
    headerKeywords: ['Particulars', 'Debit', 'Credit'],
    dateCol: 'tran date', dateCol2: 'value date',
    withdrawalCols: ['debit', 'withdrawal'],
    depositCols:    ['credit', 'deposit'],
    descCols:       ['particulars', 'narration', 'description'],
  }),

  kotak: csvParser({
    label: 'Kotak Mahindra Bank',
    headerKeywords: ['Debit Amount', 'Credit Amount'],
    dateCol: 'transaction date', dateCol2: 'value date',
    withdrawalCols: ['debit amount', 'debit'],
    depositCols:    ['credit amount', 'credit'],
    descCols:       ['description', 'narration'],
  }),
}

// ── Auto-detect bank ──────────────────────────────────────────────────────────

export function detectBank(text, bankName = '') {
  const b = bankName.toLowerCase()
  if (b.includes('icici'))                            return 'icici'
  if (b.includes('hdfc'))                             return 'hdfc'
  if (b.includes('state bank') || b.includes('sbi')) return 'sbi'
  if (b.includes('axis'))                             return 'axis'
  if (b.includes('kotak'))                            return 'kotak'
  const t = (text || '').slice(0, 3000).toLowerCase()
  if (t.includes('icici bank'))          return 'icici'
  if (t.includes('hdfc bank'))           return 'hdfc'
  if (t.includes('state bank of india')) return 'sbi'
  if (t.includes('axis bank'))           return 'axis'
  if (t.includes('kotak mahindra'))      return 'kotak'
  return null
}

// ── Auto-categorise by description keywords ───────────────────────────────────

const KEYWORD_MAP = [
  ['c2', ['swiggy','zomato','bigbasket','big basket','dunzo','blinkit','zepto','grofers','grocery','restaurant','cafe','food','dominos','mcdonald','kfc','pizza']],
  ['c3', ['uber','ola','rapido','petrol','diesel','fuel','metro','irctc','bus','taxi','cab','parking']],
  ['c4', ['amazon','flipkart','myntra','nykaa','meesho','ajio','tatacliq','shopping','mall','store']],
  ['c5', ['netflix','spotify','hotstar','prime video','youtube premium','zee5','sonyliv','bookmyshow','pvr','inox']],
  ['c6', ['electricity','power','bescom','water','gas bill','internet','broadband','airtel','jio','bsnl','vodafone','recharge','mobile bill','postpaid','prepaid','bill pay','bpay']],
  ['c7', ['doctor','hospital','clinic','pharmacy','medplus','apollo','fortis','medical','medicine','lab','diagnostic','health','insurance','national insurance','star health']],
  ['c8', ['school','college','university','course','udemy','coursera','byju','unacademy','tuition','fees']],
  ['c9', ['makemytrip','goibibo','oyo','cleartrip','flight','airways','indigo','air india','hotel','resort','travel','yatra']],
  ['c1', ['rent','maintenance','society','housing','landlord','lease']],
  ['i1', ['salary','payroll','ctc','compensation']],
  ['i2', ['freelance','upwork','fiverr','consulting','invoice']],
  ['i3', ['dividend','interest','mutual fund','nav','nps','ppf','fd interest','sip','ppfas','tata mutua','hdfc mutua','mirae','icici prud','icicipru','nippon','axis mf']],
]

export function autoCategory(description, type) {
  const lower = description.toLowerCase()
  for (const [catId, keywords] of KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return catId
  }
  return type === 'income' ? 'i5' : 'c10'
}
