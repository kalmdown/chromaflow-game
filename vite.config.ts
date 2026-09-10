import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' rather than 'autoUpdate': the player is told a new version is
      // ready and reloads when they choose, so an update never swaps the
      // bundle out from under a level in progress.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Chromaflow',
        short_name: 'Chromaflow',
        description:
          'A turn-limited colour flood puzzle. Spread your flow across the board and finish on the target hue.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#080d1c',
        theme_color: '#080d1c',
        categories: ['games', 'puzzle'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Padded so Android launchers can clip it to any shape.
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The whole game is well under a megabyte and has no backend, so
        // precaching every built file makes it fully playable offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // Honour an assigned PORT so the dev server can move off 5173 when it is
    // already taken. Nothing here is tied to a fixed port - no OAuth callback,
    // webhook or CORS origin - so any free port is fine.
    port: Number(process.env.PORT) || 5173,
  },
})
