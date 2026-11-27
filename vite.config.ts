import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // El PDF de recibos pesa ~1,2 MB: se baja solo cuando el admin genera un recibo.
        globIgnores: ['**/react-pdf*.js', '**/ReciboPdf*.js', '**/generarRecibo*.js'],
      },
      manifest: {
        name: 'SGP - Sistema de Gestión de Pedidos',
        short_name: 'SGP',
        description: 'Sistema de gestión de pedidos gastronómicos',
        theme_color: '#f9a825',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
