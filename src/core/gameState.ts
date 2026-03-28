import type { Card } from './cards'

// ═══════════════════════════════════════════════════════════════
// GAME PHASE
// ═══════════════════════════════════════════════════════════════
export const GamePhase = {
  SELECT: 'select',
  GOSTOP: 'goStop',
  GAME_OVER: 'gameOver',
  CHOOSE_MATCH: 'choose_match',
} as const

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase]

// ═══════════════════════════════════════════════════════════════
// SCORE BREAKDOWN
// ═══════════════════════════════════════════════════════════════
export interface ScoreBreakdown {
  key: string
  emoji: string
  label: string
  pts: number
  cards?: Card[]
}

// ═══════════════════════════════════════════════════════════════
// MOVE EXPLANATION
// ═══════════════════════════════════════════════════════════════
export interface MoveExplanation {
  lines: string[]
  quality: 'excellent' | 'good' | 'ok' | 'poor' | 'neutral'
  delta: number
  newPts: number
  who: 'player' | 'ai'
}

// ═══════════════════════════════════════════════════════════════
// PENDING CHOOSE
// ═══════════════════════════════════════════════════════════════
export interface PendingChoose {
  played: Card
  matches: Card[]
}

// ═══════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════
export interface GameState {
  playerHand: Card[]
  aiHand: Card[]
  field: Card[]
  drawPile: Card[]
  playerCaptured: Card[]
  aiCaptured: Card[]
  playerScore: number
  aiScore: number
  playerBreakdown: ScoreBreakdown[]
  aiBreakdown: ScoreBreakdown[]
  turn: 'player' | 'ai'
  phase: GamePhase
  lastExp: MoveExplanation | null
  history: MoveExplanation[]
  goCount: number
  pendingChoose: PendingChoose | null
  message: string
  winner: 'player' | 'ai' | 'draw' | null
  _hadTwoMatches: boolean
  scoreAtLastGo: number
}
