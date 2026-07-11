// AMC (fund house) name harmonisation — see ../../name_overrides.md "Fund
// House Names" for the authoritative, actively-maintained list this mirrors.
// Keyed by the AMC's full name exactly as CAMS/KFintech statements print it
// (RE_HOUSE in parsing/cas/scheme.ts always captures a string ending in
// "Mutual Fund"). Matching is case/whitespace-insensitive so a statement's
// own formatting quirks (extra spaces, different casing) still resolve.
export const FUND_HOUSE_NAMES: Record<string, string> = {
  '360 ONE Mutual Fund': '360 ONE MF',
  'Abakkus Mutual Fund': 'Abakkus MF',
  'Aditya Birla Sun Life Mutual Fund': 'Aditya Birla Sun Life MF',
  'Axis Mutual Fund': 'Axis MF',
  'Bajaj Finserv Mutual Fund': 'Bajaj Finserv MF',
  'Bandhan Mutual Fund': 'Bandhan MF',
  'Bank of India Mutual Fund': 'Bank of India MF',
  'Baroda BNP Paribas Mutual Fund': 'Baroda BNP Paribas MF',
  'Canara Robeco Mutual Fund': 'Canara Robeco MF',
  'Capitalmind Mutual Fund': 'Capitalmind MF',
  'DSP Mutual Fund': 'DSP MF',
  'Edelweiss Mutual Fund': 'Edelweiss MF',
  'Franklin Templeton Mutual Fund': 'Franklin Templeton MF',
  'HDFC Mutual Fund': 'HDFC MF',
  'HSBC Mutual Fund': 'HSBC MF',
  'Helios Mutual Fund': 'Helios MF',
  'ICICI Prudential Mutual Fund': 'ICICI MF',
  'ITI Mutual Fund': 'ITI MF',
  'Invesco Mutual Fund': 'Invesco MF',
  'JM Financial Mutual Fund': 'JM Financial MF',
  'Kotak Mahindra Mutual Fund': 'Kotak Mahindra MF',
  'LIC Mutual Fund': 'LIC MF',
  'Mahindra Manulife Mutual Fund': 'Mahindra Manulife MF',
  'Mirae Asset Mutual Fund': 'Mirae Asset MF',
  'Motilal Oswal Mutual Fund': 'Motilal Oswal MF',
  'Navi Mutual Fund': 'Navi MF',
  'Nippon India Mutual Fund': 'Nippon India MF',
  'Old Bridge Mutual Fund': 'Old Bridge MF',
  'PGIM India Mutual Fund': 'PGIM India MF',
  'PPFAS Mutual Fund': 'PPFAS MF',
  'Quant Mutual Fund': 'Quant MF',
  'Quantum Mutual Fund': 'Quantum MF',
  'SBI Mutual Fund': 'SBI MF',
  'Samco Mutual Fund': 'Samco MF',
  'Sundaram Mutual Fund': 'Sundaram MF',
  'TRUST Mutual Fund': 'TRUST MF',
  'Tata Mutual Fund': 'Tata MF',
  'The Wealth Company Mutual Fund': 'The Wealth Company MF',
  'UTI Mutual Fund': 'UTI MF',
  'Union Mutual Fund': 'Union MF',
  'WhiteOak Capital Mutual Fund': 'WhiteOak Capital MF',
}

// Statements sometimes shorten an AMC's legal name further than the
// canonical form above (e.g. dropping "Mahindra" from "Kotak Mahindra
// Mutual Fund") — caught live against a real fixture. Add the observed
// variant here (lowercased) rather than in FUND_HOUSE_NAMES, so there's
// still exactly one canonical entry per AMC.
const RAW_ALIASES: Record<string, string> = {
  'kotak mutual fund': 'Kotak Mahindra Mutual Fund',
}

const byLower: Record<string, string> = Object.fromEntries(Object.keys(FUND_HOUSE_NAMES).map((k) => [k.toLowerCase().replace(/\s+/g, ' ').trim(), k]))

function canonicalKey(house: string): string | null {
  const norm = String(house || '').toLowerCase().replace(/\s+/g, ' ').trim()
  const resolved = RAW_ALIASES[norm]?.toLowerCase() ?? norm
  return byLower[resolved] ?? null
}

// The canonical full name (e.g. "ICICI Prudential Mutual Fund"). Used at
// parse time (parsing/cas/parse.ts) so every downstream field derived from
// `Scheme.house` is already canonical, and by the one display exception —
// the "Allocation Across AMCs" table — that shows the full name, not the
// abbreviation. Falls through to the input unchanged for an AMC not yet in
// the list, rather than hiding data behind a blank.
export function fundHouseFullName(house: string): string {
  return canonicalKey(house) ?? house
}

// "ICICI MF" etc. — the abbreviated form used everywhere else in the
// dashboard (Fund Cards, the Allocation drill-down). See name_overrides.md.
export function fundHouseShortName(house: string): string {
  const key = canonicalKey(house)
  return key ? FUND_HOUSE_NAMES[key] : house
}
