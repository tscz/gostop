import { DECK } from './cards'
import type { Card } from './cards'

// ═══════════════════════════════════════════════════════════════
// RANDOMNESS — swappable so tests can replay a game from a seed
// ═══════════════════════════════════════════════════════════════
export type Rng = () => number

let rng: Rng = Math.random

/** Use a custom random source for shuffling (null restores Math.random). */
export function setRandom(fn: Rng | null): void {
  rng = fn ?? Math.random
}

/** Small, fast seeded PRNG (mulberry32) — same seed, same sequence. */
export function seededRandom(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ═══════════════════════════════════════════════════════════════
// SHUFFLE
// ═══════════════════════════════════════════════════════════════
export function shuffle<T>(arr: T[], random: Rng = rng): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
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

// Split a 48-card order into hands, field and pile:
// [0–9] player, [10–19] AI, [20–27] field, [28–47] pile (index 28 is drawn first)
function split(deck: Card[]): Omit<DealResult, 'instantWin'> {
  return {
    playerHand: deck.slice(0, 10),
    aiHand: deck.slice(10, 20),
    field: deck.slice(20, 28),
    drawPile: deck.slice(28),
  }
}

function bombOwner(playerHand: Card[], aiHand: Card[]): DealResult['instantWin'] {
  const p = Object.values(countByMonth(playerHand)).some(v => v === 4)
  const a = Object.values(countByMonth(aiHand)).some(v => v === 4)
  return p && !a ? 'player' : a && !p ? 'ai' : null
}

/**
 * Deal a round. Pass `order` (all 48 cards) to deal a fixed deck — used by
 * scripted tests; it skips the reshuffle rules but still detects instant wins.
 */
export function deal(order?: Card[]): DealResult {
  if (order) {
    if (order.length !== 48 || new Set(order.map(c => c.id)).size !== 48) {
      throw new Error('deal(order): need all 48 distinct cards')
    }
    const parts = split(order)
    return { ...parts, instantWin: bombOwner(parts.playerHand, parts.aiHand) }
  }
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
