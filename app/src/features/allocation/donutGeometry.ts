import type { CatKey } from './categories'

export interface DonutSlice {
  key: CatKey
  d: string
  frac: number
}

// Pure donut-slice path geometry, ported from reference/engine.js
// donutPaths. cx/cy/R/r are fixed to the prototype's 340x340 viewBox.
export function donutPaths(values: { key: CatKey; value: number }[]): DonutSlice[] {
  const total = values.reduce((a, v) => a + v.value, 0) || 1
  const cx = 170
  const cy = 170
  const R = 150
  const r = 92
  const TAU = Math.PI * 2
  let a0 = -Math.PI / 2
  const out: DonutSlice[] = []
  values.forEach((v) => {
    const frac = v.value / total
    const a1 = a0 + frac * TAU
    const big = a1 - a0 > Math.PI ? 1 : 0
    const p = (ang: number): [number, number] => [cx + Math.cos(ang) * R, cy + Math.sin(ang) * R]
    const q = (ang: number): [number, number] => [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    const [x2, y2] = q(a1)
    const [x3, y3] = q(a0)
    const d = `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${big} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} A${r} ${r} 0 ${big} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`
    out.push({ key: v.key, d, frac })
    a0 = a1
  })
  return out
}
