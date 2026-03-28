import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/gostop/',
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      exclude: ['src/core/**/*.test.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
})
