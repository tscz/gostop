# 고스톱 Trainer

<img src="public/assets/cards/Hwatu_January_Hikari.svg" width="60" title="January – Crane"><img src="public/assets/cards/Hwatu_March_Hikari.svg" width="60" title="March – Curtain"><img src="public/assets/cards/Hwatu_August_Hikari.svg" width="60" title="August – Full Moon"><img src="public/assets/cards/Hwatu_November_Hikari.svg" width="60" title="November – Phoenix"><img src="public/assets/cards/Hwatu_December_Hikari.svg" width="60" title="December – Rain Man"><img src="public/assets/cards/Hwatu_February_Tane.svg" width="60" title="February – Nightingale"><img src="public/assets/cards/Hwatu_April_Tane.svg" width="60" title="April – Cuckoo"><img src="public/assets/cards/Hwatu_August_Tane.svg" width="60" title="August – Geese">

A browser-based **Go-Stop (고스톱)** card game trainer — rule-based AI opponent, animated scoring explanations, and full DE / EN / KO support. Runs entirely in the browser with no backend.

▶ **[Play it live](https://tscz.github.io/gostop)**

Press the **?** button in the top-right corner for in-app rules, scoring combinations, and special rules (available in EN / DE / KO).

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests (Vitest) |

## Project structure

```
src/
├── core/               # Pure TypeScript game logic (no React)
├── store/              # Zustand global state
├── components/         # React UI components
├── i18n/               # Translation files (de.json, en.json, ko.json)
├── App.tsx
└── main.tsx
```

## Deployment

Pushing a GitHub Release triggers the `deploy-release.yml` workflow which builds and deploys to the `gh-pages` branch automatically. Every push runs the CI build via `build.yml`.

---

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Hwatu card artwork by **Marcus Richert**, based on Louie Mantia Jr.'s Hanafuda graphics.
Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
Source: [Wikimedia Commons – Category:SVG Hwatu](https://commons.wikimedia.org/wiki/Category:SVG_Hwatu)
