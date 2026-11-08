import type { Card } from '../core/cards'

// A card in flight / resting on the table before the move is committed.
// `onto` is the id of the card it lands on (a field card or another staged
// card), or null when it lands in an empty spot on the field.
export interface Staged {
  card: Card
  onto: number | null
  who: 'player' | 'ai'
}

// Decide where the thrown hand card(s) and the flipped pile card land, so the
// table shows the classic "slap on top of the matching card" before captures
// are resolved by the rules engine.
export function planThrow(
  field: Card[],
  thrown: Card[],
  target: Card | null,
  drawn: Card | null,
  who: 'player' | 'ai',
): { hand: Staged[]; draw: Staged | null } {
  const hand = thrown.map(card => ({ card, onto: target?.id ?? null, who }))
  if (!drawn) return { hand, draw: null }

  const lastThrown = thrown[thrown.length - 1]
  let onto: number | null = null
  if (lastThrown && lastThrown.month === drawn.month) {
    // Drawn card matches what was just thrown (쪽 / 따닥): slap it onto that pile
    onto = lastThrown.id
  } else {
    const match = field.find(f => f.month === drawn.month && f.id !== target?.id)
    onto = match?.id ?? null
  }
  return { hand, draw: { card: drawn, onto, who } }
}
