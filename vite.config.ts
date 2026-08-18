import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/kyc': 'https://ai.dev.foodlabelsolutions.com/',
      '/category_id': 'https://ai.dev.foodlabelsolutions.com/',
    },
  },
})
