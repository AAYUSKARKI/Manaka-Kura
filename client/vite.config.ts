import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest', 
      srcDir: 'src',
      filename: 'sw.ts', 
      manifest: {
        name: 'Manaka Kura',
        short_name: 'ManakaKura',
        description: 'Seamless connections, Infinite Conversations At Manaka Kura Have Fun',
        theme_color: '#000000', 
        icons: [
          { src: 'image.png', sizes: '192x192', type: 'image/png' },
          { src: 'image.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  }
})
