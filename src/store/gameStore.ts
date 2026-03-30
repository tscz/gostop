import { create } from 'zustand'
import i18n from '../i18n'
import { GamePhase } from '../core/gameState'
import { initState, applyTurn, applyPoktan, applyShake } from '../core/rules'
import { applyGoMultiplier, applyShakeMultiplier } from '../core/scoring'
import { selectAiCard } from '../core/ai'
import type { GameState } from '../core/gameState'
import type { Card } from '../core/cards'

// ═══════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════
interface GameStore {
  state: GameState

  // Actions
  playCard: (card: Card) => void
  chooseMatch: (matchCard: Card) => void
  declarePoktan: () => void
  declareShake: () => void
  callGo: () => void
  callStop: () => void
  newGame: () => void
  playAiTurn: () => void
}

// Helper to get current translation function
function getT() {
  return (key: string) => i18n.t(key)
}

// ═══════════════════════════════════════════════════════════════
// ZUSTAND STORE
// ═══════════════════════════════════════════════════════════════
export const useGameStore = create<GameStore>((set, get) => ({
  state: initState(),

  playCard: (card: Card) => {
    set(store => {
      const prev = store.state
      if (prev.turn !== 'player' || prev.phase !== GamePhase.SELECT) return store

      const matches = prev.field.filter(f => f.month === card.month)
      if (matches.length === 2) {
        // Remove card from hand immediately to prevent double-play
        return {
          state: {
            ...prev,
            phase: GamePhase.CHOOSE_MATCH,
            playerHand: prev.playerHand.filter(c => c.id !== card.id),
            pendingChoose: { played: card, matches },
          },
        }
      }
      return { state: applyTurn(prev, card, false, getT()) }
    })
  },

  declarePoktan: () => {
    set(store => {
      const prev = store.state
      if (prev.turn !== 'player' || prev.phase !== GamePhase.SELECT || !prev.pendingPoktan) return store
      return { state: applyPoktan(prev, false, getT()) }
    })
  },

  declareShake: () => {
    set(store => {
      const prev = store.state
      if (prev.turn !== 'player' || prev.phase !== GamePhase.SELECT || !prev.pendingShake) return store
      return { state: applyShake(prev, getT()) }
    })
  },

  chooseMatch: (matchCard: Card) => {
    set(store => {
      const prev = store.state
      if (prev.phase !== GamePhase.CHOOSE_MATCH || !prev.pendingChoose) return store

      const { played, matches } = prev.pendingChoose
      // Remove BOTH matches from field, put back the unchosen one.
      const unchosen = matches.filter(m => m.id !== matchCard.id)
      const fieldWithoutMatches = prev.field.filter(f => !matches.some(m => m.id === f.id))
      const adjustedField = [...fieldWithoutMatches, ...unchosen]
      const adjusted: GameState = {
        ...prev,
        phase: GamePhase.SELECT,
        pendingChoose: null,
        field: adjustedField,
        // Re-add played card so applyTurn can remove it cleanly
        playerHand: [...prev.playerHand, played],
        // Flag: played card had 2 field matches — needed to detect Ppeok/Ttadak on draw
        _hadTwoMatches: true,
      }
      return { state: applyTurn(adjusted, played, false, getT()) }
    })
  },

  callGo: () => {
    set(store => {
      const prev = store.state
      if (prev.phase !== GamePhase.GOSTOP) return store
      return {
        state: {
          ...prev,
          goCount: prev.goCount + 1,
          scoreAtLastGo: prev.playerScore, // record score at time of GO
          phase: GamePhase.SELECT,
          turn: 'ai' as const,
          message: `GO! ×${prev.goCount + 1}`,
        },
      }
    })
  },

  callStop: () => {
    set(store => {
      const prev = store.state
      // Guard against double-click: only act when in GOSTOP phase
      if (prev.phase !== GamePhase.GOSTOP) return store

      const finalPlayerScore = applyShakeMultiplier(applyGoMultiplier(prev.playerScore, prev.goCount), prev.shakeCount)
      const winner: GameState['winner'] =
        finalPlayerScore > prev.aiScore
          ? 'player'
          : prev.aiScore > finalPlayerScore
            ? 'ai'
            : 'draw'
      // Add GO bonus entry to breakdown so ScorePanel total matches
      const goBreakdown =
        prev.goCount > 0
          ? [
              ...prev.playerBreakdown,
              {
                key: 'go_bonus',
                emoji: '🔥',
                label: `GO ×${prev.goCount} 보너스`,
                pts: finalPlayerScore - prev.playerScore,
              },
            ]
          : prev.playerBreakdown

      return {
        state: {
          ...prev,
          playerScore: finalPlayerScore,
          playerBreakdown: goBreakdown,
          phase: GamePhase.GAME_OVER,
          winner,
          message:
            prev.goCount > 0
              ? `STOP! GO×${prev.goCount} → ${finalPlayerScore}P`
              : 'STOP!',
        },
      }
    })
  },

  newGame: () => {
    set({ state: initState() })
  },

  playAiTurn: () => {
    set(store => {
      const prev = store.state
      if (prev.turn !== 'ai' || prev.phase !== GamePhase.SELECT) return store

      // AI always declares Poktan when available
      if (prev.pendingPoktan) {
        const newState = applyPoktan(prev, true, getT())
        if (newState.aiScore >= 7 && newState.phase !== GamePhase.GAME_OVER) {
          const lead = newState.aiScore - newState.playerScore
          if (lead > 0) {
            return {
              state: {
                ...newState,
                phase: GamePhase.GAME_OVER,
                winner: 'ai' as const,
                message: 'AI: STOP!',
              },
            }
          }
        }
        return { state: newState }
      }

      const card = selectAiCard(prev)
      const newState = applyTurn(prev, card, true, getT())

      // AI Go/Stop decision after its turn
      if (newState.aiScore >= 7 && newState.phase !== GamePhase.GAME_OVER) {
        const lead = newState.aiScore - newState.playerScore
        // Only call STOP when strictly ahead — on a tie, keep playing
        if (lead > 0) {
          return {
            state: {
              ...newState,
              phase: GamePhase.GAME_OVER,
              winner: 'ai' as const,
              message: 'AI: STOP!',
            },
          }
        }
      }

      return { state: newState }
    })
  },
}))
