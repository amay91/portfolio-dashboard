// Local companion server for the dashboard's floating Feedback button — same
// pattern as ../markitdown_server.py: a small process you run yourself
// (`npm install && npm start`), listening only on 127.0.0.1. Never deployed
// or exposed beyond localhost; see docs/DECISIONS.md "Feedback system".
'use strict'

const path = require('node:path')
const express = require('express')
const cors = require('cors')
const sanitizeHtml = require('sanitize-html')
const Database = require('better-sqlite3')
// Shared with the production counterpart, app/src/server/feedbackWebhook.ts
// (task R13/review item C7) — category list + length cap are the one part
// of validation genuinely identical between the two; the actual message
// *cleaning* stays separate by design (full HTML strip here vs. webhook
// mention-neutralization there — see feedbackWebhook.ts's comment).
const feedbackRules = require('../feedback-rules.json')

const PORT = 8766
const DB_PATH = path.join(__dirname, 'feedback.db')
const ALLOWED_CATEGORIES = new Set(feedbackRules.categories)
const MAX_MESSAGE_LENGTH = feedbackRules.maxMessageLength

function createApp(dbPath) {
  const db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  const insert = db.prepare('INSERT INTO feedback (category, message) VALUES (?, ?)')

  const app = express()
  // Dev server origins only (Vite's default port plus a couple of common
  // alternates) — this endpoint is never meant to be reachable from
  // anywhere but the dashboard running on the same machine.
  app.use(
    cors({
      origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
      methods: ['POST'],
    }),
  )
  app.use(express.json({ limit: '100kb' }))

  app.post('/api/feedback', (req, res) => {
    const body = req.body || {}
    const category = body.category
    const rawMessage = body.message

    if (typeof category !== 'string' || !ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Choose a valid category.' })
    }
    if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return res.status(400).json({ error: 'Feedback message is required.' })
    }
    if (rawMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Feedback message must be under ${MAX_MESSAGE_LENGTH} characters.` })
    }

    // Strips all markup rather than escaping it, so what's stored is plain
    // text regardless of where it's ever displayed later (defense in depth
    // against stored XSS, even though nothing renders this as HTML today).
    const clean = sanitizeHtml(rawMessage.trim(), { allowedTags: [], allowedAttributes: {} }).trim()
    if (!clean) {
      return res.status(400).json({ error: 'Feedback message is required.' })
    }

    try {
      insert.run(category, clean)
      res.status(201).json({ ok: true })
    } catch (err) {
      console.error('Failed to save feedback:', err)
      res.status(500).json({ error: 'Could not save feedback right now.' })
    }
  })

  return { app, db }
}

module.exports = { createApp, ALLOWED_CATEGORIES, MAX_MESSAGE_LENGTH }

if (require.main === module) {
  const { app } = createApp(DB_PATH)
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Feedback server listening on http://127.0.0.1:${PORT}`)
  })
}
