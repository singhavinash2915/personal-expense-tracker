import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

/**
 * Shows a "Add to Home Screen" install banner on mobile browsers that support the
 * beforeinstallprompt event (Android Chrome). For iOS Safari, shows manual instructions.
 */
export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null)       // deferred beforeinstallprompt
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already installed as PWA (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // Dismissed this session
    if (sessionStorage.getItem('pwa-banner-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone
    if (ios) {
      setIsIOS(true)
      setShow(true)
      return
    }

    const handler = e => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setShow(false)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false)
  }

  if (installed || !show) return null

  return (
    <div
      className="fixed bottom-16 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 rounded-2xl p-4 flex items-start gap-3 shadow-2xl"
      style={{
        background: 'linear-gradient(135deg,rgba(229,57,53,0.95),rgba(245,158,11,0.95))',
        backdropFilter: 'blur(12px)',
      }}
    >
      <img src={`${import.meta.env.BASE_URL}logo.jpeg`} alt="ExpenseFlow" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">Install ExpenseFlow</p>
        {isIOS ? (
          <p className="text-white/80 text-xs mt-0.5">
            Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong> to install
          </p>
        ) : (
          <p className="text-white/80 text-xs mt-0.5">
            Add to your home screen for a native app experience — works offline too!
          </p>
        )}
        {!isIOS && (
          <button
            onClick={install}
            className="mt-2 px-4 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-white/90 transition"
          >
            Install App
          </button>
        )}
      </div>

      <button onClick={dismiss} className="text-white/70 hover:text-white flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
