// ═══════════════════════════════════════════════════════════════
// CARD TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CardType = {
  BRIGHT: 'bright',
  ANIMAL: 'animal',
  RIBBON: 'ribbon',
  JUNK: 'junk',
  DOUBLE_JUNK: 'double_junk',
} as const

export type CardType = (typeof CardType)[keyof typeof CardType]

export type RibbonType = 'poetry' | 'plain' | 'blue'

export interface Card {
  id: number
  month: number
  type: CardType
  ribbonType?: RibbonType
  countsAsDoublePi?: boolean
}

export interface MonthInfo {
  id: number
  ko: string
  en: string
  de: string
  flower: string
}

export const MONTHS: MonthInfo[] = [
  { id: 1,  ko: '송학',   en: 'Pine',          de: 'Kiefer',       flower: '🌲' },
  { id: 2,  ko: '매화',   en: 'Plum',          de: 'Pflaume',      flower: '🌸' },
  { id: 3,  ko: '벚꽃',   en: 'Cherry',        de: 'Kirschblüte',  flower: '🌸' },
  { id: 4,  ko: '등꽃',   en: 'Wisteria',      de: 'Glyzinie',     flower: '🌿' },
  { id: 5,  ko: '난초',   en: 'Iris',          de: 'Iris',         flower: '🌾' },
  { id: 6,  ko: '모란',   en: 'Peony',         de: 'Pfingstrose',  flower: '🌼' },
  { id: 7,  ko: '흑싸리', en: 'Bush Clover',   de: 'Buschklee',    flower: '🍀' },
  { id: 8,  ko: '공산',   en: 'Eulalia',       de: 'Chinaschilf',  flower: '🌾' },
  { id: 9,  ko: '국화',   en: 'Chrysanthemum', de: 'Chrysantheme', flower: '🌻' },
  { id: 10, ko: '단풍',   en: 'Maple',         de: 'Ahorn',        flower: '🍁' },
  { id: 11, ko: '오동',   en: 'Paulownia',     de: 'Blauglocke',   flower: '🌳' },
  { id: 12, ko: '비',     en: 'Rain/Willow',   de: 'Regen',        flower: '🌧️' },
]

// Local card SVG assets (CC BY-SA 4.0, Marcus Richert / Wikimedia Commons)
// Files are in public/assets/cards/ — BASE_URL handles the /gostop/ prefix in production
const C = `${import.meta.env.BASE_URL}assets/cards`
export const CARD_IMAGE_URL: Record<number, string> = {
  // January (松鶴 / Pine & Crane)
  1:  `${C}/Hwatu_January_Hikari.svg`,
  2:  `${C}/Hwatu_January_Tanzaku.svg`,
  3:  `${C}/Hwatu_January_Kasu_1.svg`,
  4:  `${C}/Hwatu_January_Kasu_2.svg`,
  // February (梅花 / Plum Blossom)
  5:  `${C}/Hwatu_February_Tane.svg`,
  6:  `${C}/Hwatu_February_Tanzaku.svg`,
  7:  `${C}/Hwatu_February_Kasu_1.svg`,
  8:  `${C}/Hwatu_February_Kasu_2.svg`,
  // March (벚꽃 / Cherry Blossom)
  9:  `${C}/Hwatu_March_Hikari.svg`,
  10: `${C}/Hwatu_March_Tanzaku.svg`,
  11: `${C}/Hwatu_March_Kasu_1.svg`,
  12: `${C}/Hwatu_March_Kasu_2.svg`,
  // April (등꽃 / Wisteria)
  13: `${C}/Hwatu_April_Tane.svg`,
  14: `${C}/Hwatu_April_Tanzaku.svg`,
  15: `${C}/Hwatu_April_Kasu_1.svg`,
  16: `${C}/Hwatu_April_Kasu_2.svg`,
  // May (난초 / Iris)
  17: `${C}/Hwatu_May_Tane.svg`,
  18: `${C}/Hwatu_May_Tanzaku.svg`,
  19: `${C}/Hwatu_May_Kasu_1.svg`,
  20: `${C}/Hwatu_May_Kasu_2.svg`,
  // June (모란 / Peony)
  21: `${C}/Hwatu_June_Tane.svg`,
  22: `${C}/Hwatu_June_Tanzaku.svg`,
  23: `${C}/Hwatu_June_Kasu_1.svg`,
  24: `${C}/Hwatu_June_Kasu_2.svg`,
  // July (흑싸리 / Bush Clover)
  25: `${C}/Hwatu_July_Tane.svg`,
  26: `${C}/Hwatu_July_Tanzaku.svg`,
  27: `${C}/Hwatu_July_Kasu_1.svg`,
  28: `${C}/Hwatu_July_Kasu_2.svg`,
  // August (공산 / Eulalia)
  29: `${C}/Hwatu_August_Hikari.svg`,
  30: `${C}/Hwatu_August_Tane.svg`,
  31: `${C}/Hwatu_August_Kasu_1.svg`,
  32: `${C}/Hwatu_August_Kasu_2.svg`,
  // September (국화 / Chrysanthemum)
  33: `${C}/Hwatu_September_Tane.svg`,
  34: `${C}/Hwatu_September_Tanzaku.svg`,
  35: `${C}/Hwatu_September_Kasu_1.svg`,
  36: `${C}/Hwatu_September_Kasu_2.svg`,
  // October (단풍 / Maple)
  37: `${C}/Hwatu_October_Tane.svg`,
  38: `${C}/Hwatu_October_Tanzaku.svg`,
  39: `${C}/Hwatu_October_Kasu_1.svg`,
  40: `${C}/Hwatu_October_Kasu_2.svg`,
  // November (오동 / Paulownia)
  41: `${C}/Hwatu_November_Hikari.svg`,
  42: `${C}/Hwatu_November_Kasu_1.svg`,
  43: `${C}/Hwatu_November_Kasu_2.svg`,
  44: `${C}/Hwatu_November_Kasu_3.svg`,
  // December (비 / Rain / Willow)
  45: `${C}/Hwatu_December_Hikari.svg`,
  46: `${C}/Hwatu_December_Tane.svg`,
  47: `${C}/Hwatu_December_Tanzaku.svg`,
  48: `${C}/Hwatu_December_Kasu.svg`,
}

