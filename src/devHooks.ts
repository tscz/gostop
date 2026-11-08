// Dev-only handles for browser tests (Playwright soak runs). Exposes the exact
// module instances the UI uses, so a test never drives a second copy of the
// store. Never included in production builds (guarded by import.meta.env.DEV).
import { useGameStore } from './store/gameStore'
import { setRandom, seededRandom } from './core/deck'
import { suggestPlayerCard } from './core/ai'
import { CARD_IMAGE_URL } from './core/cards'

export function installDevHooks(): void {
  Object.assign(window, {
    __gostop: { store: useGameStore, setRandom, seededRandom, suggestPlayerCard, cardUrls: CARD_IMAGE_URL },
  })
}
