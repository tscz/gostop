import { CardType } from './cards'
import { cardValue } from './scoring'
import type { GameState } from './gameState'
import type { Card } from './cards'

// Heuristic value of playing `card` onto `field`
function playValue(card: Card, field: Card[]): number {
  const m = field.filter(f => f.month === card.month)
  let s = cardValue(card) + (m.length > 0 ? 20 + Math.max(...m.map(cardValue)) : 0)
  if ([2, 4, 8].includes(card.month) && card.type === CardType.ANIMAL) s += 20
  return s
}

// ═══════════════════════════════════════════════════════════════
// AI CARD SELECTION
// ═══════════════════════════════════════════════════════════════
export function selectAiCard(state: GameState): Card {
  let best: Card | null = null
  let bestScore = -Infinity

  for (const card of state.aiHand) {
    const s = playValue(card, state.field)
    if (s > bestScore) {
      bestScore = s
      best = card
    }
  }

  return best ?? state.aiHand[0]
}

// ═══════════════════════════════════════════════════════════════
// PLAYER HINT — "what would a pro play?"
// Best capture first (by the value of the field card it takes);
// without any capture, discard the least valuable card.
// ═══════════════════════════════════════════════════════════════
export interface PlayerSuggestion {
  card: Card
  target: Card | null  // best field card captured, or null for a discard
}

export function suggestPlayerCard(state: GameState): PlayerSuggestion | null {
  const hand = state.playerHand
  if (!hand.length) return null

  let best: PlayerSuggestion | null = null
  let bestScore = -Infinity
  for (const card of hand) {
    const matches = state.field.filter(f => f.month === card.month)
    if (!matches.length) continue
    const target = matches.reduce((a, b) => (cardValue(b) > cardValue(a) ? b : a))
    const s = playValue(card, state.field)
    if (s > bestScore) {
      bestScore = s
      best = { card, target }
    }
  }
  if (best) return best

  const discard = hand.reduce((a, b) => (cardValue(b) < cardValue(a) ? b : a))
  return { card: discard, target: null }
}
