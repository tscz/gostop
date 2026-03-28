import { describe, it, expect } from 'vitest'
import { applyTurn, detectPoktan, applyPoktan } from './rules'
import { GamePhase } from './gameState'
import { DECK } from './cards'
import type { GameState } from './gameState'
import type { Card } from './cards'

const t = (key: string) => key // mock i18n

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
    turn: 'player',
    phase: GamePhase.SELECT,
    lastExp: null,
    history: [],
    goCount: 0,
    pendingChoose: null,
    pendingPoktan: null,
    message: '',
    winner: null,
    _hadTwoMatches: false,
    scoreAtLastGo: 0,
    ...overrides,
  }
}

describe('applyTurn — hand card matching', () => {
  it('no field match → played card goes to field', () => {
    const jan1 = c(1)  // January Bright
    const mar9 = c(9)  // March Bright — different month
    const state = makeState({ playerHand: [jan1], field: [mar9], drawPile: [] })
    const next = applyTurn(state, jan1, false, t)
    expect(next.field).toContainEqual(jan1)
    expect(next.playerCaptured).toHaveLength(0)
  })

  it('1 field match → both cards captured', () => {
    const jan1 = c(1)  // Jan Bright (played from hand)
    const jan2 = c(2)  // Jan Ribbon (on field)
    const state = makeState({ playerHand: [jan1], field: [jan2], drawPile: [] })
    const next = applyTurn(state, jan1, false, t)
    expect(next.playerCaptured).toContainEqual(jan1)
    expect(next.playerCaptured).toContainEqual(jan2)
    expect(next.field).not.toContainEqual(jan2)
  })

  it('sassak: 3 field matches → all 4 captured + steal opponent junk', () => {
    // Jan has 4 cards: 1,2,3,4. Put 3 on field, play the 4th.
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const oppJunk = c(7) // Feb junk owned by opponent
    const state = makeState({
      playerHand: [jan4],
      field: [jan1, jan2, jan3],
      drawPile: [],
      aiCaptured: [oppJunk],
    })
    const next = applyTurn(state, jan4, false, t)
    expect(next.playerCaptured).toContainEqual(jan1)
    expect(next.playerCaptured).toContainEqual(jan2)
    expect(next.playerCaptured).toContainEqual(jan3)
    expect(next.playerCaptured).toContainEqual(jan4)
    expect(next.playerCaptured).toContainEqual(oppJunk) // stolen
    expect(next.aiCaptured).not.toContainEqual(oppJunk)
  })
})

