'use strict'
/**
 * Renders PWA icons (192×192 and 512×512 PNG) from the actual
 * Hwatu_January_Hikari card SVG, composited on a dark background,
 * using a headless Firefox browser via Playwright.
 */
const { firefox } = require('playwright')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'public')
const CARD_SVG = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'assets', 'cards', 'Hwatu_January_Hikari.svg'),
  'utf8'
)
  // Let CSS control the size; preserve natural aspect ratio
  .replace(/width="[^"]*"/, 'width="100%"')
  .replace(/height="[^"]*"/, 'height="100%"')
  .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid meet"')

// Wrap the card in a sized HTML page with a dark background
const HTML = (size) => {
  // Card natural ratio is 103.2 × 168.2 — fit it into size with padding
  const pad = Math.round(size * 0.06)
  const cardH = size - pad * 2
  const cardW = Math.round(cardH * (103.2 / 168.2))
  const cardX = Math.round((size - cardW) / 2)
  return `<!doctype html>
<html>
<head>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${size}px; height: ${size}px; overflow: hidden; }
body {
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card {
  width: ${cardW}px;
  height: ${cardH}px;
  filter: drop-shadow(0 ${Math.round(size*0.015)}px ${Math.round(size*0.03)}px rgba(0,0,0,0.7));
}
</style>
</head>
<body>
<div class="card">${CARD_SVG}</div>
</body>
</html>`
}

async function run() {
  const browser = await firefox.launch()
  const page = await browser.newPage()

  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(HTML(size))
    await page.waitForLoadState('load')
    const out = path.join(OUT, `pwa-${size}x${size}.png`)
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size, height: size } })
    console.log(`  wrote ${out}`)
  }

  // 180×180 apple-touch-icon
  const size = 180
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(HTML(size))
  await page.waitForLoadState('load')
  const appleOut = path.join(OUT, 'apple-touch-icon.png')
  await page.screenshot({ path: appleOut, clip: { x: 0, y: 0, width: size, height: size } })
  console.log(`  wrote ${appleOut}`)

  await browser.close()
  console.log('Icons generated.')
}

run().catch(err => { console.error(err); process.exit(1) })
