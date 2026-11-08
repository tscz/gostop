import { describe, it, expect } from 'vitest'
import { useGameStore } from '../store/gameStore'
import { GamePhase } from './gameState'
import { initState } from './rules'
import { calcScore } from './scoring'
import { seededRandom } from './deck'
import { card, dealFixed, rig, playToEnd, strategies, checkState } from '../test/simulate'
import type { GameState } from './gameState'

// Scripted rounds from a fixed deck (or a hand-built end position), each with
// an exact expected outcome. They pin down what each rule MEANS — the seeded
// simulation only checks that the engine is self-consistent.

const api = () => useGameStore.getState()
const st = () => useGameStore.getState().state
const capIds = (who: 'player' | 'ai') => (who === 'player' ? st().playerCaptured : st().aiCaptured).map(c => c.id).sort((a, b) => a - b)

/** Start from a hand-built position (cards listed by id). Scores follow the piles. */
function position(p: {
  player?: number[]; ai?: number[]; field?: number[]; pile?: number[]
  playerCaptured?: number[]; aiCaptured?: number[]
} & Partial<Omit<GameState, 'playerHand' | 'aiHand' | 'field' | 'drawPile' | 'playerCaptured' | 'aiCaptured'>>) {
  const { player = [], ai = [], field = [], pile = [], playerCaptured = [], aiCaptured = [], ...rest } = p
  const pc = playerCaptured.map(card)
  const ac = aiCaptured.map(card)
  const base = initState({ deck: rig({}) })
  useGameStore.setState({
    state: {
      ...base,
      playerHand: player.map(card), aiHand: ai.map(card), field: field.map(card), drawPile: pile.map(card),
      playerCaptured: pc, aiCaptured: ac,
      playerScore: calcScore(pc).points, playerBreakdown: calcScore(pc).breakdown,
      aiScore: calcScore(ac).points, aiBreakdown: calcScore(ac).breakdown,
      pendingPoktan: null, pendingShake: [],
      ...rest,
    },
    session: { round: 1, playerTotal: 0, aiTotal: 0, rounds: [], nagariMultiplier: rest.nagariMultiplier ?? 1 },
  })
}

describe('scenario: capturing', () => {
  it('two matches: you get the card you CHOSE, the other stays (regression)', () => {
    // Jan junk in hand; Jan bright + Jan ribbon on the field
    dealFixed(rig({ player: [3], field: [1, 2], pile: [13] }))
    api().playCard(card(3))
    expect(st().phase).toBe(GamePhase.CHOOSE_MATCH)
    api().chooseMatch(card(1))
    // (the drawn card may pair with filler on the field — only January matters here)
    expect(capIds('player').filter(id => id <= 4)).toEqual([1, 3])
    expect(st().field.map(c => c.id)).toContain(2)
    checkState(st(), 'choose')
  })

  it('따닥 Ttadak: choose one of two, the draw is the 4th → all four + steal', () => {
    dealFixed(rig({ player: [3], field: [1, 2], pile: [4] }))
    position({ ...snapshot(), aiCaptured: [7] }) // AI owns a junk to steal
    api().playCard(card(3))
    api().chooseMatch(card(2))
    expect(capIds('player')).toEqual([1, 2, 3, 4, 7])
    expect(capIds('ai')).toEqual([])
  })

  it('쪽 Chok: discard with no match, the draw pairs with it → both + steal', () => {
    position({ player: [3, 13], ai: [21, 25], field: [9], pile: [4, 33], aiCaptured: [8] })
    api().playCard(card(3))
    expect(capIds('player')).toEqual([3, 4, 8])
    expect(st().lastExp!.lines.some(l => l.includes('Chok'))).toBe(true)
  })

  it('hand card takes all three of its month from the field → all four + steal', () => {
    position({ player: [4, 13], ai: [21, 25], field: [1, 2, 3], pile: [33, 35], aiCaptured: [8] })
    api().playCard(card(4))
    expect(capIds('player')).toEqual([1, 2, 3, 4, 8])
  })

  it('stealing a junk re-scores the victim (regression)', () => {
    // AI sits on exactly 10 pi = 1 point; a Chok steals one → AI drops to 0
    const tenPi = [7, 8, 11, 12, 15, 16, 19, 20, 23, 24]
    position({ player: [3, 13], ai: [21, 25], field: [9], pile: [4, 33], aiCaptured: tenPi })
    expect(st().aiScore).toBe(1)
    api().playCard(card(3))
    expect(st().aiScore).toBe(0)
  })
})

