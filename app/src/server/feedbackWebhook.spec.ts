import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleFeedbackWebhook } from './feedbackWebhook'

const WEBHOOK_URL = 'https://hooks.example.test/services/T00/B00/xxx'

function post(body: unknown) {
  return new Request('https://example.test/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function jsonBody(res: Response) {
  return res.text().then((t) => JSON.parse(t))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('handleFeedbackWebhook', () => {
  it('rejects methods other than POST', async () => {
    const res = await handleFeedbackWebhook(new Request('https://example.test/feedback', { method: 'GET' }), WEBHOOK_URL)
    expect(res.status).toBe(405)
  })

  it('rejects an invalid category', async () => {
    const res = await handleFeedbackWebhook(post({ category: 'Not A Category', message: 'hello' }), WEBHOOK_URL)
    expect(res.status).toBe(400)
    expect((await jsonBody(res)).error).toBe('Choose a valid category.')
  })

  it('rejects an empty or whitespace-only message', async () => {
    const res = await handleFeedbackWebhook(post({ category: 'Bug Report', message: '   ' }), WEBHOOK_URL)
    expect(res.status).toBe(400)
    expect((await jsonBody(res)).error).toBe('Feedback message is required.')
  })

  it('rejects a message over the length limit', async () => {
    const res = await handleFeedbackWebhook(post({ category: 'Bug Report', message: 'x'.repeat(5001) }), WEBHOOK_URL)
    expect(res.status).toBe(400)
  })

  it('rejects an unparseable body', async () => {
    const res = await handleFeedbackWebhook(new Request('https://example.test/feedback', { method: 'POST', body: '{not json' }), WEBHOOK_URL)
    expect(res.status).toBe(400)
  })

  it('returns 500 (not a crash) when FEEDBACK_WEBHOOK_URL is not configured', async () => {
    const res = await handleFeedbackWebhook(post({ category: 'Bug Report', message: 'hello' }), undefined)
    expect(res.status).toBe(500)
    expect((await jsonBody(res)).error).toContain('isn’t configured on this deployment')
  })

  it('forwards a valid submission to the webhook and returns 201', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await handleFeedbackWebhook(post({ category: 'Feature Request', message: 'Add dark mode charts' }), WEBHOOK_URL)
    expect(res.status).toBe(201)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(WEBHOOK_URL)
    const sent = JSON.parse(init.body)
    expect(sent.text).toBe('[Feature Request] Add dark mode charts')
    expect(sent.content).toBe('[Feature Request] Add dark mode charts')
    expect(sent.category).toBe('Feature Request')
    expect(sent.message).toBe('Add dark mode charts')
    expect(typeof sent.submittedAt).toBe('string')
  })

  it('neutralizes @here/@everyone/@channel-style mentions before forwarding', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await handleFeedbackWebhook(post({ category: 'Bug Report', message: 'ping @everyone please fix @here' }), WEBHOOK_URL)
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.message).not.toContain('@everyone')
    expect(sent.message).not.toContain('@here')
    // the @ itself survives (with a zero-width space after it), so real
    // feedback mentioning an email or handle isn't mangled beyond recognition
    expect(sent.message).toContain('@')
  })

  it('returns 502 (not a crash) when the webhook itself is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const res = await handleFeedbackWebhook(post({ category: 'Bug Report', message: 'hello' }), WEBHOOK_URL)
    expect(res.status).toBe(502)
  })

  it('returns 502 when the webhook responds with a non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('invalid_payload', { status: 400 })))
    const res = await handleFeedbackWebhook(post({ category: 'Bug Report', message: 'hello' }), WEBHOOK_URL)
    expect(res.status).toBe(502)
  })
})
