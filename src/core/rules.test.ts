import { describe, it, expect } from 'vitest'
import { applyTurn, detectPoktan, applyPoktan, detectShake, applyShake, applySkipTurn } from './rules'
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
    pendingShake: [],
    shakeCount: 0,
    message: '',
    winner: null,
    _hadTwoMatches: false,
    scoreAtLastGo: 0,
    poktanSkipsRemaining: 0,
    aiPoktanSkipsRemaining: 0,
    isNagari: false,
    nagariMultiplier: 1,
    endReason: null,
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

  it('game over — nagari when no GO called (goCount=0)', () => {
    const jan1 = c(1)
    const state = makeState({ playerHand: [jan1], aiHand: [], field: [], drawPile: [], goCount: 0 })
    const next = applyTurn(state, jan1, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).toBeNull()
    expect(next.isNagari).toBe(true)
  })

  it('game over — winner determined when GO was called (goCount>0)', () => {
    const jan1 = c(1)
    // Player has 10pts pre-scored and called GO once; AI has 0
    const state = makeState({
      playerHand: [jan1],
      aiHand: [],
      field: [],
      drawPile: [],
      goCount: 1,
      playerScore: 10,
      aiScore: 0,
      aiCaptured: [c(3), c(4), c(7), c(8), c(11), c(12), c(41)], // 6pi + bright = no penalties
    })
    const next = applyTurn(state, jan1, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).not.toBeNull()
    expect(next.isNagari).toBe(false)
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
    // AI gets 6 pi + 1 bright so no loser penalties fire.
    const jan1 = c(1)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [],
      field: [],
      drawPile: [],
      goCount: 1,
      playerCaptured: [c(5), c(13), c(30)], // godori = 5 raw pts
      aiCaptured: [c(3), c(4), c(7), c(8), c(11), c(12), c(41)], // 6 pi + bright → no penalties
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

  it('AI picks higher-value card when 2 field matches exist', () => {
    // AI plays feb ribbon (c6) with 2 field matches: feb animal (c5, value 25) and feb junk (c7, value 1).
    // AI should capture c5 (animal) and leave c7 on the field.
    const feb5 = c(5), feb6 = c(6), feb7 = c(7)
    const state = makeState({ aiHand: [feb6], field: [feb7, feb5], drawPile: [] })
    const next = applyTurn(state, feb6, true, t)
    expect(next.aiCaptured).toContainEqual(feb5)
    expect(next.field).toContainEqual(feb7)
    expect(next.field).not.toContainEqual(feb5)
  })

  it('AI ttadak: 2 field matches → takes first, draws 4th card → steals junk from player', () => {
    // AI plays jan4 with 2 field matches (jan2, jan3); takes jan2, jan3 stays on field.
    // Draw pile has jan1 — 4th Jan card → ttadak: AI captures all 4 and steals player junk.
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const playerJunk = c(7) // Feb junk card held by player
    const state = makeState({
      aiHand: [jan4],
      field: [jan2, jan3],
      drawPile: [jan1],
      playerCaptured: [playerJunk],
    })
    const next = applyTurn(state, jan4, true, t)
    expect(next.aiCaptured).toContainEqual(jan1)
    expect(next.aiCaptured).toContainEqual(jan2)
    expect(next.aiCaptured).toContainEqual(jan3)
    expect(next.aiCaptured).toContainEqual(jan4)
    expect(next.aiCaptured).toContainEqual(playerJunk)
    expect(next.playerCaptured).not.toContainEqual(playerJunk)
  })
})

// ─── Sa-ssak ──────────────────────────────────────────────────────────────────

