import { CardType, CARD_VISUAL, MONTHS } from './cards'
import { GamePhase } from './gameState'
import { calcScore, applyGoMultiplier } from './scoring'
import { buildExplanation } from './moveExplainer'
import { deal } from './deck'
import type { Card } from './cards'
import type { GameState, MoveExplanation } from './gameState'

const GOSTOP_THRESHOLD = 7

// ═══════════════════════════════════════════════════════════════
// INIT STATE
// ═══════════════════════════════════════════════════════════════
export function initState(): GameState {
  const { playerHand, aiHand, field, drawPile, instantWin } = deal()

  // Rule: player with 4 of same month in hand wins immediately (5pts)
  if (instantWin) {
    return {
      playerHand,
      aiHand,
      field,
      drawPile,
      playerCaptured: [],
      aiCaptured: [],
      playerScore: instantWin === 'player' ? 5 : 0,
      aiScore: instantWin === 'ai' ? 5 : 0,
      playerBreakdown:
        instantWin === 'player'
          ? [{ key: 'bomb', emoji: '💣', label: '네 장 폭탄! Instant Win', pts: 5 }]
          : [],
      aiBreakdown:
        instantWin === 'ai'
          ? [{ key: 'bomb', emoji: '💣', label: '네 장 폭탄! Instant Win', pts: 5 }]
          : [],
      turn: instantWin === 'ai' ? 'ai' : 'player',
      phase: GamePhase.GAME_OVER,
      lastExp: null,
      history: [],
      goCount: 0,
      pendingChoose: null,
      _hadTwoMatches: false,
      scoreAtLastGo: 0,
      message: instantWin === 'player' ? '💣 4장 폭탄! 즉시 승리!' : '💣 AI 4장 폭탄!',
      winner: instantWin,
    }
  }

  return {
    playerHand,
    aiHand,
    field,
    drawPile,
    playerCaptured: [],
    aiCaptured: [],
    playerScore: 0,
    aiScore: 0,
    playerBreakdown: [],
    aiBreakdown: [],
    turn: 'player',
    phase: GamePhase.SELECT,
    lastExp: null,
    history: [],
    goCount: 0,
    pendingChoose: null,
    message: '',
    winner: null,
    _hadTwoMatches: false,
    scoreAtLastGo: 0,
  }
}

