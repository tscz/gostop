import { CardType } from './cards'
import { cardValue } from './scoring'
import type { GameState } from './gameState'
import type { Card } from './cards'

// ═══════════════════════════════════════════════════════════════
// AI CARD SELECTION
// ═══════════════════════════════════════════════════════════════
export function selectAiCard(state: GameState): Card {
  let best: Card | null = null
  let bestScore = -Infinity

  for (const card of state.aiHand) {
    const m = state.field.filter(f => f.month === card.month)
    let s = cardValue(card) + (m.length > 0 ? 20 + Math.max(...m.map(cardValue)) : 0)
    if ([2, 4, 8].includes(card.month) && card.type === CardType.ANIMAL) s += 20
    if (s > bestScore) {
      bestScore = s
      best = card
    }
  }

  return best ?? state.aiHand[0]
}
