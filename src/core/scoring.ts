import { CardType } from './cards'
import type { Card } from './cards'
import type { ScoreBreakdown } from './gameState'

// ═══════════════════════════════════════════════════════════════
// CALC SCORE
// ═══════════════════════════════════════════════════════════════
export interface ScoreResult {
  points: number
  breakdown: ScoreBreakdown[]
}

export function calcScore(captured: Card[]): ScoreResult {
  const brights = captured.filter(c => c.type === CardType.BRIGHT)
  const animals = captured.filter(c => c.type === CardType.ANIMAL && !c.countsAsDoublePi)
  const ribbons = captured.filter(c => c.type === CardType.RIBBON && c.month !== 12)
  const piCount = captured.reduce((s, c) => {
    if (c.type === CardType.DOUBLE_JUNK || c.countsAsDoublePi) return s + 2
    if (c.type === CardType.JUNK) return s + 1
    return s
  }, 0)

  let points = 0
  const breakdown: ScoreBreakdown[] = []

  // Gwang
  const hasRain = brights.some(c => c.month === 12)
  if (brights.length === 5) {
    points += 15
    breakdown.push({ key: 'ogwang', emoji: '🌟', label: '오광 Five Brights', pts: 15, cards: brights })
  } else if (brights.length === 4) {
    points += 4
    breakdown.push({ key: 'sagwang', emoji: '✨', label: '사광 Four Brights', pts: 4, cards: brights })
  } else if (brights.length === 3) {
    if (hasRain) {
      points += 2
      breakdown.push({ key: 'bisamgwang', emoji: '🌧️', label: '비삼광 Wet 3 Brights', pts: 2, cards: brights })
    } else {
      points += 3
      breakdown.push({ key: 'samgwang', emoji: '💫', label: '삼광 Three Brights', pts: 3, cards: brights })
    }
  }

  // Godori
  const godori = captured.filter(c => [2, 4, 8].includes(c.month) && c.type === CardType.ANIMAL)
  if (godori.length === 3) {
    points += 5
    breakdown.push({ key: 'godori', emoji: '🐦', label: '고도리 Five Birds', pts: 5, cards: godori })
  }

  // Ribbons
  const poetry = ribbons.filter(c => c.ribbonType === 'poetry')
  const plain = ribbons.filter(c => c.ribbonType === 'plain')
  const blue = ribbons.filter(c => c.ribbonType === 'blue')
  if (poetry.length === 3) {
    points += 3
    breakdown.push({ key: 'hongdan', emoji: '📜', label: '홍단 Poetry Ribbons', pts: 3, cards: poetry })
  }
  if (plain.length === 3) {
    points += 3
    breakdown.push({ key: 'chodan', emoji: '🎗️', label: '초단 Plain Ribbons', pts: 3, cards: plain })
  }
  if (blue.length === 3) {
    points += 3
    breakdown.push({ key: 'cheongdan', emoji: '💙', label: '청단 Blue Ribbons', pts: 3, cards: blue })
  }
  if (ribbons.length >= 5) {
    const b = ribbons.length - 4
    points += b
    breakdown.push({ key: 'tti', emoji: '🎀', label: `띠 ${ribbons.length} Ribbons`, pts: b, cards: ribbons })
  }

  // Animals
  if (animals.length >= 5) {
    const b = animals.length - 4
    points += b
    breakdown.push({ key: 'kkeus', emoji: '🦋', label: `끗 ${animals.length} Animals`, pts: b, cards: animals })
  }

  // Pi
  const piCards = captured.filter(
    c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK || c.countsAsDoublePi,
  )
  if (piCount >= 10) {
    const b = piCount - 9
    points += b
    breakdown.push({ key: 'pi', emoji: '🃏', label: `피 ${piCount} Junk`, pts: b, cards: piCards })
  }

  return { points, breakdown }
}

// ═══════════════════════════════════════════════════════════════
// CARD VALUE (for AI scoring)
// ═══════════════════════════════════════════════════════════════
export function cardValue(card: Card | null | undefined): number {
  if (!card) return 0
  if (card.type === CardType.BRIGHT) return 50
  if (card.type === CardType.ANIMAL) return card.countsAsDoublePi ? 14 : 25
  if (card.type === CardType.RIBBON) return 14
  if (card.type === CardType.DOUBLE_JUNK) return 4
  return 1
}

// ═══════════════════════════════════════════════════════════════
// GO MULTIPLIER — official rules
// 1 GO  → +1 bonus point
// 2 GOs → +2 bonus points
// 3 GOs → score × 2
// 4 GOs → score × 2 × 3  (= ×6)
// 5 GOs → score × 2 × 3 × 4  (= ×24)  etc.
// ═══════════════════════════════════════════════════════════════
export function applyGoMultiplier(rawScore: number, goCount: number): number {
  if (goCount === 0) return rawScore
  if (goCount === 1) return rawScore + 1
  if (goCount === 2) return rawScore + 2
  // 3rd GO doubles, each subsequent GO multiplies by one more integer
  let score = rawScore * 2
  for (let i = 4; i <= goCount; i++) score *= i - 1
  return score
}
