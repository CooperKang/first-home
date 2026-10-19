import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages에서는 https://cooperkang.github.io/first-home/ 아래에서 열린다
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/first-home/' : '/',
  plugins: [react(), tailwindcss()],
}))
