import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScoreBreakdown } from '../core/gameState'
import CardSVG from './CardSVG'

interface ScoreDetailModalProps {
  score: number
  breakdown: ScoreBreakdown[]
  label: string
  onClose: () => void
}

export default function ScoreDetailModal({ score, breakdown, label, onClose }: ScoreDetailModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/60 bg-slate-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950 rounded-t-3xl">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">{t('breakdown')}</p>
            <p className="text-white font-bold text-lg leading-tight">{label}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white/40 text-[10px] uppercase tracking-widest">{t('total')}</p>
              <p className="text-yellow-300 font-black text-2xl leading-none">{score}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-6">
          {breakdown.length === 0 ? (
            <p className="text-slate-600 italic text-sm text-center py-8">{t('noPoints')}</p>
          ) : (
            breakdown.map((b, i) => (
              <div key={i} className="flex flex-col gap-3">
                {/* Row header */}
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">
                    {b.emoji} {b.label}
                  </span>
                  <span className="text-yellow-400 font-black text-base">+{b.pts}</span>
                </div>

                {/* Cards */}
                {b.cards && b.cards.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {b.cards.map(c => (
                      <CardSVG key={c.id} card={c} size={72} />
                    ))}
                  </div>
                )}

                {/* Divider */}
                {i < breakdown.length - 1 && (
                  <div className="border-b border-slate-800/70 mt-1" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