export interface CardVisual {
  bg: string
  grad: string
  symbol: string
  top: string
  label: string
  badge: string
  ribbon?: boolean
}

export const CARD_VISUAL: Record<number, CardVisual> = {
  1:  { bg: '#0d2818', grad: '#1a4a28', symbol: '🦢', top: '🌲', label: '光',    badge: 'bright' },
  2:  { bg: '#2a1018', grad: '#3d1820', symbol: '📜', top: '🌲', label: '띠',    badge: 'poetry',    ribbon: true },
  3:  { bg: '#1a2010', grad: '#243018', symbol: '🍃', top: '🌲', label: '피',    badge: 'junk' },
  4:  { bg: '#1a2010', grad: '#243018', symbol: '🍃', top: '🌲', label: '피',    badge: 'junk' },
  5:  { bg: '#200a28', grad: '#2e1038', symbol: '🐦', top: '🌸', label: '끗',    badge: 'animal' },
  6:  { bg: '#28100a', grad: '#3a1810', symbol: '📜', top: '🌸', label: '띠',    badge: 'poetry',    ribbon: true },
  7:  { bg: '#180820', grad: '#22102e', symbol: '·',  top: '🌸', label: '피',    badge: 'junk' },
  8:  { bg: '#180820', grad: '#22102e', symbol: '·',  top: '🌸', label: '피',    badge: 'junk' },
  9:  { bg: '#280a18', grad: '#3c1022', symbol: '🌸', top: '🌸', label: '光',    badge: 'bright' },
  10: { bg: '#281018', grad: '#3a1820', symbol: '📜', top: '🌸', label: '띠',    badge: 'poetry',    ribbon: true },
  11: { bg: '#200a14', grad: '#2e1020', symbol: '·',  top: '🌸', label: '피',    badge: 'junk' },
  12: { bg: '#200a14', grad: '#2e1020', symbol: '·',  top: '🌸', label: '피',    badge: 'junk' },
  13: { bg: '#0a1030', grad: '#101840', symbol: '🦅', top: '🌿', label: '끗',    badge: 'animal' },
  14: { bg: '#281018', grad: '#381820', symbol: '🎗️', top: '🌿', label: '띠',    badge: 'plain',     ribbon: true },
  15: { bg: '#0e2010', grad: '#182e18', symbol: '·',  top: '🌿', label: '피',    badge: 'junk' },
  16: { bg: '#0e2010', grad: '#182e18', symbol: '·',  top: '🌿', label: '피',    badge: 'junk' },
  17: { bg: '#081428', grad: '#0e2038', symbol: '🌉', top: '🌾', label: '끗×2',  badge: 'animal2x' },
  18: { bg: '#281018', grad: '#381820', symbol: '🎗️', top: '🌾', label: '띠',    badge: 'plain',     ribbon: true },
  19: { bg: '#141e08', grad: '#1e2c10', symbol: '·',  top: '🌾', label: '피',    badge: 'junk' },
  20: { bg: '#141e08', grad: '#1e2c10', symbol: '·',  top: '🌾', label: '피',    badge: 'junk' },
  21: { bg: '#180a28', grad: '#240e38', symbol: '🦋', top: '🌼', label: '끗',    badge: 'animal' },
  22: { bg: '#080e28', grad: '#0e1638', symbol: '💙', top: '🌼', label: '띠',    badge: 'blue',      ribbon: true },
  23: { bg: '#200e08', grad: '#2e1810', symbol: '·',  top: '🌼', label: '피',    badge: 'junk' },
  24: { bg: '#200e08', grad: '#2e1810', symbol: '·',  top: '🌼', label: '피',    badge: 'junk' },
  25: { bg: '#280808', grad: '#381010', symbol: '🐗', top: '🍀', label: '끗',    badge: 'animal' },
  26: { bg: '#280a10', grad: '#381218', symbol: '🎗️', top: '🍀', label: '띠',    badge: 'plain',     ribbon: true },
  27: { bg: '#101010', grad: '#1a1a1a', symbol: '·',  top: '🍀', label: '피',    badge: 'junk' },
  28: { bg: '#101010', grad: '#1a1a1a', symbol: '·',  top: '🍀', label: '피',    badge: 'junk' },
  29: { bg: '#080818', grad: '#0e0e24', symbol: '🌕', top: '🌾', label: '光',    badge: 'bright' },
  30: { bg: '#081018', grad: '#0e1824', symbol: '🦢', top: '🌾', label: '끗',    badge: 'animal' },
  31: { bg: '#0a0a0a', grad: '#141414', symbol: '·',  top: '🌾', label: '피',    badge: 'junk' },
  32: { bg: '#0a0a0a', grad: '#141414', symbol: '·',  top: '🌾', label: '피',    badge: 'junk' },
  33: { bg: '#201408', grad: '#2e1e0e', symbol: '🍶', top: '🌻', label: '끗×2',  badge: 'animal2x' },
  34: { bg: '#080e28', grad: '#0e1638', symbol: '💙', top: '🌻', label: '띠',    badge: 'blue',      ribbon: true },
  35: { bg: '#181008', grad: '#24180e', symbol: '·',  top: '🌻', label: '피',    badge: 'junk' },
  36: { bg: '#181008', grad: '#24180e', symbol: '·',  top: '🌻', label: '피',    badge: 'junk' },
  37: { bg: '#280804', grad: '#380e08', symbol: '🦌', top: '🍁', label: '끗',    badge: 'animal' },
  38: { bg: '#080e28', grad: '#0e1638', symbol: '💙', top: '🍁', label: '띠',    badge: 'blue',      ribbon: true },
  39: { bg: '#1e0804', grad: '#2c1008', symbol: '·',  top: '🍁', label: '피',    badge: 'junk' },
  40: { bg: '#1e0804', grad: '#2c1008', symbol: '·',  top: '🍁', label: '피',    badge: 'junk' },
  41: { bg: '#080814', grad: '#0e0e20', symbol: '🦅', top: '🌳', label: '光',    badge: 'bright' },
  42: { bg: '#100818', grad: '#180e22', symbol: '🐦', top: '🌳', label: '끗',    badge: 'animal' },
  43: { bg: '#0c0808', grad: '#161010', symbol: '·',  top: '🌳', label: '피',    badge: 'junk' },
  44: { bg: '#120808', grad: '#1c1010', symbol: '·',  top: '🌳', label: '쌍피',  badge: 'doublejunk' },
  45: { bg: '#081014', grad: '#0e1820', symbol: '☂️', top: '🌧️', label: '光',    badge: 'bright' },
  46: { bg: '#081018', grad: '#0e1824', symbol: '🐦', top: '🌧️', label: '끗',    badge: 'animal' },
  47: { bg: '#141018', grad: '#1e1824', symbol: '🎗️', top: '🌧️', label: '띠',    badge: 'plain',     ribbon: true },
  48: { bg: '#100808', grad: '#1a1010', symbol: '·',  top: '🌧️', label: '쌍피',  badge: 'doublejunk' },
}

