import type { Participant } from '@/lib/types'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export interface RatingGroup {
  letter: string
  tops: Participant[]
  bottoms: Participant[]
}

/**
 * 레이팅 내림차순으로 정렬한 뒤 그룹당 팀수(N)에 따라 그룹을 나눈다.
 * 그룹 크기 = 2N. 나누어떨어지지 않는 여유 인원은 최상위/최하위로 A그룹에 우선 배치하고,
 * 나머지는 레이팅 순으로 B·C·D… 그룹에 묶는다. (멤버십은 결정적)
 */
export function buildGroups(participants: Participant[], teamsPerGroup: number): RatingGroup[] {
  if (participants.length % 2 !== 0) {
    throw new Error('Odd number of participants')
  }
  const sorted = [...participants].sort((a, b) => b.rating - a.rating)
  const total = sorted.length
  if (total < 2) return []

  const groupSize = teamsPerGroup * 2
  const fullGroups = Math.floor(total / groupSize)
  const remainder = total % groupSize

  let topIdx = 0
  let bottomIdx = total - 1
  const takeTop = (n: number) => {
    const arr: Participant[] = []
    for (let i = 0; i < n; i++) arr.push(sorted[topIdx++])
    return arr
  }
  const takeBottom = (n: number) => {
    const arr: Participant[] = []
    for (let i = 0; i < n; i++) arr.push(sorted[bottomIdx--])
    return arr
  }

  const groups: RatingGroup[] = []
  let letterIdx = 0

  // 여유 인원(remainder) → A그룹 (최상위 + 최하위). groupSize·total이 짝수이므로 remainder도 짝수.
  if (remainder > 0) {
    groups.push({
      letter: LETTERS[letterIdx++],
      tops: takeTop(Math.ceil(remainder / 2)),
      bottoms: takeBottom(Math.floor(remainder / 2)),
    })
  }

  // 나머지는 레이팅 순으로 B·C·D… (각 N+N)
  for (let g = 0; g < fullGroups; g++) {
    groups.push({
      letter: LETTERS[letterIdx++],
      tops: takeTop(teamsPerGroup),
      bottoms: takeBottom(teamsPerGroup),
    })
  }

  return groups
}

export interface DrawnTeam {
  label: string       // "A1"
  a: Participant      // 상위
  b: Participant      // 하위
}

export interface DrawnGroup {
  letter: string      // "A"
  teams: DrawnTeam[]
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * buildGroups로 그룹을 나눈 뒤, 그룹 내에서 상위·하위를 무작위로 짝지어 팀을 만든다.
 * (그룹 멤버십은 결정적, 짝짓기만 랜덤)
 */
export function groupDraw(participants: Participant[], teamsPerGroup: number): DrawnGroup[] {
  const groups = buildGroups(participants, teamsPerGroup)
  return groups.map((g) => {
    const tops = shuffle(g.tops)
    const bottoms = shuffle(g.bottoms)
    const teams: DrawnTeam[] = tops.map((top, i) => ({
      label: `${g.letter}${i + 1}`,
      a: top,
      b: bottoms[i],
    }))
    return { letter: g.letter, teams }
  })
}
