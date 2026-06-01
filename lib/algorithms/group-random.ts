import type { Participant } from '@/lib/types'
import type { AlgorithmPair } from './snake-draft'

export function buildGroupSizes(n: number, g: 2 | 4): number[] {
  const base = Math.floor(n / g)
  const sizes = Array(g).fill(base) as number[]
  let remainder = n - base * g
  // Distribute extras symmetrically to middle group pairs
  let inner = 1
  while (remainder >= 2 && inner < g - inner) {
    sizes[inner]++
    sizes[g - 1 - inner]++
    remainder -= 2
    inner++
  }
  if (remainder !== 0) {
    throw new Error('Cannot distribute participants symmetrically')
  }
  return sizes
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function groupRandom(
  participants: Participant[],
  groupCount: 2 | 4
): AlgorithmPair[] {
  if (participants.length % 2 !== 0) {
    throw new Error('Odd number of participants')
  }
  const sorted = [...participants].sort((a, b) => b.rating - a.rating)
  const sizes = buildGroupSizes(sorted.length, groupCount)

  // Slice sorted array into groups
  const groups: Participant[][] = []
  let idx = 0
  for (const size of sizes) {
    groups.push(sorted.slice(idx, idx + size))
    idx += size
  }

  // Pair groups: groups[0]↔groups[G-1], groups[1]↔groups[G-2]
  const pairs: AlgorithmPair[] = []
  for (let i = 0; i < groupCount / 2; i++) {
    const upper = groups[i]
    const lower = shuffle(groups[groupCount - 1 - i])
    for (let j = 0; j < upper.length; j++) {
      pairs.push({ a: upper[j], b: lower[j] })
    }
  }
  return pairs
}
