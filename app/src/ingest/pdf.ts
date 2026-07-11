import * as pdfjsLib from 'pdfjs-dist'
// Bundled by Vite and served same-origin — self-hosted, not a CDN, per
// plan.md's CSP/privacy stance (no third-party script execution on a page
// that may hold statement data).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { PdfPasswordRequiredError } from './router'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Extracts PDF text as reconstructed lines, ported from portfolio-dashboard.html
// pdfToText(). pdf.js returns positioned text runs, not lines, so runs are
// grouped by their rounded y-coordinate (one PDF "row"), rows are ordered
// top-to-bottom (PDF y increases upward), and runs within a row are ordered
// left-to-right by x. This is the CAS-specific "tokenize" step: the same
// grouping a pdfplumber script would do server-side.
export async function pdfToText(data: ArrayBuffer, password?: string): Promise<string> {
  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data, password }).promise
  } catch (err) {
    // No onPassword callback is registered above, so pdf.js rejects the
    // promise with a PasswordException (rather than hanging) whenever a
    // password is needed or the one given was wrong — confirmed against
    // pdfjs-dist's source (PDFDocumentLoadingTask's password-retry path
    // only engages if onPassword is set).
    if (err instanceof pdfjsLib.PasswordException) {
      throw new PdfPasswordRequiredError(err.code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD)
    }
    throw err
  }
  const allLines: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const tc = await page.getTextContent()
    const rows = new Map<number, { x: number; s: string }[]>()
    for (const it of tc.items) {
      if (!('str' in it) || !it.str || !it.str.trim()) continue
      const y = Math.round(it.transform[5])
      const x = it.transform[4]
      const row = rows.get(y) ?? []
      row.push({ x, s: it.str })
      rows.set(y, row)
    }
    const ys = [...rows.keys()].sort((a, b) => b - a) // PDF y increases upward
    for (const y of ys) {
      const line = rows
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((o) => o.s)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (line) allLines.push(line)
    }
  }
  return allLines.join('\n')
}
