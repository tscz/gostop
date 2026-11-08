import { describe, it, expect } from 'vitest'
import { planThrow } from './throwPlan'
import { DECK } from '../core/cards'
import type { Card } from '../core/cards'

const c = (id: number): Card => DECK.find(card => card.id === id)!

describe('planThrow', () => {
  it('hand card lands on its match, drawn card on its own match', () => {
    // Jan junk onto Jan bright; drawn Mar junk onto Mar ribbon
    const plan = planThrow([c(1), c(10)], [c(3)], c(1), c(11), 'player')
    expect(plan.hand).toEqual([{ card: c(3), onto: 1, who: 'player' }])
    expect(plan.draw).toEqual({ card: c(11), onto: 10, who: 'player' })
  })

  it('discard lands in an empty spot; unmatched draw too', () => {
    const plan = planThrow([c(9)], [c(3)], null, c(13), 'ai')
    expect(plan.hand[0].onto).toBeNull()
    expect(plan.draw?.onto).toBeNull()
  })

  it('drawn card of the thrown month lands on the thrown card (쪽)', () => {
    const plan = planThrow([c(9)], [c(3)], null, c(4), 'player')
    expect(plan.draw?.onto).toBe(3)
  })

  it('poktan: all three hand cards land on the field card', () => {
    const plan = planThrow([c(4)], [c(1), c(2), c(3)], c(4), null, 'player')
    expect(plan.hand.map(s => s.onto)).toEqual([4, 4, 4])
    expect(plan.draw).toBeNull()
  })

  it('skip turn: only the pile card is thrown', () => {
    const plan = planThrow([c(14)], [], null, c(15), 'player')
    expect(plan.hand).toEqual([])
    expect(plan.draw?.onto).toBe(14)
  })
})
