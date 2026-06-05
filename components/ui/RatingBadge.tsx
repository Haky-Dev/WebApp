import { getRatingColor, getRatingPrefix, RATING_OUTLINE } from '@/lib/rating'

interface Props {
  rating: number
  fontSize?: number
  fontWeight?: number
}

export default function RatingBadge({ rating, fontSize = 12, fontWeight = 700 }: Props) {
  return (
    <span style={{
      fontSize,
      fontWeight,
      color: getRatingColor(rating),
      textShadow: RATING_OUTLINE,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}>
      {getRatingPrefix(rating)}{rating}
    </span>
  )
}
