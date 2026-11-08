import { describe, it, expect } from 'vitest'
import { buildExplanation } from './moveExplainer'
import { DECK } from './cards'
import type { Card } from './cards'

const c = (id: number): Card => DECK.find(card => card.id === id)!
// Echo the key plus any {{type}} substitution so assertions can see both
const t = (key: string) => (key.startsWith('coach') ? `${key}:{{type}}` : key)

const base = {
  drawn: undefined,
  drawnMatches: [],
  prevPts: 0,
  newPts: 0,
  breakdown: [],
  prevBreakdown: [],
  special: null,
  who: 'player' as const,
  t,
}

describe('buildExplanation — line 1 names the best card taken', () => {
  it('junk played onto a field bright → bright template', () => {
    const exp = buildExplanation({ ...base, played: c(3), handMatches: [c(1)] })
    expect(exp.lines[0]).toMatch(/^coachYouCapturedBright/)
  })

  it('junk played onto a field ribbon → names the ribbon, not junk', () => {
    const exp = buildExplanation({ ...base, played: c(3), handMatches: [c(2)] })
    expect(exp.lines[0]).toBe('coachYouCaptured:typeRibbon')
  })

  it('AI capture names the best card type', () => {
    const exp = buildExplanation({ ...base, who: 'ai', played: c(7), handMatches: [c(5)] })
    expect(exp.lines[0]).toBe('coachAiCaptured:typeAnimal')
  })

  it('drawn junk capturing a field ribbon names the ribbon', () => {
    const exp = buildExplanation({ ...base, played: c(11), handMatches: [], drawn: c(15), drawnMatches: [c(14)] })
    expect(exp.lines[1]).toBe('coachDrewMatch:typeRibbon')
  })
})
