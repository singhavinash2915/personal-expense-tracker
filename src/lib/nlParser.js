// Natural Language parser for voice/text transaction entry
// Handles amounts, merchants, categories, dates, types, accounts

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  thousand: 1000, lakh: 100000, lac: 100000, crore: 10000000,
}

function parseAmount(text) {
  // Try direct number match first: "350", "3,500", "3500.50"
  const direct = text.match(/(?:rs\.?|inr|₹|rupees?)?\s*([\d,]+\.?\d*)\s*(?:rs\.?|inr|₹|rupees?|k|thousand|lakh|lac|crore)?/i)
  if (direct) {
    let amt = parseFloat(direct[1].replace(/,/g, ''))
    const suffix = (direct[2] || '').toLowerCase()
    const post = text.toLowerCase()
    if (suffix.includes('k') || /\bk\b/.test(post.slice(direct.index + direct[0].length - 2, direct.index + direct[0].length + 2))) amt *= 1000
    else if (suffix.includes('thousand')) amt *= 1000
    else if (suffix.includes('lakh') || suffix.includes('lac')) amt *= 100000
    else if (suffix.includes('crore')) amt *= 10000000
    if (amt > 0) return amt
  }
  // Word-based: "three hundred"
  const words = text.toLowerCase().split(/\s+/)
  let total = 0, current = 0
  for (const w of words) {
    if (NUMBER_WORDS[w] !== undefined) {
      const n = NUMBER_WORDS[w]
      if (n === 100) current *= 100
      else if (n >= 1000) { total += (current || 1) * n; current = 0 }
      else current += n
    }
  }
  if (total + current > 0) return total + current
  return 0
}

const CATEGORY_KEYWORDS = [
  { id: 'c2', re: /\b(swiggy|zomato|uber eats|food|lunch|dinner|breakfast|snack|coffee|tea|restaurant|dominos|kfc|mcdonald|pizza|burger|biryani|thali|dosa)\b/i, merchant: (m) => m[0] },
  { id: 'c3', re: /\b(uber|ola|rapido|auto|taxi|metro|bus|train|flight|petrol|diesel|fuel|parking|irctc|indigo|airline)\b/i, merchant: (m) => m[0] },
  { id: 'c4', re: /\b(amazon|flipkart|myntra|nykaa|meesho|ajio|shopping|clothes|shirt|shoes|bag|electronics)\b/i, merchant: (m) => m[0] },
  { id: 'c5', re: /\b(netflix|spotify|hotstar|prime|disney|youtube premium|movie|cinema|pvr|inox|bookmyshow|concert|game|entertainment)\b/i, merchant: (m) => m[0] },
  { id: 'c6', re: /\b(airtel|jio|bsnl|vodafone|electricity|bijli|water|gas|cylinder|broadband|wifi|recharge|bill|mobile)\b/i, merchant: (m) => m[0] },
  { id: 'c7', re: /\b(apollo|medplus|pharmacy|medicine|medical|hospital|doctor|clinic|gym|fitness|yoga)\b/i, merchant: (m) => m[0] },
  { id: 'c8', re: /\b(school|college|tuition|course|book|stationery|udemy|coursera|udacity|class)\b/i, merchant: (m) => m[0] },
  { id: 'c9', re: /\b(makemytrip|goibibo|oyo|hotel|travel|vacation|trip|holiday|airbnb)\b/i, merchant: (m) => m[0] },
  { id: 'c1', re: /\b(rent|maintenance|society|apartment|lease|home loan emi|broker)\b/i, merchant: (m) => m[0] },
  { id: 'c11', re: /\b(haircut|salon|barber|spa|massage|beauty|cosmetic|makeup)\b/i, merchant: (m) => m[0] },
  { id: 'i1', re: /\b(salary|payroll|paycheck|stipend)\b/i, merchant: () => 'Salary' },
  { id: 'i2', re: /\b(freelance|project|contract|gig|consulting)\b/i, merchant: (m) => m[0] },
  { id: 'i3', re: /\b(dividend|interest|mutual fund|nav|sip|return|investment income)\b/i, merchant: (m) => m[0] },
  { id: 'i4', re: /\b(cashback|refund|reward|bonus|incentive|commission)\b/i, merchant: (m) => m[0] },
]