describe('applyTurn — sa-ssak', () => {
  // Jan cards: 1=Bright, 2=Ribbon, 3=Junk, 4=Junk
  it('records sassak as special in explanation', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({ playerHand: [jan4], field: [jan1, jan2, jan3], drawPile: [] })
    const next = applyTurn(state, jan4, false, t)
    expect(next.lastExp?.lines.some(l => l.toLowerCase().includes('sassak'))).toBe(true)
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

// ─── Issue #7: DOUBLE_JUNK eligible for stealing ─────────────────────────────
// All five steal operations must fall back to a DOUBLE_JUNK card when the
// opponent's pile contains no plain JUNK cards.

describe('junk-stealing accepts DOUBLE_JUNK when no plain JUNK exists (issue #7)', () => {
  const doubleJunk = c(43) // November DOUBLE_JUNK

  it('sa-ssak steals DOUBLE_JUNK when opponent has no plain junk', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan4],
      field: [jan1, jan2, jan3],
      drawPile: [],
      aiCaptured: [doubleJunk],
    })
    const next = applyTurn(state, jan4, false, t)
    expect(next.playerCaptured).toContainEqual(doubleJunk)
    expect(next.aiCaptured).not.toContainEqual(doubleJunk)
  })

  it('ttadak (draw hits 3 field cards) steals DOUBLE_JUNK when opponent has no plain junk', () => {
    const feb5 = c(5) // played — no field match
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [feb5],
      field: [jan1, jan2, jan3],
      drawPile: [jan4],
      aiCaptured: [doubleJunk],
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.playerCaptured).toContainEqual(doubleJunk)
    expect(next.aiCaptured).not.toContainEqual(doubleJunk)
  })

  it('ttadak (hadTwoMatches) steals DOUBLE_JUNK when opponent has no plain junk', () => {
    // Player played jan4 with 2 field matches (jan2, jan3); jan2 was chosen.
    // jan3 stays on field. Draw pile has jan1 — 4th Jan → ttadak.
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan4],
      field: [jan2, jan3],
      drawPile: [jan1],
      aiCaptured: [doubleJunk],
      _hadTwoMatches: true,
    })
    const next = applyTurn(state, jan4, false, t)
    expect(next.playerCaptured).toContainEqual(doubleJunk)
    expect(next.aiCaptured).not.toContainEqual(doubleJunk)
  })

  it('chok steals DOUBLE_JUNK when opponent has no plain junk', () => {
    // Chok: hand card has no field match (goes to field), drawn card matches it.
    const feb5 = c(5), feb6 = c(6) // Feb cards — feb5 played, feb6 drawn
    const state = makeState({
      playerHand: [feb5],
      field: [],
      drawPile: [feb6],
      aiCaptured: [doubleJunk],
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.playerCaptured).toContainEqual(doubleJunk)
    expect(next.aiCaptured).not.toContainEqual(doubleJunk)
  })

  it('poktan steals DOUBLE_JUNK when opponent has no plain junk', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan1, jan2, jan3],
      aiHand: [c(21)],
      field: [jan4],
      drawPile: [],
      aiCaptured: [doubleJunk],
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
    })
    const next = applyPoktan(state, false, t)
    expect(next.playerCaptured).toContainEqual(doubleJunk)
    expect(next.aiCaptured).not.toContainEqual(doubleJunk)
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
      goCount: 1, // ensures someone wins (prevents 0-0 nagari)
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
    })
    const next = applyPoktan(state, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).not.toBeNull()
  })

  it('game over when next player has no hand cards even if pile has cards', () => {
    // After player Poktan, AI has 0 hand cards — neither player can play from hand
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan1, jan2, jan3],
      aiHand: [],
      field: [jan4],
      drawPile: [c(9)], // pile not empty, but AI still can't play from hand
      goCount: 1, // ensures someone wins (prevents 0-0 nagari)
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
    })
    const next = applyPoktan(state, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).not.toBeNull()
  })
})

// ─── detectShake ──────────────────────────────────────────────────────────────

