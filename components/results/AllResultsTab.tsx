'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'

interface Props { pairs: Pair[]; highlightId?: string | null }

const NEON_COLORS = ['var(--neon-pink)', 'var(--neon-green)', 'var(--neon-cyan)']

function teamColor(index: number) {
  return NEON_COLORS[index % NEON_COLORS.length]
}

export default function AllResultsTab({ pairs, highlightId }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? pairs.filter(p =>
        p.participant_a?.name.includes(search) ||
        p.participant_b?.name.includes(search)
      )
    : pairs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input
        className="input-field"
        placeholder="이름으로 검색..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {filtered.map((pair) => {
          const highlight =
            pair.participant_a_id === highlightId ||
            pair.participant_b_id === highlightId
          const originalIndex = pairs.indexOf(pair)
          const color = teamColor(originalIndex)
          return (
            <div
              key={pair.id}
              className="card-surface"
              style={{
                padding: '11px 14px',
                borderLeft: `3px solid ${highlight ? 'var(--neon-cyan)' : color}`,
                background: highlight ? 'var(--accent-bg)' : 'var(--bg-surface)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: highlight ? 'var(--neon-cyan)' : color, marginBottom: 8 }}>
                팀 {pair.team_number}{highlight ? ' ← 내 팀' : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {pair.participant_a?.club || '—'}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {pair.participant_a?.name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                    {pair.participant_a?.rating}
                  </span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>×</span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {pair.participant_b?.club || '—'}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {pair.participant_b?.name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                    {pair.participant_b?.rating}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
