'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'
import CopyButton from './CopyButton'

interface Props { pairs: Pair[]; highlightId?: string | null }

export default function AllResultsTab({ pairs, highlightId }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? pairs.filter(p =>
        p.participant_a?.name.includes(search) ||
        p.participant_b?.name.includes(search)
      )
    : pairs

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="이름 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <CopyButton pairs={pairs} />
      </div>

      <div className="space-y-2">
        {filtered.map(pair => {
          const isHighlighted =
            pair.participant_a_id === highlightId ||
            pair.participant_b_id === highlightId

          return (
            <div
              key={pair.id}
              className={`p-3 rounded-lg border ${
                isHighlighted ? 'border-blue-400 bg-blue-50' : 'border-gray-100'
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">팀 {pair.team_number}</p>
              <div className="flex gap-4 text-sm">
                <div className="flex-1">
                  <span className="font-semibold">{pair.participant_a?.name}</span>
                  {pair.participant_a?.club && (
                    <span className="text-gray-400 text-xs ml-1">({pair.participant_a.club})</span>
                  )}
                  <span className="ml-2 text-gray-500">{pair.participant_a?.rating.toFixed(2)}</span>
                </div>
                <span className="text-gray-300">+</span>
                <div className="flex-1">
                  <span className="font-semibold">{pair.participant_b?.name}</span>
                  {pair.participant_b?.club && (
                    <span className="text-gray-400 text-xs ml-1">({pair.participant_b.club})</span>
                  )}
                  <span className="ml-2 text-gray-500">{pair.participant_b?.rating.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
