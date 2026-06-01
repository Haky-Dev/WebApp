import { describe, it, expect } from 'vitest'
import { groupRandom, buildGroupSizes } from '@/lib/algorithms/group-random'
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

describe('buildGroupSizes', () => {
  it('10명 / 2그룹 → [5, 5]', () => {
    expect(buildGroupSizes(10, 2)).toEqual([5, 5])
  })

  it('10명 / 4그룹 → [2, 3, 3, 2]', () => {
    expect(buildGroupSizes(10, 4)).toEqual([2, 3, 3, 2])
  })

  it('8명 / 4그룹 → [2, 2, 2, 2]', () => {
    expect(buildGroupSizes(8, 4)).toEqual([2, 2, 2, 2])
  })

  it('6명 / 4그룹 → [1, 2, 2, 1]', () => {
    expect(buildGroupSizes(6, 4)).toEqual([1, 2, 2, 1])
  })

  it('12명 / 4그룹 → [3, 3, 3, 3]', () => {
    expect(buildGroupSizes(12, 4)).toEqual([3, 3, 3, 3])
  })

  it('14명 / 4그룹 → [3, 4, 4, 3]', () => {
    expect(buildGroupSizes(14, 4)).toEqual([3, 4, 4, 3])
  })
})

describe('groupRandom', () => {
  it('모든 참가자가 정확히 한 번씩 배정된다', () => {
    const ps = makeParticipants([25, 20, 15, 10, 8, 6, 4, 2])
    const pairs = groupRandom(ps, 2)
    const assigned = pairs.flatMap(p => [p.a.id, p.b.id])
    expect(assigned.sort()).toEqual(ps.map(p => p.id).sort())
  })

  it('2그룹: 각 팀의 a는 상위절반, b는 하위절반에서 배정된다', () => {
    const ps = makeParticipants([20, 18, 16, 14, 5, 4, 3, 2])
    const pairs = groupRandom(ps, 2)
    const topRatings = new Set([20, 18, 16, 14])
    const bottomRatings = new Set([5, 4, 3, 2])
    for (const pair of pairs) {
      expect(topRatings.has(pair.a.rating)).toBe(true)
      expect(bottomRatings.has(pair.b.rating)).toBe(true)
    }
  })

  it('4그룹 10명: 올바른 팀 수 반환', () => {
    const ps = makeParticipants([25, 22, 18, 15, 12, 9, 7, 5, 3, 1])
    const pairs = groupRandom(ps, 4)
    expect(pairs).toHaveLength(5)
  })

  it('홀수 인원이면 에러를 던진다', () => {
    const ps = makeParticipants([10, 20, 30])
    expect(() => groupRandom(ps, 2)).toThrow('Odd number of participants')
  })
})
