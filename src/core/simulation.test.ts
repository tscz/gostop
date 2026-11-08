import { describe, it, expect } from 'vitest'
import { useGameStore } from '../store/gameStore'
import { GamePhase } from './gameState'
import { suggestPlayerCard } from './ai'

// Plays complete rounds through the real store (player uses the hint heuristic,
// always bombs, skips when its hand is empty, and STOPs at the first chance).
// Invariant: a round that ends naturally has used every card — no early endings.
function playRound(): ReturnType<typeof useGameStore.getState>['state'] {
  const store = useGameStore
  store.getState().endSession()
  for (let i = 0; i < 200; i++) {
    const { state: s } = store.getState()
    const api = store.getState()
    if (s.phase === GamePhase.GAME_OVER) return s
    if (s.phase === GamePhase.GOSTOP) { api.callStop(); continue }
    if (s.phase === GamePhase.CHOOSE_MATCH) { api.chooseMatch(s.pendingChoose!.matches[0]); continue }
    if (s.turn === 'ai') { api.playAiTurn(); continue }
    if (s.pendingPoktan) { api.declarePoktan(); continue }
    if (!s.playerHand.length) { api.skipHandCard(); continue }
    api.playCard(suggestPlayerCard(s)!.card)
  }
  throw new Error('round did not finish within 200 actions')
}

describe('full-round simulation', () => {
  it('500 rounds all finish, and natural endings leave no cards behind', () => {
    let natural = 0
    let bombs = 0
    for (let n = 0; n < 500; n++) {
      const s = playRound()
      expect(s.phase).toBe(GamePhase.GAME_OVER)
      if (s.history.some(h => h.lines[0]?.startsWith('💣'))) bombs++
      if (s.endReason === 'natural') {
        natural++
        expect({ pile: s.drawPile.length, player: s.playerHand.length, ai: s.aiHand.length })
          .toEqual({ pile: 0, player: 0, ai: 0 })
      }
    }
    expect(natural).toBeGreaterThan(0)
    expect(bombs).toBeGreaterThan(0) // the Poktan/skip paths were actually exercised
    console.info(`simulation: ${natural} natural endings, ${bombs} rounds with a Poktan`)
  })
})
