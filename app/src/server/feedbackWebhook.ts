export type FeedbackCategory = 'Bug Report' | 'Feature Request' | 'General Feedback'
const ALLOWED_CATEGORIES = new Set<FeedbackCategory>(['Bug Report', 'Feature Request', 'General Feedback'])
const MAX_MESSAGE_LENGTH = 5000

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS })
}

// Slack (`<!here>`/`<!channel>`/`<!everyone>`) and Discord (`@here`/
// `@everyone`, plus `<@id>`/`<@&id>` role/user pings) both trigger a mass
// notification from plain text inside a webhook message — this is a
// public-facing endpoint accepting free text from anyone, so a submitted
// "feedback" message is exactly as trusted as a comment box. A zero-width
// space after every `@` breaks both platforms' mention syntax while
// leaving the character visible/readable.
function neutralizeMentions(text: string): string {
  return text.replace(/@/g, '@​')
}

// Strips characters a text field has no legitimate reason to carry ­— note
// this is deliberately not full HTML sanitization like the local dev
// server's `sanitize-html` (server/feedback-server.js): this handler only
// ever forwards the message as a JSON string field to a webhook, never
// renders it as HTML anywhere in this pipeline, so the actual injection
// surface is webhook mention syntax (handled above), not markup.
function cleanMessage(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return neutralizeMentions(raw.trim()).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
}

interface FeedbackPayload {
  category: FeedbackCategory
  message: string
}

function parseAndValidate(body: unknown): { ok: true; value: FeedbackPayload } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const category = b.category
  const rawMessage = b.message

  if (typeof category !== 'string' || !ALLOWED_CATEGORIES.has(category as FeedbackCategory)) {
    return { ok: false, error: 'Choose a valid category.' }
  }
  if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
    return { ok: false, error: 'Feedback message is required.' }
  }
  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Feedback message must be under ${MAX_MESSAGE_LENGTH} characters.` }
  }
  const clean = cleanMessage(rawMessage)
  if (!clean) return { ok: false, error: 'Feedback message is required.' }

  return { ok: true, value: { category: category as FeedbackCategory, message: clean } }
}

// The production counterpart to server/feedback-server.js's local SQLite
// store (task D3): there's no user-run companion process once this is
// deployed for real visitors, so submissions are instead forwarded to a
// webhook the site owner configures — a Slack or Discord "Incoming
// Webhook" URL, kept as a Cloudflare Pages secret (`FEEDBACK_WEBHOOK_URL`),
// never committed. The payload includes `text` (Slack's field) and
// `content` (Discord's field) with the same formatted string, plus the raw
// `category`/`message`/`submittedAt` fields for anyone pointing this at a
// generic webhook catcher (Zapier/Make/n8n) instead. Written as a plain
// Web-standard `(Request, webhookUrl) => Promise<Response>` handler with no
// platform-specific imports, same shape as amfiNav.ts's handleAmfiNav — the
// Pages Function wrapper (functions/api/feedback.ts) just unwraps env.
export async function handleFeedbackWebhook(request: Request, webhookUrl: string | undefined): Promise<Response> {
  if (request.method !== 'POST') return jsonError(405, 'method not allowed')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Invalid request body.')
  }

  const result = parseAndValidate(body)
  if (!result.ok) return jsonError(400, result.error)
  const { category, message } = result.value

  if (!webhookUrl) {
    console.error('FEEDBACK_WEBHOOK_URL is not configured — see docs/DEPLOY.md')
    return jsonError(500, 'Feedback isn’t configured on this deployment yet.')
  }

  const text = `[${category}] ${message}`
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        text,
        content: text,
        category,
        message,
        submittedAt: new Date().toISOString(),
      }),
    })
    if (!res.ok) {
      console.error('Feedback webhook rejected the submission:', res.status, await res.text().catch(() => ''))
      return jsonError(502, 'Could not save feedback right now.')
    }
  } catch (err) {
    console.error('Failed to reach the feedback webhook:', err)
    return jsonError(502, 'Could not save feedback right now.')
  }

  return new Response(JSON.stringify({ ok: true }), { status: 201, headers: JSON_HEADERS })
}
