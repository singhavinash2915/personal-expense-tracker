// ── PDF text extraction via pdfjs-dist ────────────────────────────────────────

async function extractPDFRows(file) {
  const pdfjsLib = await import('pdfjs-dist')
  // Use CDN worker to avoid Vite bundling issues
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const allItems = []
  for (let pn = 1; pn <= pdf.numPages; pn++) {
    const page = await pdf.getPage(pn)
    const vp = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    for (const item of tc.items) {
      if (!item.str?.trim()) continue
      allItems.push({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        // PDF y is bottom-up; flip to top-down
        y: Math.round(vp.height - item.transform[5]),
        page: pn,
      })
    }
  }

  // Group items into rows by Y coordinate (±4px tolerance)
  const Y_TOL = 4
  const rowMap = new Map()
  for (const item of allItems) {
    let matched = null
    for (const [key] of rowMap) {
      if (Math.abs(key - item.y + item.page * 10000) <= Y_TOL) { matched = key; break }
    }
    const key = matched ?? item.y + item.page * 10000
    if (!rowMap.has(key)) rowMap.set(key, [])
    rowMap.get(key).push(item)
  }

  // Sort rows top-to-bottom; sort items in each row left-to-right
  return [...rowMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, items]) => items.sort((a, b) => a.x - b.x))
}

// ── Common helpers ────────────────────────────────────────────────────────────

function parseDateDMY(str) {
  if (!str) return null
  const m1 = str.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
  const m2 = str.trim().match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{4})$/)
  if (m2) {
    const mo = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}[m2[2].toLowerCase()]
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

// ── ICICI PDF parser ──────────────────────────────────────────────────────────
// Handles ICICI Bank account statement PDFs (savings, current, salary accounts)

function parseICICIPDFRows(rows) {
  const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/
  const AMT_RE  = /^[\d,]+\.\d{2}$/

  // Find header row containing "Value Date" + "Withdrawal"
  let headerRowIdx = rows.findIndex(r => {
    const txt = r.map(i => i.text).join(' ')
    return txt.includes('Value Date') && (txt.includes('Withdrawal') || txt.includes('Debit'))
  })
  if (headerRowIdx === -1) {
    // Fallback: find first row with two date-like items followed by amounts
    headerRowIdx = 0
  }

  // Derive column X-boundaries from header row
  const headerRow = rows[headerRowIdx] || []
  const colX = {
    withdrawal: headerRow.find(i => /withdrawal|debit/i.test(i.text))?.x ?? null,
    deposit:    headerRow.find(i => /deposit|credit/i.test(i.text))?.x ?? null,
    balance:    headerRow.find(i => /balance/i.test(i.text))?.x ?? null,
  }

  const txs = []
  // Buffer for multi-line transaction remarks
  let pending = null

  const flush = () => {
    if (!pending) return
    const { date, items } = pending
    // Gather all amount-like items from the collected rows
    const amtItems = items.filter(i => AMT_RE.test(i.text)).map(i => ({ x: i.x, v: parseAmt(i.text) }))
    if (amtItems.length === 0) { pending = null; return }

    let withdrawal = 0, deposit = 0
    if (colX.withdrawal !== null && colX.deposit !== null) {
      // Assign amounts by X proximity to header column positions
      for (const ai of amtItems) {
        const dW = Math.abs(ai.x - colX.withdrawal)
        const dD = Math.abs(ai.x - colX.deposit)
        const dB = colX.balance !== null ? Math.abs(ai.x - colX.balance) : Infinity
        if (dB < dW && dB < dD) continue // balance column — skip
        if (dW < dD) withdrawal = ai.v
        else deposit = ai.v
      }
    } else {
      // No header: last amount is balance, second-to-last is the transaction
      const sorted = amtItems.sort((a, b) => a.x - b.x)
      if (sorted.length >= 2) {
        // Heuristic: larger x = balance column
        const nonBalance = sorted.slice(0, -1)
        const txAmt = nonBalance[nonBalance.length - 1]
        // Check if balance increased (deposit) vs decreased (withdrawal)
        const balance = sorted[sorted.length - 1].v
        // Compare balance with the amount: if balance > prev guess it's deposit
        withdrawal = txAmt.v  // default to withdrawal; will fix below
      }
    }

    const description = items
      .filter(i => !DATE_RE.test(i.text) && !AMT_RE.test(i.text) && !/^\d+$/.test(i.text))
      .map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()

    if ((withdrawal > 0 || deposit > 0) && description) {
      txs.push({
        type: deposit > 0 ? 'income' : 'expense',
        amount: deposit > 0 ? deposit : withdrawal,
        description: description || 'Bank Transaction',
        date,
      })
    }
    pending = null
  }

  for (let ri = headerRowIdx + 1; ri < rows.length; ri++) {
    const row = rows[ri]
    const texts = row.map(i => i.text)
    const rowStr = texts.join(' ')

    // Skip header repetitions, page numbers, totals
    if (/value date|transaction date|withdrawal amount|opening balance|closing balance|page \d/i.test(rowStr)) {
      flush(); continue
    }

    // Check if this row starts a new transaction (has a date in first few items)
    const firstDate = texts.slice(0, 5).find(t => DATE_RE.test(t))
    if (firstDate) {
      flush()
      const date = parseDateDMY(firstDate)
      if (date) {
        pending = { date, items: [...row] }
        continue
      }
    }

    // Continuation of current transaction (multi-line remarks)
    if (pending) {
      // If this row has only non-amount, non-date text, it's part of the remarks
      const hasDate = texts.some(t => DATE_RE.test(t))
      const hasAmt  = texts.some(t => AMT_RE.test(t))
      if (!hasDate || hasAmt) {
        pending.items.push(...row)
      } else {
        flush()
      }
    }
  }
  flush()
  return txs
}

