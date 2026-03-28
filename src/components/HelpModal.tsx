import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CARD_IMAGE_URL } from '../core/cards'

interface HelpModalProps {
  onClose: () => void
}

type Tab = 'howto' | 'scoring' | 'special'
type Lang = 'en' | 'de' | 'ko'

// ── Hardcoded content per language ───────────────────────────────────────────

const TABS: Record<Lang, [string, string, string]> = {
  en: ['How to Play', 'Scoring', 'Special Rules'],
  de: ['Spielregeln', 'Punkte', 'Sonderregeln'],
  ko: ['게임 방법', '점수 계산', '특수 규칙'],
}

const TITLES: Record<Lang, string> = {
  en: 'How to Play Go-Stop',
  de: 'Spielanleitung Go-Stop',
  ko: '고스톱 게임 방법',
}

// ── BRIGHT combos ─────────────────────────────────────────────────────────────
const BRIGHT_ROWS = {
  en: [
    { name: '오광', desc: 'All 5 Brights', pts: '15 pts', cards: [1, 9, 29, 41, 45] as number[] },
    { name: '사광', desc: 'Any 4 Brights', pts: '4 pts', cards: [1, 9, 29, 41] as number[] },
    { name: '삼광', desc: '3 Brights (no Rain)', pts: '3 pts', cards: [1, 9, 29] as number[] },
    { name: '비삼광', desc: '3 Brights incl. December (Rain)', pts: '2 pts', cards: [1, 9, 45] as number[] },
  ],
  de: [
    { name: '오광', desc: 'Alle 5 Lichter', pts: '15 Punkte', cards: [1, 9, 29, 41, 45] as number[] },
    { name: '사광', desc: 'Beliebige 4 Lichter', pts: '4 Punkte', cards: [1, 9, 29, 41] as number[] },
    { name: '삼광', desc: '3 Lichter (ohne Regen)', pts: '3 Punkte', cards: [1, 9, 29] as number[] },
    { name: '비삼광', desc: '3 Lichter inkl. Dezember (Regen)', pts: '2 Punkte', cards: [1, 9, 45] as number[] },
  ],
  ko: [
    { name: '오광', desc: '광 5장 모두', pts: '15점', cards: [1, 9, 29, 41, 45] as number[] },
    { name: '사광', desc: '광 4장', pts: '4점', cards: [1, 9, 29, 41] as number[] },
    { name: '삼광', desc: '광 3장 (비 제외)', pts: '3점', cards: [1, 9, 29] as number[] },
    { name: '비삼광', desc: '광 3장 (12월 포함)', pts: '2점', cards: [1, 9, 45] as number[] },
  ],
}

const RIBBON_SETS = {
  en: [
    { name: '홍단 Hongdan', desc: 'Poetry Ribbons — Jan + Feb + Mar', pts: '3 pts', cards: [2, 6, 10] as number[] },
    { name: '청단 Cheongdan', desc: 'Blue Ribbons — Jun + Sep + Oct', pts: '3 pts', cards: [22, 34, 38] as number[] },
    { name: '초단 Chodan', desc: 'Plain Ribbons — Apr + May + Jul', pts: '3 pts', cards: [14, 18, 26] as number[] },
  ],
  de: [
    { name: '홍단 Hongdan', desc: 'Dichterbänder — Jan + Feb + Mär', pts: '3 Punkte', cards: [2, 6, 10] as number[] },
    { name: '청단 Cheongdan', desc: 'Blaue Bänder — Jun + Sep + Okt', pts: '3 Punkte', cards: [22, 34, 38] as number[] },
    { name: '초단 Chodan', desc: 'Einfache Bänder — Apr + Mai + Jul', pts: '3 Punkte', cards: [14, 18, 26] as number[] },
  ],
  ko: [
    { name: '홍단', desc: '1월 + 2월 + 3월 띠', pts: '3점', cards: [2, 6, 10] as number[] },
    { name: '청단', desc: '6월 + 9월 + 10월 띠', pts: '3점', cards: [22, 34, 38] as number[] },
    { name: '초단', desc: '4월 + 5월 + 7월 띠', pts: '3점', cards: [14, 18, 26] as number[] },
  ],
}