function detectCategory(text, type) {
  for (const c of CATEGORY_KEYWORDS) {
    const m = text.match(c.re)
    if (m) return { id: c.id, merchant: c.merchant(m) }
  }
  return { id: type === 'income' ? 'i5' : 'c10', merchant: null }
}

function detectType(text) {
  const s = text.toLowerCase()
  // Explicit income signals
  if (/\b(got|received|earned|credit|credited|salary|income|deposit|refund|cashback|earning|made)\b/.test(s)) return 'income'
  // Explicit expense signals
  if (/\b(spent|paid|bought|purchased|debited|gave|sent|withdrew|expense|cost|charged|bill)\b/.test(s)) return 'expense'
  // Transfer signals
  if (/\b(transfer|transferred|moved|sent to self)\b/.test(s)) return 'transfer'
  // Default: expense
  return 'expense'
}

function detectDate(text) {
  const today = new Date()
  const s = text.toLowerCase()
  if (/\byesterday\b/.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  if (/\btoday\b/.test(s)) return today.toISOString().slice(0, 10)
  if (/\btomorrow\b/.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }
  // "last monday", "3 days ago"
  const daysAgoMatch = s.match(/(\d+)\s+days?\s+ago/)
  if (daysAgoMatch) {
    const d = new Date(today); d.setDate(d.getDate() - parseInt(daysAgoMatch[1]))
    return d.toISOString().slice(0, 10)
  }
  // "on 15th", "on april 15"
  const monthMatch = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/)
  if (monthMatch) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
    const m = months[monthMatch[1]]
    const day = parseInt(monthMatch[2])
    const y = today.getFullYear()
    const d = new Date(y, m, day)
    if (d > today) d.setFullYear(y - 1) // past year if in future
    return d.toISOString().slice(0, 10)
  }
  return today.toISOString().slice(0, 10)
}

function detectAccount(text, accounts = []) {
  const s = text.toLowerCase()
  for (const a of accounts) {
    const name = (a.name || '').toLowerCase()
    if (name && s.includes(name)) return a.id
  }
  // Account-type hints
  if (/\bcredit card|cc\b/.test(s)) {
    const cc = accounts.find(a => /credit/i.test(a.name || ''))
    if (cc) return cc.id
  }
  if (/\bcash\b/.test(s)) {
    const cash = accounts.find(a => /cash/i.test(a.name || ''))
    if (cash) return cash.id
  }
  if (/\bupi|gpay|googlepay|phonepe|paytm\b/.test(s)) {
    const upi = accounts.find(a => /upi|gpay|phonepe/i.test(a.name || ''))
    if (upi) return upi.id
  }
  // Default to first account
  return accounts[0]?.id || null
}

function extractMerchant(text, hit) {
  // Priority 1: category hit gave a merchant
  if (hit && typeof hit === 'string') return hit
  // "at XYZ", "to XYZ", "from XYZ"
  const m = text.match(/(?:at|to|from|on)\s+([A-Za-z][A-Za-z0-9 &.\-_]{2,40})/i)
  if (m) return m[1].trim().replace(/\s+(yesterday|today|tomorrow|ago).*$/i, '').trim()
  return ''
}

export function parseNLTransaction(text, { accounts = [] } = {}) {
  if (!text) return null
  const amount = parseAmount(text)
  if (!amount) return { error: 'Could not detect an amount. Try "spent 300 on lunch"' }
  const type = detectType(text)
  const { id: categoryId, merchant: catMerchant } = detectCategory(text, type)
  const merchant = extractMerchant(text, catMerchant)
  const date = detectDate(text)
  const accountId = detectAccount(text, accounts)

  // Build description
  let description = merchant || ''
  if (!description) {
    // Strip known tokens and use remaining as description
    const cleaned = text
      .replace(/\b(spent|paid|bought|got|received|credit|debit|rs\.?|inr|rupees?|on|at|from|to|yesterday|today|tomorrow)\b/gi, '')
      .replace(/[\d,.]+/g, '')
      .trim().split(/\s+/).slice(0, 4).join(' ')
    description = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return {
    amount,
    type,
    categoryId,
    description: (description || 'Transaction').slice(0, 60),
    date,
    accountId,
    raw: text,
  }
}
