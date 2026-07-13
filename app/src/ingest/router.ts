import { acceptMarkitdownText, readTextFile } from './markitdown'

// Every ingest route resolves to a plain text string, which then goes through
// normalizeInput() + parseStatement() identically regardless of source.
export type IngestSource =
  | { kind: 'pdf'; file: File; password?: string }
  | { kind: 'file'; file: File } // dropped .md / .txt
  | { kind: 'paste'; text: string } // pasted MarkItDown output or plain text

// Thrown by ingest/pdf.ts's pdfToText when the PDF is password-protected
// (CAMS/KFintech CAS statements almost always are). Deliberately defined
// here — in router.ts, which is always loaded — rather than in pdf.ts,
// which is dynamically imported specifically so pdf.js doesn't load eagerly
// for sessions that never touch the PDF path (see resolveToText below).
// App.tsx needs to `instanceof`-check this via a static import without
// defeating that lazy-load.
export class PdfPasswordRequiredError extends Error {
  incorrect: boolean
  constructor(incorrect: boolean) {
    super(incorrect ? 'Incorrect PDF password' : 'PDF requires a password')
    this.name = 'PdfPasswordRequiredError'
    this.incorrect = incorrect
  }
}

export async function resolveToText(source: IngestSource): Promise<string> {
  switch (source.kind) {
    case 'pdf': {
      // Lazy-loaded: pdf.js needs real browser APIs (DOMMatrix, Worker) that
      // don't exist under jsdom/Node, and most sessions never touch the PDF
      // path (MarkItDown is the primary route) — no reason to ship or
      // initialise it up front.
      const { pdfToText } = await import('./pdf')
      return pdfToText(await source.file.arrayBuffer(), source.password)
    }
    case 'file':
      return readTextFile(source.file)
    case 'paste':
      return acceptMarkitdownText(source.text)
  }
}

// The canonical "is this a PDF" / "is this an already-extracted text file"
// checks (review item C3) — App.tsx used to independently re-implement its
// own copy of isPdfFile's logic (for the accept/reject gate ahead of
// classifyFile, and to route password retries) with no MIME-type check,
// only the extension — a genuine, silent divergence from this file's own
// classifyFile, not just duplicated code.
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

export function isTextFile(file: File): boolean {
  return /\.(md|markdown|txt|text)$/i.test(file.name) || /^text\//.test(file.type || '')
}

// Classifies a dropped/browsed File into an IngestSource. PDF falls back to
// pdf.js (in-browser, zero dependencies); .md/.txt are treated as
// already-extracted text (e.g. MarkItDown output).
export function classifyFile(file: File): IngestSource {
  if (isPdfFile(file)) return { kind: 'pdf', file }
  return { kind: 'file', file }
}
