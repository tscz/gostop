import { describe, it, expect, afterAll } from 'vitest'
import { useGameStore } from '../store/gameStore'
import { setRandom, seededRandom } from './deck'
import { dealSeeded, playToEnd, strategies } from '../test/simulate'

// Full rounds through the real store, seeded so any failure replays exactly.
// After EVERY action the rule invariants in src/test/simulate.ts are checked:
// 48 cards conserved, captures pair by month, steals are junk only, one pile
// card per move, correct hand usage (1 / 3 Poktan / 0 Skip), turn order,
// live score = captured value, GO/STOP offered exactly when due, final score =
// breakdown, natural endings use every card, Nagari exactly when nobody hit 7.

const ROUNDS_PER_STRATEGY = 300

afterAll(() => setRandom(null))

describe('seeded full-round simulation', () => {
  const names = Object.keys(strategies(Math.random))

  it.each(names)('strategy "%s": %i rounds follow the rules', name => {
    const stats = { natural: 0, stop: 0, aiStop: 0, instant: 0, nagari: 0, poktan: 0, shake: 0, skip: 0, go: 0 }
    for (let seed = 1; seed <= ROUNDS_PER_STRATEGY; seed++) {
      dealSeeded(seed)
      const d = strategies(seededRandom(seed * 7919))[name]
      const { final, actions } = playToEnd(d, `strategy=${name} seed=${seed}`)
      stats[final.endReason ?? 'natural']++
      if (final.isNagari) stats.nagari++
      for (const a of ['poktan', 'shake', 'skip', 'go'] as const) if (actions.includes(a)) stats[a]++
    }
    // Every way a round can end actually occurred across the seeds
    expect(stats.natural + stats.stop + stats.aiStop + stats.instant).toBe(ROUNDS_PER_STRATEGY)
    expect(stats.aiStop).toBeGreaterThan(0)
    if (name !== 'passive') expect(stats.poktan + stats.shake).toBeGreaterThan(0)
    console.info(`[${name}]`, JSON.stringify(stats))
  })

  it('a 20-round session carries Nagari multipliers and totals correctly', () => {
    dealSeeded(424242)
    const d = strategies(seededRandom(99)).greedy
    let expectedMultiplier = 1
    let playerTotal = 0
    let aiTotal = 0
    for (let round = 1; round <= 20; round++) {
      const { state, session } = useGameStore.getState()
      expect(session.round).toBe(round)
      expect(state.nagariMultiplier).toBe(expectedMultiplier)
      const { final } = playToEnd(d, `session round=${round}`)
      if (final.winner === 'player') playerTotal += final.playerScore
      if (final.winner === 'ai') aiTotal += final.aiScore
      // Nagari doubles the next round, anything else resets it
      expectedMultiplier = final.isNagari ? expectedMultiplier * 2 : 1
      useGameStore.getState().newGame()
      const s = useGameStore.getState().session
      expect(s.playerTotal).toBe(playerTotal)
      expect(s.aiTotal).toBe(aiTotal)
      expect(s.rounds).toHaveLength(round)
    }
  })

  it('the same seed deals and plays the same round', () => {
    const run = () => {
      dealSeeded(777)
      return playToEnd(strategies(seededRandom(1)).random, 'replay').final
    }
    const a = run()
    const b = run()
    expect(b.playerScore).toBe(a.playerScore)
    expect(b.aiScore).toBe(a.aiScore)
    expect(b.history.map(h => h.lines.join('|'))).toEqual(a.history.map(h => h.lines.join('|')))
  })
})
