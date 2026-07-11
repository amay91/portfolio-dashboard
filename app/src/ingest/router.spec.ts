import { describe, expect, it } from 'vitest'
import { classifyFile, resolveToText } from './router'

describe('ingest router', () => {
  it('classifies a .pdf file for the pdf.js route', () => {
    const file = new File(['%PDF-1.4'], 'statement.pdf', { type: 'application/pdf' })
    expect(classifyFile(file).kind).toBe('pdf')
  })

  it('classifies a .md file as a plain text file', () => {
    const file = new File(['# statement'], 'statement.md', { type: 'text/markdown' })
    expect(classifyFile(file).kind).toBe('file')
  })

  it('resolves a paste source to its own text unchanged', async () => {
    const text = await resolveToText({ kind: 'paste', text: 'hello world' })
    expect(text).toBe('hello world')
  })

  it('resolves a dropped text file to its contents', async () => {
    const file = new File(['line one\nline two'], 'statement.txt')
    const text = await resolveToText({ kind: 'file', file })
    expect(text).toBe('line one\nline two')
  })

  it('rejects an empty paste', async () => {
    await expect(resolveToText({ kind: 'paste', text: '   ' })).rejects.toThrow()
  })
})
