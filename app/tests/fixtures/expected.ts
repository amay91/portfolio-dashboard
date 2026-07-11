// Golden-fixture expected totals — mirrors ../../../scripts/test.mjs FIXTURES
// and handoff.md §2. Statement-only total market value, rupees, rounded.
// Any change that moves these numbers is a regression: verify by hand
// against the source statement before updating.
export const FIXTURES: Record<string, number> = {
  'sample.txt': 4310702,
  'alok_2025.txt': 23144598,
  'axis.txt': 81505,
  'alok_2026.txt': 25165629,
  'markitdown_cas.md': 25165629, // MarkItDown output of the alok_2026 statement
  'vandana_kfintech.txt': 34202380, // 29 schemes — first fixture with confirmed KFintech-registrar folios (AXIS/Quant/Quantum/UTI)
}
