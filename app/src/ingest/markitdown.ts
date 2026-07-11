// Accepts MarkItDown-converted Markdown from any route: a dropped .md file,
// pasted text, or a string handed back from the MarkItDown MCP tool /
// markitdown_server.py bridge / `markitdown` CLI. No transformation happens
// here — table-flattening and page-footer stripping are normalizeInput's job
// (parsing/normalize.ts) so pdf.js text and MarkItDown text go through one
// normaliser. This module exists purely as the typed ingest entry point.
export function acceptMarkitdownText(text: string): string {
  if (!text || !text.trim()) throw new Error('Empty input — nothing to parse.')
  return text
}

export function readTextFile(file: File): Promise<string> {
  return file.text().then(acceptMarkitdownText)
}
