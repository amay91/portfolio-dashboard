// Comprehensive, layperson-facing privacy explainer (task: help menu). Every
// claim here is enforced by a real test, not just written down —
// marketdata/egress.spec.ts spies on every fetch() call resolveLiveNavs()/
// fetchNiftyBenchmark() make and asserts (a) the host is one of exactly
// www.amfiindia.com / mf.captnemo.in / api.mfapi.in / 127.0.0.1, and (b) no
// folio number or rupee amount ever appears in a request URL — only ISIN or
// fund name does, which is the one thing a live NAV lookup actually needs.
// Supersedes the earlier, shorter PrivacyNote (task D2) — this is the single,
// comprehensive place for privacy information now.
export function PrivacyDataContent() {
  return (
    <div className="help-body">
      <p>
        <b>Short version: your statement never leaves your device.</b> Nothing about you — your name, folio numbers, holdings, or how much money you have — is ever sent
        anywhere. Below is exactly how that's true, and how you can check it yourself.
      </p>

      <h4>How your statement gets processed</h4>
      <p>
        When you drop a PDF (or paste text) into this dashboard, it's read and processed entirely <b>inside your own web browser</b>, using ordinary web technology (the same
        kind that runs any website) executing on your own computer or phone. There is no step where your file is sent to a server — because this dashboard doesn't have a
        server to send it to. It's what's called a <b>static site</b>: a set of files your browser downloads once and then runs entirely on its own.
      </p>
      <p>
        Extracting the fund names, folios, transactions, and amounts from your PDF; calculating your returns, gains, and allocation; drawing every chart — all of it happens as
        JavaScript code running in your browser tab, the same way a spreadsheet formula runs on your own computer rather than someone else's.
      </p>

      <h4>The only thing that ever goes out</h4>
      <p>
        To show you <b>today's</b> fund prices (rather than the older prices printed in your statement), the dashboard does need to ask the internet one question per fund:{' '}
        <i>"what is the current price of this specific fund?"</i> That question is identified only by the fund's <b>ISIN code</b> (a public identifier every mutual fund
        scheme has, like a product barcode) or its <b>name</b> — never by your folio number, your name, or how many units you hold.
      </p>
      <p>These price lookups go to exactly three places, all public, none of them able to identify you:</p>
      <ol className="help-steps">
        <li>
          <b>AMFI</b> (amfiindia.com) — the mutual fund industry's own regulator-adjacent body, which publishes every scheme's official daily price.
        </li>
        <li>
          <b>mf.captnemo.in</b> — a free public mirror of the same official AMFI price data, queried by ISIN.
        </li>
        <li>
          <b>mfapi.in</b> — another free public price-lookup service, used only as a fallback when a fund can't be matched by ISIN.
        </li>
      </ol>
      <p>None of these three services ever receive your folio number, your name, your PAN, or any rupee amount from your statement — only a fund identifier and nothing else.</p>

      <h4>You can verify this yourself</h4>
      <p>
        You don't have to take this on faith. Open your browser's built-in Developer Tools (usually <code>F12</code>, or right-click → Inspect), click the <b>Network</b> tab,
        then upload a statement or press <b>Refresh</b>. You'll see a short list of requests — every one of them to the three addresses above, each carrying nothing but a fund
        code. None will contain your file's contents.
      </p>

      <h4>No accounts, no storage, no tracking</h4>
      <p>
        There's no sign-up, no login, and nothing you do here is saved on any server — there is no server to save it on. If you use the optional MarkItDown conversion or the
        Feedback form, those talk only to a small program running on <b>your own machine</b> (<code>127.0.0.1</code> — a technical way of saying "this computer, not the
        internet"), never a third party. Closing the tab clears everything from memory; nothing persists unless you choose to keep the tab open, and even then, nothing is ever
        written anywhere but your own browser's temporary memory for that session. This includes the email/password fields in the Instructions panel's quick-fill box (used to copy
        those details into CAMS's own statement-request form) — they're held only in that same in-tab memory, never in <code>localStorage</code> or any other on-disk store,
        and vanish the moment you reload or close the tab.
      </p>

      <h4>In short</h4>
      <p>
        Think of this dashboard less like a website you send your data to, and more like a calculator app you happen to run in a browser window — it just happens to also check
        the internet for a public price now and then, the same way a weather app checks for today's forecast without needing to know anything about you.
      </p>
      <p className="privacy-footnote">
        For how the figures themselves are calculated (not just where the data comes from), see the FAQ or the Method Notes section under Portfolio Analysis.
      </p>
    </div>
  )
}
