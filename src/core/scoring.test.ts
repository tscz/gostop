import { describe, it, expect } from 'vitest'
import { calcScore, cardValue, applyGoMultiplier, applyShakeMultiplier, finaliseScore } from './scoring'
import { DECK, CardType } from './cards'

const c = (id: number) => DECK.find(card => card.id === id)!

// Brights: 1=Jan, 9=Mar, 29=Aug, 41=Nov, 45=Dec(Rain)
// Godori animals: 5=Feb, 13=Apr, 30=Aug
// Poetry ribbons: 2=Jan, 6=Feb, 10=Mar
// Plain ribbons: 14=Apr, 18=May, 26=Jul
// Blue ribbons: 22=Jun, 34=Sep, 38=Oct
// Double junk: 44=Nov, 48=Dec
// countsAsDoublePi: 17=May(Tane), 33=Sep(Tane)

// ─────────────────────────────────────────────
// cardValue
// ─────────────────────────────────────────────
describe('cardValue', () => {
  it('returns 50 for bright', () => {
    expect(cardValue(c(1))).toBe(50)
  })
  it('returns 25 for animal', () => {
    expect(cardValue(c(5))).toBe(25)
  })
  it('returns 14 for countsAsDoublePi animal', () => {
    expect(cardValue(c(17))).toBe(14)
  })
  it('returns 14 for ribbon', () => {
    expect(cardValue(c(2))).toBe(14)
  })
  it('returns 4 for double junk', () => {
    expect(cardValue(c(44))).toBe(4)
  })
  it('returns 1 for junk', () => {
    expect(cardValue(c(3))).toBe(1)
  })
  it('returns 0 for null/undefined', () => {
    expect(cardValue(null)).toBe(0)
    expect(cardValue(undefined)).toBe(0)
  })
})

// ─────────────────────────────────────────────
// applyGoMultiplier
// ─────────────────────────────────────────────
describe('applyGoMultiplier', () => {
  it('0 GO → raw score unchanged', () => {
    expect(applyGoMultiplier(10, 0)).toBe(10)
  })
  it('1 GO → +1 bonus point', () => {
    expect(applyGoMultiplier(10, 1)).toBe(11)
  })
  it('2 GOs → +2 bonus points', () => {
    expect(applyGoMultiplier(10, 2)).toBe(12)
  })
  it('3 GOs → score × 2', () => {
    expect(applyGoMultiplier(10, 3)).toBe(20)
  })
  it('4 GOs → score × 2 × 3 = ×6', () => {
    expect(applyGoMultiplier(10, 4)).toBe(60)
  })
  it('5 GOs → score × 2 × 3 × 4 = ×24', () => {
    expect(applyGoMultiplier(10, 5)).toBe(240)
  })
})

// ─────────────────────────────────────────────
// applyShakeMultiplier
// ─────────────────────────────────────────────
describe('applyShakeMultiplier', () => {
  it('0 shakes → score unchanged', () => {
    expect(applyShakeMultiplier(10, 0)).toBe(10)
  })
  it('1 shake → score × 2', () => {
    expect(applyShakeMultiplier(10, 1)).toBe(20)
  })
  it('2 shakes → score × 4', () => {
    expect(applyShakeMultiplier(10, 2)).toBe(40)
  })
  it('0 score stays 0 regardless of shakeCount', () => {
    expect(applyShakeMultiplier(0, 3)).toBe(0)
  })
})

