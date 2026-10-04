import { describe, expect, it } from 'vitest'
import { EASIER_ROUTE_COLOR, RELIABILITY_COLORS, REPORT_COLOR, ROUTE_COLOR, SEVERITY_COLORS, VERDICT_COLORS } from './theme.ts'

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('status colours', () => {
  it('keep white text readable on every one of them (WCAG AA, 4.5:1)', () => {
    const colors = [...Object.values(VERDICT_COLORS), ...Object.values(SEVERITY_COLORS), ...Object.values(RELIABILITY_COLORS), REPORT_COLOR, ROUTE_COLOR, EASIER_ROUTE_COLOR]
    for (const hex of new Set(colors)) expect(1.05 / (luminance(hex) + 0.05), hex).toBeGreaterThanOrEqual(4.5)
  })
})
