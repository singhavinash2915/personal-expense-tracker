/**
 * Parse OCR text extracted from a receipt / bill image.
 * Returns { amount, date, merchant, category } — all nullable if not found.
 */

// ── Amount detection ────────────────────────────────────────────────────────
const AMOUNT_PATTERNS = [
  // "Grand Total : ₹ 1,234.00"  /  "Total Amount : Rs 500"
  /grand\s*total\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  /total\s*amount\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  /net\s*(?:payable|amount|total)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  /amount\s*(?:due|payable|paid)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  /(?:bill|invoice)\s*(?:total|amount)\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  // plain "Total : 500" or "TOTAL 500"
  /\btotal\b\s*[:\-]?\s*(?:rs\.?|₹|inr)?\s*([\d,]+\.?\d*)/i,
  // "₹ 1,234" or "Rs. 234.50"
  /(?:rs\.?|₹|inr)\s*([\d,]+\.?\d{2})/i,
]

function parseAmount(text) {
  for (const re of AMOUNT_PATTERNS) {
    const m = text.match(re)
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''))
      if (val > 0) return val
    }
  }
  // Fallback: find the largest number that looks like a price
  const nums = [...text.matchAll(/\b(\d{1,6}[.,]\d{2})\b/g)]
    .map(m => parseFloat(m[1].replace(',', '.')))
    .filter(n => n > 0)
  return nums.length ? Math.max(...nums) : null
}

// ── Date detection ──────────────────────────────────────────────────────────
function parseDate(text) {
  // ISO: 2026-04-01
  let m = text.match(/\b(20\d{2})[\/\-\.](0?\d|1[0-2])[\/\-\.](0?\d|[12]\d|3[01])\b/)
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  m = text.match(/\b(0?\d|[12]\d|3[01])[\/\-\.](0?\d|1[0-2])[\/\-\.](20\d{2})\b/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`

  // "01 Apr 2026" / "April 01, 2026"
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
  m = text.match(/\b(\d{1,2})\s+([a-z]{3,9})\s+(20\d{2})\b/i)
  if (m) {
    const mo = MONTHS[m[2].slice(0,3).toLowerCase()]
    if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`
  }
  m = text.match(/\b([a-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\b/i)
  if (m) {
    const mo = MONTHS[m[1].slice(0,3).toLowerCase()]
    if (mo) return `${m[3]}-${String(mo).padStart(2,'0')}-${m[2].padStart(2,'0')}`
  }

  return new Date().toISOString().split('T')[0]  // default to today
}

// ── Merchant name detection ─────────────────────────────────────────────────
const SKIP_LINES = /^(gst|gstin|invoice|receipt|bill|date|time|phone|tel|mob|address|thank|visit|vat|tax|total|amount|cash|paid|change|order|table|www\.|http)/i

function parseMerchant(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2)
  // First meaningful line that isn't a label/number
  for (const line of lines.slice(0, 8)) {
    if (!SKIP_LINES.test(line) && !/^\d/.test(line) && line.length > 3) {
      // Remove special chars, keep letters/spaces
      return line.replace(/[^\w\s&'.\-]/g, '').trim().slice(0, 50)
    }
  }
  return ''
}

// ── Auto-suggest category from merchant / text ──────────────────────────────
const CAT_KEYWORDS = {
  c2:  ['restaurant','café','cafe','food','pizza','burger','swiggy','zomato','kitchen','dhaba','eat','bakery','biryani','hotel','canteen'],
  c3:  ['uber','ola','rapido','petrol','diesel','fuel','parking','metro','bus','auto','taxi','toll','train','flight','cab'],
  c5:  ['electricity','water','gas','broadband','wifi','internet','airtel','jio','bsnl','vodafone','bill','recharge'],
  c6:  ['amazon','flipkart','myntra','ajio','nykaa','shopping','mall','store','mart','supermarket','grocer','bigbasket','zepto','blinkit','dmart','reliance fresh'],
  c7:  ['doctor','hospital','clinic','pharmacy','medical','medicine','health','labs','diagnostics','apollo','max','fortis'],
  c8:  ['movie','cinema','netflix','hotstar','prime','spotify','concert','theatre','pvr','inox','game','fun','park','amusement'],
  c9:  ['school','college','university','tuition','course','books','stationery','education','fees'],
}

function suggestCategory(text) {
  const lower = text.toLowerCase()
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat
  }
  return 'c10'  // default: other expense
}

// ── Main export ─────────────────────────────────────────────────────────────
export function parseReceipt(ocrText) {
  return {
    amount:      parseAmount(ocrText),
    date:        parseDate(ocrText),
    merchant:    parseMerchant(ocrText),
    categoryId:  suggestCategory(ocrText),
  }
}
