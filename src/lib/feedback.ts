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

let noise: AudioBuffer | null = null
function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noise) return noise
  noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.4), ac.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return noise
}

// 짝! — a card slapped down on the table: a sharp filtered noise crack over a
// low thump. `hard` is the louder slap used when the card lands on a match.
// `swish` is the softer sweep when captured cards are taken off the table.
export function cardSound(kind: 'slap' | 'swish', hard = false): void {
  if (!enabled) return
  const ac = audio()
  if (!ac) return
  try {
    if (ac.state === 'suspended') void ac.resume()
    const t0 = ac.currentTime
    const src = ac.createBufferSource()
    src.buffer = noiseBuffer(ac)
    const filter = ac.createBiquadFilter()
    const gain = ac.createGain()
    if (kind === 'slap') {
      filter.type = 'bandpass'
      filter.frequency.value = hard ? 1700 : 2300
      filter.Q.value = 0.9
      gain.gain.setValueAtTime(hard ? 0.9 : 0.45, t0)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (hard ? 0.09 : 0.06))
      // body of the slap: a short low thump
      const thump = ac.createOscillator()
      const tg = ac.createGain()
      thump.type = 'sine'
      thump.frequency.setValueAtTime(hard ? 140 : 180, t0)
      thump.frequency.exponentialRampToValueAtTime(60, t0 + 0.08)
      tg.gain.setValueAtTime(hard ? 0.5 : 0.25, t0)
      tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1)
      thump.connect(tg).connect(ac.destination)
      thump.start(t0)
      thump.stop(t0 + 0.12)
    } else {
      filter.type = 'highpass'
      filter.frequency.setValueAtTime(600, t0)
      filter.frequency.exponentialRampToValueAtTime(3500, t0 + 0.25)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3)
    }
    src.connect(filter).connect(gain).connect(ac.destination)
    src.start(t0)
    src.stop(t0 + 0.35)
  } catch { /* ignore */ }
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