export interface BadgeStyle {
  bg: string
  fg: string
  glow: string
}

export const BADGE_STYLES: Record<string, BadgeStyle> = {
  bright:     { bg: '#f5d020', fg: '#000', glow: '#f5d02066' },
  animal:     { bg: '#22c55e', fg: '#000', glow: '#22c55e44' },
  animal2x:   { bg: '#16a34a', fg: '#fff', glow: '#16a34a44' },
  poetry:     { bg: '#f43f5e', fg: '#fff', glow: '#f43f5e44' },
  plain:      { bg: '#fb923c', fg: '#000', glow: '#fb923c44' },
  blue:       { bg: '#3b82f6', fg: '#fff', glow: '#3b82f644' },
  junk:       { bg: '#64748b', fg: '#fff', glow: 'none' },
  doublejunk: { bg: '#94a3b8', fg: '#000', glow: 'none' },
}

export const DECK: Card[] = [
  { id: 1,  month: 1,  type: CardType.BRIGHT },
  { id: 2,  month: 1,  type: CardType.RIBBON, ribbonType: 'poetry' },
  { id: 3,  month: 1,  type: CardType.JUNK },
  { id: 4,  month: 1,  type: CardType.JUNK },
  { id: 5,  month: 2,  type: CardType.ANIMAL },
  { id: 6,  month: 2,  type: CardType.RIBBON, ribbonType: 'poetry' },
  { id: 7,  month: 2,  type: CardType.JUNK },
  { id: 8,  month: 2,  type: CardType.JUNK },
  { id: 9,  month: 3,  type: CardType.BRIGHT },
  { id: 10, month: 3,  type: CardType.RIBBON, ribbonType: 'poetry' },
  { id: 11, month: 3,  type: CardType.JUNK },
  { id: 12, month: 3,  type: CardType.JUNK },
  { id: 13, month: 4,  type: CardType.ANIMAL },
  { id: 14, month: 4,  type: CardType.RIBBON, ribbonType: 'plain' },
  { id: 15, month: 4,  type: CardType.JUNK },
  { id: 16, month: 4,  type: CardType.JUNK },
  { id: 17, month: 5,  type: CardType.ANIMAL, countsAsDoublePi: true },
  { id: 18, month: 5,  type: CardType.RIBBON, ribbonType: 'plain' },
  { id: 19, month: 5,  type: CardType.JUNK },
  { id: 20, month: 5,  type: CardType.JUNK },
  { id: 21, month: 6,  type: CardType.ANIMAL },
  { id: 22, month: 6,  type: CardType.RIBBON, ribbonType: 'blue' },
  { id: 23, month: 6,  type: CardType.JUNK },
  { id: 24, month: 6,  type: CardType.JUNK },
  { id: 25, month: 7,  type: CardType.ANIMAL },
  { id: 26, month: 7,  type: CardType.RIBBON, ribbonType: 'plain' },
  { id: 27, month: 7,  type: CardType.JUNK },
  { id: 28, month: 7,  type: CardType.JUNK },
  { id: 29, month: 8,  type: CardType.BRIGHT },
  { id: 30, month: 8,  type: CardType.ANIMAL },
  { id: 31, month: 8,  type: CardType.JUNK },
  { id: 32, month: 8,  type: CardType.JUNK },
  { id: 33, month: 9,  type: CardType.ANIMAL, countsAsDoublePi: true },
  { id: 34, month: 9,  type: CardType.RIBBON, ribbonType: 'blue' },
  { id: 35, month: 9,  type: CardType.JUNK },
  { id: 36, month: 9,  type: CardType.JUNK },
  { id: 37, month: 10, type: CardType.ANIMAL },
  { id: 38, month: 10, type: CardType.RIBBON, ribbonType: 'blue' },
  { id: 39, month: 10, type: CardType.JUNK },
  { id: 40, month: 10, type: CardType.JUNK },
  { id: 41, month: 11, type: CardType.BRIGHT },
  { id: 42, month: 11, type: CardType.ANIMAL },
  { id: 43, month: 11, type: CardType.JUNK },
  { id: 44, month: 11, type: CardType.DOUBLE_JUNK },
  { id: 45, month: 12, type: CardType.BRIGHT },
  { id: 46, month: 12, type: CardType.ANIMAL },
  { id: 47, month: 12, type: CardType.RIBBON },
  { id: 48, month: 12, type: CardType.DOUBLE_JUNK },
]
