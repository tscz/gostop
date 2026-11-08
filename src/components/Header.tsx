import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'
import { GamePhase } from '../core/gameState'
import { feedbackEnabled, setFeedbackEnabled } from '../lib/feedback'

const LANGS = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
] as const

interface HeaderProps {
  onHelpOpen: () => void
}

export default function Header({ onHelpOpen }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const { state, session, newGame, endSession } = useGameStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const [fx, setFx] = useState(feedbackEnabled())
  const menuRef = useRef<HTMLDivElement>(null)

  // A round counts as "in progress" once any move was made and it isn't over
  const inProgress = state.phase !== GamePhase.GAME_OVER && state.history.length > 0

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuOpen(false); setConfirmNew(false) }
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuOpen])

  const requestNew = () => {
    if (inProgress) { setConfirmNew(true); return }
    newGame(); setMenuOpen(false)
  }

  return (
    <header
      className="flex items-center gap-2 px-3 py-2 border-b border-white/6 bg-black/60 backdrop-blur-lg sticky top-0 z-40"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-black tracking-tight leading-none whitespace-nowrap">{t('title')}</h1>
        {/* Compact session line — replaces the tall session card on mobile */}
        <p className="text-white/45 text-[11px] mt-1 whitespace-nowrap tabular-nums truncate">
          {t('sessionRound')} {session.round}
          <span className="mx-1.5 text-white/20">·</span>
          <span className="text-blue-300/80">👤 {session.playerTotal}</span>
          <span className="mx-1 text-white/20">:</span>
          <span className="text-red-300/80">🤖 {session.aiTotal}</span>
        </p>
      </div>
      {state.goCount > 0 && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-2 py-1 rounded-full font-bold flex-shrink-0">
          GO ×{state.goCount}
        </div>
      )}
      <button
        onClick={onHelpOpen}
        aria-label="Help"
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 text-sm font-bold flex-shrink-0"
      >
        ?
      </button>
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => { setMenuOpen(o => !o); setConfirmNew(false) }}
          aria-label={t('menu')}
          aria-expanded={menuOpen}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-lg"
        >
          ☰
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl bg-slate-950 border border-slate-700 p-2 shadow-2xl shadow-black/60">
            {confirmNew ? (
              <div className="p-2 flex flex-col gap-2">
                <p className="text-sm text-white/85">{t('confirmNewGame')}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { newGame(); setMenuOpen(false); setConfirmNew(false) }}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-bold py-2 rounded-xl"
                  >
                    {t('confirmDeal')}
                  </button>
                  <button
                    onClick={() => setConfirmNew(false)}
                    className="flex-1 bg-white/10 hover:bg-white/15 text-white text-sm font-bold py-2 rounded-xl"
                  >
                    {t('keepPlaying')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="px-2 pt-1 pb-1.5 text-white/40 text-[10px] uppercase tracking-widest">{t('language')}</p>
                <div className="flex gap-1 px-1 pb-2">
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => i18n.changeLanguage(l.code)}
                      aria-pressed={i18n.language === l.code}
                      className={`flex-1 rounded-lg py-1.5 text-xs flex flex-col items-center gap-0.5 ${
                        i18n.language === l.code ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8'
                      }`}
                    >
                      <span className="text-lg leading-none">{l.flag}</span>
                      {l.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { const on = !fx; setFx(on); setFeedbackEnabled(on) }}
                  className="w-full flex justify-between items-center px-2 py-2 rounded-lg hover:bg-white/8 text-sm text-white/85"
                >
                  <span>🔊 {t('soundHaptics')}</span>
                  <span className={fx ? 'text-emerald-400' : 'text-white/40'}>{fx ? t('on') : t('off')}</span>
                </button>
                <div className="my-1 border-t border-white/10" />
                <button onClick={requestNew} className="w-full text-left px-2 py-2 rounded-lg hover:bg-white/8 text-sm text-white/85">
                  {t('newGame')}
                </button>
                <button
                  onClick={() => { endSession(); setMenuOpen(false) }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-white/8 text-sm text-white/60"
                >
                  {t('endSession')}
                </button>
                <p className="px-2 pt-2 pb-1 text-white/25 text-[10px]">{t('sub')} · v{__APP_VERSION__}</p>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
