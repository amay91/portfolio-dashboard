/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    // T1's e2e/ specs (and item #5's e2e-network/) use @playwright/test's
    // own `test`/`expect`, not Vitest's — without this, Vitest's default
    // *.spec.ts glob would also try (and fail) to run them.
    exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-network/**'],
  },
})
