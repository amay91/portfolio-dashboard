import { handleFeedbackWebhook } from '../../src/server/feedbackWebhook'

// Cloudflare Pages Function entry point for task D3's edge handler — the
// production counterpart to server/feedback-server.js (which only exists
// for local dev). Pages auto-routes this file to POST /api/feedback based
// on its path under functions/ (see amfi-nav.ts for the same pattern).
// FEEDBACK_WEBHOOK_URL is a Cloudflare Pages secret (Settings -> Environment
// variables), never committed — see docs/DEPLOY.md.
export const onRequest = ({ request, env }: { request: Request; env: { FEEDBACK_WEBHOOK_URL?: string } }): Promise<Response> =>
  handleFeedbackWebhook(request, env.FEEDBACK_WEBHOOK_URL)
