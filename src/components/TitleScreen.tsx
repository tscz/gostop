import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CARD_IMAGE_URL } from '../core/cards'
import HelpModal from './HelpModal'

const LANGS = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
] as const

// Three brights/animals fanned out: crane (Jan), moon (Aug), deer (Oct)
const FAN = [
  { id: 1, rotate: -16, x: -62, y: 10 },
  { id: 29, rotate: 0, x: 0, y: -6 },
  { id: 37, rotate: 16, x: 62, y: 10 },
]

interface TitleScreenProps {
  onPlay: () => void
}

export default function TitleScreen({ onPlay }: TitleScreenProps) {
  const { t, i18n } = useTranslation()
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center select-none px-4"
      style={{
        background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #0c1a2e 0%, #060810 60%, #000 100%)',
        paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Language picker */}
      <div className="flex gap-1 self-center mt-2" role="group" aria-label={t('language')}>
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            aria-pressed={i18n.language === l.code}
            aria-label={l.name}
            className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-colors ${
              i18n.language === l.code ? 'bg-white/15 ring-1 ring-white/30' : 'opacity-60 hover:bg-white/8'
            }`}
          >
            {l.flag}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-8">
        {/* Card fan */}
        <div className="relative h-44 w-full flex items-center justify-center" aria-hidden="true">
          {FAN.map((c, i) => (
            <motion.img
              key={c.id}
              src={CARD_IMAGE_URL[c.id]}
              alt=""
              draggable={false}
              className="absolute w-24 rounded-lg shadow-2xl shadow-black/70 ring-1 ring-white/10"
              initial={{ opacity: 0, y: 60, rotate: 0, x: 0 }}
              animate={{ opacity: 1, y: c.y, rotate: c.rotate, x: c.x }}
              transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 140, damping: 16 }}
              style={{ zIndex: i === 1 ? 2 : 1 }}
            />
          ))}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h1 className="text-4xl font-black tracking-tight">{t('title')}</h1>
          <p className="text-white/50 text-sm mt-2">{t('titleTagline')}</p>
        </motion.div>

        <motion.div
          className="w-full flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={onPlay}
            autoFocus
            className="w-full max-w-xs py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] transition text-lg font-black tracking-wide shadow-lg shadow-red-900/40"
          >
            ▶ {t('play')}
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            className="px-4 py-2 text-white/60 hover:text-white text-sm"
          >
            {t('howToPlay')} ›
          </button>
        </motion.div>
      </div>

      <p className="text-white/25 text-[10px] self-end">v{__APP_VERSION__}</p>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
