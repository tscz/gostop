import { DECK } from './cards'
import type { Card } from './cards'

// ═══════════════════════════════════════════════════════════════
// SHUFFLE
// ═══════════════════════════════════════════════════════════════
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ═══════════════════════════════════════════════════════════════
// COUNT BY MONTH
// ═══════════════════════════════════════════════════════════════
export function countByMonth(cards: Card[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const c of cards) counts[c.month] = (counts[c.month] || 0) + 1
  return counts
}

// ═══════════════════════════════════════════════════════════════
// DEAL
// ═══════════════════════════════════════════════════════════════
export interface DealResult {
  playerHand: Card[]
  aiHand: Card[]
  field: Card[]
  drawPile: Card[]
  instantWin: 'player' | 'ai' | null
}

export function deal(): DealResult {
  for (let attempt = 0; attempt < 20; attempt++) {
    const deck = shuffle(DECK)
    // 2-player (Matgo) rules: 10 cards each, 8 on field, 20 draw pile
    const playerHand = deck.slice(0, 10)
    const aiHand = deck.slice(10, 20)
    const field = deck.slice(20, 28)
    const drawPile = deck.slice(28)

    // Rule: if 4 cards of same month on field → reshuffle
    const fieldCounts = countByMonth(field)
    if (Object.values(fieldCounts).some(v => v >= 4)) continue

    // Rule: if any player has all 4 cards of same month → instant win
    const playerCounts = countByMonth(playerHand)
    const aiCounts = countByMonth(aiHand)
    const playerBomb = Object.entries(playerCounts).find(([, v]) => v === 4)?.[0]
    const aiBomb = Object.entries(aiCounts).find(([, v]) => v === 4)?.[0]

    // Rule: if BOTH have a bomb simultaneously → reshuffle
    if (playerBomb && aiBomb) continue

    return {
      playerHand,
      aiHand,
      field,
      drawPile,
      instantWin: playerBomb ? 'player' : aiBomb ? 'ai' : null,
    }
  }
  // Fallback: accept whatever deck, still check rules
  const deck = shuffle(DECK)
  const playerHand = deck.slice(0, 10)
  const aiHand = deck.slice(10, 20)
  const playerCounts = countByMonth(playerHand)
  const aiCounts = countByMonth(aiHand)
  const playerBomb = Object.entries(playerCounts).find(([, v]) => v === 4)?.[0]
  const aiBomb = Object.entries(aiCounts).find(([, v]) => v === 4)?.[0]
  return {
    playerHand,
    aiHand,
    field: deck.slice(20, 28),
    drawPile: deck.slice(28),
    instantWin: playerBomb && !aiBomb ? 'player' : !playerBomb && aiBomb ? 'ai' : null,
  }
}
