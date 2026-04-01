import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'ExpenseFlow – Personal Finance',
        short_name: 'ExpenseFlow',
        description: 'Track expenses, budgets, investments and bank statements — all offline on your device.',
        theme_color: '#e53935',
        background_color: '#141414',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache all app assets so it works fully offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache pdfjs worker
            urlPattern: /\/pdf\.worker\.min\.mjs$/,
            handler: 'CacheFirst',
            options: { cacheName: 'pdfjs-worker', expiration: { maxEntries: 1, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
  base: command === 'build' ? '/personal-expense-tracker/' : '/',
}))
