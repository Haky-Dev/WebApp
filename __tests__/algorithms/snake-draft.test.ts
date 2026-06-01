import { describe, it, expect } from 'vitest'
import { snakeDraft } from '@/lib/algorithms/snake-draft'
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

describe('snakeDraft', () => {
  it('8명 → 상위절반과 하위절반을 순서대로 짝짓는다', () => {
    const ps = makeParticipants([25.5, 22.0, 18.75, 15.0, 9.5, 7.2, 5.8, 3.1])
    const pairs = snakeDraft(ps)

    expect(pairs).toHaveLength(4)
    expect(pairs[0].a.rating).toBe(25.5)
    expect(pairs[0].b.rating).toBe(9.5)
    expect(pairs[1].a.rating).toBe(22.0)
    expect(pairs[1].b.rating).toBe(7.2)
    expect(pairs[2].a.rating).toBe(18.75)
    expect(pairs[2].b.rating).toBe(5.8)
    expect(pairs[3].a.rating).toBe(15.0)
    expect(pairs[3].b.rating).toBe(3.1)
  })

  it('입력 순서가 뒤섞여 있어도 레이팅으로 정렬해서 배정한다', () => {
    const ps = makeParticipants([5.0, 20.0, 10.0, 1.0])
    const pairs = snakeDraft(ps)
    expect(pairs[0].a.rating).toBe(20.0)
    expect(pairs[0].b.rating).toBe(5.0)
    expect(pairs[1].a.rating).toBe(10.0)
    expect(pairs[1].b.rating).toBe(1.0)
  })

  it('모든 참가자가 정확히 한 번씩 배정된다', () => {
    const ps = makeParticipants([10, 20, 30, 5, 15, 25])
    const pairs = snakeDraft(ps)
    const assigned = pairs.flatMap(p => [p.a.id, p.b.id])
    const ids = ps.map(p => p.id)
    expect(assigned.sort()).toEqual(ids.sort())
  })

  it('홀수 인원이면 에러를 던진다', () => {
    const ps = makeParticipants([10, 20, 30])
    expect(() => snakeDraft(ps)).toThrow('Odd number of participants')
  })
})
