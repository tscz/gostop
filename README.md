# 고스톱 Trainer

A browser-based Go-Stop (고스톱) card game trainer — rule-based AI opponent, animated scoring explanations, and full DE / EN / KO support. Runs entirely in the browser with no backend.

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript (Vite) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| State | Zustand |
| i18n | i18next + react-i18next |
| Testing | Vitest |
| Deployment | GitHub Pages (static) |

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
│   ├── cards.ts        # Card definitions, 48 Hwatu cards
│   ├── deck.ts         # Shuffle & deal
│   ├── gameState.ts    # TypeScript interfaces
│   ├── rules.ts        # Turn resolution (ppeok, chok, ttadak, poktan)
│   ├── scoring.ts      # Scoring (gwang, godori, tti, kkeus, pi)
│   ├── ai.ts           # Rule-based AI heuristic
│   └── moveExplainer.ts# Structured move explanations
├── store/
│   └── gameStore.ts    # Zustand global state
├── components/         # React UI components
├── i18n/               # Translation files (de.json, en.json, ko.json)
├── App.tsx
└── main.tsx
```

## Deployment to GitHub Pages

```bash
npm run build
# Deploy the dist/ folder to your gh-pages branch
```