describe('applyTurn — draw card', () => {
  it('draw matches 1 field card → both captured', () => {
    const feb5 = c(5)  // Feb Animal (played — no match on field)
    const jan1 = c(1)  // Jan Bright (on field)
    const jan2 = c(2)  // Jan Ribbon (drawn → matches jan1 on field)
    const state = makeState({
      playerHand: [feb5],
      field: [jan1],
      drawPile: [jan2],
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.playerCaptured).toContainEqual(jan1)
    expect(next.playerCaptured).toContainEqual(jan2)
  })

  it('draw matches 0 field cards → drawn card added to field', () => {
    const feb5 = c(5)  // played (no field match)
    const mar9 = c(9)  // drawn — no March cards on field
    const state = makeState({
      playerHand: [feb5],
      field: [],
      drawPile: [mar9],
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.field).toContainEqual(mar9)
  })

  it('ppeok: draw matches 2 field cards of same month → all 3 stay on field', () => {
    // Play a non-matching card, then drawn card hits 2 same-month cards on field
    const feb5 = c(5)  // played (no field match for Feb on field)
    const jan3 = c(3), jan4 = c(4) // 2 Jan cards on field
    const jan1 = c(1)              // drawn — matches 2 field Jans → ppeok
    const state = makeState({
      playerHand: [feb5],
      field: [jan3, jan4],
      drawPile: [jan1],
    })
    const next = applyTurn(state, feb5, false, t)
    // All 3 Jan cards stay on field (jan3, jan4, jan1)
    expect(next.field).toContainEqual(jan3)
    expect(next.field).toContainEqual(jan4)
    expect(next.field).toContainEqual(jan1)
    expect(next.playerCaptured.filter(card => card.month === 1)).toHaveLength(0)
  })

  it('ttadak: draw matches 3 field cards → all 4 collected + steal junk', () => {
    const feb5 = c(5)  // played (no match)
    const jan1 = c(1), jan2 = c(2), jan3 = c(3) // 3 Jan cards on field
    const jan4 = c(4)  // drawn — hits 3 → ttadak
    const oppJunk = c(7)
    const state = makeState({
      playerHand: [feb5],
      field: [jan1, jan2, jan3],
      drawPile: [jan4],
      aiCaptured: [oppJunk],
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.playerCaptured).toContainEqual(jan1)
    expect(next.playerCaptured).toContainEqual(jan2)
    expect(next.playerCaptured).toContainEqual(jan3)
    expect(next.playerCaptured).toContainEqual(jan4)
    expect(next.playerCaptured).toContainEqual(oppJunk)
  })
})

describe('applyTurn — state transitions', () => {
  it('removes played card from player hand', () => {
    const jan1 = c(1), jan2 = c(2)
    const state = makeState({ playerHand: [jan1, jan2], field: [], drawPile: [] })
    const next = applyTurn(state, jan1, false, t)
    expect(next.playerHand).not.toContainEqual(jan1)
    expect(next.playerHand).toContainEqual(jan2)
  })

  it('switches turn from player to ai', () => {
    const jan1 = c(1)
    const state = makeState({ playerHand: [jan1], field: [], drawPile: [], turn: 'player' })
    const next = applyTurn(state, jan1, false, t)
    expect(next.turn).toBe('ai')
  })

  it('switches turn from ai to player', () => {
    const jan1 = c(1)
    const state = makeState({ aiHand: [jan1], field: [], drawPile: [], turn: 'ai' })
    const next = applyTurn(state, jan1, true, t)
    expect(next.turn).toBe('player')
  })

  it('game over when all hands and draw pile empty', () => {
    const jan1 = c(1)
    const state = makeState({ playerHand: [jan1], aiHand: [], field: [], drawPile: [] })
    const next = applyTurn(state, jan1, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).not.toBeNull()
  })

  it('phase → GOSTOP when player reaches threshold with 0 GO count', () => {
    // Player captures godori(5pts) + 3 poetry ribbons(3pts) = 8pts in a single turn.
    // Keep aiHand non-empty so game doesn't end (GAME_OVER check requires ALL hands empty).
    const jan1 = c(1), jan2 = c(2)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [c(3)],           // AI still has cards → game not over
      field: [jan2],
      drawPile: [],
      // Pre-fill with godori(5) + 2 poetry ribbons; playing jan1+jan2 adds the 3rd poetry ribbon
      playerCaptured: [c(5), c(13), c(30), c(6), c(10)], // godori birds + 2 poetry ribbons
    })
    // After turn: playerCaptured gains jan1(Bright) + jan2(poetry ribbon) → 3 poetry ribbons → +3pts
    // Total: 5(godori) + 3(hongdan) = 8pts ≥ 7 threshold → GOSTOP
    const next = applyTurn(state, jan1, false, t)
    expect(next.playerScore).toBeGreaterThanOrEqual(7)
    expect(next.phase).toBe(GamePhase.GOSTOP)
  })

  it('appends move explanation to history', () => {
    const jan1 = c(1)
    const state = makeState({ playerHand: [jan1], field: [], drawPile: [] })
    const next = applyTurn(state, jan1, false, t)
    expect(next.history).toHaveLength(1)
    expect(next.lastExp).not.toBeNull()
    expect(next.lastExp!.who).toBe('player')
  })

  it('AI turn sets lastExp.who to ai', () => {
    const jan1 = c(1)
    const state = makeState({ aiHand: [jan1], field: [], drawPile: [] })
    const next = applyTurn(state, jan1, true, t)
    expect(next.lastExp!.who).toBe('ai')
  })

  it('applies GO multiplier to player score at game end', () => {
    // applyGoMultiplier applies to calcScore(captured), not state.playerScore.
    // Give player godori cards (5pts raw) in captured, then trigger game over.
    // With goCount=1: finalScore = 5 + 1 = 6
    const jan1 = c(1)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [],
      field: [],
      drawPile: [],
      goCount: 1,
      playerCaptured: [c(5), c(13), c(30)], // godori = 5 raw pts
    })
    const next = applyTurn(state, jan1, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    // raw=5, goCount=1 → 5+1=6
    expect(next.playerScore).toBe(6)
  })

  it('resets _hadTwoMatches after turn', () => {
    const jan1 = c(1)
    const state = makeState({ playerHand: [jan1], field: [], drawPile: [], _hadTwoMatches: true })
    const next = applyTurn(state, jan1, false, t)
    expect(next._hadTwoMatches).toBe(false)
  })
})

