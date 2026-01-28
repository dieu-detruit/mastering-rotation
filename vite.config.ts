import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Use base path only for production (GitHub Pages)
  base: mode === 'production' ? '/mastering-rotation/' : '/',
}))
