// SMS auto-import parser
// Reads bank/UPI SMS on Android and converts them to transaction suggestions.
// iOS: not supported (Apple restricts SMS access entirely).

import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()
const isAndroid = Capacitor.getPlatform() === 'android'

// Regex patterns for common bank/UPI SMS formats
const PATTERNS = [
  // HDFC / ICICI / SBI / Axis debit patterns
  { re: /(?:spent|debited|paid|sent|transferred|withdrawn)\s+(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i, type: 'expense' },
  { re: /(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)\s+(?:debited|spent|paid|sent)/i, type: 'expense' },
  // UPI debit
  { re: /(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)\s+(?:has been debited|debited from)/i, type: 'expense' },
  // Credit patterns
  { re: /(?:credited|received|deposited|added)\s+(?:with\s+)?(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)/i, type: 'income' },
  { re: /(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)\s+(?:credited|received|deposited)/i, type: 'income' },
]

// Merchant extraction patterns
const MERCHANT_PATTERNS = [
  /at\s+([A-Z][A-Za-z0-9\s&.\-_]{2,30?})(?:\s+on|\.|\s*$)/i,
  /to\s+([A-Z][A-Za-z0-9\s&.\-_]{2,30?})(?:\s+on|\.|\s*$)/i,
  /from\s+([A-Z][A-Za-z0-9\s&.\-_]{2,30?})(?:\s+on|\.|\s*$)/i,
  /upi[\/\-]([A-Z][A-Za-z0-9\s&.\-_@]{2,30?})(?:[\s\/]|$)/i,
]

// Trusted sender filters — typical Indian bank/UPI SMS senders
const TRUSTED_SENDERS = [
  /^[A-Z]{2}-[A-Z]{4,}/i, // e.g. VM-HDFCBK, AD-SBIINB
  /^[A-Z]{6,}/i,
  /^[0-9]{4,8}$/,
]

export function isTransactionSMS(sms) {
  const body = (sms.body || '').toLowerCase()
  if (body.length < 20 || body.length > 600) return false
  // Must mention currency AND action word
  if (!/rs\.?|inr|₹|rupees/i.test(body)) return false
  if (!/(debit|credit|spent|paid|received|sent|deposited|withdrawn|transferred|credited|debited)/i.test(body)) return false
  // Exclude OTP/promo messages
  if (/otp|verification code|password/i.test(body)) return false
  // Trust sender format
  const addr = sms.address || ''
  if (!TRUSTED_SENDERS.some(re => re.test(addr))) return false
  return true
}

export function parseTransactionSMS(sms) {
  const body = sms.body || ''
  let amount = 0
  let type = null
  for (const { re, type: t } of PATTERNS) {
    const m = body.match(re)
    if (m) {
      amount = parseFloat(m[1].replace(/,/g, ''))
      type = t
      break
    }
  }
  if (!amount || !type) return null

  // Extract merchant/description
  let description = ''
  for (const re of MERCHANT_PATTERNS) {
    const m = body.match(re)
    if (m) { description = m[1].trim(); break }
  }
  if (!description) description = sms.address || 'Bank Transaction'

  // Derive category suggestion from description
  const category = guessCategory(description, type)

  return {
    smsId: sms.id,
    date: new Date(sms.date).toISOString().slice(0, 10),
    amount,
    type,
    description: description.slice(0, 80),
    sender: sms.address,
    rawBody: body,
    categoryId: category,
  }
}

function guessCategory(desc, type) {
  const s = desc.toLowerCase()
  const map = [
    ['c2', /swiggy|zomato|dominos|mcdonald|kfc|pizza|food|bigbasket|zepto|blinkit|grocery/],
    ['c3', /uber|ola|rapido|petrol|fuel|metro|irctc/],
    ['c4', /amazon|flipkart|myntra|nykaa|meesho/],
    ['c5', /netflix|spotify|hotstar|prime|youtube|bookmyshow|pvr/],
    ['c6', /airtel|jio|bsnl|vodafone|electricity|water|gas|broadband|recharge/],
    ['c7', /apollo|medplus|hospital|pharmacy|medical/],
    ['c9', /makemytrip|goibibo|oyo|indigo|hotel/],
    ['c1', /rent|maintenance|society/],
    ['i1', /salary|payroll/],
    ['i3', /dividend|interest|mutual fund|nav|sip/],
  ]
  for (const [cat, re] of map) if (re.test(s)) return cat
  return type === 'income' ? 'i5' : 'c10'
}

export async function requestSMSPermission() {
  if (!isAndroid) return { granted: false, reason: 'Not Android' }
  try {
    const { SMSInboxReader } = await import('capacitor-sms-inbox')
    const status = await SMSInboxReader.checkPermissions()
    if (status.sms === 'granted') return { granted: true }
    const req = await SMSInboxReader.requestPermissions()
    return { granted: req.sms === 'granted' }
  } catch (err) {
    return { granted: false, reason: err.message }
  }
}

export async function fetchRecentBankSMS({ days = 30 } = {}) {
  if (!isAndroid) {
    return { supported: false, reason: 'SMS reading is only supported on Android' }
  }
  try {
    const { SMSInboxReader, MessageType } = await import('capacitor-sms-inbox')
    const perm = await requestSMSPermission()
    if (!perm.granted) return { supported: true, granted: false, reason: perm.reason || 'Permission denied' }
    const since = Date.now() - days * 24 * 60 * 60 * 1000
    const { smsList } = await SMSInboxReader.getSMSList({
      filter: { type: MessageType.INBOX, minDate: since },
      maxCount: 500,
    })
    const parsed = []
    for (const sms of smsList || []) {
      if (!isTransactionSMS(sms)) continue
      const tx = parseTransactionSMS(sms)
      if (tx) parsed.push(tx)
    }
    return { supported: true, granted: true, transactions: parsed, raw: smsList?.length || 0 }
  } catch (err) {
    return { supported: true, granted: false, reason: err.message }
  }
}

// Test-friendly export (for web browser — parses provided mock SMS)
export function parseMockSMSList(list) {
  return list
    .filter(isTransactionSMS)
    .map(parseTransactionSMS)
    .filter(Boolean)
}
