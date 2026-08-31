// import { defineConfig, loadEnv } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'

// // Point the dev proxy at a local backend with:
// //   VITE_API_TARGET=http://localhost:5000 npm run dev
// // Defaults to the deployed dev API when unset.
// export default defineConfig(({ mode }) => {
//   const env = loadEnv(mode, process.cwd(), '')
//   // process.env first so `VITE_API_TARGET=... npm run dev` works; loadEnv only reads .env files.
//   const target =
//     process.env.VITE_API_TARGET ||
//     env.VITE_API_TARGET ||
//     'https://ai.dev.foodlabelsolutions.com/'

//   return {
//     plugins: [react(), tailwindcss()],
//     server: {
//       port: 3000,
//       proxy: {
//         '/kyc': target,
//         '/category_id': target,
//       },
//     },
//   }
// })


import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const target =
    process.env.VITE_API_TARGET ||
    env.VITE_API_TARGET ||
    'https://ai.dev.foodlabelsolutions.com'

  return {
    plugins: [react(), tailwindcss()],

    server: {
      port: 3000,
      proxy: {
        '/kyc': {
          target,
          changeOrigin: true,
        },
        '/category_id': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
