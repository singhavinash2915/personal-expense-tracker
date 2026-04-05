import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Capacitor builds need base '/' — GitHub Pages needs '/personal-expense-tracker/'
  const isCapacitor = process.env.BUILD_TARGET === 'capacitor'
  const base = (command === 'build' && !isCapacitor) ? '/personal-expense-tracker/' : '/'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.jpeg', 'pwa-192.png', 'pwa-512.png'],
        manifest: {
          name: 'ExpenseFlow – Personal Finance',
          short_name: 'ExpenseFlow',
          description: 'Track expenses, budgets, investments and bank statements — all offline on your device.',
          theme_color: '#e53935',
          background_color: '#141414',
          display: 'standalone',
          orientation: 'portrait-primary',
          // Must match the GitHub Pages sub-path so iOS opens the right URL
          scope: base,
          start_url: base,
          categories: ['finance', 'productivity'],
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /\/pdf\.worker\.min\.mjs$/,
              handler: 'CacheFirst',
              options: { cacheName: 'pdfjs-worker', expiration: { maxEntries: 1, maxAgeSeconds: 30 * 24 * 60 * 60 } },
            },
          ],
        },
      }),
    ],
    base,
  }
})
