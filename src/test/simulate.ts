// Test kit: drive complete rounds through the real store and check the rules
// after every single action. Used by simulation.test.ts and scenarios.test.ts.
import { useGameStore } from '../store/gameStore'
import { GamePhase } from '../core/gameState'
import { DECK, MONTHS } from '../core/cards'
import { calcScore, cardValue } from '../core/scoring'
import { suggestPlayerCard } from '../core/ai'
import { initState } from '../core/rules'
import { seededRandom, setRandom, countByMonth } from '../core/deck'
import type { GameState } from '../core/gameState'
import type { Card } from '../core/cards'
import type { Rng } from '../core/deck'

export const card = (id: number): Card => DECK.find(c => c.id === id)!
const store = () => useGameStore.getState()
const isJunk = (c: Card) => c.type === 'junk' || c.type === 'double_junk'
const ids = (cs: Card[]) => cs.map(c => c.id)
const minus = (a: Card[], b: Card[]) => a.filter(x => !b.some(y => y.id === x.id))

// ── Player strategies ─────────────────────────────────────────────────────────
export interface Decision {
  card: (s: GameState) => Card
  choose: (s: GameState) => Card
  goOrStop: (s: GameState) => 'go' | 'stop'
  shake: (s: GameState) => boolean
  poktan: (s: GameState) => boolean
  skipEarly: (s: GameState) => boolean   // use a bonus draw while still holding cards
}

export function strategies(rnd: Rng): Record<string, Decision> {
  const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const best = (s: GameState) => suggestPlayerCard(s)!.card
  return {
    // Every legal choice at random — explores odd paths (early skips, random GO)
    random: {
      card: s => pick(s.playerHand),
      choose: s => pick(s.pendingChoose!.matches),
      goOrStop: () => (rnd() < 0.5 ? 'go' : 'stop'),
      shake: () => rnd() < 0.5,
      poktan: () => rnd() < 0.5,
      skipEarly: () => rnd() < 0.3,
    },
    // Hint-style play, takes every bonus, stops at once
    greedy: {
      card: best,
      choose: s => s.pendingChoose!.matches.reduce((a, b) => (cardValue(b) > cardValue(a) ? b : a)),
      goOrStop: () => 'stop',
      shake: () => true,
      poktan: () => true,
      skipEarly: () => false,
    },
    // Keeps calling GO (up to 4×) to exercise GO bonuses and 고박
    goHappy: {
      card: best,
      choose: s => s.pendingChoose!.matches[0],
      goOrStop: s => (s.goCount < 4 ? 'go' : 'stop'),
      shake: () => true,
      poktan: () => true,
      skipEarly: () => false,
    },
    // Weakest card first, declines every bonus
    passive: {
      card: s => s.playerHand.reduce((a, b) => (cardValue(b) < cardValue(a) ? b : a)),
      choose: s => s.pendingChoose!.matches[1],
      goOrStop: () => 'stop',
      shake: () => false,
      poktan: () => false,
      skipEarly: () => false,
    },
  }
}

// ── Invariants checked after every action ─────────────────────────────────────
type Action = 'play' | 'choose' | 'poktan' | 'shake' | 'skip' | 'go' | 'stop' | 'ai'

export class RuleViolation extends Error {}

function fail(msg: string, ctx: string): never {
  throw new RuleViolation(`${msg}\n  at ${ctx}`)
}

function allCards(s: GameState): Card[] {
  return [
    ...s.playerHand, ...s.aiHand, ...s.field, ...s.drawPile,
    ...s.playerCaptured, ...s.aiCaptured,
    ...(s.pendingChoose ? [s.pendingChoose.played] : []),
  ]
}

