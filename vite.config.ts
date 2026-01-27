import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages用: リポジトリ名に合わせてbaseを設定
  // 例: base: '/mastering_rotation/'
  base: './',
})
