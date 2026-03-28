import { useTranslation } from 'react-i18next'
import type { MoveExplanation } from '../core/gameState'

interface ExplainerPanelProps {
  exp: MoveExplanation | null
}

export default function ExplainerPanel({ exp }: ExplainerPanelProps) {
  const { t } = useTranslation()

  if (!exp) {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/30 p-3 text-center">
        <p className="text-slate-600 text-sm">{t('selectHint')}</p>
      </div>
    )
  }

  const border: Record<string, string> = {
    excellent: 'border-yellow-500/50',
    good: 'border-emerald-500/50',
    ok: 'border-blue-500/40',
    poor: 'border-red-500/50',
    neutral: 'border-slate-600/40',
  }
  const bg: Record<string, string> = {
    excellent: 'bg-yellow-950/30',
    good: 'bg-emerald-950/30',
    ok: 'bg-blue-950/30',
    poor: 'bg-red-950/30',
    neutral: 'bg-slate-900/30',
  }

  return (
    <div
      className={`rounded-2xl border-2 ${border[exp.quality] || border.neutral} ${bg[exp.quality] || bg.neutral} p-3`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-white/40 text-[10px] uppercase tracking-widest">{t('moveExp')}</span>
        <span className="ml-auto text-xs">{exp.who === 'player' ? '👤' : '🤖'}</span>
      </div>
      {exp.lines.map((l, i) => (
        <p key={i} className="text-white text-sm leading-relaxed">
          {l}
        </p>
      ))}
    </div>
  )
}