describe('applyTurn — AI specific', () => {
  it('AI plays do not modify playerHand', () => {
    const jan1 = c(1)
    const playerCards = [c(5), c(13)]
    const state = makeState({ aiHand: [jan1], playerHand: playerCards, field: [], drawPile: [] })
    const next = applyTurn(state, jan1, true, t)
    expect(next.playerHand).toEqual(playerCards)
  })

  it('AI captured cards go to aiCaptured, not playerCaptured', () => {
    const jan1 = c(1), jan2 = c(2)
    const state = makeState({ aiHand: [jan1], field: [jan2], drawPile: [] })
    const next = applyTurn(state, jan1, true, t)
    expect(next.aiCaptured).toContainEqual(jan1)
    expect(next.playerCaptured).toHaveLength(0)
  })
})

// ─── Sa-ssak ──────────────────────────────────────────────────────────────────

describe('applyTurn — sa-ssak', () => {
  // Jan cards: 1=Bright, 2=Ribbon, 3=Junk, 4=Junk
  it('records sassak as special in explanation', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({ playerHand: [jan4], field: [jan1, jan2, jan3], drawPile: [] })
    const next = applyTurn(state, jan4, false, t)
    expect(next.lastExp?.lines.some(l => l.includes('sassak') || l.includes('Sa-ssak'))).toBe(true)
  })

  it('no pi steal when opponent has no junk', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan4],
      field: [jan1, jan2, jan3],
      drawPile: [],
      aiCaptured: [], // opponent has no junk
    })
    const next = applyTurn(state, jan4, false, t)
    expect(next.playerCaptured).toHaveLength(4)
    expect(next.aiCaptured).toHaveLength(0)
  })

  it('sets pendingPoktan for next player if AI now has 3-of-a-kind + 1 field card', () => {
    // Jan sassak by player. AI holds 3 Feb cards; 1 Feb card lands on field via draw.
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const feb5 = c(5), feb6 = c(6), feb7 = c(7), feb8 = c(8) // 4 Feb cards
    const state = makeState({
      playerHand: [jan4],
      aiHand: [feb5, feb6, feb7],
      field: [jan1, jan2, jan3],
      drawPile: [feb8], // drawn feb goes to field → AI has 3 Feb in hand + 1 on field
    })
    const next = applyTurn(state, jan4, false, t)
    expect(next.pendingPoktan).not.toBeNull()
    expect(next.pendingPoktan?.handCards.every(c => c.month === 2)).toBe(true)
  })
})

// ─── detectPoktan ─────────────────────────────────────────────────────────────

describe('detectPoktan', () => {
  it('returns null when hand has no 3-of-a-kind', () => {
    const hand = [c(1), c(5), c(9)]  // Jan, Feb, Mar — all different months
    const field = [c(2)]
    expect(detectPoktan(hand, field)).toBeNull()
  })

  it('returns null when 3-of-a-kind in hand but no matching field card', () => {
    const hand = [c(1), c(2), c(3)]  // 3 Jan cards
    const field = [c(9)]             // only Mar on field — no Jan
    expect(detectPoktan(hand, field)).toBeNull()
  })

  it('returns PendingPoktan when 3 hand cards match 1 field card', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3)
    const jan4 = c(4) // on field
    const result = detectPoktan([jan1, jan2, jan3], [jan4])
    expect(result).not.toBeNull()
    expect(result!.handCards).toHaveLength(3)
    expect(result!.handCards.every(card => card.month === 1)).toBe(true)
    expect(result!.fieldCard.id).toBe(jan4.id)
  })

  it('returns null when field is empty', () => {
    expect(detectPoktan([c(1), c(2), c(3)], [])).toBeNull()
  })

  it('returns null when hand has only 2 cards of a month', () => {
    const hand = [c(1), c(2), c(9)] // 2 Jan + 1 Mar
    const field = [c(3)]            // Jan on field, but only 2 in hand
    expect(detectPoktan(hand, field)).toBeNull()
  })
})