describe('detectShake', () => {
  it('returns empty array when hand has no 3-of-a-kind', () => {
    expect(detectShake([c(1), c(5), c(9)], [])).toHaveLength(0)
  })

  it('returns empty array when 3-of-a-kind in hand but a field card exists (poktan, not shake)', () => {
    // Jan: c(1), c(2), c(3) in hand; c(4) on field → poktan territory, not shake
    expect(detectShake([c(1), c(2), c(3)], [c(4)])).toHaveLength(0)
  })

  it('returns one entry when 3-of-a-kind in hand with no matching field card', () => {
    const result = detectShake([c(1), c(2), c(3)], [c(9)])
    expect(result).toHaveLength(1)
    expect(result[0].handCards).toHaveLength(3)
    expect(result[0].handCards.every(h => h.month === 1)).toBe(true)
  })

  it('returns empty array when only 2 cards of a month in hand', () => {
    expect(detectShake([c(1), c(2), c(9)], [])).toHaveLength(0)
  })

  it('returns one entry per qualifying month when multiple months have 3-of-a-kind', () => {
    // 3 Jan cards (c1-c3) + 3 Feb cards (c5-c7), no field cards for either
    const result = detectShake([c(1), c(2), c(3), c(5), c(6), c(7)], [])
    expect(result).toHaveLength(2)
    const months = result.map(r => r.handCards[0].month).sort()
    expect(months).toEqual([1, 2])
  })
})

// ─── applyShake ───────────────────────────────────────────────────────────────

const janShake = { handCards: [c(1), c(2), c(3)] }