const SPECIAL_RULES = {
  en: [
    {
      name: '뻑 Ppeok', color: 'text-blue-400',
      trigger: 'Drawn card matches 2 field cards of the same month',
      effect: 'All 3 cards stay on the field until the 4th is played',
    },
    {
      name: '촉 Chok', color: 'text-yellow-400',
      trigger: 'Hand card had no match, but drawn card did',
      effect: 'Steal 1 junk card from your opponent',
    },
    {
      name: '따닥 Ttadak', color: 'text-orange-400',
      trigger: 'Drawn card matches 3 field cards of the same month',
      effect: 'Capture all 4 cards + steal 1 junk',
    },
    {
      name: '폭탄 Poktan', color: 'text-red-400',
      trigger: '3 hand cards match 1 field card (same month)',
      effect: 'Capture all 4 cards + steal 1 junk',
    },
  ],
  de: [
    {
      name: '뻑 Ppeok', color: 'text-blue-400',
      trigger: 'Gezogene Karte trifft 2 gleiche Tischkarten',
      effect: 'Alle 3 Karten bleiben auf dem Tisch bis zur 4.',
    },
    {
      name: '촉 Chok', color: 'text-yellow-400',
      trigger: 'Handkarte hatte kein Match, gezogene Karte schon',
      effect: '1 Junk vom Gegner stehlen',
    },
    {
      name: '따닥 Ttadak', color: 'text-orange-400',
      trigger: 'Gezogene Karte trifft 3 gleiche Tischkarten',
      effect: 'Alle 4 Karten nehmen + 1 Junk stehlen',
    },
    {
      name: '폭탄 Poktan', color: 'text-red-400',
      trigger: '3 Handkarten matchen 1 Tischkarte (gleicher Monat)',
      effect: 'Alle 4 Karten nehmen + 1 Junk stehlen',
    },
  ],
  ko: [
    {
      name: '뻑', color: 'text-blue-400',
      trigger: '뽑은 카드가 같은 달 바닥 카드 2장과 매칭',
      effect: '3장 모두 4번째 카드가 올 때까지 바닥에 남음',
    },
    {
      name: '촉', color: 'text-yellow-400',
      trigger: '손패는 매칭 없었는데 뽑은 카드가 매칭',
      effect: '상대에게서 피 1장을 가져옴',
    },
    {
      name: '따닥', color: 'text-orange-400',
      trigger: '뽑은 카드가 같은 달 바닥 카드 3장과 매칭',
      effect: '4장 모두 획득 + 피 1장 빼앗기',
    },
    {
      name: '폭탄', color: 'text-red-400',
      trigger: '손패 3장이 바닥 카드 1장과 같은 달',
      effect: '4장 모두 획득 + 피 1장 빼앗기',
    },
  ],
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CardImg({ id }: { id: number }) {
  return (
    <img
      src={CARD_IMAGE_URL[id]}
      alt={`Card ${id}`}
      width={56}
      className="rounded-lg shadow-md"
      draggable={false}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-white font-bold text-sm mb-2.5">{title}</h3>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-b border-slate-800/60" />
}

// ── Tab content ───────────────────────────────────────────────────────────────

function HowToTab({ lang }: { lang: Lang }) {
  if (lang === 'de') return (
    <div className="flex flex-col gap-5 text-sm">
      <p className="text-slate-400 leading-relaxed">
        Go-Stop (고스톱) ist ein koreanisches Kartenspiel mit 48 <strong className="text-white">Hwatu</strong>-Karten — 12 Monate, je 4 Karten.
        In dieser 2-Spieler-Variante (Matgo / 맞고) erhält jeder Spieler <strong className="text-white">10 Karten</strong>,
        8 liegen auf dem <strong className="text-white">Tisch</strong> und 20 bilden den <strong className="text-white">Zugstapel</strong>.
      </p>

      <Divider />

      <Section title="Ein Zug">
        <p className="text-slate-400 mb-2">1. Spiele eine Karte aus deiner Hand auf den Tisch:</p>
        <ul className="flex flex-col gap-1.5 mb-3 ml-2">
          {[
            ['1 Tischkarte gleichen Monats', '→ beide nehmen'],
            ['2 Tischkarten gleichen Monats', '→ eine auswählen, die andere bleibt'],
            ['3 Tischkarten gleichen Monats', '→ alle 4 nehmen + 1 Junk stehlen (Poktan)'],
            ['Kein Match', '→ Karte bleibt auf dem Tisch'],
          ].map(([a, b]) => (
            <li key={a} className="flex gap-2 text-slate-300">
              <span className="text-slate-600 shrink-0">•</span>
              <span><strong className="text-white">{a}</strong> {b}</span>
            </li>
          ))}
        </ul>
        <p className="text-slate-400">2. Eine Karte wird automatisch vom Stapel gezogen und aufgelöst.</p>
      </Section>

      <Divider />

      <Section title="GO oder STOP">
        <p className="text-slate-400 mb-3">Ab <strong className="text-white">7 Punkten</strong> kannst du nach jedem eigenen Zug wählen:</p>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-emerald-950/50 border border-emerald-800/40 p-3">
            <p className="text-emerald-400 font-black text-xs mb-1">고 GO</p>
            <p className="text-slate-400 text-xs">Weiterspielen für mehr Punkte (riskant!)</p>
          </div>
          <div className="flex-1 rounded-xl bg-red-950/50 border border-red-800/40 p-3">
            <p className="text-red-400 font-black text-xs mb-1">스톱 STOP</p>
            <p className="text-slate-400 text-xs">Spiel beenden und Punkte kassieren</p>
          </div>
        </div>
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">GO-Multiplikator</p>
        <div className="flex flex-col gap-1">
          {[
            ['1× GO', '+1 Bonuspunkt', false],
            ['2× GO', '+2 Bonuspunkte', false],
            ['3× GO', 'Punkte × 2', true],
            ['4× GO', 'Punkte × 6', true],
            ['5× GO', 'Punkte × 24', true],
          ].map(([label, effect, orange]) => (
            <div key={label as string} className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className={`text-xs font-bold ${orange ? 'text-orange-400' : 'text-yellow-400'}`}>{effect}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-2">Die KI ruft automatisch STOP, wenn sie in Führung liegt.</p>
      </Section>
    </div>
  )

  if (lang === 'ko') return (
    <div className="flex flex-col gap-5 text-sm">
      <p className="text-slate-400 leading-relaxed">
        고스톱은 48장의 <strong className="text-white">화투</strong>로 하는 한국 카드 게임입니다 — 12달, 각 4장.
        이 2인용 버전(맞고)에서 각 플레이어는 <strong className="text-white">10장</strong>을 받고,
        8장은 <strong className="text-white">바닥</strong>에 깔고, 20장은 <strong className="text-white">뽑기 더미</strong>가 됩니다.
      </p>

      <Divider />

      <Section title="나의 차례">
        <p className="text-slate-400 mb-2">1. 손패에서 카드 한 장을 바닥에 냅니다:</p>
        <ul className="flex flex-col gap-1.5 mb-3 ml-2">
          {[
            ['같은 달 바닥 카드 1장', '→ 두 장 모두 획득'],
            ['같은 달 바닥 카드 2장', '→ 한 장 선택, 나머지는 바닥에'],
            ['같은 달 바닥 카드 3장', '→ 4장 모두 획득 + 피 1장 빼앗기 (폭탄)'],
            ['매칭 없음', '→ 카드가 바닥에 남음'],
          ].map(([a, b]) => (
            <li key={a} className="flex gap-2 text-slate-300">
              <span className="text-slate-600 shrink-0">•</span>
              <span><strong className="text-white">{a}</strong> {b}</span>
            </li>
          ))}
        </ul>
        <p className="text-slate-400">2. 그 다음 더미에서 카드를 자동으로 뽑아 처리합니다.</p>
      </Section>

      <Divider />

      <Section title="고 또는 스톱">
        <p className="text-slate-400 mb-3"><strong className="text-white">7점</strong> 이상이 되면 자신의 차례 후 선택할 수 있습니다:</p>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-emerald-950/50 border border-emerald-800/40 p-3">
            <p className="text-emerald-400 font-black text-xs mb-1">고 GO</p>
            <p className="text-slate-400 text-xs">계속해서 더 높은 점수를 노립니다 (위험!)</p>
          </div>
          <div className="flex-1 rounded-xl bg-red-950/50 border border-red-800/40 p-3">
            <p className="text-red-400 font-black text-xs mb-1">스톱 STOP</p>
            <p className="text-slate-400 text-xs">게임을 끝내고 점수를 획득합니다</p>
          </div>
        </div>
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">고 배율</p>
        <div className="flex flex-col gap-1">
          {[
            ['1× 고', '+1 보너스 점수', false],
            ['2× 고', '+2 보너스 점수', false],
            ['3× 고', '점수 × 2', true],
            ['4× 고', '점수 × 6', true],
            ['5× 고', '점수 × 24', true],
          ].map(([label, effect, orange]) => (
            <div key={label as string} className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className={`text-xs font-bold ${orange ? 'text-orange-400' : 'text-yellow-400'}`}>{effect}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-2">AI는 자신이 앞서고 있을 때 자동으로 스톱을 선언합니다.</p>
      </Section>
    </div>
  )

  // EN (default)
  return (
    <div className="flex flex-col gap-5 text-sm">
      <p className="text-slate-400 leading-relaxed">
        Go-Stop (고스톱) is a Korean card game played with 48 <strong className="text-white">Hwatu</strong> cards — 12 months, 4 cards each.
        In this 2-player version (Matgo / 맞고), each player receives <strong className="text-white">10 cards</strong>,
        8 are placed on the <strong className="text-white">field</strong>, and 20 form the <strong className="text-white">draw pile</strong>.
      </p>

      <Divider />

      <Section title="A Turn">
        <p className="text-slate-400 mb-2">1. Play a card from your hand onto the field:</p>
        <ul className="flex flex-col gap-1.5 mb-3 ml-2">
          {[
            ['1 field card of the same month', '→ capture both'],
            ['2 field cards of the same month', '→ choose one; the other stays'],
            ['3 field cards of the same month', '→ capture all 4 + steal 1 junk (Poktan)'],
            ['No match', '→ your card stays on the field'],
          ].map(([a, b]) => (
            <li key={a} className="flex gap-2 text-slate-300">
              <span className="text-slate-600 shrink-0">•</span>
              <span><strong className="text-white">{a}</strong> {b}</span>
            </li>
          ))}
        </ul>
        <p className="text-slate-400">2. A card is drawn from the pile and resolved automatically.</p>
      </Section>

      <Divider />

      <Section title="GO or STOP">
        <p className="text-slate-400 mb-3">Once you reach <strong className="text-white">7 points</strong>, choose after each of your turns:</p>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-emerald-950/50 border border-emerald-800/40 p-3">
            <p className="text-emerald-400 font-black text-xs mb-1">고 GO</p>
            <p className="text-slate-400 text-xs">Keep playing for more points (risky!)</p>
          </div>
          <div className="flex-1 rounded-xl bg-red-950/50 border border-red-800/40 p-3">
            <p className="text-red-400 font-black text-xs mb-1">스톱 STOP</p>
            <p className="text-slate-400 text-xs">End the game and collect your score</p>
          </div>
        </div>
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">GO Multiplier</p>
        <div className="flex flex-col gap-1">
          {[
            ['1× GO', '+1 bonus point', false],
            ['2× GO', '+2 bonus points', false],
            ['3× GO', 'score × 2', true],
            ['4× GO', 'score × 6', true],
            ['5× GO', 'score × 24', true],
          ].map(([label, effect, orange]) => (
            <div key={label as string} className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
              <span className="text-slate-400 text-xs">{label}</span>
              <span className={`text-xs font-bold ${orange ? 'text-orange-400' : 'text-yellow-400'}`}>{effect}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-2">The AI calls STOP automatically when it is in the lead.</p>
      </Section>
    </div>
  )
}

function ScoringTab({ lang }: { lang: Lang }) {
  const cardTypes = {
    en: [
      { name: 'Bright', ko: '광', desc: 'Highest value — 5 per deck' },
      { name: 'Animal', ko: '끗', desc: 'Bird and animal motifs' },
      { name: 'Ribbon', ko: '띠', desc: 'Coloured or inscribed ribbons' },
      { name: 'Junk', ko: '피', desc: 'Plain cards — quantity matters' },
    ],
    de: [
      { name: 'Licht', ko: '광', desc: 'Höchster Wert — 5 im Spiel' },
      { name: 'Tier', ko: '끗', desc: 'Vogel- und Tiermotive' },
      { name: 'Band', ko: '띠', desc: 'Farbige oder beschriftete Bänder' },
      { name: 'Junk', ko: '피', desc: 'Einfache Karten — Menge zählt' },
    ],
    ko: [
      { name: '광', ko: '광', desc: '가장 높은 가치 — 5장' },
      { name: '끗', ko: '끗', desc: '새 및 동물 그림' },
      { name: '띠', ko: '띠', desc: '색깔 또는 글자가 있는 리본' },
      { name: '피', ko: '피', desc: '일반 카드 — 수량이 중요' },
    ],
  }

  const sectionTitles = {
    en: { types: 'Card Types', gwang: '광 Gwang — Bright Combinations', godori: '고도리 Godori — Five Birds', ribbons: '단 Dan — Ribbon Sets', ribbonExtra: 'Extra Ribbons — 띠 Tti', animals: '끗 Kkeus — Animals', junk: '피 Pi — Junk Cards' },
    de: { types: 'Kartentypen', gwang: '광 Gwang — Licht-Kombinationen', godori: '고도리 Godori — Fünf Vögel', ribbons: '단 Dan — Bänder-Sets', ribbonExtra: 'Extra Bänder — 띠 Tti', animals: '끗 Kkeus — Tiere', junk: '피 Pi — Junk-Karten' },
    ko: { types: '카드 종류', gwang: '광 — 광 조합', godori: '고도리 — 다섯 새', ribbons: '단 — 띠 세트', ribbonExtra: '추가 띠', animals: '끗 — 끗 조합', junk: '피 — 피 조합' },
  }

  const notes = {
    en: {
      godori: '+5 points — capture the Animal cards from February, April, and August.',
      ribbonExtra: '5 or more ribbons total: +1 point per ribbon above 4.',
      animals: '5 or more Animal cards: +1 point per animal above 4.',
      animalsNote: 'The May and September Animals (bridge and sake cup) count as double-junk (피×2) instead of Animals for this bonus.',
      junk: '10 or more junk points: +1 point per junk above 9.',
      junkNote: 'Regular junk = 1 pi · Double-junk cards (Nov & Dec) = 2 pi · May & Sep Animals = 2 pi (counted here, not as animals)',
    },
    de: {
      godori: '+5 Punkte — fange die Tier-Karten von Februar, April und August.',
      ribbonExtra: '5 oder mehr Bänder gesamt: +1 Punkt pro Band über 4.',
      animals: '5 oder mehr Tier-Karten: +1 Punkt pro Tier über 4.',
      animalsNote: 'Mai- und September-Tier (Brücke und Sake-Schale) zählen als Doppel-Junk (피×2), nicht als Tier.',
      junk: '10 oder mehr Junk-Punkte: +1 Punkt pro Junk über 9.',
      junkNote: 'Normaler Junk = 1 pi · Doppel-Junk (Nov & Dez) = 2 pi · Mai & Sep Tier = 2 pi (hier gezählt, nicht als Tier)',
    },
    ko: {
      godori: '+5점 — 2월, 4월, 8월의 끗 카드를 획득하세요.',
      ribbonExtra: '띠 5장 이상: 4장 초과 1장당 +1점.',
      animals: '끗 5장 이상: 4장 초과 1장당 +1점.',
      animalsNote: '5월·9월 끗은 쌍피로 계산되어 끗 보너스에 포함되지 않습니다.',
      junk: '피 10점 이상: 9점 초과 1점당 +1점.',
      junkNote: '일반 피 = 1pi · 쌍피(11월·12월) = 2pi · 5월·9월 끗 = 2pi (피로 계산)',
    },
  }

  const t = sectionTitles[lang]
  const n = notes[lang]
  const types = cardTypes[lang]
  const brightRows = BRIGHT_ROWS[lang]
  const ribbonSets = RIBBON_SETS[lang]

  return (
    <div className="flex flex-col gap-5">
      {/* Card types */}
      <Section title={t.types}>
        <div className="rounded-xl overflow-hidden border border-slate-800">
          {types.map((row, i) => (
            <div key={row.ko} className={`flex items-center gap-3 px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-slate-900/60' : ''}`}>
              <span className="text-white font-bold w-8 shrink-0">{row.ko}</span>
              <span className="text-slate-300 font-semibold w-16 shrink-0">{row.name}</span>
              <span className="text-slate-500">{row.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Gwang */}
      <Section title={t.gwang}>
        <div className="flex flex-col gap-4">
          {brightRows.map(row => (
            <div key={row.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white font-semibold text-xs">{row.name} — {row.desc}</span>
                <span className="text-yellow-400 font-black text-xs">{row.pts}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.cards.map(id => <CardImg key={id} id={id} />)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* Godori */}
      <Section title={t.godori}>
        <p className="text-slate-400 text-xs mb-2">{n.godori}</p>
        <div className="flex gap-1.5">
          {[5, 13, 30].map(id => <CardImg key={id} id={id} />)}
        </div>
      </Section>

      <Divider />

      {/* Ribbon sets */}
      <Section title={t.ribbons}>
        <div className="flex flex-col gap-4">
          {ribbonSets.map(set => (
            <div key={set.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white font-semibold text-xs">{set.name} — {set.desc}</span>
                <span className="text-yellow-400 font-black text-xs">{set.pts}</span>
              </div>
              <div className="flex gap-1.5">
                {set.cards.map(id => <CardImg key={id} id={id} />)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.ribbonExtra}>
        <p className="text-slate-400 text-xs">{n.ribbonExtra}</p>
      </Section>

      <Divider />

      {/* Animals */}
      <Section title={t.animals}>
        <p className="text-slate-400 text-xs mb-2">{n.animals}</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[5, 13, 21, 25, 37].map(id => <CardImg key={id} id={id} />)}
        </div>
        <p className="text-slate-500 text-xs">{n.animalsNote}</p>
      </Section>

      <Divider />

      {/* Junk */}
      <Section title={t.junk}>
        <p className="text-slate-400 text-xs mb-2">{n.junk}</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[3, 4, 7, 8, 11, 12, 44, 48].map(id => <CardImg key={id} id={id} />)}
        </div>
        <p className="text-slate-500 text-xs">{n.junkNote}</p>
      </Section>
    </div>
  )
}

function SpecialTab({ lang }: { lang: Lang }) {
  const intros = {
    en: 'These rules trigger automatically during play and can swing the game dramatically.',
    de: 'Diese Regeln lösen sich automatisch aus und können das Spiel entscheidend beeinflussen.',
    ko: '이 규칙들은 게임 중 자동으로 발동되며 게임 흐름을 크게 바꿀 수 있습니다.',
  }
  const labels = {
    en: ['Trigger', 'Effect'],
    de: ['Auslöser', 'Effekt'],
    ko: ['발동 조건', '효과'],
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-400 text-sm">{intros[lang]}</p>
      {SPECIAL_RULES[lang].map(rule => (
        <div key={rule.name} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className={`font-black text-base mb-3 ${rule.color}`}>{rule.name}</p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 text-xs">
              <span className="text-slate-500 shrink-0 w-20">{labels[lang][0]}</span>
              <span className="text-slate-300">{rule.trigger}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-slate-500 shrink-0 w-20">{labels[lang][1]}</span>
              <span className="text-slate-300">{rule.effect}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function HelpModal({ onClose }: HelpModalProps) {
  const { i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('howto')

  const lang: Lang = (i18n.language in TABS ? i18n.language : 'en') as Lang
  const [tabHowTo, tabScoring, tabSpecial] = TABS[lang]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-700/60 bg-slate-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800 shrink-0">
          <h2 className="text-white font-bold text-lg">{TITLES[lang]}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {([['howto', tabHowTo], ['scoring', tabScoring], ['special', tabSpecial]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {tab === 'howto' && <HowToTab lang={lang} />}
          {tab === 'scoring' && <ScoringTab lang={lang} />}
          {tab === 'special' && <SpecialTab lang={lang} />}
        </div>
      </div>
    </div>
  )
}
