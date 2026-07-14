import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '词映 VocScreen',
        short_name: 'VocScreen',
        description: '看剧学英语，不知不觉的那种',
        theme_color: '#07060d',
        background_color: '#07060d',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 排除大型词书 JSON（5-6MB），改为运行时按需缓存
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/wordbooks/*.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(mp4|m4v|mov|mkv)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'demo-videos', expiration: { maxEntries: 5 } },
          },
          {
            // 词书按需缓存：首次加载后缓存供离线使用
            urlPattern: /\/wordbooks\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wordbooks',
              expiration: { maxEntries: 10 },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('motion')) return 'motion'
            if (id.includes('@phosphor-icons')) return 'icons'
            if (id.includes('dexie')) return 'db'
            if (id.includes('compromise')) return 'nlp'
          }
        },
      },
    },
  },
})