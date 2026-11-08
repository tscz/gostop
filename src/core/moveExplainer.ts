import { cardValue } from './scoring'
import { MONTHS } from './cards'
import type { Card, CardType } from './cards'
import type { ScoreBreakdown, MoveExplanation } from './gameState'

function typeName(type: CardType, t: (k: string) => string): string {
  const keys: Record<CardType, string> = {
    bright:      'typeBright',
    animal:      'typeAnimal',
    ribbon:      'typeRibbon',
    double_junk: 'typeDoubleJunk',
    junk:        'typeJunk',
  }
  return t(keys[type])
}

const GOSTOP_THRESHOLD = 7

function bestCard(cards: Card[]): Card {
  return cards.reduce((a, b) => (cardValue(b) > cardValue(a) ? b : a))
}

export interface BuildExplanationParams {
  played: Card
  handMatches: Card[]
  drawn: Card | undefined
  drawnMatches: Card[]
  prevPts: number
  newPts: number
  breakdown: ScoreBreakdown[]
  prevBreakdown: ScoreBreakdown[]
  special: string | null
  who: 'player' | 'ai'
  t: (key: string) => string
}

export function buildExplanation({
  played,
  handMatches,
  drawn,
  drawnMatches,
  prevPts,
  newPts,
  breakdown,
  prevBreakdown,
  special,
  who,
  t,
}: BuildExplanationParams): MoveExplanation {
  const lines: string[] = []
  let quality: MoveExplanation['quality'] = 'neutral'
  const isAI = who === 'ai'

  const monthName = MONTHS[played.month - 1].ko

  // ── Line 1: The play ─────────────────────────────────────────
  if (handMatches.length > 0) {
    const gain = cardValue(played) + handMatches.reduce((s, c) => s + cardValue(c), 0)
    quality = gain >= 50 ? 'excellent' : gain >= 20 ? 'good' : 'ok'
    // Describe the most valuable card taken (played or field), not just the played one
    const best = bestCard([played, ...handMatches])
    const bestType = typeName(best.type, t)

    if (isAI) {
      lines.push(t('coachAiCaptured').replace('{{month}}', monthName).replace('{{type}}', bestType))
    } else if (best.type === 'bright') {
      lines.push(t('coachYouCapturedBright').replace('{{month}}', monthName))
    } else {
      lines.push(t('coachYouCaptured').replace('{{month}}', monthName).replace('{{type}}', bestType))
    }
  } else {
    quality = 'poor'
    if (isAI) {
      lines.push(t('coachAiDiscarded').replace('{{month}}', monthName))
    } else {
      lines.push(t('coachYouDiscarded').replace('{{month}}', monthName))
    }
  }

  // ── Line 2: Drawn card ───────────────────────────────────────
  if (drawn) {
    const drawnMonth = MONTHS[drawn.month - 1].ko
    // On a capture, name the best of the drawn card and the field card it took
    const drawnType = typeName((drawnMatches.length === 1 ? bestCard([drawn, ...drawnMatches]) : drawn).type, t)

    if (special === 'ppeok') {
      lines.push(t('coachPpeok').replace('{{month}}', drawnMonth))
    } else if (drawnMatches.length > 0) {
      if (isAI) {
        lines.push(t('coachAiDrewMatch').replace('{{month}}', drawnMonth).replace('{{type}}', drawnType))
      } else {
        lines.push(t('coachDrewMatch').replace('{{month}}', drawnMonth).replace('{{type}}', drawnType))
        if (quality === 'ok') quality = 'good'
      }
    } else {
      if (isAI) {
        lines.push(t('coachAiDrewField').replace('{{month}}', drawnMonth))
      } else {
        lines.push(t('coachDrewField').replace('{{month}}', drawnMonth).replace('{{type}}', drawnType))
      }
    }
  }

  // ── Special moves ────────────────────────────────────────────
  if (special === 'chok') {
    lines.push(isAI ? t('coachAiChok') : t('coachChok'))
    if (quality === 'ok') quality = 'good'
  }
  if (special === 'ttadak') {
    lines.push(isAI ? t('coachAiTtadak') : t('coachTtadak'))
    quality = 'excellent'
  }
  if (special === 'sassak') {
    lines.push(isAI ? t('coachAiSassak') : t('coachSassak'))
    quality = 'excellent'
  }

  // ── Score line ───────────────────────────────────────────────
  const delta = newPts - prevPts
  if (delta > 0) {
    if (isAI) {
      lines.push(t('coachAiScore').replace('{{delta}}', String(delta)).replace('{{total}}', String(newPts)))
    } else if (newPts >= GOSTOP_THRESHOLD) {
      lines.push(t('coachScoreCanStop').replace('{{delta}}', String(delta)).replace('{{total}}', String(newPts)))
    } else {
      const rem = GOSTOP_THRESHOLD - newPts
      lines.push(
        t('coachScoreProgress')
          .replace('{{delta}}', String(delta))
          .replace('{{total}}', String(newPts))
          .replace('{{rem}}', String(rem)),
      )
    }
  }

  // ── New scoring categories ───────────────────────────────────
  const prevKeys = new Set((prevBreakdown || []).map(b => b.key))
  for (const b of breakdown) {
    if (!prevKeys.has(b.key)) {
      lines.push(
        t('coachNewCategory')
          .replace('{{emoji}}', b.emoji)
          .replace('{{label}}', b.label)
          .replace('{{pts}}', String(b.pts)),
      )
      quality = 'excellent'
    }
  }

  return { lines, quality, delta, newPts, who }
}