// ═══════════════════════════════════════════════════════════════
// APPLY TURN
// ═══════════════════════════════════════════════════════════════
export function applyTurn(
  state: GameState,
  played: Card,
  isAI: boolean,
  t: (key: string) => string,
): GameState {
  let newField = [...state.field]
  let newDraw = [...state.drawPile]
  let captured = [...(isAI ? state.aiCaptured : state.playerCaptured)]
  let oppCaptured = [...(isAI ? state.playerCaptured : state.aiCaptured)]
  let special: string | null = null
  // Flag from chooseMatch: player had 2 field matches for played.month
  const hadTwoMatches = state._hadTwoMatches || false

  // Hand card
  const handMatches = newField.filter(f => f.month === played.month)
  if (handMatches.length === 0) {
    newField = [...newField, played]
  } else if (handMatches.length === 1) {
    newField = newField.filter(f => f.id !== handMatches[0].id)
    captured = [...captured, played, handMatches[0]]
  } else if (handMatches.length === 2) {
    // AI always takes first; player goes through CHOOSE_MATCH so this branch
    // is only reached by AI
    const chosen = handMatches[0]
    newField = newField.filter(f => f.id !== chosen.id)
    captured = [...captured, played, chosen]
  } else if (handMatches.length === 3) {
    // Poktan: 3 cards of same month in hand + 1 on field → all 4 collected + pi
    newField = newField.filter(f => !handMatches.some(m => m.id === f.id))
    captured = [...captured, played, ...handMatches]
    special = 'poktan'
    const junk = oppCaptured.find(c => c.type === CardType.JUNK)
    if (junk) {
      oppCaptured = oppCaptured.filter(c => c.id !== junk.id)
      captured = [...captured, junk]
    }
  }

  // Draw card
  const drawn = newDraw.shift()
  let drawnMatches: Card[] = []
  if (drawn) {
    drawnMatches = newField.filter(f => f.month === drawn.month)

    if (drawnMatches.length === 0) {
      // No match: drawn goes to field
      newField = [...newField, drawn]
    } else if (drawnMatches.length === 1) {
      // R4: Ttadak — player had 2 field matches, chose 1, unchosen is still on field,
      // and drawn card is the 4th card of same month → collect all 4 + steal pi
      if (!special && hadTwoMatches && drawn.month === played.month) {
        // All 4 collected: played + chosen (already in captured) + unchosen + drawn
        newField = newField.filter(f => f.id !== drawnMatches[0].id)
        captured = [...captured, drawn, drawnMatches[0]]
        special = 'ttadak'
        const junk = oppCaptured.find(c => c.type === CardType.JUNK)
        if (junk) {
          oppCaptured = oppCaptured.filter(c => c.id !== junk.id)
          captured = [...captured, junk]
        }
      } else {
        // Normal capture of drawn + field card
        newField = newField.filter(f => f.id !== drawnMatches[0].id)
        captured = [...captured, drawn, drawnMatches[0]]
        // Chok: hand card had no match (discarded), drawn matched it
        if (!special && handMatches.length === 0 && drawnMatches[0].id === played.id) {
          special = 'chok'
          const junk = oppCaptured.find(c => c.type === CardType.JUNK)
          if (junk) {
            oppCaptured = oppCaptured.filter(c => c.id !== junk.id)
            captured = [...captured, junk]
          }
        }
      }
    } else if (drawnMatches.length === 2) {
      // R2: Ppeok — drawn hits 2 field cards of same month → all 3 stay on field
      special = 'ppeok'
      newField = [...newField, drawn]
    } else if (drawnMatches.length === 3) {
      // Ttadak from draw pile hitting 3 field cards → all 4 collected
      newField = newField.filter(f => !drawnMatches.some(m => m.id === f.id))
      captured = [...captured, drawn, ...drawnMatches]
      special = 'ttadak'
      const junk = oppCaptured.find(c => c.type === CardType.JUNK)
      if (junk) {
        oppCaptured = oppCaptured.filter(c => c.id !== junk.id)
        captured = [...captured, junk]
      }
    }
  }

  // Remove from hand
  const newPH = isAI ? state.playerHand : state.playerHand.filter(c => c.id !== played.id)
  const newAH = isAI ? state.aiHand.filter(c => c.id !== played.id) : state.aiHand

  // Score
  const prevPts = isAI ? state.aiScore : state.playerScore
  const prevBD = isAI ? state.aiBreakdown : state.playerBreakdown
  const { points: newPts, breakdown } = calcScore(captured)

  const expBase = buildExplanation({
    played,
    handMatches,
    drawn,
    drawnMatches,
    prevPts,
    newPts,
    breakdown,
    prevBreakdown: prevBD,
    special,
    t,
  })
  const exp: MoveExplanation = { ...expBase, who: isAI ? 'ai' : 'player' }

  // Game over check
  const gameOver = newPH.length === 0 && newAH.length === 0 && newDraw.length === 0
  // R9: after calling GO, player must gain ≥1 point before calling GO/STOP again
  const scoreGainedSinceLastGo = state.goCount > 0 ? newPts > state.scoreAtLastGo : true
  const canCall = !isAI && newPts >= GOSTOP_THRESHOLD && scoreGainedSinceLastGo
  let phase: GameState['phase'] = isAI ? GamePhase.SELECT : canCall ? GamePhase.GOSTOP : GamePhase.SELECT
  let winner: GameState['winner'] = null
  // Apply GO multiplier to player score at natural game end
  const finalPlayerPts = gameOver
    ? applyGoMultiplier(isAI ? state.playerScore : newPts, state.goCount)
    : isAI
      ? state.playerScore
      : newPts
  const finalAiPts = isAI ? newPts : state.aiScore
  if (gameOver) {
    phase = GamePhase.GAME_OVER
    winner =
      finalPlayerPts > finalAiPts ? 'player' : finalAiPts > finalPlayerPts ? 'ai' : 'draw'
  }

  return {
    ...state, // scoreAtLastGo carried through via spread
    _hadTwoMatches: false, // reset after use
    playerHand: newPH,
    aiHand: newAH,
    field: newField,
    drawPile: newDraw,
    playerCaptured: isAI ? oppCaptured : captured,
    aiCaptured: isAI ? captured : oppCaptured,
    playerScore: finalPlayerPts,
    aiScore: finalAiPts,
    playerBreakdown: isAI ? state.playerBreakdown : breakdown,
    aiBreakdown: isAI ? breakdown : state.aiBreakdown,
    turn: isAI ? 'player' : 'ai',
    phase,
    lastExp: exp,
    history: [...state.history, exp],
    winner,
    // Only overwrite message when AI plays (player messages set by callGo/callStop persist)
    ...(isAI
      ? { message: `AI: ${MONTHS[played.month - 1].en} (${CARD_VISUAL[played.id]?.symbol})` }
      : {}),
  }
}
