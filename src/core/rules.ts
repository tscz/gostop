import { CardType } from './cards'
import { GamePhase } from './gameState'
import { calcScore, finaliseScore, applyLoserPenalties, applyNagariMultiplier, cardValue } from './scoring'
import { buildExplanation } from './moveExplainer'
import { deal } from './deck'
import type { Card } from './cards'
import type { GameState, MoveExplanation, PendingPoktan, PendingShake, ScoreBreakdown } from './gameState'

const GOSTOP_THRESHOLD = 7

// ═══════════════════════════════════════════════════════════════
// RESOLVE GAME END — shared helper used by all five natural/stop paths
// Applies loser penalties, nagari multiplier, and the nagari threshold
// check (natural ends only: no winner when neither side reached 7 pts
// and no GO was called).
// ═══════════════════════════════════════════════════════════════
interface GameEndResult {
  winner: GameState['winner']
  finalPlayerPts: number
  finalPlayerBD: ScoreBreakdown[]
  finalAiPts: number
  finalAiBD: ScoreBreakdown[]
  isNagari: boolean
}

export function resolveGameEnd(
  baseFinalPlayerPts: number,
  baseFinalPlayerBD: ScoreBreakdown[],
  baseAiPts: number,
  baseAiBD: ScoreBreakdown[],
  playerCaptured: Card[],
  aiCaptured: Card[],
  goCount: number,
  nagariMultiplier: number,
  isNaturalEnd: boolean,
): GameEndResult {
  if (isNaturalEnd && goCount === 0 && baseFinalPlayerPts < GOSTOP_THRESHOLD && baseAiPts < GOSTOP_THRESHOLD) {
    return { winner: null, isNagari: true, finalPlayerPts: baseFinalPlayerPts, finalPlayerBD: baseFinalPlayerBD, finalAiPts: baseAiPts, finalAiBD: baseAiBD }
  }
  if (baseFinalPlayerPts > baseAiPts) {
    let { finalScore: fp, breakdown: fb } = applyLoserPenalties(baseFinalPlayerPts, baseFinalPlayerBD, playerCaptured, aiCaptured, 0)
    ;({ finalScore: fp, breakdown: fb } = applyNagariMultiplier(fp, fb, nagariMultiplier))
    return { winner: 'player', isNagari: false, finalPlayerPts: fp, finalPlayerBD: fb, finalAiPts: baseAiPts, finalAiBD: baseAiBD }
  } else if (baseAiPts > baseFinalPlayerPts) {
    let { finalScore: fa, breakdown: fad } = applyLoserPenalties(baseAiPts, baseAiBD, aiCaptured, playerCaptured, goCount)
    ;({ finalScore: fa, breakdown: fad } = applyNagariMultiplier(fa, fad, nagariMultiplier))
    return { winner: 'ai', isNagari: false, finalPlayerPts: baseFinalPlayerPts, finalPlayerBD: baseFinalPlayerBD, finalAiPts: fa, finalAiBD: fad }
  } else {
    return { winner: 'draw', isNagari: false, finalPlayerPts: baseFinalPlayerPts, finalPlayerBD: baseFinalPlayerBD, finalAiPts: baseAiPts, finalAiBD: baseAiBD }
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECT POKTAN
// Returns the first month where the given hand has 3 cards and
// the field has at least 1 card of that month. Since each month
// has 4 cards, 3 in hand guarantees at most 1 can be on the field.
// ═══════════════════════════════════════════════════════════════
export function detectPoktan(hand: Card[], field: Card[]): PendingPoktan | null {
  const byMonth = new Map<number, Card[]>()
  for (const c of hand) {
    if (!byMonth.has(c.month)) byMonth.set(c.month, [])
    byMonth.get(c.month)!.push(c)
  }
  for (const [month, cards] of byMonth) {
    if (cards.length >= 3) {
      const fieldCard = field.find(f => f.month === month)
      if (fieldCard) return { handCards: cards.slice(0, 3), fieldCard }
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════════════
// DETECT SHAKE (흔들기)
// Returns cards if the hand has 3 of the same month with NO
// matching card on the field (distinct from Poktan which requires
// exactly 1 matching field card).
// ═══════════════════════════════════════════════════════════════
export function detectShake(hand: Card[], field: Card[]): PendingShake[] {
  const byMonth = new Map<number, Card[]>()
  for (const c of hand) {
    if (!byMonth.has(c.month)) byMonth.set(c.month, [])
    byMonth.get(c.month)!.push(c)
  }
  const result: PendingShake[] = []
  for (const [month, cards] of byMonth) {
    if (cards.length >= 3) {
      const fieldCard = field.find(f => f.month === month)
      if (!fieldCard) result.push({ handCards: cards.slice(0, 3) })
    }
  }
  return result
}

// ═══════════════════════════════════════════════════════════════
// APPLY SHAKE (흔들기)
// Player declares shake: increments shakeCount, clears the
// pending flag. Turn stays with the player — they still play.
// ═══════════════════════════════════════════════════════════════
export function applyShake(
  state: GameState,
  _shake: PendingShake,
  t: (key: string) => string,
): GameState {
  const exp: MoveExplanation = {
    lines: [`🫨 흔들기 Shake! ${t('shakeDesc')}`, `💡 ${t('tipExcellent')}`],
    quality: 'excellent',
    delta: 0,
    newPts: state.playerScore,
    who: 'player',
  }
  return {
    ...state,
    shakeCount: state.shakeCount + 1,
    pendingShake: [],
    lastExp: exp,
    history: [...state.history, exp],
  }
}

// ═══════════════════════════════════════════════════════════════
// INIT STATE
// ═══════════════════════════════════════════════════════════════
export interface InitOpts {
  nagariMultiplier?: number
}

export function initState(opts: InitOpts = {}): GameState {
  const { playerHand, aiHand, field, drawPile, instantWin } = deal()
  const nagariMultiplier = opts.nagariMultiplier ?? 1

  // Rule: player with 4 of same month in hand wins immediately (5pts, scaled by nagariMultiplier)
  if (instantWin) {
    const bomb = { key: 'bomb', emoji: '💣', label: '네 장 폭탄! Instant Win', pts: 5 }
    const { finalScore: playerScore, breakdown: playerBreakdown } = instantWin === 'player'
      ? applyNagariMultiplier(5, [bomb], nagariMultiplier)
      : { finalScore: 0, breakdown: [] as ScoreBreakdown[] }
    const { finalScore: aiScore, breakdown: aiBreakdown } = instantWin === 'ai'
      ? applyNagariMultiplier(5, [bomb], nagariMultiplier)
      : { finalScore: 0, breakdown: [] as ScoreBreakdown[] }
    return {
      playerHand,
      aiHand,
      field,
      drawPile,
      playerCaptured: [],
      aiCaptured: [],
      playerScore,
      aiScore,
      playerBreakdown,
      aiBreakdown,
      turn: instantWin === 'ai' ? 'ai' : 'player',
      phase: GamePhase.GAME_OVER,
      lastExp: null,
      history: [],
      goCount: 0,
      pendingChoose: null,
      pendingPoktan: null,
      pendingShake: [],
      shakeCount: 0,
      _hadTwoMatches: false,
      scoreAtLastGo: 0,
      poktanSkipsRemaining: 0,
      isNagari: false,
      nagariMultiplier,
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
    pendingPoktan: detectPoktan(playerHand, field),
    pendingShake: detectShake(playerHand, field),
    shakeCount: 0,
    message: '',
    winner: null,
    _hadTwoMatches: false,
    scoreAtLastGo: 0,
    poktanSkipsRemaining: 0,
    isNagari: false,
    nagariMultiplier,
  }
}

// ═══════════════════════════════════════════════════════════════
// APPLY POKTAN
// Executes a Poktan declaration: capture 3 hand cards + 1 field
// card, steal 1 junk from opponent. Turn passes to opponent.
// ═══════════════════════════════════════════════════════════════
export function applyPoktan(
  state: GameState,
  isAI: boolean,
  t: (key: string) => string,
): GameState {
  const { handCards, fieldCard } = state.pendingPoktan!

  let captured = [...(isAI ? state.aiCaptured : state.playerCaptured)]
  let oppCaptured = [...(isAI ? state.playerCaptured : state.aiCaptured)]

  // Capture all 4 cards
  captured = [...captured, ...handCards, fieldCard]

  // Remove hand cards from hand
  const handCardIds = new Set(handCards.map(c => c.id))
  const newPH = isAI
    ? state.playerHand
    : state.playerHand.filter(c => !handCardIds.has(c.id))
  const newAH = isAI
    ? state.aiHand.filter(c => !handCardIds.has(c.id))
    : state.aiHand

  // Remove field card from field
  const newField = state.field.filter(f => f.id !== fieldCard.id)

  // Steal 1 junk from opponent
  const junk = oppCaptured.find(c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK)
  if (junk) {
    oppCaptured = oppCaptured.filter(c => c.id !== junk.id)
    captured = [...captured, junk]
  }

  // Score
  const prevPts = isAI ? state.aiScore : state.playerScore
  const prevBD = isAI ? state.aiBreakdown : state.playerBreakdown
  const { points: newPts, breakdown } = calcScore(captured)
  const delta = newPts - prevPts

  const expLines: string[] = [
    `💣 폭탄 Poktan! ${t('poktanDesc')}`,
    ...(delta > 0 ? [`🎉 +${delta} ${t('pts')}! (${t('total')}: ${newPts})`] : []),
    ...breakdown
      .filter(b => !prevBD.some(p => p.key === b.key))
      .map(b => `🏆 ${b.emoji} ${b.label} +${b.pts}${t('pts')}`),
    `💡 ${t('tipExcellent')}`,
  ]

  const exp: MoveExplanation = {
    lines: expLines,
    quality: 'excellent',
    delta,
    newPts,
    who: isAI ? 'ai' : 'player',
  }

  // Game over check: both hands + pile empty, OR next player has no cards to play
  // (poktan skips let the human player draw without a hand card)
  const nextPlayerHand = isAI ? newPH : newAH
  const nextPlayerSkips = isAI ? state.poktanSkipsRemaining : 0
  const gameOver =
    (newPH.length === 0 && newAH.length === 0 && state.drawPile.length === 0) ||
    (nextPlayerHand.length === 0 && (nextPlayerSkips === 0 || state.drawPile.length === 0))
  const rawPlayerPts = isAI ? state.playerScore : newPts
  const rawPlayerBD = isAI ? state.playerBreakdown : breakdown
  const { finalScore: baseFinalPlayerPts, breakdown: baseFinalPlayerBD } = gameOver
    ? finaliseScore(rawPlayerPts, state.goCount, state.shakeCount, rawPlayerBD)
    : { finalScore: rawPlayerPts, breakdown: rawPlayerBD }
  const baseAiPts = isAI ? newPts : state.aiScore
  const baseAiBD = isAI ? breakdown : state.aiBreakdown
  let phase: GameState['phase'] = GamePhase.SELECT
  let winner: GameState['winner'] = null
  let isNagariGame = false
  let finalPlayerPts = baseFinalPlayerPts
  let finalPlayerBD = baseFinalPlayerBD
  let finalAiPts = baseAiPts
  let finalAiBD = baseAiBD
  if (gameOver) {
    phase = GamePhase.GAME_OVER
    const ge = resolveGameEnd(
      baseFinalPlayerPts, baseFinalPlayerBD, baseAiPts, baseAiBD,
      isAI ? oppCaptured : captured,
      isAI ? captured : oppCaptured,
      state.goCount, state.nagariMultiplier, true,
    )
    winner = ge.winner
    isNagariGame = ge.isNagari
    finalPlayerPts = ge.finalPlayerPts
    finalPlayerBD = ge.finalPlayerBD
    finalAiPts = ge.finalAiPts
    finalAiBD = ge.finalAiBD
  }

  // Detect Poktan + Shake for the next player (only if game isn't over)
  const pendingPoktan = !gameOver ? detectPoktan(nextPlayerHand, newField) : null
  // Only offer shake when it is the player's turn next
  const pendingShake = !gameOver && isAI ? detectShake(nextPlayerHand, newField) : []

  return {
    ...state,
    _hadTwoMatches: false,
    playerHand: newPH,
    aiHand: newAH,
    field: newField,
    playerCaptured: isAI ? oppCaptured : captured,
    aiCaptured: isAI ? captured : oppCaptured,
    playerScore: finalPlayerPts,
    aiScore: finalAiPts,
    playerBreakdown: finalPlayerBD,
    aiBreakdown: finalAiBD,
    turn: isAI ? 'player' : 'ai',
    poktanSkipsRemaining: !isAI ? state.poktanSkipsRemaining + 2 : state.poktanSkipsRemaining,
    phase,
    lastExp: exp,
    history: [...state.history, exp],
    pendingChoose: null,
    pendingPoktan,
    pendingShake,
    winner,
    isNagari: isNagariGame,
    message: '',
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
  let hadTwoMatches = state._hadTwoMatches || false

  // Hand card
  const handMatches = newField.filter(f => f.month === played.month)
  if (handMatches.length === 0) {
    newField = [...newField, played]
  } else if (handMatches.length === 1) {
    newField = newField.filter(f => f.id !== handMatches[0].id)
    captured = [...captured, played, handMatches[0]]
  } else if (handMatches.length === 2) {
    // AI picks the higher-value match; player goes through CHOOSE_MATCH so this
    // branch is only reached by AI
    const chosen = handMatches.reduce((best, m) => cardValue(m) >= cardValue(best) ? m : best)
    newField = newField.filter(f => f.id !== chosen.id)
    captured = [...captured, played, chosen]
    hadTwoMatches = true // needed so draw-phase ttadak check fires for AI
  } else if (handMatches.length === 3) {
    // Sa-ssak (싹쓸이): played card sweeps all 3 remaining field cards of same month
    newField = newField.filter(f => !handMatches.some(m => m.id === f.id))
    captured = [...captured, played, ...handMatches]
    special = 'sassak'
    const junk = oppCaptured.find(c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK)
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
        const junk = oppCaptured.find(c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK)
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
          const junk = oppCaptured.find(c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK)
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
      const junk = oppCaptured.find(c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK)
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

  const exp: MoveExplanation = buildExplanation({
    played,
    handMatches,
    drawn,
    drawnMatches,
    prevPts,
    newPts,
    breakdown,
    prevBreakdown: prevBD,
    special,
    who: isAI ? 'ai' : 'player',
    t,
  })

  // Game over check: both hands + pile empty, OR next player has no cards to play
  // (poktan skips let the human player draw without a hand card)
  const nextPlayerHand = isAI ? newPH : newAH
  const nextPlayerSkips = isAI ? state.poktanSkipsRemaining : 0
  const gameOver =
    (newPH.length === 0 && newAH.length === 0 && newDraw.length === 0) ||
    (nextPlayerHand.length === 0 && (nextPlayerSkips === 0 || newDraw.length === 0))
  // R9: after calling GO, player must gain ≥1 point before calling GO/STOP again
  const scoreGainedSinceLastGo = state.goCount > 0 ? newPts > state.scoreAtLastGo : true
  const canCall = !isAI && newPts >= GOSTOP_THRESHOLD && scoreGainedSinceLastGo
  let phase: GameState['phase'] = isAI ? GamePhase.SELECT : canCall ? GamePhase.GOSTOP : GamePhase.SELECT
  let winner: GameState['winner'] = null
  // Apply GO + shake multipliers to player score at natural game end
  const rawPlayerPts = isAI ? state.playerScore : newPts
  const rawPlayerBD = isAI ? state.playerBreakdown : breakdown
  const { finalScore: baseFinalPlayerPts, breakdown: baseFinalPlayerBD } = gameOver
    ? finaliseScore(rawPlayerPts, state.goCount, state.shakeCount, rawPlayerBD)
    : { finalScore: rawPlayerPts, breakdown: rawPlayerBD }
  const baseAiPts = isAI ? newPts : state.aiScore
  const baseAiBD = isAI ? breakdown : state.aiBreakdown
  let finalPlayerPts = baseFinalPlayerPts
  let finalPlayerBD = baseFinalPlayerBD
  let finalAiPts = baseAiPts
  let finalAiBD = baseAiBD
  let isNagariGame = false
  if (gameOver) {
    phase = GamePhase.GAME_OVER
    const ge = resolveGameEnd(
      baseFinalPlayerPts, baseFinalPlayerBD, baseAiPts, baseAiBD,
      isAI ? oppCaptured : captured,
      isAI ? captured : oppCaptured,
      state.goCount, state.nagariMultiplier, true,
    )
    winner = ge.winner
    isNagariGame = ge.isNagari
    finalPlayerPts = ge.finalPlayerPts
    finalPlayerBD = ge.finalPlayerBD
    finalAiPts = ge.finalAiPts
    finalAiBD = ge.finalAiBD
  }

  // Detect Poktan + Shake for the next player (only if game isn't over)
  const nextHand = isAI ? newPH : newAH
  const pendingPoktan = !gameOver ? detectPoktan(nextHand, newField) : null
  // Only offer shake when it is the player's turn next (AI ignores shake)
  const pendingShake = !gameOver && isAI ? detectShake(nextHand, newField) : []

  // Decrement skip counter on player turns (whether they skipped or played normally)
  const poktanSkipsRemaining =
    !isAI && state.poktanSkipsRemaining > 0
      ? state.poktanSkipsRemaining - 1
      : state.poktanSkipsRemaining

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
    playerBreakdown: finalPlayerBD,
    aiBreakdown: finalAiBD,
    turn: isAI ? 'player' : 'ai',
    phase,
    lastExp: exp,
    history: [...state.history, exp],
    pendingChoose: null,
    pendingPoktan,
    pendingShake,
    winner,
    isNagari: isNagariGame,
    poktanSkipsRemaining,
  }
}

// ═══════════════════════════════════════════════════════════════
// APPLY SKIP TURN — #8 post-poktan hand-card skip
// Player draws from the pile without playing a hand card.
// Decrements poktanSkipsRemaining.
// ═══════════════════════════════════════════════════════════════
export function applySkipTurn(
  state: GameState,
  t: (key: string) => string,
): GameState {
  let newField = [...state.field]
  let newDraw = [...state.drawPile]
  let captured = [...state.playerCaptured]
  let oppCaptured = [...state.aiCaptured]

  // Draw card only (no hand-card phase)
  const drawn = newDraw.shift()
  if (drawn) {
    const drawnMatches = newField.filter(f => f.month === drawn.month)
    if (drawnMatches.length === 0) {
      newField = [...newField, drawn]
    } else if (drawnMatches.length === 1) {
      newField = newField.filter(f => f.id !== drawnMatches[0].id)
      captured = [...captured, drawn, drawnMatches[0]]
    } else if (drawnMatches.length === 2) {
      // Ppeok: drawn hits 2 field cards → all 3 stay
      newField = [...newField, drawn]
    } else if (drawnMatches.length === 3) {
      // Ttadak from draw pile
      newField = newField.filter(f => !drawnMatches.some(m => m.id === f.id))
      captured = [...captured, drawn, ...drawnMatches]
      const junk = oppCaptured.find(c => c.type === CardType.JUNK || c.type === CardType.DOUBLE_JUNK)
      if (junk) {
        oppCaptured = oppCaptured.filter(c => c.id !== junk.id)
        captured = [...captured, junk]
      }
    }
  }

  const prevPts = state.playerScore
  const { points: newPts, breakdown } = calcScore(captured)
  const delta = newPts - prevPts

  const exp: MoveExplanation = {
    lines: [
      `⏭️ ${t('skipHandCard')}`,
      ...(delta > 0 ? [`+${delta} ${t('pts')} (${t('total')}: ${newPts})`] : []),
    ],
    quality: 'neutral',
    delta,
    newPts,
    who: 'player',
  }

  const poktanSkipsRemaining = state.poktanSkipsRemaining > 0
    ? state.poktanSkipsRemaining - 1
    : 0

  // Game over check
  const gameOver =
    (state.playerHand.length === 0 && state.aiHand.length === 0 && newDraw.length === 0) ||
    state.aiHand.length === 0

  let isNagariGame = false
  let phase: GameState['phase'] = GamePhase.SELECT
  let winner: GameState['winner'] = null
  let finalPlayerPts = newPts
  let finalPlayerBD = breakdown
  let finalAiPts = state.aiScore
  let finalAiBD = state.aiBreakdown

  if (gameOver) {
    phase = GamePhase.GAME_OVER
    const { finalScore: baseFinalPlayerPts, breakdown: baseFinalPlayerBD } = finaliseScore(
      newPts, state.goCount, state.shakeCount, breakdown,
    )
    const ge = resolveGameEnd(
      baseFinalPlayerPts, baseFinalPlayerBD, state.aiScore, state.aiBreakdown,
      captured, oppCaptured,
      state.goCount, state.nagariMultiplier, true,
    )
    winner = ge.winner
    isNagariGame = ge.isNagari
    finalPlayerPts = ge.finalPlayerPts
    finalPlayerBD = ge.finalPlayerBD
    finalAiPts = ge.finalAiPts
    finalAiBD = ge.finalAiBD
  }

  const scoreGainedSinceLastGo = state.goCount > 0 ? newPts > state.scoreAtLastGo : true
  const canCall = newPts >= GOSTOP_THRESHOLD && scoreGainedSinceLastGo
  if (!gameOver && canCall) phase = GamePhase.GOSTOP

  const pendingPoktan = !gameOver ? detectPoktan(state.aiHand, newField) : null
  const pendingShake: GameState['pendingShake'] = []

  return {
    ...state,
    _hadTwoMatches: false,
    field: newField,
    drawPile: newDraw,
    playerCaptured: captured,
    aiCaptured: oppCaptured,
    playerScore: finalPlayerPts,
    aiScore: finalAiPts,
    playerBreakdown: finalPlayerBD,
    aiBreakdown: finalAiBD,
    turn: 'ai',
    phase,
    lastExp: exp,
    history: [...state.history, exp],
    pendingChoose: null,
    pendingPoktan,
    pendingShake,
    winner,
    isNagari: isNagariGame,
    poktanSkipsRemaining,
  }
}
