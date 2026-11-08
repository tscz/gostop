import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { comboProgress, piCount } from '../core/scoring'
import type { Card } from '../core/cards'
import type { ScoreBreakdown } from '../core/gameState'
import PlayerSheet, { TYPE_GROUPS } from './PlayerSheet'

interface PlayerStripProps {
  label: string
  score: number
  breakdown: ScoreBreakdown[]
  captured: Card[]
  accent: string
}

// Score + captures at a glance. Tapping opens the full breakdown sheet.
export function ScoreButton({ label, score, breakdown, captured, accent }: PlayerStripProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${score} ${t('pts')}. ${t('tapForDetails')}`}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/8 hover:bg-white/14 border border-white/10 flex-shrink-0"
      >
        <span className="text-white/50 text-xs">{t('score')}</span>
        <span className={`font-black text-lg leading-none tabular-nums ${accent}`}>{score}</span>
        <span className="text-white/30 text-[10px]">▸</span>
      </button>
      {open && (
        <PlayerSheet label={label} score={score} breakdown={breakdown} captured={captured} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

export function CaptureSummary({ label, score, breakdown, captured }: PlayerStripProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const counts = TYPE_GROUPS.map(g => ({
    ...g,
    n: g.key === 'junk' ? piCount(captured) : captured.filter(g.match).length,
  }))
  // The two named combos closest to scoring — 광/끗/띠/피 counts already have chips
  const progress = comboProgress(captured)
  const near = progress
    .filter(p => p.have >= 2 && !p.done && ['godori', 'hongdan', 'cheongdan', 'chodan'].includes(p.key))
    .sort((a, b) => b.have / b.need - a.have / a.need)
    .slice(0, 2)
  const pi = progress.find(p => p.key === 'pi')!

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`${label} — ${t('captured')}. ${t('tapForDetails')}`}
        className="flex items-center gap-1.5 flex-wrap text-[11px] leading-none text-left min-w-0"
      >
        {counts.map(c => (
          <span key={c.key} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 bg-white/5 border border-white/8 tabular-nums">
            <span style={{ color: c.color }} className="font-bold">{c.label}</span>
            {/* 피 shows progress to the first point (x/10) until it scores, then just the count */}
            <span className={c.key === 'junk' && c.n >= pi.need ? 'text-yellow-300 font-bold' : 'text-white/80'}>
              {c.key === 'junk' && c.n < pi.need ? `${c.n}/${pi.need}` : c.n}
            </span>
          </span>
        ))}
        {near.map(p => (
          <span key={p.key} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-200/90 tabular-nums">
            {p.label} {p.have}/{p.need}
          </span>
        ))}
      </button>
      {open && (
        <PlayerSheet label={label} score={score} breakdown={breakdown} captured={captured} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
