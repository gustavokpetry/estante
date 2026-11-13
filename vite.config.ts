import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// O nome do repositório no GitHub define o caminho do site:
// https://<usuario>.github.io/estante/
const base = '/estante/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Estante',
        short_name: 'Estante',
        description: 'Sua biblioteca pessoal de PDFs, lidos como livros.',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#E9DABB',
        theme_color: '#4A2E1B',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // O app em si fica disponível offline logo na primeira visita.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        globIgnores: ['pdfjs/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Os auxiliares do PDF.js são baixados só quando um PDF precisa deles
        // e ficam guardados para uso offline depois.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/pdfjs/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs-auxiliares',
              expiration: { maxEntries: 400 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
