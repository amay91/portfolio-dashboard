export interface AdvancedTile {
  id: string
  label: string
  iconPath: string
}

// The 6 Portfolio Analysis section buttons (tasks.md §U). By default only one
// section is open at a time (clicking a second one replaces the first); the
// "View All" button opens all 6 together. Order matches the user's stated
// preference: gallery, holdings, houses, then per-fund detail, then
// provenance/methods.
export const ADVANCED_TILES: AdvancedTile[] = [
  { id: 'charts', label: '6-Chart Gallery', iconPath: 'M4 20h16M7 20v-6M12 20V8M17 20v-9' },
  { id: 'holdings-full', label: 'Full Holdings', iconPath: 'M3 5h18v14H3zM3 10h18M9 5v14' },
  { id: 'houses', label: 'Fund Houses', iconPath: 'M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M4 10l8-6 8 6' },
  { id: 'schemes', label: 'Fund Cards', iconPath: 'M3 7h13v13H3zM8 4h10a2 2 0 0 1 2 2v10' },
  { id: 'sources', label: 'Data Sources', iconPath: 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6' },
  { id: 'notes', label: 'Method Notes', iconPath: 'M5 3h14v18H5zM9 7h6M9 11h6M9 15h4' },
]
