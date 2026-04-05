/**
 * useNAVScheduler
 *
 * Automatically refreshes all MF NAVs that have a schemeCode once per day,
 * at or after 21:00 IST (AMFI publishes end-of-day NAVs by ~8:30 PM IST).
 *
 * Logic:
 *  - On mount (app open / foreground) AND every 5 minutes while the app is open,
 *    check if the current IST time is ≥ 21:00 AND today's NAV has not been fetched yet.
 *  - "Fetched today" is stored in localStorage as 'ef_nav_last_fetch' = 'YYYY-MM-DD' (IST date).
 *  - If both conditions met → silently fetch all linked funds and dispatch updates.
 */
import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { fetchNAV, isValidSchemeCode } from '../lib/mfapi'

const STORAGE_KEY = 'ef_nav_last_fetch'
const CHECK_INTERVAL_MS = 5 * 60 * 1000   // check every 5 minutes
const NAV_HOUR_IST      = 21              // 9 PM IST

/** Returns current date/hour in IST as { dateStr: 'YYYY-MM-DD', hour: 0-23 } */
function getISTDateTime() {
  const now = new Date()
  // IST = UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000
  const ist = new Date(now.getTime() + istOffset)
  const dateStr = ist.toISOString().slice(0, 10)   // 'YYYY-MM-DD'
  const hour    = ist.getUTCHours()
  return { dateStr, hour }
}

export function useNAVScheduler() {
  const { state, dispatch } = useApp()
  const fetchingRef = useRef(false)

  async function tryRefreshNAV() {
    if (fetchingRef.current) return           // already running

    const { dateStr, hour } = getISTDateTime()
    if (hour < NAV_HOUR_IST) return           // before 9 PM IST — skip

    const lastFetch = localStorage.getItem(STORAGE_KEY)
    if (lastFetch === dateStr) return         // already fetched today

    const funds = (state.mutualFunds || []).filter(
      mf => mf.schemeCode && isValidSchemeCode(mf.schemeCode)
    )
    if (!funds.length) return                 // no linked funds

    fetchingRef.current = true
    try {
      const results = await Promise.allSettled(
        funds.map(mf => fetchNAV(mf.schemeCode).then(navData => ({ mf, navData })))
      )
      let updated = 0
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          dispatch({
            type: 'UPDATE_INVESTMENT_NAV',
            payload: {
              id:   r.value.mf.id,
              nav:  r.value.navData.nav,
              date: r.value.navData.date,
            },
          })
          updated++
        }
      })
      if (updated > 0) {
        // Mark today as fetched so we don't re-fetch until tomorrow
        localStorage.setItem(STORAGE_KEY, dateStr)
        console.info(`[NAV Scheduler] Auto-updated ${updated}/${funds.length} funds at ${dateStr} 21:xx IST`)
      }
    } catch (err) {
      console.warn('[NAV Scheduler] Error:', err)
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    // Run immediately on mount (handles app re-open after 9 PM)
    tryRefreshNAV()

    // Then check every 5 minutes
    const timer = setInterval(tryRefreshNAV, CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
