# Feedback server

Local companion server for the dashboard's floating Feedback button — same pattern as
`../markitdown_server.py`: a small process you run yourself, listening only on `127.0.0.1`.
Never deployed or exposed beyond localhost.

## Setup (one-time)

```
cd server
npm install
```

## Run

```
npm start
```

Listens on `http://127.0.0.1:8766`. Leave it running while you use the dashboard's Feedback
button — the app's Content-Security-Policy only allows `connect-src` to this exact origin, so
the button won't work against anything else.

## Data

Feedback is stored in `feedback.db` (SQLite, created automatically on first run, gitignored).
Each row: `id`, `category` (`Bug Report` / `Feature Request` / `General Feedback`), `message`
(HTML-stripped plain text), `created_at`.

## Tests

```
npm test
```
