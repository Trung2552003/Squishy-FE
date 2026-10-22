import { cn } from '@/lib/utils'

export type MascotMood = 'happy' | 'wink' | 'sleepy' | 'worried'

interface MascotProps {
  mood?: MascotMood
  size?: number
  color?: string
  className?: string
  animated?: boolean
}

const INK = '#1e293b'

// Linh vật "Mochi" – một bé squishy tròn vẽ bằng SVG, có chớp mắt và nhún nhảy nhẹ
export function Mascot({ mood = 'happy', size = 72, color = '#FFC8D6', className, animated = true }: MascotProps) {
  const eyeOpen = (cx: number) => (
    <g className={animated ? 'mochi-eye' : undefined}>
      <ellipse cx={cx} cy={56} rx={4.2} ry={5.4} fill={INK} />
      <circle cx={cx + 1.4} cy={54} r={1.4} fill="#fff" />
    </g>
  )
  const eyeClosed = (cx: number, up = false) => (
    <path
      d={up ? `M${cx - 6} 57 q6 -6 12 0` : `M${cx - 6} 55 q6 6 12 0`}
      stroke={INK}
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    />
  )

  let eyes
  let mouth
  if (mood === 'sleepy') {
    eyes = <>{eyeClosed(44)}{eyeClosed(76)}</>
    mouth = <ellipse cx={60} cy={70} rx={3} ry={3.6} fill={INK} />
  } else if (mood === 'wink') {
    eyes = <>{eyeOpen(44)}{eyeClosed(76, true)}</>
    mouth = <path d="M52 66 q8 9 16 0" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="#FF8FAB" />
  } else if (mood === 'worried') {
    eyes = (
      <>
        {eyeOpen(44)}
        {eyeOpen(76)}
        <path d="M37 45 l10 -3 M83 45 l-10 -3" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      </>
    )
    mouth = <path d="M53 71 q7 -6 14 0" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
  } else {
    eyes = <>{eyeOpen(44)}{eyeOpen(76)}</>
    mouth = <path d="M53 65 q3.5 5 7 0 q3.5 5 7 0" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  }

  return (
    <svg
      width={size}
      height={size * (100 / 120)}
      viewBox="0 0 120 100"
      role="img"
      aria-label="Linh vật Mochi"
      className={cn(animated && 'mochi-bob', className)}
    >
      {/* Bóng dưới chân */}
      <ellipse cx={60} cy={95} rx={38} ry={4} fill={INK} opacity={0.12} />
      {/* Thân mochi */}
      <path
        d="M12 70 C12 36 34 14 60 14 C86 14 108 36 108 70 C108 87 92 92 60 92 C28 92 12 87 12 70 Z"
        fill={color}
        stroke={INK}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      {/* Vệt bóng */}
      <ellipse cx={38} cy={34} rx={10} ry={5} fill="#fff" opacity={0.75} transform="rotate(-28 38 34)" />
      <circle cx={53} cy={26} r={2.2} fill="#fff" opacity={0.75} />
      {/* Lá mầm trên đầu */}
      <path d="M60 15 C58 8 52 5 46 6 C48 12 53 15 60 15 Z" fill="#A7F3D0" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M60 15 C62 9 67 6 73 7 C71 12 66 15 60 15 Z" fill="#A7F3D0" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {/* Má hồng */}
      <ellipse cx={32} cy={67} rx={7} ry={4.5} fill="#FF8FAB" opacity={0.65} />
      <ellipse cx={88} cy={67} rx={7} ry={4.5} fill="#FF8FAB" opacity={0.65} />
      {eyes}
      {mouth}
      {mood === 'sleepy' && (
        <text x={92} y={30} fontSize={16} fontWeight={900} fill={INK} className={animated ? 'mochi-zzz' : undefined}>
          z
        </text>
      )}
    </svg>
  )
}

// Nét gạch chân nguệch ngoạc vẽ tay
export function Squiggle({ className }: { className?: string }) {
  let d = 'M2 7'
  for (let x = 2; x < 198; x += 16) d += ` q4 -6 8 0 t8 0`
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Ngôi sao lấp lánh nhỏ để trang trí
export function SparkleDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2 C13 8 16 11 22 12 C16 13 13 16 12 22 C11 16 8 13 2 12 C8 11 11 8 12 2 Z"
        fill="currentColor"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}