// ── CSV parsers ───────────────────────────────────────────────────────────────

function csvParser(config) {
  return {
    label: config.label,
    parse(text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      const hi = findHeaderLine(lines, config.headerKeywords)
      if (hi === -1) throw new Error(`Cannot find ${config.label} statement header row. Please make sure you're uploading the correct bank's CSV.`)
      const headers = splitCSV(lines[hi]).map(h => h.toLowerCase().trim())
      const txs = []
      for (let i = hi + 1; i < lines.length; i++) {
        const cols = splitCSV(lines[i])
        if (cols.length < 4) continue
        const row = toRow(headers, cols)
        const date = parseDateDMY(
          row[config.dateCol] || row[config.dateCol2] || row['value date'] || row['date']
        ) || (() => { const d = new Date(row[config.dateCol] || ''); return isNaN(d) ? null : d.toISOString().slice(0,10) })()
        if (!date) continue
        const withdrawal = parseAmt(config.withdrawalCols.map(c => row[c]).find(v => v) || '')
        const deposit    = parseAmt(config.depositCols.map(c => row[c]).find(v => v) || '')
        if (withdrawal === 0 && deposit === 0) continue
        const description = (config.descCols.map(c => row[c]).find(v => v) || '').replace(/\s+/g, ' ')
        txs.push({ type: deposit > 0 ? 'income' : 'expense', amount: deposit > 0 ? deposit : withdrawal, description: description || 'Bank Transaction', date })
      }
      return txs
    }
  }
}

// ── Exported parsers ──────────────────────────────────────────────────────────

export const BANK_PARSERS = {
  icici: {
    label: 'ICICI Bank',
    async parsePDF(file) { return parseICICIPDFRows(await extractPDFRows(file)) },
    parse(text) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      let hi = findHeaderLine(lines, ['Value Date', 'Withdrawal'])
      if (hi === -1) hi = findHeaderLine(lines, ['Transaction Date', 'Withdrawal'])
      if (hi === -1) throw new Error('Cannot find ICICI statement header row. Expected "Value Date" and "Withdrawal Amount" columns.')
      const headers = splitCSV(lines[hi]).map(h => h.toLowerCase().trim())
      const txs = []
      for (let i = hi + 1; i < lines.length; i++) {
        const cols = splitCSV(lines[i])
        if (cols.length < 5) continue
        const row = toRow(headers, cols)
        const date = parseDateDMY(row['value date'] || row['transaction date'])
        if (!date) continue
        const withdrawal = parseAmt(row['withdrawal amount (inr )'] || row['withdrawal amount(inr)'] || row['withdrawal amt.'] || row['debit amount'] || row['debit'] || '')
        const deposit    = parseAmt(row['deposit amount (inr )']    || row['deposit amount(inr)']    || row['deposit amt.']    || row['credit amount'] || row['credit'] || '')
        if (withdrawal === 0 && deposit === 0) continue
        const description = (row['transaction remarks'] || row['remarks'] || row['narration'] || row['particulars'] || '').replace(/\s+/g, ' ')
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
        const date = parseDateDMY(rawDate) || (() => { const d = new Date(rawDate); return isNaN(d) ? null : d.toISOString().slice(0,10) })()
        if (!date) continue
        const debit  = parseAmt(row['debit']  || row['withdrawal'] || '')
        const credit = parseAmt(row['credit'] || row['deposit']    || '')
        if (debit === 0 && credit === 0) continue
        const description = (row['description'] || row['narration'] || row['particulars'] || '').replace(/\s+/g, ' ')
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
  if (t.includes('icici bank'))           return 'icici'
  if (t.includes('hdfc bank'))            return 'hdfc'
  if (t.includes('state bank of india')) return 'sbi'
  if (t.includes('axis bank'))            return 'axis'
  if (t.includes('kotak mahindra'))      return 'kotak'
  return null
}

// ── Auto-categorise ───────────────────────────────────────────────────────────

const KEYWORD_MAP = [
  ['c2', ['swiggy','zomato','bigbasket','big basket','dunzo','blinkit','zepto','grofers','grocery','restaurant','cafe','food','dominos','mcdonald','kfc','pizza']],
  ['c3', ['uber','ola','rapido','petrol','diesel','fuel','metro','irctc','bus','taxi','cab','parking']],
  ['c4', ['amazon','flipkart','myntra','nykaa','meesho','ajio','tatacliq','shopping','mall','store']],
  ['c5', ['netflix','spotify','hotstar','prime video','youtube premium','zee5','sonyliv','bookmyshow','pvr','inox']],
  ['c6', ['electricity','power','bescom','water','gas bill','internet','broadband','airtel','jio','bsnl','vodafone','recharge','mobile bill','postpaid','prepaid']],
  ['c7', ['doctor','hospital','clinic','pharmacy','medplus','apollo','fortis','medical','medicine','lab','diagnostic','health']],
  ['c8', ['school','college','university','course','udemy','coursera','byju','unacademy','tuition','fees']],
  ['c9', ['makemytrip','goibibo','oyo','cleartrip','flight','airways','indigo','air india','hotel','resort','travel','yatra']],
  ['c1', ['rent','maintenance','society','housing','landlord','lease']],
  ['i1', ['salary','payroll','ctc','compensation']],
  ['i2', ['freelance','upwork','fiverr','consulting','invoice']],
  ['i3', ['dividend','interest','mutual fund','nav','nps','ppf','fd interest','fixed deposit']],
]

export function autoCategory(description, type) {
  const lower = description.toLowerCase()
  for (const [catId, keywords] of KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return catId
  }
  return type === 'income' ? 'i5' : 'c10'
}
