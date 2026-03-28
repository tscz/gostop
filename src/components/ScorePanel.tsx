import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScoreBreakdown } from '../core/gameState'
import ScoreDetailModal from './ScoreDetailModal'

interface ScorePanelProps {
  score: number
  breakdown: ScoreBreakdown[]
  label: string
  accent: string
}

export default function ScorePanel({ score, breakdown, label, accent }: ScorePanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/8 hover:bg-white/14 transition-all border border-white/10"
        >
          <span className="text-white/50 text-xs">{label}</span>
          <span className={`font-black text-lg leading-none ${accent}`}>{score}</span>
          <span className="text-white/30 text-[10px]">▾</span>
        </button>

        {open && (
          <div className="absolute top-10 right-0 z-50 w-60 rounded-2xl bg-slate-950/95 border border-slate-700/60 p-3 shadow-2xl backdrop-blur">
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">{t('breakdown')}</p>
            {breakdown.length === 0 ? (
              <p className="text-slate-600 text-xs italic">{t('noPoints')}</p>
            ) : (
              breakdown.map((b, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0"
                >
                  <span className="text-slate-300 text-xs">
                    {b.emoji} {b.label}
                  </span>
                  <span className="text-yellow-400 font-black text-xs">+{b.pts}</span>
                </div>
              ))
            )}
            <div className="mt-2 pt-2 border-t border-slate-700/60 flex justify-between items-center">
              <span className="text-white/60 text-xs">{t('total')}</span>
              <span className="text-yellow-300 font-black">{score}</span>
            </div>
            {breakdown.length > 0 && (
              <button
                onClick={() => { setOpen(false); setModal(true) }}
                className="mt-2 w-full text-center text-xs text-blue-400 hover:text-blue-300 py-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                {t('showDetails')} →
              </button>
            )}
          </div>
        )}
      </div>

      {modal && (
        <ScoreDetailModal
          score={score}
          breakdown={breakdown}
          label={label}
          onClose={() => setModal(false)}
        />
      )}
    </>
  )
}
