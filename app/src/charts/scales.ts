// Shared chart geometry, ported from reference/engine.js's inline-SVG chart
// gallery. Every chart builder returns a complete `<svg>...</svg>` string at
// this fixed viewBox size; the SVG scales via `preserveAspectRatio` in the
// gallery component.
export const CW = 740
export const CH = 380
export const ML = 64
export const MR = 20
export const MT = 20
export const MB = 44

export const _sx = (x: number, a: number, b: number): number => ML + (b === a ? 0 : (x - a) / (b - a)) * (CW - ML - MR)
export const _sy = (y: number, a: number, b: number): number => CH - MB + (b === a ? 0 : (y - a) / (b - a)) * (MT - (CH - MB))

export function niceStep(range: number, target: number): number {
  if (range <= 0) return 1
  const raw = range / Math.max(1, target)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  const s = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10
  return s * mag
}

export function axisTicks(min: number, max: number, target: number): number[] {
  const step = niceStep(max - min, target) || 1
  const t: number[] = []
  const start = Math.floor(min / step) * step
  for (let v = start; v <= max + step * 0.5; v += step) t.push(+v.toFixed(6))
  return t
}

export function inrUnit(m: number): { div: number; suf: string } {
  return m >= 1e7
    ? { div: 1e7, suf: '₹ crore' }
    : m >= 1e5
      ? { div: 1e5, suf: '₹ lakh' }
      : m >= 1e3
        ? { div: 1e3, suf: '₹ 000s' }
        : { div: 1, suf: '₹' }
}

