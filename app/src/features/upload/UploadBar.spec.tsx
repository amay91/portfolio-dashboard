import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UploadBar } from './UploadBar'

function noop() {}

const base = {
  hasExtractionProblem: false,
  pendingPassword: null,
  onFile: noop,
  onClearAndReset: noop,
  onRefresh: noop,
  onConvertMarkitdown: noop,
  onSubmitPassword: noop,
}

describe('UploadBar', () => {
  it('shows the idle drop-zone label, Refresh, and Clear Data buttons with no status and no extraction problem', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="idle" />)
    expect(html).toContain('Drop a CAMS / KFintech Statement Here')
    expect(html).toContain('Refresh')
    expect(html).toContain('Clear Data')
    expect(html).not.toContain('Convert PDF to Markdown')
    expect(html).not.toContain('Instructions')
  })

  it('shows the processing label while uploadPhase is processing, and disables Refresh', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="processing" />)
    expect(html).toContain('Please Wait - Creating Dashboard')
    expect(html).toContain('disabled')
  })

  it('shows the done label after a successful load', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="done" />)
    expect(html).toContain('Done! Dashboard Created')
  })

  it('shows Convert PDF to Markdown and Instructions only when hasExtractionProblem is true', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="done" hasExtractionProblem={true} />)
    expect(html).toContain('Convert PDF to Markdown')
    expect(html).toContain('Instructions')
  })

  it('shows an error-styled status message when status.isErr is true', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={{ message: 'Could not parse this file.', isErr: true }} uploadPhase="idle" />)
    expect(html).toContain('upload-status err')
    expect(html).toContain('Could not parse this file.')
  })

  it('shows the password-required label and prompt when pendingPassword is set', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="idle" pendingPassword={{ incorrect: false }} />)
    expect(html).toContain('Password Required — Enter It Below to Continue')
    expect(html).toContain('This statement is password-protected.')
    expect(html).toContain('type="password"')
    expect(html).not.toContain('Incorrect password')
  })

  it('renders the password prompt as a sibling of .wrap (matching the dashboard content width, not a flex-row-dependent one), with a capitalized field label and the exact hint copy', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="idle" pendingPassword={{ incorrect: false }} />)
    // A sibling of .wrap, not nested inside its flex row — its width comes
    // from its own max-width (matching the dashboard's .wrap), not from
    // however much space the row's other children (status text, buttons)
    // happen to leave over, which is what caused the block to visibly
    // shift width as the status message changed length (see app.css).
    expect(html).toMatch(/<\/div>\s*<form class="upload-password-block"/)
    expect(html).toContain('placeholder="Statement Password"')
    expect(html).toContain('aria-label="Statement Password"')
    expect(html).not.toContain('Statement password"')
    expect(html).toContain('Usually your PAN in capitals (e.g. <code>AAAPZ1234C</code>), or whatever password entered on the CAMS webpage')
    expect(html).toContain('uses your local MarkItDown bridge (127.0.0.1) if you')
  })

  it('shows the incorrect-password variant when pendingPassword.incorrect is true', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="idle" pendingPassword={{ incorrect: true }} />)
    expect(html).toContain('Incorrect password — try again.')
  })

  it('password prompt takes priority over the normal drop-zone label even when done', () => {
    const html = renderToStaticMarkup(<UploadBar {...base} status={null} uploadPhase="done" pendingPassword={{ incorrect: false }} />)
    expect(html).toContain('Password Required')
    expect(html).not.toContain('Done! Dashboard Created')
  })
})
