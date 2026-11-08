import { useEffect, useRef, useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'
import { GamePhase } from '../core/gameState'
import { selectAiCard, suggestPlayerCard } from '../core/ai'
import { cardValue } from '../core/scoring'
import { breakdownLabel } from '../core/labels'
import { MONTHS } from '../core/cards'
import type { Card } from '../core/cards'
import type { ScoreBreakdown } from '../core/gameState'
import { blip, buzz, cardSound } from '../lib/feedback'
import { planThrow } from '../lib/throwPlan'
import type { Staged } from '../lib/throwPlan'
import CardSVG from './CardSVG'
import Timeline from './Timeline'
import CapturedArea from './CapturedArea'
import Header from './Header'
import HelpModal from './HelpModal'
import { CaptureSummary, ScoreButton } from './PlayerStrip'

const HINTS_PER_ROUND = 3
// Breakdown entries that are multipliers/penalties, not combos worth celebrating
const NON_COMBO_KEYS = new Set(['go_bonus', 'shake_bonus', 'gobak', 'gwangbak', 'pibak', 'nagari_bonus', 'bomb'])

// Move pacing (ms). One table so the feel can be tuned in one place.
const T = {
  aiStart: 650,    // pause after the player's move before the AI acts
  aiReveal: 950,   // AI card shown face-up in its row before it is thrown
  land: 430,       // flight time until a thrown card smacks down
  throwRest: 800,  // after the hand card lands, before the pile flips
  flip: 700,       // pile card flip
  drawRest: 950,   // after the pile card lands, before captures are taken
}
// Flight of a thrown card (shared-layout animation from hand/pile to the table)
const FLIGHT = { type: 'spring' as const, stiffness: 190, damping: 24 }
// Captured cards slide toward whoever took them: down for the player, up for the AI
const fieldVariants = {
  exit: (dir: number) => ({ opacity: 0, y: dir * 90, scale: 0.55, transition: { duration: 0.55, ease: 'easeIn' } }),
}
// Small, stable tilt per card so stacked cards look tossed, not placed
const tilt = (id: number) => ((id * 37) % 9) - 4

const TYPE_KEY: Record<string, string> = {
  bright: 'typeBright', animal: 'typeAnimal', ribbon: 'typeRibbon', junk: 'typeJunk', double_junk: 'typeDoubleJunk',
}

export default function GameBoard() {
  const { t } = useTranslation()
  const { state: g, session, playCard, chooseMatch, declarePoktan, declareShake, callGo, callStop, skipHandCard, newGame, playAiTurn } = useGameStore()
  // Every step of a move animation is a timer here, so it can be cancelled as one
  const moveTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (ms: number, fn: () => void) => { moveTimers.current.push(setTimeout(fn, ms)) }
  const clearMove = () => { moveTimers.current.forEach(clearTimeout); moveTimers.current = [] }
  // Cards thrown onto the table but not yet resolved by the rules engine
  const [staged, setStaged] = useState<Staged[]>([])
  const [busy, setBusy] = useState(false)
  const lastMover = useRef<'player' | 'ai'>('player')
  const [helpOpen, setHelpOpen] = useState(false)
  const [shakeWhy, setShakeWhy] = useState(false)
  const [aiRevealCard, setAiRevealCard] = useState<Card | null>(null)
  const [drawnCard, setDrawnCard] = useState<Card | null>(null)
  // match-highlighting state
  const [selectedHandCard, setSelectedHandCard] = useState<Card | null>(null)
  const [hoverMonth, setHoverMonth] = useState<number | null>(null)
  // move toast
  const [toastVisible, setToastVisible] = useState(false)
  const [toastExpanded, setToastExpanded] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>()
  // hint
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_ROUND)
  const [hint, setHint] = useState<{ cardId: number; text: string } | null>(null)
  // combo celebration
  const [celebration, setCelebration] = useState<ScoreBreakdown | null>(null)
  const prevPlayerKeys = useRef<Set<string>>(new Set())

  // Play one move as a sequence: throw hand card(s) onto the table → slap →
  // flip the pile card → throw it onto its match → slap → commit to the store.
  const runThrow = (opts: {
    who: 'player' | 'ai'
    thrown: Card[]
    target: Card | null
    startAt?: number
    commit: () => void
  }) => {
    const { who, thrown, target, commit } = opts
    const top = g.drawPile[0] ?? null
    const plan = planThrow(g.field, thrown, target, top, who)
    const takes = target !== null || (plan.draw?.onto ?? null) !== null
    lastMover.current = who
    setBusy(true)
    let at = opts.startAt ?? 0
    if (plan.hand.length) {
      later(at, () => { setAiRevealCard(null); setStaged(plan.hand) })
      later(at + T.land, () => slap(who, target !== null))
      at += T.throwRest
    }
    if (plan.draw) {
      const d = plan.draw
      later(at, () => setDrawnCard(d.card))
      at += T.flip
      later(at, () => { setDrawnCard(null); setStaged(prev => [...prev, d]) })
      later(at + T.land, () => slap(who, d.onto !== null))
      at += T.drawRest
    }
    later(at, () => {
      commit()
      setStaged([])
      setBusy(false)
      if (takes) cardSound('swish')
    })
  }

  const slap = (who: 'player' | 'ai', onMatch: boolean) => {
    cardSound('slap', onMatch)
    if (who === 'player') buzz(onMatch ? 28 : 12)
  }

  const resetSelection = () => {
    setSelectedHandCard(null)
    setHoverMonth(null)
    setHint(null)
  }

  const handlePlayCard = (c: Card) => {
    resetSelection()
    const matches = g.field.filter(f => f.month === c.month)
    // Two possible captures: ask first, the throw happens after the choice
    if (matches.length === 2) { playCard(c); return }
    runThrow({ who: 'player', thrown: [c], target: matches[0] ?? null, commit: () => playCard(c) })
  }

  const handleChoose = (m: Card) => {
    const played = g.pendingChoose?.played
    if (!played || busy) return
    runThrow({ who: 'player', thrown: [played], target: m, commit: () => chooseMatch(m) })
  }

  // F4: tap-to-select, second-tap-to-play
  const handleCardTap = (c: Card) => {
    if (!isPlayer) return
    if (selectedHandCard?.id === c.id) {
      handlePlayCard(c)
    } else {
      setSelectedHandCard(c)
    }
  }

  // Show move toast after each turn, auto-dismiss after 5 s (unless expanded)
  useEffect(() => {
    if (!g.lastExp) return
    setToastVisible(true)
    setToastExpanded(false)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 5000)
    return () => clearTimeout(toastTimerRef.current)
  }, [g.history.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // New round → reset hints and celebration tracking
  useEffect(() => {
    if (g.history.length === 0) {
      setHintsLeft(HINTS_PER_ROUND)
      setHint(null)
      prevPlayerKeys.current = new Set()
    }
  }, [g.history.length])

  // Celebrate newly unlocked player combos (오광, 고도리, 홍단 …)
  useEffect(() => {
    const fresh = g.playerBreakdown.find(b => !NON_COMBO_KEYS.has(b.key) && !prevPlayerKeys.current.has(b.key))
    prevPlayerKeys.current = new Set(g.playerBreakdown.map(b => b.key))
    if (!fresh || g.phase === GamePhase.GAME_OVER) return
    setCelebration(fresh)
    buzz([20, 60, 20])
    blip('chord')
    const id = setTimeout(() => setCelebration(null), 2200)
    return () => clearTimeout(id)
  }, [g.playerBreakdown]) // eslint-disable-line react-hooks/exhaustive-deps

  // AI turn: pause → reveal its card in the AI row → throw it onto the table →
  // flip + throw the pile card → commit. Same sequence as the player's move.
  useEffect(() => {
    if (g.turn === 'ai' && g.phase === GamePhase.SELECT) {
      const poktan = g.pendingPoktan
      // Empty hand → the AI is taking a post-poktan bonus draw: only the pile flips
      const card = poktan ? poktan.handCards[0] : g.aiHand.length ? selectAiCard(g) : null
      const thrown = poktan ? poktan.handCards : card ? [card] : []
      // Same capture the rules engine will make (highest-value match)
      const matches = card ? g.field.filter(f => f.month === card.month) : []
      const target = poktan
        ? poktan.fieldCard
        : matches.length ? matches.reduce((a, b) => (cardValue(b) >= cardValue(a) ? b : a)) : null
      if (card) later(T.aiStart, () => { setToastVisible(false); setAiRevealCard(card) })
      runThrow({
        who: 'ai',
        thrown,
        target,
        startAt: card ? T.aiStart + T.aiReveal : T.aiStart,
        commit: playAiTurn,
      })
    }
    return () => {
      clearMove()
      setStaged([])
      setBusy(false)
      setAiRevealCard(null)
      setDrawnCard(null)
    }
  }, [g.turn, g.phase, g.aiHand.length, playAiTurn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => clearMove, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection when it's no longer the player's turn
  useEffect(() => {
    if (g.turn !== 'player' || g.phase !== GamePhase.SELECT) { setSelectedHandCard(null); setHint(null) }
  }, [g.turn, g.phase])

  // Responsive card sizes — larger on wide desktop
  const is2xl = useMemo(() => window.matchMedia('(min-width: 1536px)').matches, [])
  const sz = useMemo(() => ({
    ai: is2xl ? 54 : 44,
    field: is2xl ? 64 : 52,
    hand: is2xl ? 72 : 58,
    pile: is2xl ? 54 : 44,
  }), [is2xl])

  // Block player interaction while a move is animating
  const isPlayer = g.turn === 'player' && g.phase === GamePhase.SELECT && !drawnCard && !busy
  const isGoStop = g.phase === GamePhase.GOSTOP
  const isChoose = g.phase === GamePhase.CHOOSE_MATCH
  const isAI = g.turn === 'ai' && g.phase === GamePhase.SELECT
  const isOver = g.phase === GamePhase.GAME_OVER
  const canPoktan = isPlayer && g.pendingPoktan !== null
  const canShake = isPlayer && g.pendingShake.length > 0
  const canSkip = isPlayer && g.poktanSkipsRemaining > 0
  // Covers SELECT, GOSTOP, CHOOSE_MATCH — any phase where player must act
  const isPlayerTurn = g.turn === 'player' && !isOver
  const sheetOpen = (isChoose || canPoktan || canShake || canSkip) && !busy

  const aiGlow = '0 0 0 2px rgba(248,113,113,0.7), 0 0 20px rgba(248,113,113,0.25)'
  const playerGlow = '0 0 0 2px rgba(147,197,253,0.7), 0 0 20px rgba(147,197,253,0.25)'

  const toastBorder: Record<string, string> = {
    excellent: 'border-yellow-500/50', good: 'border-emerald-500/50',
    ok: 'border-blue-500/40', poor: 'border-red-500/50', neutral: 'border-slate-600/40',
  }
  const toastBg: Record<string, string> = {
    excellent: 'bg-yellow-950/95', good: 'bg-emerald-950/95',
    ok: 'bg-blue-950/95', poor: 'bg-red-950/95', neutral: 'bg-slate-900/95',
  }

  // F4: month to highlight on field — hover preview takes priority over selection
  const highlightMonth: number | null = hoverMonth ?? selectedHandCard?.month ?? null

  const typeName = (c: Card) => t(TYPE_KEY[c.type])

  const showHint = () => {
    if (!isPlayer || hintsLeft <= 0) return
    const s = suggestPlayerCard(g)
    if (!s) return
    const month = MONTHS[s.card.month - 1].ko
    const text = s.target
      ? t('hintCapture').replace('{{month}}', month).replace('{{type}}', typeName(s.target))
      : t('hintDiscard').replace('{{month}}', month).replace('{{type}}', typeName(s.card))
    setHint({ cardId: s.card.id, text })
    setSelectedHandCard(s.card)
    setHintsLeft(n => n - 1)
  }

  const handleGo = () => { buzz(30); blip('go'); callGo() }

  // Poktan: all three hand cards are slapped onto the field card, then the pile flips
  const handlePoktan = () => {
    const pk = g.pendingPoktan
    if (!pk) return
    resetSelection()
    runThrow({ who: 'player', thrown: pk.handCards, target: pk.fieldCard, commit: declarePoktan })
  }

  // Skip (post-poktan bonus draw): only the pile card is thrown
  const handleSkip = () => {
    resetSelection()
    runThrow({ who: 'player', thrown: [], target: null, commit: skipHandCard })
  }

  // Choose-match advice: recommend the more valuable card
  const chooseAdvice = (() => {
    if (!g.pendingChoose) return null
    const [a, b] = g.pendingChoose.matches
    if (cardValue(a) === cardValue(b)) return { best: null, text: t('chooseEqual') }
    const best = cardValue(a) > cardValue(b) ? a : b
    return { best, text: t('chooseRecommend').replace('{{type}}', typeName(best)) }
  })()

  const endReasonText = g.isNagari
    ? t('endNagari')
    : g.endReason === 'stop' ? t('endStop')
    : g.endReason === 'aiStop' ? t('endAiStop')
    : g.endReason === 'instant' ? t('endInstant')
    : t('endNatural')

  // Cards on the table but not yet in state leave the hand/AI row/pile right away
  const stagedIds = new Set(staged.map(s => s.card.id))
  const handShown = g.playerHand.filter(c => !stagedIds.has(c.id))
  const aiStaged = g.aiHand.filter(c => stagedIds.has(c.id)).length
  // AI face-down cards fan out with overlap so 10 cards always fit (no clipped sliver)
  const aiBacks = Array.from({ length: Math.max(0, g.aiHand.length - aiStaged - (aiRevealCard ? 1 : 0)) })
  const pileTopStaged = g.drawPile[0] !== undefined && stagedIds.has(g.drawPile[0].id)
  const pileCount = g.drawPile.length - (pileTopStaged ? 1 : 0)
  // The store updates synchronously on commit, so for one render a card can be both
  // staged and already on the field — the field copy wins.
  const fieldIds = new Set(g.field.map(c => c.id))
  const onTable = staged.filter(s => !fieldIds.has(s.card.id))
  // Table = field cards + thrown cards that landed on an empty spot
  const tableCards: Card[] = [...g.field, ...onTable.filter(s => s.onto === null).map(s => s.card)]
  const captureDir = lastMover.current === 'player' ? 1 : -1

  // Thrown cards resting on top of `id` (recursively: a pile card can land on a thrown card)
  const renderStack = (id: number, depth = 0): React.ReactNode =>
    onTable.filter(s => s.onto === id).map((s, i) => (
      <motion.div
        key={s.card.id}
        layoutId={`card-${s.card.id}`}
        className="absolute"
        style={{ left: 9 + 3 * i, top: 11 + 3 * i, zIndex: 10 + depth * 5 + i }}
        initial={{ opacity: 0, y: s.who === 'ai' ? -70 : 70, scale: 1.18 }}
        animate={{ opacity: 1, y: 0, rotate: tilt(s.card.id), scale: [1.18, 1.18, 0.93, 1] }}
        transition={{
          layout: FLIGHT,
          default: FLIGHT,
          scale: { duration: (T.land + 180) / 1000, times: [0, 0.7, 0.85, 1] },
        }}
      >
        <div style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))' }}>
          <CardSVG card={s.card} size={sz.field} />
        </div>
        {renderStack(s.card.id, depth + 1)}
      </motion.div>
    ))

  return (
    <div
      className="min-h-screen text-white flex flex-col select-none"
      style={{
        fontFamily: "'Noto Sans KR','Nanum Gothic',system-ui,sans-serif",
        background:
          'radial-gradient(ellipse 120% 80% at 50% 0%, #0c1a2e 0%, #060810 60%, #000 100%)',
      }}
    >
      <Header onHelpOpen={() => setHelpOpen(true)} />
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      <div
        className="flex-1 flex flex-col xl:flex-row gap-2 p-2 sm:p-3 xl:p-5 w-full"
        style={{ paddingBottom: sheetOpen ? 140 : undefined }}
      >

        {/* BOARD */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">

          {/* AI row */}
          <motion.div
            className="rounded-2xl border border-white/6 bg-white/3 px-3 py-2 relative"
            animate={{ boxShadow: isAI ? aiGlow : 'none', opacity: isPlayerTurn ? 0.55 : 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-red-400/90 font-bold text-sm flex-shrink-0">🤖 {t('aiLabel')}</span>
              {isAI && (
                <span className="text-yellow-300/70 text-xs flex-shrink-0">{t('aiThinks')}</span>
              )}
              <div className="flex items-center flex-1 min-w-0 pl-1">
                <AnimatePresence>
                  {aiBacks.map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                      style={{ flexShrink: 0, marginLeft: i === 0 ? 0 : -6, filter: 'drop-shadow(-1px 0 1px rgba(0,0,0,0.8))' }}
                    >
                      <CardSVG card={{ id: `back_${i}`, month: 0 }} faceDown size={20} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!g.aiHand.length && !aiRevealCard && <span className="text-slate-700 text-xs">–</span>}
                {aiRevealCard && (
                  // Zero-height anchor: the revealed card floats over the row instead of growing it
                  <div className="ml-2 relative flex-shrink-0" style={{ width: sz.ai, height: 30 }}>
                  <motion.div
                    layoutId={`card-${aiRevealCard.id}`}
                    style={{ position: 'absolute', left: 0, top: -4, width: sz.ai, height: Math.round(sz.ai * 1.52), zIndex: 20 }}
                  >
                    <motion.div
                      style={{ position: 'absolute', transformOrigin: 'center' }}
                      animate={{ scaleX: [1, 0, 0] }}
                      transition={{ duration: 0.7, times: [0, 0.45, 1], ease: 'easeInOut' }}
                    >
                      <CardSVG card={{ id: 'back_reveal', month: 0 }} faceDown size={sz.ai} />
                    </motion.div>
                    <motion.div
                      style={{ position: 'absolute', transformOrigin: 'center' }}
                      animate={{ scaleX: [0, 0, 1] }}
                      transition={{ duration: 0.7, times: [0, 0.45, 1], ease: 'easeInOut' }}
                    >
                      <CardSVG card={aiRevealCard} size={sz.ai} />
                    </motion.div>
                  </motion.div>
                  </div>
                )}
              </div>
              <ScoreButton
                label={`🤖 ${t('aiLabel')}`}
                score={g.aiScore}
                breakdown={g.aiBreakdown}
                captured={g.aiCaptured}
                accent="text-red-300"
              />
            </div>
            <div className="mt-1.5">
              <CaptureSummary
                label={`🤖 ${t('aiLabel')}`}
                score={g.aiScore}
                breakdown={g.aiBreakdown}
                captured={g.aiCaptured}
                accent="text-red-300"
              />
            </div>
          </motion.div>

          {/* Nagari multiplier — stable indicator, shown between rounds */}
          {g.nagariMultiplier > 1 && !isOver && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-1 flex items-center gap-2">
              <span className="text-amber-400 text-sm">🔄</span>
              <span className="text-amber-300/80 text-xs font-semibold">
                {t('nagariMultiplier').replace('{{n}}', String(g.nagariMultiplier))}
              </span>
            </div>
          )}

          {/* Field */}
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/15 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-emerald-500/80 text-sm font-semibold">🍀 {t('field')}</span>
            </div>
            <div className="flex gap-2 min-h-[5rem] items-center">
              <div className="flex gap-2 flex-wrap flex-1 items-center">
                <AnimatePresence mode="popLayout" custom={captureDir}>
                  {tableCards.length === 0 ? (
                    <span className="text-slate-700 text-sm italic">–</span>
                  ) : (
                    tableCards.map(c => {
                      const isMatch = highlightMonth !== null && c.month === highlightMonth
                      const isDimmed = highlightMonth !== null && c.month !== highlightMonth
                      const thrownHere = onTable.find(s => s.card.id === c.id)
                      const hit = onTable.some(s => s.onto === c.id)
                      return (
                        <motion.div
                          key={c.id}
                          layoutId={`card-${c.id}`}
                          layout
                          custom={captureDir}
                          variants={fieldVariants}
                          initial={thrownHere ? { scale: 1.18 } : { scale: 0.6, opacity: 0, y: -20 }}
                          animate={{
                            scale: thrownHere ? [1.18, 1.18, 0.93, 1] : isMatch ? 1.08 : 1,
                            opacity: isDimmed ? 0.35 : 1,
                            y: isMatch ? -4 : 0,
                            // the card underneath jolts when something is slapped onto it
                            x: hit ? [0, 0, -3, 3, -1, 0] : 0,
                          }}
                          exit="exit"
                          transition={{
                            layout: FLIGHT,
                            default: { type: 'spring', stiffness: 260, damping: 24 },
                            scale: thrownHere ? { duration: (T.land + 180) / 1000, times: [0, 0.7, 0.85, 1] } : { type: 'spring', stiffness: 260, damping: 24 },
                            x: { duration: (T.land + 250) / 1000, times: [0, 0.62, 0.72, 0.82, 0.92, 1] },
                          }}
                          style={{ position: 'relative' }}
                        >
                          <CardSVG card={c} size={sz.field} highlighted={isMatch} />
                          {renderStack(c.id)}
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>

              {/* Draw pile */}
              <AnimatePresence>
                {(pileCount > 0 || drawnCard) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex-shrink-0 ml-1"
                    style={{ position: 'relative', width: sz.pile + 8, height: Math.round(sz.pile * 1.52) + 8 }}
                  >
                    {pileCount > 2 && (
                      <div style={{ position: 'absolute', top: -4, left: -4, opacity: 0.35 }}>
                        <CardSVG card={{ id: 'pile_2', month: 0 }} faceDown size={sz.pile} />
                      </div>
                    )}
                    {pileCount > 1 && (
                      <div style={{ position: 'absolute', top: -2, left: -2, opacity: 0.65 }}>
                        <CardSVG card={{ id: 'pile_1', month: 0 }} faceDown size={sz.pile} />
                      </div>
                    )}
                    {drawnCard ? (
                      <motion.div
                        layoutId={`card-${drawnCard.id}`}
                        style={{ position: 'absolute', top: 0, left: 0, width: sz.pile, height: Math.round(sz.pile * 1.52) }}
                      >
                        <motion.div
                          style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'center' }}
                          animate={{ scaleX: [1, 0, 0] }}
                          transition={{ duration: T.flip / 1000 * 0.85, times: [0, 0.45, 1], ease: 'easeInOut' }}
                        >
                          <CardSVG card={{ id: 'pile_top', month: 0 }} faceDown size={sz.pile} />
                        </motion.div>
                        <motion.div
                          style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'center' }}
                          animate={{ scaleX: [0, 0, 1] }}
                          transition={{ duration: T.flip / 1000 * 0.85, times: [0, 0.45, 1], ease: 'easeInOut' }}
                        >
                          <CardSVG card={drawnCard} size={sz.pile} />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <AnimatePresence>
                        <motion.div
                          key={pileCount}
                          style={{ position: 'absolute', top: 0, left: 0 }}
                          initial={{ y: -18, opacity: 0, scale: 0.85 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ y: -28, opacity: 0, scale: 0.85 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        >
                          <CardSVG card={{ id: 'pile_top', month: 0 }} faceDown size={sz.pile} />
                        </motion.div>
                      </AnimatePresence>
                    )}
                    <motion.div
                      key={`count-${pileCount}`}
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        background: 'rgba(0,0,0,0.75)', color: 'rgba(255,255,255,0.7)',
                        fontSize: 10, fontWeight: 'bold', borderRadius: 6, padding: '1px 5px',
                        fontFamily: 'monospace', lineHeight: '16px',
                      }}
                    >
                      {pileCount}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Player hand */}
          <motion.div
            className="rounded-2xl border border-white/6 bg-white/3 px-3 py-2 relative"
            animate={{ boxShadow: isPlayerTurn ? playerGlow : 'none', opacity: isAI ? 0.55 : 1 }}
            transition={{ duration: 0.4 }}
            onClick={(e) => { if (e.currentTarget === e.target) setSelectedHandCard(null) }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-blue-300/90 font-bold text-sm flex-shrink-0">👤 {t('yourHand')}</span>
                {isPlayer && !hint && (
                  <span className="bg-blue-500/15 border border-blue-500/30 text-blue-300/80 text-xs px-2 py-0.5 rounded-full truncate">
                    {selectedHandCard ? t('tapAgainToPlay') : t('selectHint')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isPlayer && g.playerHand.length > 0 && (
                  <button
                    onClick={showHint}
                    disabled={hintsLeft <= 0}
                    className="text-xs px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 disabled:opacity-35"
                  >
                    💡 {t('hint')} <span className="text-amber-200/60">{t('hintsLeft').replace('{{n}}', String(hintsLeft))}</span>
                  </button>
                )}
                <ScoreButton
                  label={`👤 ${t('you')}`}
                  score={g.playerScore}
                  breakdown={g.playerBreakdown}
                  captured={g.playerCaptured}
                  accent="text-blue-300"
                />
              </div>
            </div>
            {hint && (
              <p className="text-amber-200/90 text-xs mb-1.5 leading-snug">💡 {hint.text}</p>
            )}
            <div className="mb-2">
              <CaptureSummary
                label={`👤 ${t('you')}`}
                score={g.playerScore}
                breakdown={g.playerBreakdown}
                captured={g.playerCaptured}
                accent="text-blue-300"
              />
            </div>
            <div className="flex gap-2 flex-wrap min-h-[4rem] items-end">
              <AnimatePresence mode="popLayout">
                {handShown.map(c => {
                  const isSelected = selectedHandCard?.id === c.id
                  const isHinted = hint?.cardId === c.id
                  const isHandDimmed = (!isPlayer && !isChoose) || (highlightMonth !== null && !isSelected && c.month !== highlightMonth)
                  return (
                    <motion.div
                      key={c.id}
                      layoutId={`card-${c.id}`}
                      layout
                      initial={{ scale: 0.7, opacity: 0, y: 16 }}
                      animate={{ scale: 1, opacity: isHandDimmed ? 0.4 : 1, y: 0 }}
                      exit={{ scale: 0.8, opacity: 0, y: -20 }}
                      whileHover={isPlayer ? { scale: 1.1, y: -8 } : undefined}
                      whileTap={isPlayer ? { scale: 0.95 } : undefined}
                      onHoverStart={() => { if (isPlayer) setHoverMonth(c.month) }}
                      onHoverEnd={() => setHoverMonth(null)}
                      transition={{ type: 'spring', stiffness: 280, damping: 24, layout: FLIGHT }}
                      style={{ cursor: isPlayer ? 'pointer' : 'default', position: 'relative' }}
                    >
                      <CardSVG
                        card={c}
                        size={sz.hand}
                        onClick={isPlayer ? () => handleCardTap(c) : null}
                        selected={isSelected}
                        dimmed={false}
                      />
                      {isHinted && (
                        <span className="absolute -top-2 -right-1.5 text-sm bg-amber-400 text-black rounded-full w-5 h-5 flex items-center justify-center shadow pointer-events-none">💡</span>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {!g.playerHand.length && <span className="text-slate-700 text-xs">–</span>}
            </div>

            {/* GO / STOP */}
            {isGoStop && (
              <div className="mt-3 pt-3 border-t border-white/8 flex flex-wrap items-center gap-3">
                <p className="text-yellow-300/90 text-sm font-semibold flex-1">{t('canGoStop')}</p>
                <button
                  onClick={handleGo}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-base shadow-lg shadow-emerald-900/40 transition-all"
                >
                  {t('go')}
                </button>
                <button
                  onClick={callStop}
                  className="bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-base shadow-lg shadow-red-900/40 transition-all"
                >
                  {t('stop')}
                </button>
              </div>
            )}
          </motion.div>

          {/* Game over — result panel */}
          {isOver && (
            <div
              className="rounded-2xl border-2 p-4 flex flex-col gap-3"
              style={{
                borderColor: g.isNagari ? 'rgba(251,191,36,0.5)' : 'rgba(234,179,8,0.5)',
                background: g.isNagari
                  ? 'radial-gradient(ellipse at center, rgba(80,20,120,0.5) 0%, rgba(0,0,0,0.2) 100%)'
                  : 'radial-gradient(ellipse at center, rgba(120,60,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
              }}
            >
              <div className="text-center">
                <p className="text-4xl mb-1">
                  {g.isNagari ? '🔄' : g.winner === 'player' ? '🎉' : g.winner === 'ai' ? '🤖' : '🤝'}
                </p>
                <p className="text-yellow-300 text-xl font-black">
                  {g.isNagari
                    ? t('nagariDraw')
                    : g.winner === 'player'
                      ? `${t('winner')}: ${t('you')} · ${g.playerScore}${t('pts')}`
                      : g.winner === 'ai'
                        ? `${t('winner')}: ${t('ai')} · ${g.aiScore}${t('pts')}`
                        : t('draw')}
                </p>
                <p className="text-white/75 text-sm mt-1">{endReasonText}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ResultColumn title={`👤 ${t('you')}`} score={g.playerScore} breakdown={g.playerBreakdown} empty={t('noPoints')} accent="text-blue-300" />
                <ResultColumn title={`🤖 ${t('aiLabel')}`} score={g.aiScore} breakdown={g.aiBreakdown} empty={t('noPoints')} accent="text-red-300" />
              </div>
              <button
                onClick={newGame}
                className="self-center bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black px-8 py-2.5 rounded-xl transition-all shadow-lg"
              >
                {t('newRound')} →
              </button>
            </div>
          )}

        </div>

        {/* SIDEBAR */}
        <div className="xl:w-80 2xl:w-96 flex flex-col gap-2.5 min-w-0">

          {/* Session panel — desktop only; mobile shows it compactly in the header */}
          <div className="hidden xl:block rounded-2xl border border-white/6 bg-white/3 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/30 text-[10px] uppercase tracking-widest">{t('sessionTitle')}</p>
            </div>
            <div className="flex gap-4 mb-2">
              <div className="text-center">
                <p className="text-blue-300 text-lg font-black tabular-nums">{session.playerTotal}</p>
                <p className="text-blue-300/50 text-[10px]">👤 {t('sessionTotal')}</p>
              </div>
              <div className="text-center">
                <p className="text-red-300 text-lg font-black tabular-nums">{session.aiTotal}</p>
                <p className="text-red-300/50 text-[10px]">🤖 {t('sessionTotal')}</p>
              </div>
              <div className="text-center ml-auto">
                <p className="text-white/60 text-lg font-black tabular-nums">{session.round}</p>
                <p className="text-white/30 text-[10px]">{t('sessionRound')}</p>
              </div>
            </div>
            {session.rounds.length > 0 && (
              <div className="space-y-0.5">
                {session.rounds.map(r => (
                  <div key={r.round} className="flex items-center gap-2 text-[11px]">
                    <span className="text-white/30 w-5">R{r.round}</span>
                    {r.isNagari ? (
                      <span className="text-purple-300/70 flex-1">🔄 {t('nagariShort')}</span>
                    ) : r.winner === 'player' ? (
                      <span className="text-blue-300/70 flex-1">👤 +{r.playerScore}{t('pts')}</span>
                    ) : r.winner === 'ai' ? (
                      <span className="text-red-300/70 flex-1">🤖 +{r.aiScore}{t('pts')}</span>
                    ) : (
                      <span className="text-white/40 flex-1">{t('draw')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {g.history.length > 0 && (
            <div className="rounded-2xl border border-white/6 bg-white/3 p-3">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">
                {t('timeline')}
              </p>
              <Timeline history={g.history} />
            </div>
          )}

          <div className="hidden xl:block rounded-2xl border border-white/6 bg-white/3 p-3 flex-1 overflow-y-auto">
            <CapturedArea cards={g.playerCaptured} label={`👤 ${t('captured')}`} accent="text-blue-300/80" />
          </div>

          <div className="hidden xl:block rounded-2xl border border-white/6 bg-white/3 p-3">
            <CapturedArea cards={g.aiCaptured} label={`🤖 ${t('captured')}`} accent="text-red-300/80" />
          </div>
        </div>
      </div>

      {/* ── ACTION SHEET — slides up from bottom, never pushes layout ──────── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div
              className="bg-slate-900/95 backdrop-blur-md border-t border-white/10 px-3 pt-3 space-y-3"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Choose match — with the played card and a recommendation */}
              {isChoose && g.pendingChoose && (
                <div>
                  <p className="text-yellow-300 font-bold text-sm mb-2">{t('chooseMatch')}</p>
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col items-center gap-1 opacity-80">
                      <CardSVG card={g.pendingChoose.played} size={40} />
                      <span className="text-[10px] text-white/50">{t('chooseYouPlayed')}</span>
                    </div>
                    <span className="text-white/40 text-xl pb-6">→</span>
                    {g.pendingChoose.matches.map(c => (
                      <button key={c.id} onClick={() => handleChoose(c)} className="relative transition-transform active:scale-95 hover:scale-105">
                        <CardSVG card={c} size={sz.hand} highlighted />
                        {chooseAdvice?.best?.id === c.id && (
                          <span className="absolute -top-2 -right-2 text-[10px] font-black bg-emerald-500 text-black rounded-full px-1.5 py-0.5 shadow">★</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {chooseAdvice && <p className="text-emerald-200/85 text-xs mt-2">💡 {chooseAdvice.text}</p>}
                </div>
              )}
              {/* Poktan */}
              {canPoktan && g.pendingPoktan && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-orange-300 font-black text-sm">💣 {t('poktanTitle')}</p>
                    <p className="text-orange-200/70 text-xs leading-snug">{t('poktanDesc')}</p>
                  </div>
                  <div className="flex gap-1 items-center flex-shrink-0">
                    {[...g.pendingPoktan.handCards, g.pendingPoktan.fieldCard].map((c, i) => (
                      <div key={c.id} className="relative">
                        <CardSVG card={c} size={28} />
                        {i === g.pendingPoktan!.handCards.length && (
                          <span className="absolute -top-1 -right-1 text-[8px] bg-orange-500 text-white rounded-full px-1 font-bold leading-4">F</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={handlePoktan} className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black px-3 py-2 rounded-xl text-sm shadow-lg shadow-orange-900/40 transition-all flex-shrink-0">
                    💣 Go!
                  </button>
                </div>
              )}
              {/* Shake */}
              {canShake && g.pendingShake.map(shake => (
                <div key={shake.handCards[0].month} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-purple-300 font-black text-sm">👋 {t('shakeTitle')}</p>
                    <p className="text-purple-200/70 text-xs leading-snug">
                      {t('shakeDesc')}{' '}
                      <button
                        type="button"
                        onClick={() => setShakeWhy(w => !w)}
                        aria-expanded={shakeWhy}
                        className="underline decoration-dotted text-purple-200/90"
                      >
                        {t('why')}
                      </button>
                    </p>
                    {shakeWhy && <p className="text-purple-100/85 text-xs leading-snug mt-1">{t('shakeWhy')}</p>}
                  </div>
                  <div className="flex gap-1 items-center flex-shrink-0">
                    {shake.handCards.map(c => <CardSVG key={c.id} card={c} size={28} />)}
                  </div>
                  <button onClick={() => { buzz(20); declareShake(shake) }} className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black px-3 py-2 rounded-xl text-sm shadow-lg shadow-purple-900/40 transition-all flex-shrink-0">
                    👋 Shake
                  </button>
                </div>
              ))}
              {/* Skip */}
              {canSkip && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-cyan-300 font-black text-sm">⏭️ {t('skipAvailable')}</p>
                    <p className="text-cyan-200/70 text-xs leading-snug">{t('skipHandCard')} · {g.poktanSkipsRemaining} {t('skipRemaining')}</p>
                  </div>
                  <button onClick={handleSkip} className="bg-cyan-700 hover:bg-cyan-600 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-sm shadow-lg shadow-cyan-900/40 transition-all flex-shrink-0">
                    ⏭️ Skip
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOVE TOAST — top of screen, compact, tap to expand ──────────────── */}
      <AnimatePresence>
        {toastVisible && g.lastExp && !isOver && (
          <motion.div
            key={g.history.length}
            className="fixed left-2 right-2 z-50 sm:left-auto sm:right-4 sm:w-[420px]"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <div
              role="status"
              onClick={() => {
                clearTimeout(toastTimerRef.current)
                // Tap expands a multi-line toast; a second tap (or a one-liner) dismisses it
                if (toastExpanded || g.lastExp!.lines.length <= 1) setToastVisible(false)
                else setToastExpanded(true)
              }}
              className={`rounded-xl border ${toastBorder[g.lastExp.quality] ?? toastBorder.neutral} ${toastBg[g.lastExp.quality] ?? toastBg.neutral} px-3 py-2 backdrop-blur-sm shadow-xl cursor-pointer`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs pt-0.5">{g.lastExp.who === 'player' ? '👤' : '🤖'}</span>
                <div className="flex-1 min-w-0">
                  {(toastExpanded ? g.lastExp.lines : g.lastExp.lines.slice(0, 1)).map((l, i) => (
                    <p key={i} className={`text-white/90 text-[13px] leading-snug ${toastExpanded ? '' : 'truncate'}`}>{l}</p>
                  ))}
                </div>
                {g.lastExp.lines.length > 1 && (
                  <span className="text-white/50 text-[11px] pt-0.5 flex-shrink-0">{toastExpanded ? '▴' : `+${g.lastExp.lines.length - 1} ▾`}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMBO CELEBRATION ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            className="fixed inset-x-0 z-[55] flex justify-center pointer-events-none"
            style={{ top: '38%' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <div className="mx-4 rounded-2xl border-2 border-yellow-400/70 bg-gradient-to-b from-yellow-500/30 to-amber-900/80 backdrop-blur-md px-6 py-4 text-center shadow-2xl shadow-yellow-900/50">
              <p className="text-4xl leading-none mb-1">{celebration.emoji}</p>
              <p className="text-yellow-200 text-xl font-black">{breakdownLabel(celebration, t)}</p>
              <p className="text-yellow-300 font-black text-lg">+{celebration.pts} {t('pts')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ResultColumn({ title, score, breakdown, empty, accent }: {
  title: string; score: number; breakdown: ScoreBreakdown[]; empty: string; accent: string
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl bg-black/30 border border-white/8 p-2.5 min-w-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className={`text-xs font-bold ${accent}`}>{title}</span>
        <span className={`font-black tabular-nums ${accent}`}>{score}</span>
      </div>
      {breakdown.length === 0 ? (
        <p className="text-white/35 text-[11px] italic">{empty}</p>
      ) : (
        breakdown.map((b, i) => (
          <div key={i} className="flex justify-between gap-1 text-[11px] leading-snug py-0.5">
            <span className="text-white/75 min-w-0">{b.emoji} {breakdownLabel(b, t)}</span>
            <span className="text-yellow-300/90 font-bold flex-shrink-0">+{b.pts}</span>
          </div>
        ))
      )}
    </div>
  )
}
