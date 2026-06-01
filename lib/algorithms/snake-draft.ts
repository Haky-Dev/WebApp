import type { Participant } from '@/lib/types'

export interface AlgorithmPair {
  a: Participant
  b: Participant
}

export function snakeDraft(participants: Participant[]): AlgorithmPair[] {
  if (participants.length % 2 !== 0) {
    throw new Error('Odd number of participants')
  }
  const sorted = [...participants].sort((a, b) => b.rating - a.rating)
  const half = sorted.length / 2
  return sorted.slice(0, half).map((p, i) => ({
    a: p,
    b: sorted[half + i],
  }))
}
