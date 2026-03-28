import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'
import { GamePhase } from '../core/gameState'
import CardSVG from './CardSVG'
import ScorePanel from './ScorePanel'
import ExplainerPanel from './ExplainerPanel'
import Timeline from './Timeline'
import CapturedArea from './CapturedArea'
import Header from './Header'

export default function GameBoard() {
  const { t } = useTranslation()
  const { state: g, playCard, chooseMatch, callGo, callStop, newGame, playAiTurn } = useGameStore()
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // AI turn effect
  useEffect(() => {
    if (g.turn === 'ai' && g.phase === GamePhase.SELECT) {
      aiTimerRef.current = setTimeout(() => {
        playAiTurn()
      }, 900 + Math.random() * 500)
    }
    return () => clearTimeout(aiTimerRef.current)
  }, [g.turn, g.phase, g.aiHand.length, playAiTurn])

  const isPlayer = g.turn === 'player' && g.phase === GamePhase.SELECT
  const isGoStop = g.phase === GamePhase.GOSTOP
  const isChoose = g.phase === GamePhase.CHOOSE_MATCH
  const isAI = g.turn === 'ai' && g.phase === GamePhase.SELECT
  const isOver = g.phase === GamePhase.GAME_OVER

  return (
    <div
      className="min-h-screen text-white flex flex-col select-none"
      style={{
        fontFamily: "'Noto Sans KR','Nanum Gothic',system-ui,sans-serif",
        background:
          'radial-gradient(ellipse 120% 80% at 50% 0%, #0c1a2e 0%, #060810 60%, #000 100%)',
      }}
    >
      <Header />

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
              {g.aiHand.map((_, i) => (
                <CardSVG key={i} card={{ id: `back_${i}`, month: 0 }} faceDown size={44} />
              ))}
              {!g.aiHand.length && <span className="text-slate-700 text-xs">–</span>}
            </div>
          </div>

          {/* Field */}
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/15 p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-emerald-500/80 text-sm font-semibold">🍀 {t('field')}</span>
              <span className="text-white/25 text-xs">
                {t('pile')}: {g.drawPile.length}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap min-h-[5rem] items-center">
              {g.field.length === 0 ? (
                <span className="text-slate-700 text-sm italic">–</span>
              ) : (
                g.field.map(c => <CardSVG key={c.id} card={c} size={52} />)
              )}
            </div>
          </div>

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
              {g.playerHand.map(c => (
                <CardSVG
                  key={c.id}
                  card={c}
                  size={58}
                  onClick={isPlayer ? () => playCard(c) : null}
                  dimmed={!isPlayer && !isChoose}
                />
              ))}
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
