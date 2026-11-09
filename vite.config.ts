import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

// version shown in Settings: the deployed commit (GitHub Actions sets GITHUB_SHA) + build time
const sha = (process.env.GITHUB_SHA ?? (() => { try { return execSync('git rev-parse HEAD').toString().trim() } catch { return 'dev' } })()).slice(0, 7)

export default defineConfig({
  base: './',
  define: {
    // built-in media (voice, breath, music) – downloaded after install, file by file, into a permanent cache
    __MEDIA__: JSON.stringify(['voice', 'breath', 'music'].flatMap((d) => readdirSync(`public/${d}`).filter((f) => f.endsWith('.mp3')).map((f) => `${d}/${f}`))),
    __APP_VERSION__: JSON.stringify(sha),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'המדריך – מלווה מסע',
        short_name: 'המדריך',
        description: 'מלווה מסע אישי: נשימה, מדיטציה ומסע עמוק בשלבים',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0C0A17',
        theme_color: '#0C0A17',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // the update itself is only the app shell (~1 MB) so it always installs; media is cached separately (see src/offline.ts)
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [{
          urlPattern: /\/(voice|breath|music)\/[^/]+\.mp3$/,
          handler: 'CacheFirst',
          options: { cacheName: 'hamadrich-media', rangeRequests: true, cacheableResponse: { statuses: [0, 200] } },
        }],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
