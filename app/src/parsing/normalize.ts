// Source-agnostic preprocessor, ported from reference/engine.js normalizeInput.
// Makes MarkItDown Markdown and raw pdf.js text parse identically: drops
// Markdown table-separator rows, flattens `| cell |` back into space-separated
// text, and strips the CAMS/KFintech rotated page-footer some extractors
// (notably MarkItDown) splice onto data lines — both forward and
// character-reversed. Idempotent on plain pdf.js text.
export function normalizeInput(text: string | null | undefined): string {
  const out: string[] = []
  for (let line of String(text == null ? '' : text).split(/\r?\n/)) {
    if (/^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(line)) continue // md table rule row
    if (line.indexOf('|') >= 0) line = line.replace(/\|/g, ' ') // flatten md table cells
    line = line
      .replace(/CAMSCASWS-?\d*/gi, ' ')
      .replace(/\d*-?SWSACSMAC/gi, ' ')
      .replace(/Version:V[\d.]+/gi, ' ')
      .replace(/[\d.]+V:noisreV/gi, ' ')
      .replace(/\bLive-\d+/gi, ' ')
      .replace(/\b\d+-eviL\b/gi, ' ')
    out.push(line)
  }
  return out.join('\n')
}
