import type { ScoreBreakdown } from './gameState'

// Score breakdown entries are created by the rules engine (no i18n there);
// translate them for display via `bd_<key>`, falling back to the built-in label.
export function breakdownLabel(b: ScoreBreakdown, t: (key: string) => string): string {
  const key = `bd_${b.key}`
  const text = t(key)
  if (!text || text === key) return b.label
  return text.replace('{{n}}', String(b.n ?? ''))
}