// ─────────────────────────────────────────────
// finaliseScore
// ─────────────────────────────────────────────
describe('finaliseScore', () => {
  const base = [{ key: 'samgwang', emoji: '💫', label: '삼광', pts: 3 }]

  it('0 GO + 0 shake → score and breakdown unchanged', () => {
    const { finalScore, breakdown } = finaliseScore(3, 0, 0, base)
    expect(finalScore).toBe(3)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].key).toBe('samgwang')
  })

  it('1 GO → +1 bonus, go_bonus entry appended', () => {
    const { finalScore, breakdown } = finaliseScore(3, 1, 0, base)
    expect(finalScore).toBe(4)
    const bonus = breakdown.find(b => b.key === 'go_bonus')
    expect(bonus).toBeDefined()
    expect(bonus!.pts).toBe(1)
    expect(breakdown.reduce((s, b) => s + b.pts, 0)).toBe(finalScore)
  })

  it('1 shake → ×2, shake_bonus entry appended', () => {
    const { finalScore, breakdown } = finaliseScore(3, 0, 1, base)
    expect(finalScore).toBe(6)
    const bonus = breakdown.find(b => b.key === 'shake_bonus')
    expect(bonus).toBeDefined()
    expect(bonus!.pts).toBe(3) // 6 - 3
    expect(breakdown.reduce((s, b) => s + b.pts, 0)).toBe(finalScore)
  })

  it('1 GO + 1 shake → both bonus entries, total matches finalScore', () => {
    const { finalScore, breakdown } = finaliseScore(3, 1, 1, base)
    // applyGoMultiplier(3,1)=4; applyShakeMultiplier(4,1)=8
    expect(finalScore).toBe(8)
    expect(breakdown.find(b => b.key === 'go_bonus')).toBeDefined()
    expect(breakdown.find(b => b.key === 'shake_bonus')).toBeDefined()
    expect(breakdown.reduce((s, b) => s + b.pts, 0)).toBe(8)
  })

  it('does not mutate the input breakdown array', () => {
    const input = [{ key: 'samgwang', emoji: '💫', label: '삼광', pts: 3 }]
    finaliseScore(3, 1, 1, input)
    expect(input).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────
// calcScore
// ─────────────────────────────────────────────
describe('calcScore', () => {
  it('empty captured → 0 points, empty breakdown', () => {
    const { points, breakdown } = calcScore([])
    expect(points).toBe(0)
    expect(breakdown).toHaveLength(0)
  })

  describe('Gwang (Brights)', () => {
    it('5 brights → ogwang 15pts', () => {
      const { points, breakdown } = calcScore([c(1), c(9), c(29), c(41), c(45)])
      expect(points).toBe(15)
      expect(breakdown[0].key).toBe('ogwang')
    })
    it('4 brights → sagwang 4pts', () => {
      const { points, breakdown } = calcScore([c(1), c(9), c(29), c(41)])
      expect(points).toBe(4)
      expect(breakdown[0].key).toBe('sagwang')
    })
    it('3 brights without rain → samgwang 3pts', () => {
      const { points, breakdown } = calcScore([c(1), c(9), c(29)])
      expect(points).toBe(3)
      expect(breakdown[0].key).toBe('samgwang')
    })
    it('3 brights with rain (Dec) → bisamgwang 2pts', () => {
      const { points, breakdown } = calcScore([c(1), c(9), c(45)])
      expect(points).toBe(2)
      expect(breakdown[0].key).toBe('bisamgwang')
    })
    it('2 brights → no gwang score', () => {
      const { points } = calcScore([c(1), c(9)])
      expect(points).toBe(0)
    })
  })

  describe('Godori (Five Birds)', () => {
    it('Feb + Apr + Aug animals → godori 5pts', () => {
      const { points, breakdown } = calcScore([c(5), c(13), c(30)])
      expect(points).toBe(5)
      expect(breakdown[0].key).toBe('godori')
    })
    it('only 2 godori birds → no bonus', () => {
      const { points } = calcScore([c(5), c(13)])
      expect(points).toBe(0)
    })
    it('godori cards include the right cards', () => {
      const { breakdown } = calcScore([c(5), c(13), c(30)])
      expect(breakdown[0].cards).toHaveLength(3)
    })
  })

  describe('Ribbons', () => {
    it('3 poetry ribbons (Jan+Feb+Mar) → hongdan 3pts', () => {
      const { points, breakdown } = calcScore([c(2), c(6), c(10)])
      expect(points).toBe(3)
      expect(breakdown[0].key).toBe('hongdan')
    })
    it('3 plain ribbons (Apr+May+Jul) → chodan 3pts', () => {
      const { points, breakdown } = calcScore([c(14), c(18), c(26)])
      expect(points).toBe(3)
      expect(breakdown[0].key).toBe('chodan')
    })
    it('3 blue ribbons (Jun+Sep+Oct) → cheongdan 3pts', () => {
      const { points, breakdown } = calcScore([c(22), c(34), c(38)])
      expect(points).toBe(3)
      expect(breakdown[0].key).toBe('cheongdan')
    })
    it('5 ribbons → +1 bonus on top of sets', () => {
      // 3 poetry + 2 plain = 5 ribbons
      const { points, breakdown } = calcScore([c(2), c(6), c(10), c(14), c(18)])
      const tti = breakdown.find(b => b.key === 'tti')
      expect(tti).toBeDefined()
      expect(tti!.pts).toBe(1) // ribbons.length(5) - 4 = 1
      expect(points).toBeGreaterThanOrEqual(4) // 3 for hongdan + 1 for tti
    })
    it('Dec ribbon excluded from ribbon counts', () => {
      // card 47 is Dec ribbon, should not count towards ribbon combos
      const { points } = calcScore([c(47)])
      expect(points).toBe(0)
    })
  })

  describe('Animals', () => {
    it('fewer than 5 animals → no kkeus bonus', () => {
      const { points } = calcScore([c(5), c(13), c(21), c(25)])
      expect(points).toBe(0)
    })
    it('5 animals → kkeus +1pt', () => {
      const { points, breakdown } = calcScore([c(5), c(13), c(21), c(25), c(37)])
      const kkeus = breakdown.find(b => b.key === 'kkeus')
      expect(kkeus).toBeDefined()
      expect(kkeus!.pts).toBe(1)
      expect(points).toBeGreaterThanOrEqual(1)
    })
    it('countsAsDoublePi animals do NOT count towards kkeus', () => {
      // May(17) and Sep(33) count as double-pi, not animals
      const { breakdown } = calcScore([c(5), c(13), c(17), c(25), c(37)])
      const kkeus = breakdown.find(b => b.key === 'kkeus')
      expect(kkeus).toBeUndefined() // only 4 real animals
    })
  })

  describe('Pi (Junk)', () => {
    it('fewer than 10 pi → no bonus', () => {
      const junks = [c(3), c(4), c(7), c(8), c(11), c(12), c(15), c(16), c(19)]
      const { points } = calcScore(junks) // 9 pi
      expect(points).toBe(0)
    })
    it('10 pi → +1pt', () => {
      const junks = [c(3), c(4), c(7), c(8), c(11), c(12), c(15), c(16), c(19), c(20)]
      const { points, breakdown } = calcScore(junks)
      const pi = breakdown.find(b => b.key === 'pi')
      expect(pi).toBeDefined()
      expect(pi!.pts).toBe(1)
      expect(points).toBe(1)
    })
    it('double junk counts as 2 pi', () => {
      // 8 junks + 1 double junk = 10 pi → bonus
      const cards = [c(3), c(4), c(7), c(8), c(11), c(12), c(15), c(16), c(44)]
      const { points } = calcScore(cards)
      expect(points).toBe(1)
    })
    it('countsAsDoublePi animal counts as 2 pi', () => {
      // 8 junks + May Tane (id:17, countsAsDoublePi) = 10 pi → bonus
      const cards = [c(3), c(4), c(7), c(8), c(11), c(12), c(15), c(16), c(17)]
      const { points } = calcScore(cards)
      expect(points).toBe(1)
    })
    it('pi breakdown includes the actual junk cards', () => {
      const junks = [c(3), c(4), c(7), c(8), c(11), c(12), c(15), c(16), c(19), c(20)]
      const { breakdown } = calcScore(junks)
      const pi = breakdown.find(b => b.key === 'pi')
      expect(pi?.cards).toBeDefined()
      expect(pi!.cards!.length).toBe(10)
    })
  })

  describe('multiple combinations', () => {
    it('godori + chodan stack correctly', () => {
      const { points } = calcScore([c(5), c(13), c(30), c(14), c(18), c(26)])
      expect(points).toBe(8) // 5 godori + 3 chodan
    })
    it('breakdown lists one entry per achieved combo', () => {
      const { breakdown } = calcScore([c(5), c(13), c(30), c(2), c(6), c(10)])
      expect(breakdown).toHaveLength(2) // godori + hongdan
    })
  })
})
