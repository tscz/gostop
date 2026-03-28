import { useTranslation } from 'react-i18next'
import { useGameStore } from '../store/gameStore'

const LANGS = ['en', 'de', 'ko'] as const
type Lang = (typeof LANGS)[number]

const FLAGS: Record<Lang, string> = {
  de: '🇩🇪',
  en: '🇺🇸',
  ko: '🇰🇷',
}

export default function Header() {
  const { t, i18n } = useTranslation()
  const { state, newGame } = useGameStore()
  const lang = i18n.language as Lang

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 border-b border-white/6 bg-black/40 backdrop-blur-lg sticky top-0 z-40">
      <div className="flex-1">
        <h1 className="text-lg font-black tracking-tight leading-none">{t('title')}</h1>
        <p className="text-white/25 text-[11px] mt-0.5">{t('sub')}</p>
      </div>
      {state.goCount > 0 && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold">
          GO ×{state.goCount}
        </div>
      )}
      {state.message && (
        <div className="bg-white/8 text-white/60 text-xs px-2.5 py-1 rounded-full max-w-32 truncate">
          {state.message}
        </div>
      )}
      <div className="flex items-center gap-1">
        {LANGS.map(l => (
          <button
            key={l}
            onClick={() => i18n.changeLanguage(l)}
            className={`text-base w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              lang === l ? 'bg-white/15 scale-110' : 'opacity-35 hover:opacity-65'
            }`}
          >
            {FLAGS[l]}
          </button>
        ))}
      </div>
      <button
        onClick={newGame}
        className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all border border-white/10"
      >
        {t('newGame')}
      </button>
    </header>
  )
}
