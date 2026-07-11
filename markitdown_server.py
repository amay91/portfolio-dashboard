#!/usr/bin/env python3
"""
MarkItDown bridge for the Portfolio Dashboard.

A browser page can't run Python MarkItDown directly, so this tiny local server
does the conversion for it. The dashboard's "Convert PDF to Markdown" button POSTs
the PDF here; this returns the Markdown, and the dashboard rebuilds from it.

Setup (one time):
    pip install "markitdown[pdf]"

CAMS/KFintech statements are almost always password-protected, and MarkItDown's
own convert() has no password parameter to plug one into (it accepts **kwargs but
never forwards them to its PDF backend). This bridge works around that itself: if
a PDF fails to convert and looks encrypted, it decrypts it in memory with pypdf
first, then hands the decrypted copy to MarkItDown. That needs one more package,
only if you actually hit a protected PDF:
    pip install pypdf

Run it (leave it running while you use the dashboard):
    python markitdown_server.py

Then run the app (`cd app && npm run dev`), load/select your CAS PDF, and click
"Convert PDF to Markdown". If it's protected, the dashboard will prompt for the
password and resend the request with it.

Notes
- Listens only on 127.0.0.1:8765 (localhost) — nothing is exposed to the network.
- CORS is enabled so the dashboard page can call it. No files are stored; each
  upload (and any decrypted copy) is written to a temp file, converted, and
  deleted immediately.
- If you serve the dashboard over https, the browser will block calls to plain
  http://127.0.0.1 (mixed content). Use the Vite dev server over http://localhost.
"""

import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import unquote

try:
    from markitdown import MarkItDown
except ImportError:
    raise SystemExit('MarkItDown is not installed. Run:  pip install "markitdown[pdf]"')

HOST, PORT = "127.0.0.1", 8765
_md = MarkItDown()


class PasswordNeeded(Exception):
    """Raised internally to short-circuit straight to a 401 JSON response."""

    def __init__(self, code):
        self.code = code  # "password_required" | "incorrect_password"


def _decrypt_pdf(path, password):
    """Returns a path to a decrypted copy of an encrypted PDF, or raises
    PasswordNeeded. Only imports pypdf here — a real dependency only for
    users who actually hit a protected PDF, not every PDF conversion."""
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        raise RuntimeError('This PDF looks password-protected. Encrypted-PDF support needs pypdf — run:  pip install pypdf')

    reader = PdfReader(path)
    if not reader.is_encrypted:
        raise RuntimeError("not encrypted")  # caller already checked is_encrypted; defensive only
    if not password:
        raise PasswordNeeded("password_required")
    # decrypt() returns pypdf.constants.PasswordType.NOT_DECRYPTED (0, falsy)
    # on a wrong password, rather than raising.
    if not reader.decrypt(password):
        raise PasswordNeeded("incorrect_password")

    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as dtmp:
        writer.write(dtmp)
        return dtmp.name


def _is_encrypted_pdf(path):
    try:
        from pypdf import PdfReader
    except ImportError:
        return False  # can't check without pypdf; let the original MarkItDown error surface
    try:
        return PdfReader(path).is_encrypted
    except Exception:
        return False  # not something pypdf can even open as a PDF; not our problem to diagnose


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Filename, X-Pdf-Password")

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        # health check
        self._json(200, {"ok": True, "service": "markitdown-bridge"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length)
        name = self.headers.get("X-Filename", "upload.pdf")
        raw_password = self.headers.get("X-Pdf-Password")
        password = unquote(raw_password) if raw_password else None
        suffix = os.path.splitext(name)[1] or ".pdf"
        path = None
        decrypted_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(data)
                path = tmp.name

            try:
                markdown = _md.convert(path).text_content
                self._json(200, {"markdown": markdown, "filename": name})
                return
            except Exception as exc:  # noqa: BLE001 — decide below whether this was a password issue
                if suffix.lower() != ".pdf" or not _is_encrypted_pdf(path):
                    raise exc
                decrypted_path = _decrypt_pdf(path, password)
                markdown = _md.convert(decrypted_path).text_content
                self._json(200, {"markdown": markdown, "filename": name})
        except PasswordNeeded as pw_exc:
            self._json(401, {"error": pw_exc.code})
        except Exception as exc:  # noqa: BLE001
            self._json(500, {"error": str(exc)})
        finally:
            if path and os.path.exists(path):
                os.unlink(path)
            if decrypted_path and os.path.exists(decrypted_path):
                os.unlink(decrypted_path)

    def log_message(self, *args):  # keep the console quiet
        pass


if __name__ == "__main__":
    print(f"MarkItDown bridge running on http://{HOST}:{PORT}")
    print("Leave this running, then use the dashboard's “Convert PDF to Markdown” button.")
    print("Press Ctrl+C to stop.")
    try:
        HTTPServer((HOST, PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
