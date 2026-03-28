import { describe, it, expect } from 'vitest'
import { shuffle, countByMonth, deal } from './deck'
import { DECK } from './cards'

describe('shuffle', () => {
  it('returns array of same length', () => {
    expect(shuffle(DECK)).toHaveLength(DECK.length)
  })
  it('contains all original elements', () => {
    const result = shuffle(DECK)
    const originalIds = DECK.map(c => c.id).sort()
    const resultIds = result.map(c => c.id).sort()
    expect(resultIds).toEqual(originalIds)
  })
  it('does not mutate the original array', () => {
    const original = [...DECK]
    shuffle(DECK)
    expect(DECK.map(c => c.id)).toEqual(original.map(c => c.id))
  })
  it('works on empty array', () => {
    expect(shuffle([])).toEqual([])
  })
  it('works on single-element array', () => {
    expect(shuffle([DECK[0]])).toEqual([DECK[0]])
  })
})

describe('countByMonth', () => {
  it('counts cards per month correctly', () => {
    const cards = DECK.filter(c => c.month === 1) // 4 January cards
    expect(countByMonth(cards)).toEqual({ 1: 4 })
  })
  it('handles multiple months', () => {
    const cards = [...DECK.filter(c => c.month === 1), ...DECK.filter(c => c.month === 2)]
    const counts = countByMonth(cards)
    expect(counts[1]).toBe(4)
    expect(counts[2]).toBe(4)
  })
  it('returns empty object for empty array', () => {
    expect(countByMonth([])).toEqual({})
  })
})

describe('deal', () => {
  it('deals correct hand and pile sizes', () => {
    const { playerHand, aiHand, field, drawPile } = deal()
    expect(playerHand).toHaveLength(10)
    expect(aiHand).toHaveLength(10)
    expect(field).toHaveLength(8)
    expect(drawPile).toHaveLength(20)
  })
  it('all 48 cards are accounted for (no duplicates, no missing)', () => {
    const { playerHand, aiHand, field, drawPile } = deal()
    const allIds = [...playerHand, ...aiHand, ...field, ...drawPile].map(c => c.id).sort((a, b) => a - b)
    expect(allIds).toEqual(DECK.map(c => c.id).sort((a, b) => a - b))
  })
  it('field never has all 4 cards of the same month', () => {
    // Run multiple deals to catch statistical cases
    for (let i = 0; i < 50; i++) {
      const { field, instantWin } = deal()
      if (instantWin) continue // bomb hands may bypass the check
      const counts = countByMonth(field)
      expect(Object.values(counts).every(v => v < 4)).toBe(true)
    }
  })
  it('returns instantWin=null when no 4-of-same-month bomb', () => {
    // Run many deals — most will have no bomb
    let nonBombFound = false
    for (let i = 0; i < 100; i++) {
      const { instantWin } = deal()
      if (instantWin === null) { nonBombFound = true; break }
    }
    expect(nonBombFound).toBe(true)
  })
  it('instantWin is player or ai when one side has a bomb', () => {
    // Can't force this easily, but validate the shape when it occurs
    for (let i = 0; i < 200; i++) {
      const { instantWin } = deal()
      if (instantWin !== null) {
        expect(['player', 'ai']).toContain(instantWin)
        return
      }
    }
    // If no bomb in 200 deals, that's statistically fine — test passes
  })
})
