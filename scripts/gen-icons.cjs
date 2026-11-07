'use strict'
/**
 * Renders PWA icons (192×192 and 512×512 PNG) from an SVG template
 * using a headless Firefox browser via Playwright.
 */
const { firefox } = require('playwright')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'public')

const SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" fill="#0f172a"/>
  <!-- Card body -->
  <rect x="116" y="66" width="280" height="380" rx="30" fill="#991b1b"/>
  <!-- Card inner border -->
  <rect x="134" y="84" width="244" height="344" rx="20" fill="none" stroke="#fca5a5" stroke-width="5" opacity="0.4"/>

  <!-- Cherry blossom: 5 petals around center -->
  <!-- Petal 1 — top -->
  <ellipse cx="256" cy="192" rx="34" ry="54" fill="#fce7f3" opacity="0.95" transform="rotate(0,256,256)"/>
  <!-- Petal 2 — upper-right -->
  <ellipse cx="256" cy="192" rx="34" ry="54" fill="#fce7f3" opacity="0.95" transform="rotate(72,256,256)"/>
  <!-- Petal 3 — lower-right -->
  <ellipse cx="256" cy="192" rx="34" ry="54" fill="#fce7f3" opacity="0.95" transform="rotate(144,256,256)"/>
  <!-- Petal 4 — lower-left -->
  <ellipse cx="256" cy="192" rx="34" ry="54" fill="#fce7f3" opacity="0.95" transform="rotate(216,256,256)"/>
  <!-- Petal 5 — upper-left -->
  <ellipse cx="256" cy="192" rx="34" ry="54" fill="#fce7f3" opacity="0.95" transform="rotate(288,256,256)"/>
  <!-- Flower centre -->
  <circle cx="256" cy="256" r="28" fill="#fbbf24"/>
  <!-- Centre dot -->
  <circle cx="256" cy="256" r="10" fill="#92400e"/>

  <!-- Three horizontal stripes (ribbon) -->
  <rect x="166" y="338" width="180" height="16" rx="8" fill="#fca5a5" opacity="0.9"/>
  <rect x="186" y="362" width="140" height="12" rx="6" fill="#fca5a5" opacity="0.6"/>
  <rect x="206" y="382" width="100" height="8"  rx="4" fill="#fca5a5" opacity="0.35"/>
</svg>
`

async function run() {
  const browser = await firefox.launch()
  const page = await browser.newPage()

  for (const size of [192, 512]) {
    await page.setContent(`
      <!doctype html>
      <html>
        <head><style>* { margin: 0; padding: 0; } body { background: transparent; }</style></head>
        <body>${SVG(size)}</body>
      </html>
    `)
    await page.setViewportSize({ width: size, height: size })
    const out = path.join(OUT, `pwa-${size}x${size}.png`)
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size, height: size } })
    console.log(`  wrote ${out}`)
  }

  // Also write a 180×180 apple-touch-icon
  const size = 180
  await page.setContent(`
    <!doctype html>
    <html>
      <head><style>* { margin: 0; padding: 0; }</style></head>
      <body>${SVG(size)}</body>
    </html>
  `)
  await page.setViewportSize({ width: size, height: size })
  const appleOut = path.join(OUT, 'apple-touch-icon.png')
  await page.screenshot({ path: appleOut, clip: { x: 0, y: 0, width: size, height: size } })
  console.log(`  wrote ${appleOut}`)

  await browser.close()
  console.log('Icons generated.')
}

run().catch(err => { console.error(err); process.exit(1) })
