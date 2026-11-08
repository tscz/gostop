import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CardType } from '../core/cards'
import { comboProgress } from '../core/scoring'
import { breakdownLabel } from '../core/labels'
import type { Card } from '../core/cards'
import type { ScoreBreakdown } from '../core/gameState'
import CardSVG from './CardSVG'

interface PlayerSheetProps {
  label: string
  score: number
  breakdown: ScoreBreakdown[]
  captured: Card[]
  onClose: () => void
}

export const TYPE_GROUPS: Array<{ key: string; label: string; color: string; match: (c: Card) => boolean }> = [
  { key: 'bright', label: '광', color: '#f5d020', match: c => c.type === CardType.BRIGHT },
  { key: 'animal', label: '끗', color: '#22c55e', match: c => c.type === CardType.ANIMAL },
  { key: 'ribbon', label: '띠', color: '#60a5fa', match: c => c.type === CardType.RIBBON },
  { key: 'junk', label: '피', color: '#94a3b8', match: c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK },
]

// Bottom sheet rendered in a portal so parent opacity/overflow never clips or dims it
export default function PlayerSheet({ label, score, breakdown, captured, onClose }: PlayerSheetProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const progress = comboProgress(captured)

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-700/60 bg-slate-950 shadow-2xl text-white"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">{t('breakdown')}</p>
            <p className="font-bold text-base leading-tight">{label}</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-yellow-300 font-black text-2xl leading-none tabular-nums">{score}</p>
            <button
              onClick={onClose}
              aria-label={t('close')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-5">
          {/* Points */}
          <section>
            {breakdown.length === 0 ? (
              <p className="text-slate-500 text-sm italic">{t('noPoints')}</p>
            ) : (
              <div className="flex flex-col">
                {breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-200 text-sm">{b.emoji} {breakdownLabel(b, t)}</span>
                    <span className="text-yellow-400 font-black text-sm">+{b.pts}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Combo progress */}
          <section>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">{t('combos')}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {progress.map(p => (
                <div key={p.key} className="flex items-center gap-2 text-xs">
                  <span className={`w-14 ${p.done ? 'text-yellow-300 font-bold' : 'text-slate-300'}`}>{p.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.done ? 'bg-yellow-400' : 'bg-blue-400/70'}`}
                      style={{ width: `${Math.min(100, (p.have / p.need) * 100)}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-slate-400 w-10 text-right">{p.have}/{p.need}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Captured cards by type */}
          <section className="flex flex-col gap-3">
            <p className="text-white/40 text-[10px] uppercase tracking-widest">{t('captured')} ({captured.length})</p>
            {captured.length === 0 && <p className="text-slate-500 text-sm italic">{t('noCaptures')}</p>}
            {TYPE_GROUPS.map(g => {
              const cards = captured.filter(g.match)
              if (!cards.length) return null
              return (
                <div key={g.key} className="flex gap-2 items-start">
                  <span className="text-sm font-bold w-6 pt-1" style={{ color: g.color }}>{g.label}</span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {cards.map(c => <CardSVG key={c.id} card={c} size={40} />)}
                  </div>
                </div>
              )
            })}
          </section>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
