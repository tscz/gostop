import { AnimatePresence, motion } from 'framer-motion'
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
          <AnimatePresence>
            {cards.map(c => (
              <motion.div
                key={c.id}
                initial={{ scale: 0.4, opacity: 0, y: -12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <CardSVG card={c} size={38} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
