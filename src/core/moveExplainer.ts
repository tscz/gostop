import { cardValue } from './scoring'
import { MONTHS } from './cards'
import type { Card } from './cards'
import type { ScoreBreakdown, MoveExplanation } from './gameState'

const GOSTOP_THRESHOLD = 7

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
  // i18next t() function
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
  t,
}: BuildExplanationParams): Omit<MoveExplanation, 'who'> {
  const lines: string[] = []
  let quality: MoveExplanation['quality'] = 'neutral'

  if (handMatches.length > 0) {
    const gain = cardValue(played) + handMatches.reduce((s, c) => s + cardValue(c), 0)
    quality = gain >= 50 ? 'excellent' : gain >= 20 ? 'good' : 'ok'
    lines.push(`✅ ${t('captured')}: ${MONTHS[played.month - 1].ko} (${handMatches.length} ${t('matchFound')})`)
  } else {
    quality = 'poor'
    lines.push(`⚠️ ${t('noMatch')} — ${t('cardDiscarded')}`)
  }

  if (drawn) {
    if (special === 'ppeok') {
      // ppeok: drawn card stays on field with 2 others — nothing captured
      lines.push(`🔒 뻑 Ppeok! ${drawn.month}월 → ${t('ppeokDesc')}`)
      quality = 'ok'
    } else if (drawnMatches.length > 0) {
      lines.push(`🎴 ${t('drew')} ${drawn.month}월 → ${t('capturedDraw')}!`)
    } else {
      lines.push(`🎴 ${t('drew')} ${drawn.month}월 → ${t('addedToField')}`)
    }
  }

  if (special === 'chok')   { lines.push(`⚡ 촉 Chok! ${t('chokDesc')}`);     quality = 'good' }
  if (special === 'ttadak') { lines.push(`💥 따닥 Ttadak! ${t('ttadakDesc')}`); quality = 'excellent' }
  if (special === 'poktan') { lines.push(`💣 폭탄 Poktan! ${t('poktanDesc')}`); quality = 'excellent' }

  const delta = newPts - prevPts
  if (delta > 0) lines.push(`🎉 +${delta} ${t('pts')}! (${t('total')}: ${newPts})`)

  const prevKeys = new Set((prevBreakdown || []).map(b => b.key))
  for (const b of breakdown) {
    if (!prevKeys.has(b.key)) {
      lines.push(`🏆 ${b.emoji} ${b.label} +${b.pts}${t('pts')}`)
      quality = 'excellent'
    }
  }
  if (newPts >= GOSTOP_THRESHOLD && prevPts < GOSTOP_THRESHOLD) lines.push(`⚡ ${t('canGoStop')}`)

  const tips: Record<string, string> = {
    excellent: t('tipExcellent'),
    good: t('tipGood'),
    ok: t('tipOk'),
    poor: t('tipPoor'),
    neutral: '',
  }
  if (tips[quality]) lines.push(`💡 ${tips[quality]}`)

  return { lines, quality, delta, newPts }
}
