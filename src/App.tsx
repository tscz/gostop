import './i18n'
import { CARD_IMAGE_URL } from './core/cards'
import GameBoard from './components/GameBoard'

const preloadStyle: React.CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
}

export default function App() {
  return (
    <>
      {/* Preload all card SVGs so they're cached before they appear in game */}
      <div style={preloadStyle} aria-hidden="true">
        {Object.values(CARD_IMAGE_URL).map(url => (
          <img key={url} src={url} alt="" />
        ))}
      </div>
      <GameBoard />
    </>
  )
}