// ─── applyPoktan ──────────────────────────────────────────────────────────────

describe('applyPoktan', () => {
  function makePoktanState(overrides: Partial<GameState> = {}): GameState {
    // Player has 3 Jan cards in hand; 1 Jan card on field
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    return makeState({
      playerHand: [jan1, jan2, jan3, c(9)], // 3 Jan + 1 other
      aiHand: [c(21)],
      field: [jan4],
      drawPile: [],
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
      ...overrides,
    })
  }

  it('captures all 3 hand cards + 1 field card', () => {
    const state = makePoktanState()
    const next = applyPoktan(state, false, t)
    expect(next.playerCaptured).toContainEqual(c(1))
    expect(next.playerCaptured).toContainEqual(c(2))
    expect(next.playerCaptured).toContainEqual(c(3))
    expect(next.playerCaptured).toContainEqual(c(4))
  })

  it('removes the 3 hand cards from playerHand', () => {
    const state = makePoktanState()
    const next = applyPoktan(state, false, t)
    expect(next.playerHand).not.toContainEqual(c(1))
    expect(next.playerHand).not.toContainEqual(c(2))
    expect(next.playerHand).not.toContainEqual(c(3))
    expect(next.playerHand).toContainEqual(c(9)) // other card stays
  })

  it('removes the field card from field', () => {
    const state = makePoktanState()
    const next = applyPoktan(state, false, t)
    expect(next.field).not.toContainEqual(c(4))
  })

  it('steals 1 junk from opponent when available', () => {
    const oppJunk = c(7) // Feb junk
    const state = makePoktanState({ aiCaptured: [oppJunk] })
    const next = applyPoktan(state, false, t)
    expect(next.playerCaptured).toContainEqual(oppJunk)
    expect(next.aiCaptured).not.toContainEqual(oppJunk)
  })

  it('does not steal when opponent has no junk', () => {
    const state = makePoktanState({ aiCaptured: [c(9)] }) // opponent has only a Bright
    const next = applyPoktan(state, false, t)
    expect(next.playerCaptured).toHaveLength(4) // only the 4 poktan cards
  })

  it('passes turn to AI after player poktan', () => {
    const state = makePoktanState()
    const next = applyPoktan(state, false, t)
    expect(next.turn).toBe('ai')
    expect(next.phase).toBe(GamePhase.SELECT)
  })

  it('passes turn to player after AI poktan', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      aiHand: [jan1, jan2, jan3],
      playerHand: [c(9)],
      field: [jan4],
      drawPile: [],
      turn: 'ai',
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
    })
    const next = applyPoktan(state, true, t)
    expect(next.turn).toBe('player')
    expect(next.aiCaptured).toContainEqual(jan1)
    expect(next.playerCaptured).toHaveLength(0)
  })

  it('appends explanation to history', () => {
    const state = makePoktanState()
    const next = applyPoktan(state, false, t)
    expect(next.history).toHaveLength(1)
    expect(next.lastExp?.quality).toBe('excellent')
    expect(next.lastExp?.who).toBe('player')
  })

  it('clears pendingPoktan after execution', () => {
    const state = makePoktanState()
    const next = applyPoktan(state, false, t)
    // No new poktan available (AI has only 1 card of its month)
    expect(next.pendingPoktan).toBeNull()
  })

  it('game over when player uses last cards for poktan and AI + pile are empty', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan1, jan2, jan3], // exactly 3 cards — all used in poktan
      aiHand: [],
      field: [jan4],
      drawPile: [],
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
    })
    const next = applyPoktan(state, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).not.toBeNull()
  })

  it('no game over when draw pile still has cards', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan1, jan2, jan3],
      aiHand: [],
      field: [jan4],
      drawPile: [c(9)], // pile not empty
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
    })
    const next = applyPoktan(state, false, t)
    expect(next.phase).toBe(GamePhase.SELECT)
    expect(next.winner).toBeNull()
  })
})