describe('applyShake', () => {
  it('increments shakeCount and clears pendingShake', () => {
    const state = makeState({
      playerHand: [c(1), c(2), c(3)],
      pendingShake: [janShake],
      shakeCount: 0,
    })
    const next = applyShake(state, janShake, t)
    expect(next.shakeCount).toBe(1)
    expect(next.pendingShake).toHaveLength(0)
  })

  it('stacks: second shake increments to 2', () => {
    const state = makeState({
      pendingShake: [janShake],
      shakeCount: 1,
    })
    const next = applyShake(state, janShake, t)
    expect(next.shakeCount).toBe(2)
  })

  it('player turn and hand are unchanged after shake declaration', () => {
    const hand = [c(1), c(2), c(3), c(5)]
    const state = makeState({
      playerHand: hand,
      pendingShake: [janShake],
    })
    const next = applyShake(state, janShake, t)
    expect(next.playerHand).toEqual(hand)
    expect(next.turn).toBe('player')
    expect(next.phase).toBe(GamePhase.SELECT)
  })

  it('pendingShake has one entry after AI turn when player holds 3-of-a-kind with no field match', () => {
    const feb5 = c(5), feb6 = c(6)
    const jan1 = c(1), jan2 = c(2), jan3 = c(3)
    const state = makeState({
      aiHand: [feb5],
      playerHand: [jan1, jan2, jan3],
      field: [feb6], // only Feb on field — Jan has no match
      drawPile: [],
      turn: 'ai',
    })
    const next = applyTurn(state, feb5, true, t)
    expect(next.pendingShake).toHaveLength(1)
    expect(next.pendingShake[0].handCards.every(h => h.month === 1)).toBe(true)
  })

  it('pendingShake is empty after player turn (shake only offered at start of player turn)', () => {
    const jan1 = c(1), jan2 = c(2), jan3 = c(3), jan4 = c(4)
    const state = makeState({
      playerHand: [jan4],
      aiHand: [c(5)],
      field: [jan1, jan2, jan3],
      drawPile: [],
    })
    const next = applyTurn(state, jan4, false, t)
    expect(next.pendingShake).toHaveLength(0)
  })

  it('shake multiplier doubles player score at game end', () => {
    // Player holds 3 non-rain brights in captured (samgwang = 3 pts).
    // With shakeCount=1 the final score should be 3 × 2 = 6.
    // AI gets 6 pi + 1 bright so no loser penalties fire.
    const feb5 = c(5) // Feb animal — played last to trigger game end
    const state = makeState({
      playerHand: [feb5],
      playerCaptured: [c(1), c(9), c(29)], // 3 brights = 3 pts
      aiHand: [],
      field: [],
      drawPile: [],
      shakeCount: 1,
      aiCaptured: [c(3), c(4), c(7), c(8), c(11), c(12), c(41)], // 6 pi + bright → no penalties
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.playerScore).toBe(6) // 3 × 2^1
  })

  it('playerBreakdown includes shake_bonus entry at natural game end', () => {
    // Ensures ScorePanel total matches breakdown sum when game ends naturally.
    // AI gets 6 pi + 1 bright so no loser penalties fire.
    const feb5 = c(5)
    const state = makeState({
      playerHand: [feb5],
      playerCaptured: [c(1), c(9), c(29)], // samgwang = 3 pts
      aiHand: [],
      field: [],
      drawPile: [],
      shakeCount: 1,
      aiCaptured: [c(3), c(4), c(7), c(8), c(11), c(12), c(41)], // 6 pi + bright → no penalties
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.playerScore).toBe(6)
    const shakeEntry = next.playerBreakdown.find(b => b.key === 'shake_bonus')
    expect(shakeEntry).toBeDefined()
    expect(shakeEntry!.pts).toBe(3) // 6 - 3 = 3 bonus pts
    const total = next.playerBreakdown.reduce((s, b) => s + b.pts, 0)
    expect(total).toBe(next.playerScore)
  })

  it('playerBreakdown includes go_bonus and shake_bonus at natural game end', () => {
    // AI gets 6 pi + 1 bright so no loser penalties fire.
    const feb5 = c(5)
    const state = makeState({
      playerHand: [feb5],
      playerCaptured: [c(1), c(9), c(29)], // samgwang = 3 pts
      aiHand: [],
      field: [],
      drawPile: [],
      goCount: 1,   // +1 bonus → 4 pts
      shakeCount: 1, // ×2 → 8 pts
      aiCaptured: [c(3), c(4), c(7), c(8), c(11), c(12), c(41)], // 6 pi + bright → no penalties
    })
    const next = applyTurn(state, feb5, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    // goMultiplier(3, 1) = 4; shakeMultiplier(4, 1) = 8
    expect(next.playerScore).toBe(8)
    expect(next.playerBreakdown.find(b => b.key === 'go_bonus')).toBeDefined()
    expect(next.playerBreakdown.find(b => b.key === 'shake_bonus')).toBeDefined()
    const total = next.playerBreakdown.reduce((s, b) => s + b.pts, 0)
    expect(total).toBe(8)
  })
})

// ═══════════════════════════════════════════════════════════════
// QA TEST PLAN — loser penalties, nagari, poktan skip, session
// ═══════════════════════════════════════════════════════════════

// 6 safe pi cards (no brights) for the winning side so no penalties fire on them
const safeLoser = [c(3), c(4), c(7), c(8), c(11), c(12), c(41)] // 6pi + Nov bright

// AI wins with samgwang (Jan+Mar+Aug brights = 3pts) helper
// Player score (loser) = 2pts (playerScore=1 + go bonus=1), AI = 3pts → AI wins
const aiSamgwang = [c(1), c(9), c(29)] // Jan + Mar + Aug Bright = 삼광 = 3pts
const loserPiOnly = [c(3), c(4), c(7), c(8), c(11), c(12)] // 6 pi, no brights

// AI plays a Jan Ribbon to empty field (no match, goes to field, no score change)
// Player has no hand cards → game ends naturally when AI finishes turn
function makeAiLastTurnState(overrides: Partial<GameState> = {}) {
  return makeState({
    turn: 'ai' as const,
    playerHand: [],         // triggers gameOver via nextPlayerHand.length===0
    aiHand: [c(2)],         // Jan Ribbon — played last
    field: [c(5)],          // Feb Animal — no month match for Jan Ribbon
    drawPile: [],
    goCount: 1,             // non-zero → not nagari; also triggers go bak if player is loser
    playerScore: 1,         // isAI=true so rawPlayerPts=state.playerScore; finalise(1,1)=2
    aiCaptured: aiSamgwang, // calcScore(aiSamgwang)=3pts → AI wins (3 > 2)
    ...overrides,
  })
}

describe('QA: 고박 (go bak) — loser called GO', () => {
  it('winner score doubles when loser (player) had called GO', () => {
    const state = makeAiLastTurnState({
      playerCaptured: safeLoser, // 6pi + bright → only go bak fires (no gwang/pi bak)
    })
    const next = applyTurn(state, c(2), true, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).toBe('ai')
    expect(next.aiBreakdown.find(b => b.key === 'gobak')).toBeDefined()
  })

  it('no go bak when goCount is 0 (nagari)', () => {
    const state = makeAiLastTurnState({ goCount: 0 })
    const next = applyTurn(state, c(2), true, t)
    expect(next.isNagari).toBe(true)
    expect(next.aiBreakdown.find(b => b.key === 'gobak')).toBeUndefined()
  })
})

describe('QA: 광박 (gwang bak) — loser has no brights', () => {
  it('winner score doubles when winner has brights, loser has none', () => {
    // AI (winner) has samgwang; player (loser) has 6 pi but zero brights
    const state = makeAiLastTurnState({ playerCaptured: loserPiOnly })
    const next = applyTurn(state, c(2), true, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).toBe('ai')
    expect(next.aiBreakdown.find(b => b.key === 'gwangbak')).toBeDefined()
  })

  it('no gwang bak when loser holds a bright', () => {
    // Player (loser) has safeLoser which includes Nov Rain Bright
    const state = makeAiLastTurnState({ playerCaptured: safeLoser })
    const next = applyTurn(state, c(2), true, t)
    expect(next.aiBreakdown.find(b => b.key === 'gwangbak')).toBeUndefined()
  })
})

describe('QA: 피박 (pi bak) — loser has fewer than 6 pi', () => {
  // pi bak requires the WINNER to have scored from pi (10+ pi junk)
  // 12 junk cards = 3 pi points; with goCount=1 player finalises to 2pts → AI wins
  const aiPiWinner = [c(3), c(4), c(7), c(8), c(11), c(12), c(15), c(16), c(19), c(20), c(23), c(24)]

  it('winner score doubles when winner has pi scoring and loser pi count < 6', () => {
    // AI (winner) has 12 pi junk = 3pts; player (loser) has 3 pi → pi bak fires
    const state = makeAiLastTurnState({
      aiCaptured: aiPiWinner,
      playerCaptured: [c(25), c(26), c(27)], // 3 pi, no brights
    })
    const next = applyTurn(state, c(2), true, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).toBe('ai')
    expect(next.aiBreakdown.find(b => b.key === 'pibak')).toBeDefined()
  })

  it('no pi bak when winner has no pi scoring (brights only)', () => {
    // AI wins with samgwang (brights, no pi key) → pi bak does not fire
    const state = makeAiLastTurnState({ playerCaptured: safeLoser })
    const next = applyTurn(state, c(2), true, t)
    expect(next.aiBreakdown.find(b => b.key === 'pibak')).toBeUndefined()
  })
})

describe('QA: post-poktan skip (#8)', () => {
  it('applyPoktan sets poktanSkipsRemaining=2 for player poktan', () => {
    // Build a state where player has 3 January cards + field has 1
    const [h1, h2, h3, f1] = [c(1), c(2), c(3), c(4)]
    // Override months so they all share month 1
    const makeJan = (id: number) => ({ ...DECK.find(x => x.id === id)!, month: 1 })
    const jan1 = makeJan(1), jan2 = makeJan(2), jan3 = makeJan(3), jan4 = makeJan(4)
    const state = makeState({
      playerHand: [jan1, jan2, jan3],
      aiHand: [c(5)],
      field: [jan4],
      drawPile: [],
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
    })
    const next = applyPoktan(state, false, t)
    expect(next.poktanSkipsRemaining).toBe(2)
    expect(next.turn).toBe('ai')
  })

  it('applyPoktan does NOT set skip for AI poktan', () => {
    const makeJan = (id: number) => ({ ...DECK.find(x => x.id === id)!, month: 1 })
    const jan1 = makeJan(1), jan2 = makeJan(2), jan3 = makeJan(3), jan4 = makeJan(4)
    const state = makeState({
      turn: 'ai' as const,
      aiHand: [jan1, jan2, jan3],
      playerHand: [c(5)],
      field: [jan4],
      drawPile: [],
      pendingPoktan: { handCards: [jan1, jan2, jan3], fieldCard: jan4 },
      poktanSkipsRemaining: 0,
    })
    const next = applyPoktan(state, true, t)
    expect(next.poktanSkipsRemaining).toBe(0)
  })

  it('applyTurn keeps poktan skips banked when the player plays a real card', () => {
    const jan1 = c(1), mar9 = c(9)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [mar9],
      field: [],
      drawPile: [],
      poktanSkipsRemaining: 2,
    })
    const next = applyTurn(state, jan1, false, t)
    expect(next.poktanSkipsRemaining).toBe(2)
  })

  it('round continues after AI move when player hand is empty but skips and pile remain', () => {
    // Regression: skips used to burn on normal plays, ending the round with cards left
    const feb5 = c(5), mar9 = c(9)
    const state = makeState({
      playerHand: [],
      aiHand: [feb5, mar9],
      field: [],
      drawPile: [c(13), c(21), c(25)],
      poktanSkipsRemaining: 2,
      turn: 'ai' as const,
    })
    const next = applyTurn(state, feb5, true, t)
    expect(next.phase).toBe(GamePhase.SELECT)
    expect(next.turn).toBe('player')
    expect(next.poktanSkipsRemaining).toBe(2)
  })

  it('applyTurn does NOT decrement on AI turn', () => {
    const jan1 = c(1), mar9 = c(9)
    const state = makeState({
      playerHand: [mar9],
      aiHand: [jan1],
      field: [],
      drawPile: [],
      poktanSkipsRemaining: 2,
      turn: 'ai' as const,
    })
    const next = applyTurn(state, jan1, true, t)
    expect(next.poktanSkipsRemaining).toBe(2)
  })

  it('applySkipTurn draws from pile without consuming hand card and decrements skip', () => {
    const jan1 = c(1), feb5 = c(5)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [feb5],
      field: [],
      drawPile: [c(9)], // Mar Bright goes to field (no match)
      poktanSkipsRemaining: 1,
    })
    const next = applySkipTurn(state, t)
    expect(next.playerHand).toContainEqual(jan1) // hand card NOT played
    expect(next.poktanSkipsRemaining).toBe(0)
    expect(next.turn).toBe('ai')
    expect(next.field).toContainEqual(c(9)) // drawn card went to field
  })
})

