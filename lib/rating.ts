export function getRatingColor(rating: number): string {
  if (rating < 2) return '#999ca0'
  if (rating < 8) return '#abdd22'
  if (rating < 14) return '#f2f3f4'
  if (rating < 25) return '#ffd200'
  return '#ff0006'
}

export function getRatingPrefix(rating: number): string {
  if (rating < 2) return 'N'
  if (rating < 4) return 'C'
  if (rating < 6) return 'CC'
  if (rating < 8) return 'CCC'
  if (rating < 10) return 'B'
  if (rating < 12) return 'BB'
  if (rating < 14) return 'BBB'
  if (rating < 17) return 'A'
  if (rating < 21) return 'AA'
  if (rating < 25) return 'AAA'
  if (rating < 28) return 'Master'
  return 'Grand Master'
}

export const RATING_OUTLINE =
  '-1px -1px 0 rgba(0,0,0,0.85), 1px -1px 0 rgba(0,0,0,0.85), -1px 1px 0 rgba(0,0,0,0.85), 1px 1px 0 rgba(0,0,0,0.85)'
