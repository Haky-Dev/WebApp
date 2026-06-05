import { RATING_OUTLINE } from '@/lib/rating'

interface Props {
  name: string
  color?: string | null
  fontSize?: number
  fontWeight?: number
}

export default function ClubBadge({ name, color, fontSize = 10, fontWeight = 400 }: Props) {
  return (
    <span style={{
      fontSize,
      fontWeight,
      color: color ?? 'var(--text-muted)',
      textShadow: color ? RATING_OUTLINE : 'none',
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}
