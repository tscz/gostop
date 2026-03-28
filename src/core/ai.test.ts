import { describe, it, expect } from 'vitest'
import { selectAiCard } from './ai'
import { GamePhase } from './gameState'
import { DECK, CardType } from './cards'
import type { GameState } from './gameState'
import type { Card } from './cards'

const c = (id: number): Card => DECK.find(card => card.id === id)!

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    playerHand: [],
    aiHand: [],
    field: [],
    drawPile: [],
    playerCaptured: [],
    aiCaptured: [],
    playerScore: 0,
    aiScore: 0,
    playerBreakdown: [],
    aiBreakdown: [],
    turn: 'ai',
    phase: GamePhase.SELECT,
    lastExp: null,
    history: [],
    goCount: 0,
    pendingChoose: null,
    message: '',
    winner: null,
    _hadTwoMatches: false,
    scoreAtLastGo: 0,
    ...overrides,
  }
}

describe('selectAiCard', () => {
  it('returns a card from aiHand', () => {
    const hand = [c(1), c(5), c(9)]
    const state = makeState({ aiHand: hand, field: [] })
    const selected = selectAiCard(state)
    expect(hand).toContainEqual(selected)
  })

  it('prefers card that matches a field card over no-match', () => {
    const jan1 = c(1)  // Jan Bright in hand
    const mar9 = c(9)  // Mar Bright in hand — no Mar on field
    const jan2 = c(2)  // Jan Ribbon on field → jan1 matches
    const state = makeState({ aiHand: [mar9, jan1], field: [jan2] })
    const selected = selectAiCard(state)
    expect(selected.id).toBe(jan1.id)
  })

  it('prefers bright (high value=50) over junk (value=1)', () => {
    const bright = c(1)  // Jan Bright, value=50
    const junk = c(3)    // Jan Junk, value=1
    const state = makeState({ aiHand: [junk, bright], field: [] })
    const selected = selectAiCard(state)
    expect(selected.id).toBe(bright.id)
  })

  it('gives extra weight to godori birds (Feb=5, Apr=13, Aug=30)', () => {
    const godoriBird = c(5)   // Feb Animal (godori) — gets +20 bonus
    const regularAnimal = c(21) // Jun Animal — no bonus
    const state = makeState({ aiHand: [regularAnimal, godoriBird], field: [] })
    const selected = selectAiCard(state)
    expect(selected.id).toBe(godoriBird.id)
  })

  it('falls back to first card when all cards score equally', () => {
    const junk1 = c(3)
    const junk2 = c(4)
    const state = makeState({ aiHand: [junk1, junk2], field: [] })
    // Both are junk with no field match — first one has highest/equal priority
    const selected = selectAiCard(state)
    expect([junk1.id, junk2.id]).toContain(selected.id)
  })

  it('handles single-card hand', () => {
    const only = c(1)
    const state = makeState({ aiHand: [only], field: [] })
    expect(selectAiCard(state).id).toBe(only.id)
  })

  it('prefers matching a high-value field card', () => {
    // Jan Bright (1) in hand. Field has Jan Ribbon (2, value=14) and May Junk (19, value=1)
    // Matching Jan gives: cardValue(1) + 20 + cardValue(2) = 50+20+14 = 84
    const jan1 = c(1)
    const mayJunk = c(19) // May junk — no May card in hand to compare
    const janRibbon = c(2)
    const state = makeState({ aiHand: [jan1, mayJunk], field: [janRibbon] })
    const selected = selectAiCard(state)
    expect(selected.id).toBe(jan1.id)
  })
})
