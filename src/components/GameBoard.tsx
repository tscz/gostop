import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'
import { GamePhase } from '../core/gameState'
import { selectAiCard } from '../core/ai'
import type { Card } from '../core/cards'
import CardSVG from './CardSVG'
import ScorePanel from './ScorePanel'
import ExplainerPanel from './ExplainerPanel'
import Timeline from './Timeline'
import CapturedArea from './CapturedArea'
import Header from './Header'
import HelpModal from './HelpModal'

export default function GameBoard() {
  const { t } = useTranslation()
  const { state: g, playCard, chooseMatch, declarePoktan, callGo, callStop, newGame, playAiTurn } = useGameStore()
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const aiRevealTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const aiClearTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const drawnCardTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const drawnCardClearTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [helpOpen, setHelpOpen] = useState(false)
  const [aiRevealCard, setAiRevealCard] = useState<Card | null>(null)
  const [drawnCard, setDrawnCard] = useState<Card | null>(null)

  // Intercept player card play: flip the pile card first, then execute
  const handlePlayCard = (c: Card) => {
    const top = g.drawPile[0] ?? null
    setDrawnCard(top)
    drawnCardTimerRef.current = setTimeout(() => {
      playCard(c)
      drawnCardClearTimerRef.current = setTimeout(() => setDrawnCard(null), 500)
    }, 650)
  }

  // AI turn effect — sequential: wait for player animation → flip hand card → flip pile card → move
  useEffect(() => {
    if (g.turn === 'ai' && g.phase === GamePhase.SELECT) {
      const card = g.pendingPoktan ? g.pendingPoktan.handCards[0] : selectAiCard(g)
      const top = g.drawPile[0] ?? null

      // Step 1: wait for player animation, then flip AI hand card
      aiRevealTimerRef.current = setTimeout(() => setAiRevealCard(card), 700)

      // Step 2: after AI card flip, flip the pile card
      aiTimerRef.current = setTimeout(() => setDrawnCard(top), 700 + 550 + 400)

      // Step 3: after pile flip, fire the turn
      aiClearTimerRef.current = setTimeout(() => {
        playAiTurn()
        setTimeout(() => {
          setAiRevealCard(null)
          setDrawnCard(null)
        }, 500)
      }, 700 + 550 + 400 + 600)
    }
    return () => {
      clearTimeout(aiRevealTimerRef.current)
      clearTimeout(aiTimerRef.current)
      clearTimeout(aiClearTimerRef.current)
      clearTimeout(drawnCardTimerRef.current)
      clearTimeout(drawnCardClearTimerRef.current)
      setAiRevealCard(null)
      setDrawnCard(null)
    }
  }, [g.turn, g.phase, g.aiHand.length, playAiTurn])

  // Block player interaction while pile flip is in progress
  const isPlayer = g.turn === 'player' && g.phase === GamePhase.SELECT && !drawnCard
  const isGoStop = g.phase === GamePhase.GOSTOP
  const isChoose = g.phase === GamePhase.CHOOSE_MATCH
  const isAI = g.turn === 'ai' && g.phase === GamePhase.SELECT
  const isOver = g.phase === GamePhase.GAME_OVER
  const canPoktan = isPlayer && g.pendingPoktan !== null

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

      <div className="flex-1 flex flex-col xl:flex-row gap-3 p-3 max-w-7xl mx-auto w-full">

        {/* BOARD */}
        <div className="flex-1 flex flex-col gap-2.5 min-w-0">

          {/* AI row */}
          <div className="rounded-2xl border border-white/6 bg-white/3 p-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-red-400/90 font-bold text-sm">🤖 {t('aiLabel')}</span>
                {isAI && (
                  <span className="text-yellow-300/80 text-xs animate-pulse">{t('aiThinks')}</span>
                )}
              </div>
              <ScorePanel
                score={g.aiScore}
                breakdown={g.aiBreakdown}
                label={t('score')}
                accent="text-red-300"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap min-h-[3rem] items-center">
              <AnimatePresence>
                {(aiRevealCard ? g.aiHand.slice(0, -1) : g.aiHand).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0, y: -16 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  >
                    <CardSVG card={{ id: `back_${i}`, month: 0 }} faceDown size={44} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Flip reveal: face-down → face-up, then layoutId flies it to the field */}
              {aiRevealCard && (
                <motion.div
                  layoutId={`card-${aiRevealCard.id}`}
                  style={{ position: 'relative', width: 44, height: 67 }}
                >
                  {/* Back face — scaleX squishes to 0 over first half */}
                  <motion.div
                    style={{ position: 'absolute', transformOrigin: 'center' }}
                    animate={{ scaleX: [1, 0, 0] }}
                    transition={{ duration: 0.55, times: [0, 0.45, 1], ease: 'easeInOut' }}
                  >
                    <CardSVG card={{ id: 'back_reveal', month: 0 }} faceDown size={44} />
                  </motion.div>
                  {/* Front face — scaleX expands from 0 over second half */}
                  <motion.div
                    style={{ position: 'absolute', transformOrigin: 'center' }}
                    animate={{ scaleX: [0, 0, 1] }}
                    transition={{ duration: 0.55, times: [0, 0.45, 1], ease: 'easeInOut' }}
                  >
                    <CardSVG card={aiRevealCard} size={44} />
                  </motion.div>
                </motion.div>
              )}

              {!g.aiHand.length && !aiRevealCard && <span className="text-slate-700 text-xs">–</span>}
            </div>
          </div>

          {/* Field */}
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/15 p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-emerald-500/80 text-sm font-semibold">🍀 {t('field')}</span>
            </div>
            <div className="flex gap-2 min-h-[5rem] items-center">
              {/* Field cards */}
              <div className="flex gap-2 flex-wrap flex-1 items-center">
                <AnimatePresence mode="popLayout">
                  {g.field.length === 0 ? (
                    <span className="text-slate-700 text-sm italic">–</span>
                  ) : (
                    g.field.map(c => (
                      <motion.div
                        key={c.id}
                        layoutId={`card-${c.id}`}
                        layout
                        initial={{ scale: 0.6, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 1.2, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                      >
                        <CardSVG card={c} size={52} />
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Draw pile */}
              <AnimatePresence>
                {g.drawPile.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex-shrink-0 ml-1"
                    style={{ position: 'relative', width: 52, height: 79 }}
                  >
                    {/* Shadow cards for stack depth */}
                    {g.drawPile.length > 2 && (
                      <div style={{ position: 'absolute', top: -4, left: -4, opacity: 0.35 }}>
                        <CardSVG card={{ id: 'pile_2', month: 0 }} faceDown size={44} />
                      </div>
                    )}
                    {g.drawPile.length > 1 && (
                      <div style={{ position: 'absolute', top: -2, left: -2, opacity: 0.65 }}>
                        <CardSVG card={{ id: 'pile_1', month: 0 }} faceDown size={44} />
                      </div>
                    )}
                    {/* Top card — flip when a card is being drawn */}
                    {drawnCard ? (
                      <motion.div
                        layoutId={`card-${drawnCard.id}`}
                        style={{ position: 'absolute', top: 0, left: 0, width: 44, height: 67 }}
                      >
                        {/* Back face squishes away */}
                        <motion.div
                          style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'center' }}
                          animate={{ scaleX: [1, 0, 0] }}
                          transition={{ duration: 0.5, times: [0, 0.45, 1], ease: 'easeInOut' }}
                        >
                          <CardSVG card={{ id: 'pile_top', month: 0 }} faceDown size={44} />
                        </motion.div>
                        {/* Front face expands in */}
                        <motion.div
                          style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'center' }}
                          animate={{ scaleX: [0, 0, 1] }}
                          transition={{ duration: 0.5, times: [0, 0.45, 1], ease: 'easeInOut' }}
                        >
                          <CardSVG card={drawnCard} size={44} />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <AnimatePresence>
                        <motion.div
                          key={g.drawPile.length}
                          style={{ position: 'absolute', top: 0, left: 0 }}
                          initial={{ y: -18, opacity: 0, scale: 0.85 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ y: -28, opacity: 0, scale: 0.85 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        >
                          <CardSVG card={{ id: 'pile_top', month: 0 }} faceDown size={44} />
                        </motion.div>
                      </AnimatePresence>
                    )}
                    {/* Count badge */}
                    <motion.div
                      key={`count-${g.drawPile.length}`}
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.75)',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 10,
                        fontWeight: 'bold',
                        borderRadius: 6,
                        padding: '1px 5px',
                        fontFamily: 'monospace',
                        lineHeight: '16px',
                      }}
                    >
                      {g.drawPile.length}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Poktan declaration */}
          {canPoktan && g.pendingPoktan && (
            <div className="rounded-2xl border-2 border-orange-500/40 bg-orange-950/30 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <p className="text-orange-300 font-black text-sm mb-0.5">💣 폭탄 Poktan!</p>
                  <p className="text-orange-200/60 text-xs">{t('poktanDesc')}</p>
                </div>
                <div className="flex gap-1.5 items-center">
                  {[...g.pendingPoktan.handCards, g.pendingPoktan.fieldCard].map((c, i) => (
                    <div key={c.id} className="relative">
                      <CardSVG card={c} size={46} />
                      {i === g.pendingPoktan!.handCards.length && (
                        <span className="absolute -top-1 -right-1 text-[9px] bg-orange-500 text-white rounded-full px-1 font-bold leading-4">field</span>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={declarePoktan}
                  className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-sm shadow-lg shadow-orange-900/40 transition-all"
                >
                  💣 Poktan!
                </button>
              </div>
            </div>
          )}

          {/* Choose match */}
          {isChoose && g.pendingChoose && (
            <div className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-950/30 p-3">
              <p className="text-yellow-300 font-bold text-sm mb-2.5">{t('chooseMatch')}</p>
              <div className="flex gap-3">
                {g.pendingChoose.matches.map(c => (
                  <button
                    key={c.id}
                    onClick={() => chooseMatch(c)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <CardSVG card={c} size={58} highlighted />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player hand */}
          <div className="rounded-2xl border border-white/6 bg-white/3 p-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-blue-300/90 font-bold text-sm">👤 {t('yourHand')}</span>
                {isPlayer && (
                  <span className="bg-blue-500/15 border border-blue-500/30 text-blue-300/80 text-xs px-2 py-0.5 rounded-full">
                    {t('selectHint')}
                  </span>
                )}
              </div>
              <ScorePanel
                score={g.playerScore}
                breakdown={g.playerBreakdown}
                label={t('score')}
                accent="text-blue-300"
              />
            </div>
            <div className="flex gap-2 flex-wrap min-h-[4rem] items-end">
              <AnimatePresence mode="popLayout">
                {g.playerHand.map(c => (
                  <motion.div
                    key={c.id}
                    layoutId={`card-${c.id}`}
                    layout
                    initial={{ scale: 0.7, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: -20 }}
                    whileHover={isPlayer ? { scale: 1.12, y: -10 } : undefined}
                    whileTap={isPlayer ? { scale: 0.95 } : undefined}
                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                    style={{ cursor: isPlayer ? 'pointer' : 'default' }}
                  >
                    <CardSVG
                      card={c}
                      size={58}
                      onClick={isPlayer ? () => handlePlayCard(c) : null}
                      dimmed={!isPlayer && !isChoose}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {!g.playerHand.length && <span className="text-slate-700 text-xs">–</span>}
            </div>

            {/* GO / STOP */}
            {isGoStop && (
              <div className="mt-3 pt-3 border-t border-white/8 flex flex-wrap items-center gap-3">
                <p className="text-yellow-300/90 text-sm font-semibold flex-1">{t('canGoStop')}</p>
                <button
                  onClick={callGo}
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
          </div>

          {/* Game over */}
          {isOver && (
            <div
              className="rounded-2xl border-2 border-yellow-500/50 p-5 text-center"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(120,60,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
              }}
            >
              <p className="text-5xl mb-2">
                {g.winner === 'player' ? '🎉' : g.winner === 'ai' ? '🤖' : '🤝'}
              </p>
              <p className="text-yellow-300 text-2xl font-black mb-1">{t('gameOver')}</p>
              <p className="text-white/80">
                {t('winner')}:{' '}
                {g.winner === 'player'
                  ? `${t('you')} (${g.playerScore}${t('pts')})`
                  : g.winner === 'ai'
                    ? `${t('ai')} (${g.aiScore}${t('pts')})`
                    : t('draw')}
              </p>
              <button
                onClick={newGame}
                className="mt-4 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black px-8 py-2.5 rounded-xl transition-all shadow-lg"
              >
                {t('newGame')}
              </button>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="xl:w-72 flex flex-col gap-2.5 min-w-0">
          <ExplainerPanel exp={g.lastExp} />

          {g.history.length > 0 && (
            <div className="rounded-2xl border border-white/6 bg-white/3 p-3">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">
                {t('timeline')}
              </p>
              <Timeline history={g.history} />
            </div>
          )}

          <div className="rounded-2xl border border-white/6 bg-white/3 p-3 flex-1 overflow-y-auto">
            <CapturedArea
              cards={g.playerCaptured}
              label={`👤 ${t('yourHand')}`}
              accent="text-blue-300/80"
            />
          </div>

          <div className="rounded-2xl border border-white/6 bg-white/3 p-3">
            <CapturedArea
              cards={g.aiCaptured}
              label={`🤖 ${t('aiLabel')}`}
              accent="text-red-300/80"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
