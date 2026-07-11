// Generic hover/keyboard interaction helpers shared by every interactive
// chart (InvestedChart, and the bar charts converted alongside it) — pure
// and data-shape-agnostic, so one implementation serves a line chart's
// per-year points and a bar chart's per-bar centers alike.

export interface Band {
  x0: number
  x1: number
}

// One hover/focus hit-region per data point, spanning the midpoint to its
// neighbours (and the chart's own edges at the ends) so hovering anywhere
// near a point/bar snaps to it — a single-pixel target is too small.
export function hoverBands(points: { x: number }[], left: number, right: number): Band[] {
  return points.map((p, i) => ({
    x0: i === 0 ? left : (points[i - 1].x + p.x) / 2,
    x1: i === points.length - 1 ? right : (p.x + points[i + 1].x) / 2,
  }))
}

// Pure keyboard-stepping logic: from no selection, the first Right press
// lands on the first point and the first Left press lands on the last
// (mirrors a screen-reader-friendly "step onto the nearest end"), then
// clamps at the ends rather than wrapping.
export function clampHoverStep(current: number | null, delta: number, length: number): number {
  if (length <= 0) return 0
  const base = current ?? (delta > 0 ? -1 : length)
  return Math.min(length - 1, Math.max(0, base + delta))
}
