/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project sites are served from https://<user>.github.io/<repo>/,
  // not the domain root, so every asset URL needs that /<repo>/ prefix baked in
  // at build time — Vite has no way to know it otherwise. Cloudflare Pages (the
  // other deploy target, docs/DEPLOY.md) serves from the domain root, so this
  // stays '/' there; VITE_BASE_PATH is only set by the GitHub Pages workflow
  // (.github/workflows/deploy-pages.yml), never for local dev or Cloudflare.
  base: process.env.VITE_BASE_PATH || '/',
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