export function checkState(s: GameState, ctx: string): void {
  // 48 cards, each exactly once
  const all = ids(allCards(s))
  if (all.length !== 48 || new Set(all).size !== 48) {
    fail(`card count ${all.length}, distinct ${new Set(all).size} (expected 48)`, ctx)
  }
  // A month can never have all 4 cards on the field (the 4th always captures)
  for (const [m, n] of Object.entries(countByMonth(s.field))) {
    if (n > 3) fail(`${n} cards of month ${m} on the field`, ctx)
  }
  if (s.poktanSkipsRemaining < 0 || s.aiPoktanSkipsRemaining < 0) fail('negative skip counter', ctx)
  if (s.phase === GamePhase.GOSTOP && s.turn !== 'player') fail('GO/STOP decision but turn is not the player', ctx)

  if (s.phase !== GamePhase.GAME_OVER) {
    // Live scores always equal the captured piles' value
    const p = calcScore(s.playerCaptured).points
    const a = calcScore(s.aiCaptured).points
    if (s.playerScore !== p) fail(`player score ${s.playerScore} ≠ captured value ${p}`, ctx)
    if (s.aiScore !== a) fail(`AI score ${s.aiScore} ≠ captured value ${a}`, ctx)
    // Offered specials must be real
    if (s.pendingPoktan) {
      const pk = s.pendingPoktan
      const hand = s.turn === 'player' ? s.playerHand : s.aiHand
      const m = pk.handCards[0].month
      if (pk.handCards.length !== 3 || pk.handCards.some(c => c.month !== m || !hand.some(h => h.id === c.id))) {
        fail('pendingPoktan does not match 3 hand cards of one month', ctx)
      }
      if (pk.fieldCard.month !== m || !s.field.some(f => f.id === pk.fieldCard.id)) fail('pendingPoktan field card missing', ctx)
    }
    if (s.shakeCount !== s.shakenMonths.length || new Set(s.shakenMonths).size !== s.shakenMonths.length) {
      fail(`shakeCount ${s.shakeCount} but shaken months [${s.shakenMonths}]`, ctx)
    }
    for (const sh of s.pendingShake) {
      const m = sh.handCards[0].month
      if (s.shakenMonths.includes(m)) fail(`month ${m} offered for a second shake`, ctx)
      if (sh.handCards.some(c => c.month !== m || !s.playerHand.some(h => h.id === c.id))) fail('pendingShake cards not in hand', ctx)
      if (s.field.some(f => f.month === m)) fail('pendingShake offered while that month is on the field', ctx)
    }
    if (s.phase === GamePhase.CHOOSE_MATCH) {
      const pc = s.pendingChoose
      if (!pc || pc.matches.length !== 2 || pc.matches.some(m => m.month !== pc.played.month || !s.field.some(f => f.id === m.id))) {
        fail('CHOOSE_MATCH without two same-month field cards', ctx)
      }
    }
  } else {
    // Final scores equal their itemised breakdown
    for (const [who, score, bd] of [['player', s.playerScore, s.playerBreakdown], ['ai', s.aiScore, s.aiBreakdown]] as const) {
      const sum = bd.reduce((t, b) => t + b.pts, 0)
      if (score !== sum) fail(`${who} final score ${score} ≠ breakdown sum ${sum}`, ctx)
    }
    if (s.isNagari && s.winner !== null) fail('nagari with a winner', ctx)
    if (s.winner === 'player' && !(s.playerScore > s.aiScore)) fail('player wins without the higher score', ctx)
    if (s.winner === 'ai' && !(s.aiScore > s.playerScore)) fail('AI wins without the higher score', ctx)
    if (s.endReason === 'natural') {
      // Every turn was used: both hands and the pile are empty
      if (s.playerHand.length || s.aiHand.length || s.drawPile.length) {
        fail(`natural end with cards left (player ${s.playerHand.length}, AI ${s.aiHand.length}, pile ${s.drawPile.length})`, ctx)
      }
      const nagari = s.goCount === 0 && s.playerScore < 7 && s.aiScore < 7
      if (nagari !== s.isNagari) fail(`isNagari=${s.isNagari} but scores ${s.playerScore}:${s.aiScore}, GO ${s.goCount}`, ctx)
    }
  }
}

export function checkTransition(prev: GameState, next: GameState, action: Action, ctx: string): void {
  checkState(next, ctx)
  if (prev.phase === GamePhase.GAME_OVER) fail('action after game over', ctx)

  const moverIsAI = action === 'ai'
  const moved = ['play', 'choose', 'poktan', 'skip', 'ai'].includes(action) && next.phase !== GamePhase.CHOOSE_MATCH
  // Captures: mover never loses cards; the opponent only loses stolen junk;
  // every other newly captured card has a same-month partner.
  const [mPrev, mNext, oPrev, oNext] = moverIsAI
    ? [prev.aiCaptured, next.aiCaptured, prev.playerCaptured, next.playerCaptured]
    : [prev.playerCaptured, next.playerCaptured, prev.aiCaptured, next.aiCaptured]
  if (minus(mPrev, mNext).length) fail('mover lost captured cards', ctx)
  if (moved) {
    const stolen = minus(oPrev, oNext)
    const gained = minus(mNext, mPrev)
    if (minus(oNext, oPrev).length) fail('opponent gained captured cards on the mover\'s turn', ctx)
    if (stolen.some(c => !isJunk(c))) fail('stole a non-junk card', ctx)
    if (minus(stolen, gained).length) fail('stolen card went missing', ctx)
    if (stolen.length > 2) fail(`stole ${stolen.length} cards in one move`, ctx)
    const won = minus(gained, stolen)
    for (const c of won) {
      if (won.filter(o => o.month === c.month).length < 2) fail(`captured ${MONTHS[c.month - 1].ko} (${c.id}) without a same-month partner`, ctx)
    }
    // Exactly one pile card per move (if any were left)
    const drew = prev.drawPile.length - next.drawPile.length
    if (drew !== Math.min(1, prev.drawPile.length)) fail(`move drew ${drew} cards`, ctx)
    // Hand cards used: 1 for a play, 3 for a Poktan, 0 for a skip
    const handPrev = moverIsAI ? prev.aiHand.length : prev.playerHand.length + (prev.pendingChoose ? 1 : 0)
    const handNext = moverIsAI ? next.aiHand.length : next.playerHand.length
    const used = handPrev - handNext
    const expected = action === 'poktan' || (moverIsAI && prev.pendingPoktan) ? 3
      : action === 'skip' || (moverIsAI && prev.aiHand.length === 0) ? 0 : 1
    if (used !== expected) fail(`${action} used ${used} hand cards, expected ${expected}`, ctx)
    if (next.history.length !== prev.history.length + 1) fail('move did not add exactly one history entry', ctx)
    if (next.phase !== GamePhase.GAME_OVER) {
      const expectTurn = moverIsAI || next.phase === GamePhase.GOSTOP ? 'player' : 'ai'
      if (next.turn !== expectTurn) fail(`turn is ${next.turn} after ${action}, expected ${expectTurn}`, ctx)
    }
    // GO/STOP is offered exactly when the player reached 7 (and gained since the last GO)
    if (!moverIsAI && next.phase !== GamePhase.GAME_OVER) {
      const due = next.playerScore >= 7 && (next.goCount === 0 || next.playerScore > next.scoreAtLastGo)
      if (due !== (next.phase === GamePhase.GOSTOP)) fail(`GO/STOP offered=${next.phase === GamePhase.GOSTOP}, due=${due} at ${next.playerScore} pts`, ctx)
    }
  }
  if (action === 'shake') {
    if (next.shakeCount !== prev.shakeCount + 1) fail('shake did not count', ctx)
    if (ids(next.playerHand).join() !== ids(prev.playerHand).join() || next.turn !== 'player') fail('shake changed hand or turn', ctx)
  }
  if (action === 'go' && (next.goCount !== prev.goCount + 1 || next.turn !== 'ai')) fail('GO did not count or pass the turn', ctx)
}

