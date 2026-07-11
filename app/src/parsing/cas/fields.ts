// Independent per-field patterns, ported from reference/engine.js. Each of
// NAV / Market Value / Closing Units / Cost Value may share a line with the
// others or sit on its own line — CAMS and KFintech differ, and PDF text
// extractors fragment rows unpredictably. Never parse by fixed column/line
// offsets; match each field by its own pattern instead.
export const RE_NAV = /NAV on\s*([0-9A-Za-z-]+)\s*:?\s*INR\s*([\d,]+\.\d+)/i
export const RE_MV = /(?:Market Value|Valuation) on\s*[0-9A-Za-z-]+\s*:?\s*INR\s*([\d,]+\.\d+)/i
export const RE_CUB = /Closing Unit Balance\s*:?\s*([\d,]+\.\d+)/i
export const RE_TCV = /Total Cost Value\s*:?\s*([\d,]+\.\d+)/i
