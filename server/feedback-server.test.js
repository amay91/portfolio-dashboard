'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createApp } = require('./feedback-server')

function withServer(t) {
  const dbPath = path.join(os.tmpdir(), `feedback-test-${process.pid}-${Math.random().toString(36).slice(2)}.db`)
  const { app, db } = createApp(dbPath)
  const server = app.listen(0)
  t.after(() => {
    server.close()
    db.close()
    fs.rmSync(dbPath, { force: true })
  })
  const port = server.address().port
  return { url: `http://127.0.0.1:${port}/api/feedback`, db }
}

test('accepts a valid submission, sanitizes it, and persists it', async (t) => {
  const { url, db } = withServer(t)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Bug Report', message: '<script>alert(1)</script>The chart broke' }),
  })
  assert.equal(res.status, 201)
  const row = db.prepare('SELECT category, message FROM feedback').get()
  assert.equal(row.category, 'Bug Report')
  // sanitize-html strips <script>...</script> content wholesale (not just
  // the tags) — the script body is never meant to be treated as visible
  // text, so only the genuine plain-text part survives.
  assert.equal(row.message, 'The chart broke')
})

test('rejects an invalid category', async (t) => {
  const { url } = withServer(t)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Not A Real Category', message: 'hello' }),
  })
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.match(body.error, /category/i)
})

test('rejects an empty or whitespace-only message', async (t) => {
  const { url } = withServer(t)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'General Feedback', message: '   ' }),
  })
  assert.equal(res.status, 400)
})

test('rejects a message over the length limit', async (t) => {
  const { url } = withServer(t)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Feature Request', message: 'x'.repeat(5001) }),
  })
  assert.equal(res.status, 400)
})

test('rejects a message that is only HTML markup once sanitized to nothing', async (t) => {
  const { url } = withServer(t)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'General Feedback', message: '<img src=x onerror=alert(1)>' }),
  })
  assert.equal(res.status, 400)
})

test('a second submission is stored as a second row, not overwriting the first', async (t) => {
  const { url, db } = withServer(t)
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Bug Report', message: 'first' }),
  })
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'Feature Request', message: 'second' }),
  })
  const rows = db.prepare('SELECT category, message FROM feedback ORDER BY id').all()
  assert.equal(rows.length, 2)
  assert.equal(rows[0].message, 'first')
  assert.equal(rows[1].message, 'second')
})
