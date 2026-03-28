import { CARD_IMAGE_URL, CARD_VISUAL, BADGE_STYLES, MONTHS } from '../core/cards'
import type { Card } from '../core/cards'

interface CardSVGProps {
  card: Card | { id: string; month: number }
  size?: number
  selected?: boolean
  highlighted?: boolean
  faceDown?: boolean
  onClick?: (() => void) | null
  dimmed?: boolean
}

export default function CardSVG({
  card,
  size = 58,
  selected,
  highlighted,
  faceDown,
  onClick,
  dimmed,
}: CardSVGProps) {
  const w = size
  const h = Math.round(size * 1.52)
  const rx = Math.round(size * 0.1)
  const id = card?.id as number
  const url = CARD_IMAGE_URL[id]
  const v = CARD_VISUAL[id]
  const bs = BADGE_STYLES[v?.badge] || BADGE_STYLES.junk
  const month = card?.month || 1

  const containerStyle: React.CSSProperties = {
    width: w,
    height: h,
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    transform: selected
      ? `translateY(-${size * 0.16}px) scale(1.1)`
      : highlighted
        ? 'scale(1.05)'
        : undefined,
    transition: 'all 0.15s ease',
    position: 'relative',
    borderRadius: rx,
    overflow: 'hidden',
    filter: dimmed ? 'brightness(0.45)' : undefined,
    boxShadow: selected
      ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 14px 4px rgba(255,255,255,0.5)'
      : highlighted
        ? '0 0 0 2px rgba(252,211,77,0.9), 0 0 12px 3px rgba(252,211,77,0.5)'
        : '2px 3px 8px rgba(0,0,0,0.6)',
  }

  if (faceDown) {
    return (
      <div style={containerStyle} onClick={onClick ?? undefined}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(160deg, #7f1d1d 0%, #3b0a0a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}>
          <span style={{ fontSize: size * 0.36, color: '#b91c1c', fontFamily: 'serif', fontWeight: 'bold', lineHeight: 1 }}>화</span>
          <span style={{ fontSize: size * 0.2, color: '#7f1d1d', fontFamily: 'serif', lineHeight: 1 }}>투</span>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle} onClick={onClick ?? undefined}>
      {/* Real Hwatu artwork */}
      <img
        src={url}
        alt={`${MONTHS[month - 1]?.en ?? ''} ${v?.label ?? ''}`}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
        draggable={false}
      />

      {/* Month number chip — top left */}
      <div style={{
        position: 'absolute',
        top: size * 0.05,
        left: size * 0.07,
        fontSize: size * 0.16,
        color: 'rgba(255,255,255,0.75)',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        lineHeight: 1,
        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
      }}>
        {month}
      </div>

      {/* Type badge — bottom bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: bs.bg,
        color: bs.fg,
        fontSize: size * 0.145,
        fontWeight: 'bold',
        textAlign: 'center',
        padding: `${Math.round(size * 0.05)}px 0`,
        fontFamily: "'Noto Sans KR', monospace",
        lineHeight: 1,
        opacity: 0.93,
      }}>
        {v?.label}
      </div>
    </div>
  )
}