describe('scenario: Poktan and Shake', () => {
  it('Poktan: 3 hand cards + field card, steal, one pile draw, 2 bonus draws', () => {
    position({ player: [1, 2, 3, 13, 21], ai: [25, 27, 29], field: [4, 9], pile: [10, 33, 35, 37], aiCaptured: [8] })
    useGameStore.setState({ state: { ...st(), pendingPoktan: { handCards: [card(1), card(2), card(3)], fieldCard: card(4) } } })
    api().declarePoktan()
    // 1–4 + stolen 8, and the drawn Mar ribbon (10) pairs with the Mar bright (9)
    expect(capIds('player')).toEqual([1, 2, 3, 4, 8, 9, 10])
    expect(st().drawPile).toHaveLength(3)
    expect(st().playerHand.map(c => c.id)).toEqual([13, 21])
    expect(st().poktanSkipsRemaining).toBe(2)
    expect(st().turn).toBe('ai')
  })

  it('a Poktan that reaches 7 points offers GO/STOP (regression)', () => {
    // Already holding 2 brights + 고도리 (5 pts); the Poktan adds the Jan bright → 삼광 (3) = 8
    position({
      player: [1, 2, 3, 21], ai: [25, 27], field: [4], pile: [33, 35],
      playerCaptured: [9, 29, 5, 13, 30],  // 2 brights + 고도리 (5)
      pendingPoktan: { handCards: [card(1), card(2), card(3)], fieldCard: card(4) },
    })
    api().declarePoktan()
    expect(st().playerScore).toBeGreaterThanOrEqual(7)
    expect(st().phase).toBe(GamePhase.GOSTOP)
    expect(st().turn).toBe('player')
  })

  it('Shake doubles the final score, and each month can be shaken only once (regression)', () => {
    // Three Octobers in hand, none on the field
    dealFixed(rig({ player: [37, 38, 39], field: [1], pile: [2, 13] }))
    expect(st().pendingShake.map(s => s.handCards[0].month)).toEqual([10])
    api().declareShake(st().pendingShake[0])
    expect(st().shakeCount).toBe(1)
    expect(st().pendingShake).toEqual([])
    // Play a non-October card; after the AI's turn October must not be offered again
    api().playCard(st().playerHand.find(c => c.month !== 10)!)
    if (st().turn === 'ai') api().playAiTurn()
    expect(st().pendingShake.some(s => s.handCards[0].month === 10)).toBe(false)

    // STOP at 8 after one shake → 16 (AI has a bright and 7 pi: no penalties)
    position({
      phase: GamePhase.GOSTOP, shakeCount: 1, shakenMonths: [10],
      playerCaptured: [1, 9, 29, 5, 13, 30],   // 삼광 (3) + 고도리 (5) = 8
      aiCaptured: [41, 7, 8, 11, 12, 15, 16],  // a bright + 7 pi
    })
    api().callStop()
    expect(st().winner).toBe('player')
    expect(st().playerScore).toBe(16) // 3 brights (3) + 고도리 (5) = 8, ×2 shake
  })
})

