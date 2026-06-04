import { describe, it, expect } from 'vitest'
import { buildGroups, groupDraw } from '@/lib/algorithms/group-draw'
import type { Participant } from '@/lib/types'

function makeParticipants(ratings: number[]): Participant[] {
  return ratings.map((rating, i) => ({
    id: `p${i}`,
    event_id: 'e1',
    name: `Player${i}`,
    club: null,
    rating,
    registered_at: '',
  }))
}

describe('buildGroups', () => {
  it('24명 / N6 (groupSize 12, 나머지 0) → A·B 두 그룹, 각 6+6', () => {
    const ps = makeParticipants(Array.from({ length: 24 }, (_, i) => 24 - i))
    const groups = buildGroups(ps, 6)
    expect(groups.map(g => g.letter)).toEqual(['A', 'B'])
    for (const g of groups) {
      expect(g.tops).toHaveLength(6)
      expect(g.bottoms).toHaveLength(6)
    }
  })

  it('여유 인원은 최상위/최하위로 A그룹에 우선 배치된다 (40명 / N6)', () => {
    // groupSize 12, remainder 4 → A: top2 + bottom2, 이후 36명 → B·C·D 각 6+6
    const ps = makeParticipants(Array.from({ length: 40 }, (_, i) => 40 - i)) // rating 40..1
    const groups = buildGroups(ps, 6)
    expect(groups.map(g => g.letter)).toEqual(['A', 'B', 'C', 'D'])
    expect(groups[0].tops.map(p => p.rating)).toEqual([40, 39])
    expect(groups[0].bottoms.map(p => p.rating)).toEqual([1, 2])
    expect(groups[1].tops.map(p => p.rating)).toEqual([38, 37, 36, 35, 34, 33])
  })

  it('groupSize > total 이면 전원이 A그룹 하나로 묶인다', () => {
    const ps = makeParticipants([10, 8, 6, 4]) // N6 → groupSize 12 > 4
    const groups = buildGroups(ps, 6)
    expect(groups).toHaveLength(1)
    expect(groups[0].letter).toBe('A')
    expect(groups[0].tops).toHaveLength(2)
    expect(groups[0].bottoms).toHaveLength(2)
  })

  it('모든 참가자가 정확히 한 번씩 어떤 그룹에 속한다', () => {
    const ps = makeParticipants(Array.from({ length: 30 }, (_, i) => 30 - i))
    const groups = buildGroups(ps, 4)
    const ids = groups.flatMap(g => [...g.tops, ...g.bottoms].map(p => p.id))
    expect(ids.sort()).toEqual(ps.map(p => p.id).sort())
  })

  it('홀수 인원이면 에러를 던진다', () => {
    expect(() => buildGroups(makeParticipants([10, 20, 30]), 6)).toThrow('Odd number of participants')
  })
})

describe('groupDraw', () => {
  it('각 그룹의 모든 멤버가 정확히 한 팀씩 구성된다', () => {
    const ps = makeParticipants(Array.from({ length: 24 }, (_, i) => 24 - i))
    const groups = groupDraw(ps, 6)
    const ids = groups.flatMap(g => g.teams.flatMap(t => [t.a.id, t.b.id]))
    expect(ids.sort()).toEqual(ps.map(p => p.id).sort())
  })

  it('팀의 a는 그룹 상위, b는 그룹 하위에서 나온다', () => {
    const ps = makeParticipants(Array.from({ length: 12 }, (_, i) => 12 - i)) // 한 그룹(N6)
    const groups = groupDraw(ps, 6)
    const topRatings = new Set([12, 11, 10, 9, 8, 7])
    const bottomRatings = new Set([6, 5, 4, 3, 2, 1])
    for (const t of groups[0].teams) {
      expect(topRatings.has(t.a.rating)).toBe(true)
      expect(bottomRatings.has(t.b.rating)).toBe(true)
    }
  })

  it('팀 라벨은 그룹문자+순번 (A1, A2 …)', () => {
    const ps = makeParticipants(Array.from({ length: 24 }, (_, i) => 24 - i))
    const groups = groupDraw(ps, 6)
    expect(groups[0].teams.map(t => t.label)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'])
    expect(groups[1].teams[0].label).toBe('B1')
  })

  it('홀수 인원이면 에러를 던진다', () => {
    expect(() => groupDraw(makeParticipants([10, 20, 30]), 6)).toThrow('Odd number of participants')
  })
})