// ── Round driver ──────────────────────────────────────────────────────────────
export interface RoundLog {
  final: GameState
  actions: Action[]
}

/** Play the current store round to the end, checking every action. */
export function playToEnd(d: Decision, ctx: string, maxActions = 120): RoundLog {
  const actions: Action[] = []
  checkState(store().state, `${ctx} deal`)
  for (let i = 0; i < maxActions; i++) {
    const s = store().state
    if (s.phase === GamePhase.GAME_OVER) return { final: s, actions }
    let action: Action
    const api = store()
    if (s.phase === GamePhase.GOSTOP) {
      action = d.goOrStop(s)
      action === 'go' ? api.callGo() : api.callStop()
    } else if (s.phase === GamePhase.CHOOSE_MATCH) {
      action = 'choose'; api.chooseMatch(d.choose(s))
    } else if (s.turn === 'ai') {
      action = 'ai'; api.playAiTurn()
    } else if (s.pendingShake.length && d.shake(s)) {
      action = 'shake'; api.declareShake(s.pendingShake[0])
    } else if (s.pendingPoktan && d.poktan(s)) {
      action = 'poktan'; api.declarePoktan()
    } else if (s.poktanSkipsRemaining > 0 && (!s.playerHand.length || d.skipEarly(s))) {
      action = 'skip'; api.skipHandCard()
    } else {
      action = 'play'; api.playCard(d.card(s))
    }
    const next = store().state
    if (next === s) fail(`${action} was ignored by the store`, `${ctx} #${i}`)
    actions.push(action)
    checkTransition(s, next, action, `${ctx} #${i} ${action}`)
  }
  fail(`round did not finish within ${maxActions} actions`, ctx)
}

/** Start a fresh session dealt from `seed`. */
export function dealSeeded(seed: number): void {
  setRandom(seededRandom(seed))
  store().endSession()
}

/** Start a session from a fixed deck order. */
export function dealFixed(deck: Card[], nagariMultiplier = 1): void {
  useGameStore.setState({
    state: initState({ deck, nagariMultiplier }),
    session: { round: 1, playerTotal: 0, aiTotal: 0, rounds: [], nagariMultiplier },
  })
}

/**
 * Build a full deck order from the cards a scenario cares about. Unlisted
 * slots are filled round-robin across months the scenario doesn't use, so the
 * filler doesn't create accidental matches.
 */
export function rig(spec: { player?: number[]; ai?: number[]; field?: number[]; pile?: number[] }): Card[] {
  const used = new Set([...(spec.player ?? []), ...(spec.ai ?? []), ...(spec.field ?? []), ...(spec.pile ?? [])])
  const months = new Set([...used].map(id => card(id).month))
  const rest = DECK.filter(c => !used.has(c.id))
  // round-robin: unused months first, one card per month per pass
  const byMonth = new Map<number, Card[]>()
  for (const c of rest) byMonth.set(c.month, [...(byMonth.get(c.month) ?? []), c])
  const order = [...byMonth.keys()].sort((a, b) => Number(months.has(a)) - Number(months.has(b)) || a - b)
  const filler: Card[] = []
  for (let pass = 0; filler.length < rest.length; pass++) {
    for (const m of order) { const c = byMonth.get(m)![pass]; if (c) filler.push(c) }
  }
  const take = (ids: number[] = [], n: number) => {
    const out = ids.map(card)
    while (out.length < n) out.push(filler.shift()!)
    return out
  }
  const player = take(spec.player, 10)
  const ai = take(spec.ai, 10)
  const field = take(spec.field, 8)
  const pile = take(spec.pile, 20)
  return [...player, ...ai, ...field, ...pile]
}
