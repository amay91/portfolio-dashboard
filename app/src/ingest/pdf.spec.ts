import { describe, expect, it, vi } from 'vitest'

// Mocks the whole pdfjs-dist module rather than using a real encrypted PDF
// fixture: ingest/router.ts's own comment notes pdf.js needs real browser
// APIs (DOMMatrix, Worker) jsdom/Node don't provide, and this test only
// needs to verify pdfToText's PasswordException -> PdfPasswordRequiredError
// translation, not pdf.js's actual decryption behavior (which is pdf.js's
// own tested responsibility). Defining PasswordException/PasswordResponses
// here (not importing the real ones) keeps this test fully independent of
// pdfjs-dist's internals.
vi.mock('pdfjs-dist', () => {
  class PasswordException extends Error {
    code: number
    constructor(msg: string, code: number) {
      super(msg)
      this.code = code
    }
  }
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    PasswordException,
    PasswordResponses: { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 },
    getDocument: vi.fn(),
  }
})

const pdfjsLib = await import('pdfjs-dist')
const { pdfToText } = await import('./pdf')
const { PdfPasswordRequiredError } = await import('./router')

function mockRejection(err: unknown) {
  vi.mocked(pdfjsLib.getDocument).mockReturnValue({ promise: Promise.reject(err) } as unknown as ReturnType<typeof pdfjsLib.getDocument>)
}

describe('pdfToText — password handling', () => {
  it('throws PdfPasswordRequiredError(incorrect:false) when no password was given and one is needed', async () => {
    mockRejection(new pdfjsLib.PasswordException('need', pdfjsLib.PasswordResponses.NEED_PASSWORD))
    await expect(pdfToText(new ArrayBuffer(0))).rejects.toBeInstanceOf(PdfPasswordRequiredError)
    mockRejection(new pdfjsLib.PasswordException('need', pdfjsLib.PasswordResponses.NEED_PASSWORD))
    await expect(pdfToText(new ArrayBuffer(0))).rejects.toMatchObject({ incorrect: false })
  })

  it('throws PdfPasswordRequiredError(incorrect:true) when the wrong password was given', async () => {
    mockRejection(new pdfjsLib.PasswordException('wrong', pdfjsLib.PasswordResponses.INCORRECT_PASSWORD))
    await expect(pdfToText(new ArrayBuffer(0), 'wrongpw')).rejects.toMatchObject({ incorrect: true })
  })

  it('propagates non-password errors unchanged', async () => {
    mockRejection(new Error('some other failure'))
    await expect(pdfToText(new ArrayBuffer(0))).rejects.toThrow('some other failure')
  })
})