describe('QA: nagari (#9)', () => {
  it('natural end with goCount=0 produces nagari (no winner)', () => {
    const jan1 = c(1)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [],
      field: [],
      drawPile: [],
      goCount: 0,
    })
    const next = applyTurn(state, jan1, false, t)
    expect(next.phase).toBe(GamePhase.GAME_OVER)
    expect(next.winner).toBeNull()
    expect(next.isNagari).toBe(true)
  })

  it('natural end with goCount>0 is NOT nagari', () => {
    const jan1 = c(1)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [],
      field: [],
      drawPile: [],
      goCount: 1,
      playerScore: 10,
      aiScore: 0,
      aiCaptured: safeLoser,
    })
    const next = applyTurn(state, jan1, false, t)
    expect(next.isNagari).toBe(false)
    expect(next.winner).not.toBeNull()
  })

  it('nagariMultiplier is applied to winner score when >1', () => {
    const jan1 = c(1)
    const state = makeState({
      playerHand: [jan1],
      aiHand: [],
      field: [],
      drawPile: [],
      goCount: 1,
      playerScore: 4,
      aiScore: 0,
      aiCaptured: safeLoser,
      nagariMultiplier: 2, // previous game was nagari
    })
    const next = applyTurn(state, jan1, false, t)
    expect(next.winner).toBe('player')
    // Score should be doubled by nagari multiplier
    expect(next.playerBreakdown.find(b => b.key === 'nagari_bonus')).toBeDefined()
    // Breakdown sum should equal total
    const total = next.playerBreakdown.reduce((s, b) => s + b.pts, 0)
    expect(total).toBe(next.playerScore)
  })
})

