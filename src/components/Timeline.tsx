import { useState } from 'react'
import type { MoveExplanation } from '../core/gameState'

interface TimelineProps {
  history: MoveExplanation[]
}

export default function Timeline({ history }: TimelineProps) {
  if (!history.length) return null

  const colors: Record<string, string> = {
    excellent: '#f59e0b',
    good: '#22c55e',
    ok: '#60a5fa',
    poor: '#ef4444',
    neutral: '#64748b',
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {history.map((h, i) => (
        <Dot key={i} h={h} color={colors[h.quality] || '#666'} index={i} total={history.length} />
      ))}
    </div>
  )
}

function Dot({ h, color, index, total }: { h: MoveExplanation; color: string; index: number; total: number }) {
  const [visible, setVisible] = useState(false)

  // Flip tooltip to left side when near right edge
  const alignRight = index >= total - 3

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <div
        style={{ background: color }}
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black cursor-pointer shadow-sm select-none"
      >
        {h.who === 'player' ? 'P' : 'A'}
      </div>

      {visible && h.lines?.length > 0 && (
        <div
          className={`absolute bottom-7 z-50 w-56 rounded-xl bg-slate-900 border border-slate-700/60 p-2.5 shadow-2xl pointer-events-none ${alignRight ? 'right-0' : 'left-0'}`}
        >
          {h.lines.map((line, j) => (
            <p key={j} className="text-white text-xs leading-snug">{line}</p>
          ))}
          {/* Arrow */}
          <div
            className={`absolute top-full ${alignRight ? 'right-2' : 'left-2'} w-2 h-2 bg-slate-900 border-r border-b border-slate-700/60 rotate-45 -translate-y-1`}
          />
        </div>
      )}
    </div>
  )
}
