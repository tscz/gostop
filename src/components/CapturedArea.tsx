import CardSVG from './CardSVG'
import type { Card } from '../core/cards'

interface CapturedAreaProps {
  cards: Card[]
  label: string
  accent: string
}

export default function CapturedArea({ cards, label, accent }: CapturedAreaProps) {
  return (
    <div>
      <p className={`text-xs font-semibold mb-1.5 ${accent}`}>
        {label} ({cards.length})
      </p>
      {cards.length === 0 ? (
        <p className="text-slate-700 text-xs italic">–</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {cards.map(c => (
            <CardSVG key={c.id} card={c} size={38} />
          ))}
        </div>
      )}
    </div>
  )
}