describe('GO/STOP keeps the turn with the player', () => {
  it('applyTurn reaching 7+ points sets phase GOSTOP with turn=player', () => {
    // Capturing Aug bird + Aug bright completes godori (5) and 삼광 (3) → 8 pts
    const state = makeState({
      playerHand: [c(30), c(3)],
      aiHand: [c(7), c(8)],
      field: [c(29)],
      drawPile: [c(11), c(12)],
      playerCaptured: [c(5), c(13), c(1), c(9)],
    })
    const next = applyTurn(state, c(30), false, t)
    expect(next.playerScore).toBeGreaterThanOrEqual(7)
    expect(next.phase).toBe(GamePhase.GOSTOP)
    expect(next.turn).toBe('player')
  })
})

describe('card data', () => {
  it('November (오동) has no animal card: 광, 피, 피, 쌍피', () => {
    const nov = DECK.filter(card => card.month === 11).map(card => card.type).sort()
    expect(nov).toEqual(['bright', 'double_junk', 'junk', 'junk'])
  })
})

describe('Poktan draws from the pile and both sides get bonus draws', () => {
  const jan = [c(1), c(2), c(3), c(4)]

  it('player poktan flips the top pile card', () => {
    const state = makeState({
      playerHand: [jan[0], jan[1], jan[2], c(9)],
      aiHand: [c(21)],
      field: [jan[3], c(10)],          // Mar ribbon on the field
      drawPile: [c(11), c(30)],        // Mar junk on top → captures the Mar ribbon
      pendingPoktan: { handCards: [jan[0], jan[1], jan[2]], fieldCard: jan[3] },
    })
    const next = applyPoktan(state, false, t)
    expect(next.drawPile).toEqual([c(30)])
    expect(next.playerCaptured).toContainEqual(c(11))
    expect(next.playerCaptured).toContainEqual(c(10))
    expect(next.poktanSkipsRemaining).toBe(2)
  })

  it('AI poktan grants the AI 2 bonus draws', () => {
    const state = makeState({
      aiHand: [jan[0], jan[1], jan[2]],
      playerHand: [c(9)],
      field: [jan[3]],
      drawPile: [c(13), c(21), c(25)],
      turn: 'ai',
      pendingPoktan: { handCards: [jan[0], jan[1], jan[2]], fieldCard: jan[3] },
    })
    const next = applyPoktan(state, true, t)
    expect(next.aiPoktanSkipsRemaining).toBe(2)
    expect(next.poktanSkipsRemaining).toBe(0)
    expect(next.phase).toBe(GamePhase.SELECT) // AI hand empty but it can still skip
  })

  it('AI skip turn draws a card and uses one AI skip', () => {
    const state = makeState({
      aiHand: [],
      playerHand: [c(9)],
      field: [c(14)],                  // Apr ribbon
      drawPile: [c(15), c(21)],        // Apr junk on top → AI captures the ribbon
      turn: 'ai',
      aiPoktanSkipsRemaining: 2,
    })
    const next = applySkipTurn(state, t, true)
    expect(next.aiCaptured).toEqual(expect.arrayContaining([c(14), c(15)]))
    expect(next.aiPoktanSkipsRemaining).toBe(1)
    expect(next.turn).toBe('player')
    expect(next.drawPile).toEqual([c(21)])
  })
})
