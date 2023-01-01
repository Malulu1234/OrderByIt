import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  base:'/OrderByIt/',
  build: {
    outDir: 'docs'
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false
      // devOptions: {
      //   enabled: true
      // }
    })
  ]
})