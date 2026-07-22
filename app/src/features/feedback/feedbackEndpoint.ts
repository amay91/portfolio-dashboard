// Pure endpoint-selection logic, split out of Feedback.tsx so the component
// file only exports the component (oxlint's react-refresh rule otherwise
// warns on a non-component export sharing a file with one) and so this
// branching is directly unit-testable — Vite bakes import.meta.env.DEV in at
// module-eval time, so a test stubbing it *after* Feedback.tsx has already
// been imported once wouldn't affect an already-evaluated top-level
// constant. Keeping the decision itself in a plain function sidesteps that
// entirely.

// Local dev default: server/feedback-server.js, a companion process you run
// yourself (same "127.0.0.1 only" pattern as markitdown_server.py) — there's
// no such process on a real visitor's machine once this is deployed, so a
// Cloudflare Pages deployment sets VITE_FEEDBACK_URL to the same-origin
// Pages Function instead (`/api/feedback`, task D3 — see
// functions/api/feedback.ts and docs/DEPLOY.md). Left unset, dev behaviour
// is unchanged from before D3.
const LOCAL_DEV_ENDPOINT = 'http://127.0.0.1:8766/api/feedback'

// GitHub Pages can't run *any* server code — not even the Cloudflare Pages
// Function above — so a production build with no explicit VITE_FEEDBACK_URL
// posts straight to Formspree instead: a third-party form-relay built for
// exactly this (static sites with no backend of their own). Every
// submission lands in a compiled, exportable table in the Formspree
// dashboard — see docs/DEPLOY.md "Feedback on GitHub Pages" for how to get
// a form ID and swap it in here.
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mojgnkkg'

export function resolveFeedbackEndpoint(edgeUrl: string | undefined, isDev: boolean): string {
  if (edgeUrl) return edgeUrl
  if (isDev) return LOCAL_DEV_ENDPOINT
  return FORMSPREE_ENDPOINT
}
