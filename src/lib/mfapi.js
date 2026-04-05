/**
 * Sanitise whatever the user typed as a scheme code:
 * - Strip leading '#', spaces, letters
 * - Return only the numeric part
 */
export function sanitiseSchemeCode(raw) {
  if (!raw) return ''
  return String(raw).replace(/[^0-9]/g, '').trim()
}

/**
 * Return true if the code looks like a valid AMFI scheme code
 * AMFI codes are 5–6 digit numbers (e.g. 120503, 100016, 122639)
 */
export function isValidSchemeCode(code) {
  const clean = sanitiseSchemeCode(code)
  return /^\d{5,6}$/.test(clean)
}

// Fetch latest NAV for a scheme code
export async function fetchNAV(rawCode) {
  const schemeCode = sanitiseSchemeCode(rawCode)
  if (!schemeCode) throw new Error('Empty scheme code')
  if (!isValidSchemeCode(schemeCode)) {
    throw new Error(
      `"${rawCode}" doesn't look like an AMFI code (should be 5–6 digits). ` +
      `Use the 🔍 Search button to find the correct code.`
    )
  }
  const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`AMFI returned ${res.status} for scheme ${schemeCode}`)
  const data = await res.json()
  if (!data?.data?.[0]) throw new Error('No NAV data returned for this scheme code')
  return {
    nav: parseFloat(data.data[0].nav),
    date: data.data[0].date,
    schemeName: data.meta.scheme_name,
  }
}

// Search for schemes by name
export async function searchSchemes(query) {
  const res = await fetch(
    `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) throw new Error('Search failed')
  return res.json() // array of { schemeCode, schemeName }
}
