import { create } from 'zustand'
import i18n from '../i18n'
import { GamePhase } from '../core/gameState'
import { initState, applyTurn, applyPoktan, applyShake, applySkipTurn, resolveGameEnd } from '../core/rules'
import { finaliseScore } from '../core/scoring'
import { selectAiCard } from '../core/ai'
import type { GameState, PendingShake, SessionState, RoundResult } from '../core/gameState'
import type { Card } from '../core/cards'

// ═══════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════
interface GameStore {
  state: GameState
  session: SessionState

  // Actions
  playCard: (card: Card) => void
  chooseMatch: (matchCard: Card) => void
  declarePoktan: () => void
  declareShake: (shake: PendingShake) => void
  callGo: () => void
  callStop: () => void
  skipHandCard: () => void
  newGame: () => void
  endSession: () => void
  playAiTurn: () => void
}

const INITIAL_SESSION: SessionState = {
  round: 1,
  playerTotal: 0,
  aiTotal: 0,
  rounds: [],
  nagariMultiplier: 1,
}

// Helper to get current translation function
function getT() {
  return (key: string) => i18n.t(key)
}

// Compute the player's final score + breakdown after GO and shake multipliers.
// Used in every game-end path so the displayed total always matches the breakdown sum.
function finalisePlayerScore(state: GameState): {
  score: number
  breakdown: GameState['playerBreakdown']
} {
  const { finalScore: score, breakdown } = finaliseScore(
    state.playerScore,
    state.goCount,
    state.shakeCount,
    state.playerBreakdown,
  )
  return { score, breakdown }
}

// ═══════════════════════════════════════════════════════════════
// ZUSTAND STORE
// ═══════════════════════════════════════════════════════════════
export const useGameStore = create<GameStore>((set, get) => ({
  state: initState(),
  session: { ...INITIAL_SESSION },

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

  declareShake: (shake: PendingShake) => {
    set(store => {
      const prev = store.state
      if (prev.turn !== 'player' || prev.phase !== GamePhase.SELECT) return store
      if (!prev.pendingShake.some(s => s.handCards[0].month === shake.handCards[0].month)) return store
      return { state: applyShake(prev, shake, getT()) }
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
          pendingShake: [],
        },
      }
    })
  },

  callStop: () => {
    set(store => {
      const prev = store.state
      // Guard against double-click: only act when in GOSTOP phase
      if (prev.phase !== GamePhase.GOSTOP) return store

      const { score: basePlayerScore, breakdown: baseBreakdown } = finalisePlayerScore(prev)
      const ge = resolveGameEnd(
        basePlayerScore, baseBreakdown,
        prev.aiScore, prev.aiBreakdown,
        prev.playerCaptured, prev.aiCaptured,
        prev.goCount, prev.nagariMultiplier, false,
      )

      return {
        state: {
          ...prev,
          playerScore: ge.finalPlayerPts,
          playerBreakdown: ge.finalPlayerBD,
          aiScore: ge.finalAiPts,
          aiBreakdown: ge.finalAiBD,
          phase: GamePhase.GAME_OVER,
          pendingShake: [],
          winner: ge.winner,
          endReason: 'stop',
          message:
            prev.goCount > 0 && prev.shakeCount > 0
              ? `STOP! GO×${prev.goCount} 흔들기×${Math.pow(2, prev.shakeCount)} → ${ge.finalPlayerPts}P`
              : prev.goCount > 0
                ? `STOP! GO×${prev.goCount} → ${ge.finalPlayerPts}P`
                : prev.shakeCount > 0
                  ? `STOP! 흔들기×${Math.pow(2, prev.shakeCount)} → ${ge.finalPlayerPts}P`
                  : 'STOP!',
        },
      }
    })
  },

  skipHandCard: () => {
    set(store => {
      const prev = store.state
      if (prev.turn !== 'player' || prev.phase !== GamePhase.SELECT || prev.poktanSkipsRemaining === 0) return store
      return { state: applySkipTurn(prev, getT()) }
    })
  },

  newGame: () => {
    set(store => {
      const s = store.state
      const session = store.session
      if (s.phase !== GamePhase.GAME_OVER) {
        return { state: initState({ nagariMultiplier: session.nagariMultiplier }), session }
      }
      const newNagariMultiplier = s.isNagari ? s.nagariMultiplier * 2 : 1
      const roundResult: RoundResult = {
        round: session.round,
        winner: s.winner,
        playerScore: s.playerScore,
        aiScore: s.aiScore,
        isNagari: s.isNagari,
      }
      const newSession: SessionState = {
        round: session.round + 1,
        playerTotal: session.playerTotal + (s.winner === 'player' ? s.playerScore : 0),
        aiTotal: session.aiTotal + (s.winner === 'ai' ? s.aiScore : 0),
        rounds: [...session.rounds, roundResult],
        nagariMultiplier: newNagariMultiplier,
      }
      return { state: initState({ nagariMultiplier: newNagariMultiplier }), session: newSession }
    })
  },

  endSession: () => {
    set({ state: initState(), session: { ...INITIAL_SESSION } })
  },

  playAiTurn: () => {
    set(store => {
      const prev = store.state
      if (prev.turn !== 'ai' || prev.phase !== GamePhase.SELECT) return store

      function aiStop(s: GameState): GameState {
        const { score: basePlayerScore, breakdown: basePlayerBD } = finalisePlayerScore(s)
        const ge = resolveGameEnd(
          basePlayerScore, basePlayerBD,
          s.aiScore, s.aiBreakdown,
          s.playerCaptured, s.aiCaptured,
          s.goCount, s.nagariMultiplier, false,
        )
        return {
          ...s,
          phase: GamePhase.GAME_OVER,
          winner: ge.winner,
          aiScore: ge.finalAiPts,
          aiBreakdown: ge.finalAiBD,
          playerScore: ge.finalPlayerPts,
          playerBreakdown: ge.finalPlayerBD,
          pendingShake: [],
          endReason: 'aiStop',
          message: 'AI: STOP!',
        }
      }

      // AI always declares Poktan when available
      if (prev.pendingPoktan) {
        const newState = applyPoktan(prev, true, getT())
        if (newState.aiScore >= 7 && newState.phase !== GamePhase.GAME_OVER) {
          const { score: effectivePlayerScore } = finalisePlayerScore(newState)
          if (newState.aiScore > effectivePlayerScore) {
            return { state: aiStop(newState) }
          }
        }
        return { state: newState }
      }

      const card = selectAiCard(prev)
      const newState = applyTurn(prev, card, true, getT())

      // AI Go/Stop decision after its turn
      if (newState.aiScore >= 7 && newState.phase !== GamePhase.GAME_OVER) {
        const { score: effectivePlayerScore } = finalisePlayerScore(newState)
        // Only call STOP when strictly ahead — on a tie, keep playing
        if (newState.aiScore > effectivePlayerScore) {
          return { state: aiStop(newState) }
        }
      }

      return { state: newState }
    })
  },
}))
