// Fetch latest NAV for a scheme code
export async function fetchNAV(schemeCode) {
  const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`)
  if (!res.ok) throw new Error('Failed to fetch NAV')
  const data = await res.json()
  return {
    nav: parseFloat(data.data[0].nav),
    date: data.data[0].date,
    schemeName: data.meta.scheme_name
  }
}

// Search for schemes by name
export async function searchSchemes(query) {
  const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json() // array of { schemeCode, schemeName }
}
