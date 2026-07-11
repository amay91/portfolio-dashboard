// A single Y-axis gridline: its raw value, scaled pixel position, and
// pre-formatted label — shared by every interactive chart's geometry so
// each doesn't redefine the same shape.
export interface AxisTick {
  value: number
  y: number
  label: string
}