describe('scenario: GO / STOP and penalties', () => {
  const sevenPoints = [1, 9, 29, 5, 13, 30] // 삼광 3 + 고도리 5 = 8

  it('STOP without GO keeps the raw score', () => {
    position({ phase: GamePhase.GOSTOP, playerCaptured: sevenPoints, aiCaptured: [41, 7, 8, 11, 12, 15, 16] })
    api().callStop()
    expect(st().playerScore).toBe(8)
    expect(st().endReason).toBe('stop')
  })

  it('1 GO adds 1, 3 GOs double', () => {
    position({ phase: GamePhase.GOSTOP, goCount: 1, scoreAtLastGo: 7, playerCaptured: sevenPoints, aiCaptured: [41, 7, 8, 11, 12, 15, 16] })
    api().callStop()
    expect(st().playerScore).toBe(9)
    position({ phase: GamePhase.GOSTOP, goCount: 3, scoreAtLastGo: 7, playerCaptured: sevenPoints, aiCaptured: [41, 7, 8, 11, 12, 15, 16] })
    api().callStop()
    expect(st().playerScore).toBe(16)
  })

  it('광박: winner scored with brights, loser has none → ×2', () => {
    position({ phase: GamePhase.GOSTOP, playerCaptured: sevenPoints, aiCaptured: [7, 8, 11, 12, 15, 16] })
    api().callStop()
    expect(st().playerBreakdown.map(b => b.key)).toContain('gwangbak')
    expect(st().playerScore).toBe(16)
  })

  it('피박: winner scored with pi, loser has fewer than 6 → ×2', () => {
    const pi10 = [7, 8, 11, 12, 15, 16, 19, 20, 23, 24]
    position({ phase: GamePhase.GOSTOP, playerCaptured: [...pi10, 1, 9, 29, 5, 13, 30], aiCaptured: [41, 3, 4] })
    api().callStop()
    expect(st().playerBreakdown.map(b => b.key)).toContain('pibak')
    expect(st().playerScore).toBe(18) // 8 + 피 10 (1) = 9, ×2
  })

  it('고박: the AI wins after you called GO → the AI\'s score doubles', () => {
    // AI completes 삼광 (+ 고도리 already) with its last move and stops; you called GO once
    position({
      turn: 'ai', goCount: 1, scoreAtLastGo: 0,
      player: [36], ai: [29], field: [31], pile: [47],
      playerCaptured: [3, 41],                 // you hold a bright → no 광박
      aiCaptured: [1, 9, 5, 13, 30],           // 2 brights + 고도리 (5)
    })
    api().playAiTurn()
    expect(st().winner).toBe('ai')
    expect(st().endReason).toBe('aiStop')
    expect(st().aiBreakdown.map(b => b.key)).toContain('gobak')
    expect(st().aiScore).toBe(16) // 3 + 5 = 8, ×2 고박
  })
})

describe('scenario: round endings', () => {
  it('four of a month in the dealt hand is an instant win (5 points)', () => {
    dealFixed(rig({ player: [1, 2, 3, 4] }))
    expect(st().phase).toBe(GamePhase.GAME_OVER)
    expect(st().endReason).toBe('instant')
    expect(st().winner).toBe('player')
    expect(st().playerScore).toBe(5)
  })

  it('Nagari twice in a row: ×2, then ×4 on the next win', () => {
    const lastMoveNoPoints = () => position({
      player: [3], ai: [], field: [13], pile: [21],
      playerCaptured: [7], aiCaptured: [8],
      nagariMultiplier: useGameStore.getState().session.nagariMultiplier,
    })
    // round 1: nobody reaches 7 → Nagari
    lastMoveNoPoints()
    api().playCard(card(3))
    expect(st().isNagari).toBe(true)
    api().newGame()
    expect(useGameStore.getState().session.nagariMultiplier).toBe(2)
    expect(st().nagariMultiplier).toBe(2)
    // round 2: Nagari again → ×4
    const keep = useGameStore.getState().session
    lastMoveNoPoints()
    useGameStore.setState({ session: { ...keep } })
    useGameStore.setState({ state: { ...st(), nagariMultiplier: 2 } })
    api().playCard(card(3))
    expect(st().isNagari).toBe(true)
    api().newGame()
    expect(st().nagariMultiplier).toBe(4)
    // round 3: STOP at 8 → 32
    const session = useGameStore.getState().session
    position({ phase: GamePhase.GOSTOP, nagariMultiplier: 4, playerCaptured: [1, 9, 29, 5, 13, 30], aiCaptured: [41, 7, 8, 11, 12, 15, 16] })
    useGameStore.setState({ session })
    api().callStop()
    expect(st().playerScore).toBe(32)
    api().newGame()
    expect(useGameStore.getState().session.playerTotal).toBe(32)
    expect(useGameStore.getState().session.nagariMultiplier).toBe(1)
  })

  it('a rigged Poktan deal plays to the end with every rule holding', () => {
    // Player holds three Januaries, the fourth is on the field
    dealFixed(rig({ player: [1, 2, 3], field: [4] }))
    expect(st().pendingPoktan).not.toBeNull()
    const { final, actions } = playToEnd(strategies(seededRandom(5)).greedy, 'rigged poktan')
    expect(actions).toContain('poktan')
    expect(final.phase).toBe(GamePhase.GAME_OVER)
  })
})

// Current store position as `position()` input (used to tweak a dealt round)
function snapshot() {
  const s = st()
  return {
    player: s.playerHand.map(c => c.id), ai: s.aiHand.map(c => c.id),
    field: s.field.map(c => c.id), pile: s.drawPile.map(c => c.id),
  }
}
