// Sound + haptic feedback. Opt-out, persisted per device; every storage and
// audio call is guarded because private windows and some browsers refuse them.
const KEY = 'gostop-feedback'

let enabled = (() => {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
})()

export function feedbackEnabled(): boolean {
  return enabled
}

export function setFeedbackEnabled(on: boolean): void {
  enabled = on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ }
}

export function buzz(pattern: number | number[]): void {
  if (!enabled) return
  try { navigator.vibrate?.(pattern) } catch { /* ignore */ }
}

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (ctx) return ctx
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    ctx = AC ? new AC() : null
  } catch { ctx = null }
  return ctx
}

// A short synthesized card "snap"; `chord` plays a rising triad for combos.
export function blip(kind: 'snap' | 'chord' | 'go' = 'snap'): void {
  if (!enabled) return
  const ac = audio()
  if (!ac) return
  try {
    if (ac.state === 'suspended') void ac.resume()
    const notes = kind === 'chord' ? [523, 659, 784] : kind === 'go' ? [392, 587] : [880]
    notes.forEach((f, i) => {
      const t0 = ac.currentTime + i * 0.07
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = kind === 'snap' ? 'triangle' : 'sine'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(kind === 'snap' ? 0.12 : 0.09, t0 + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'snap' ? 0.08 : 0.35))
      osc.connect(gain).connect(ac.destination)
      osc.start(t0)
      osc.stop(t0 + 0.4)
    })
  } catch { /* ignore */ }
}
