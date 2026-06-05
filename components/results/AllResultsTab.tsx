'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import RatingBadge from '@/components/ui/RatingBadge'
import { useClubColors } from '@/hooks/useClubColors'
import ClubBadge from '@/components/ui/ClubBadge'

interface Props { pairs: Pair[]; highlightId?: string | null }

type SortOption = 'team' | 'rating_desc' | 'rating_asc'

const NEON_COLORS = ['var(--neon-pink)', 'var(--neon-green)', 'var(--neon-cyan)']
function teamColor(index: number) { return NEON_COLORS[index % NEON_COLORS.length] }

function combinedRating(pair: Pair): number {
  return (pair.participant_a?.rating ?? 0) + (pair.participant_b?.rating ?? 0)
}

function ParticipantInfo({
  name, club, rating, isDesktop, clubColor,
}: { name: string; club: string | null; rating: number; isDesktop: boolean; clubColor?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {club && <ClubBadge name={club} color={clubColor} fontSize={isDesktop ? 12 : 10} />}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: isDesktop ? 20 : 15, fontWeight: 800, color: 'var(--text-primary)' }}>
          {name}
        </span>
        <RatingBadge rating={rating} fontSize={isDesktop ? 14 : 11} />
      </div>
    </div>
  )
}

export default function AllResultsTab({ pairs, highlightId }: Props) {
  const isDesktop = useIsDesktop()
  const clubColors = useClubColors()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('team')
  const [clubFilter, setClubFilter] = useState('')

  const clubs = [...new Set(
    pairs.flatMap(p => [p.participant_a?.club, p.participant_b?.club])
      .filter((c): c is string => Boolean(c))
  )].sort((a, b) => a.localeCompare(b, 'ko'))

  const avgRating = pairs.length > 0
    ? (pairs.flatMap(p => [p.participant_a?.rating ?? 0, p.participant_b?.rating ?? 0])
        .reduce((a, b) => a + b, 0) / (pairs.length * 2)).toFixed(2)
    : '—'

  let filtered = search
    ? pairs.filter(p =>
        p.participant_a?.name.includes(search) ||
        p.participant_b?.name.includes(search))
    : pairs

  if (clubFilter) {
    filtered = filtered.filter(p =>
      p.participant_a?.club === clubFilter ||
      p.participant_b?.club === clubFilter)
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'rating_desc') return combinedRating(b) - combinedRating(a)
    if (sort === 'rating_asc') return combinedRating(a) - combinedRating(b)
    return 0
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 통계 헤더 — PC 전용 */}
      {isDesktop && pairs.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          background: 'var(--bg-surface)', borderRadius: 10, padding: '16px 20px',
        }}>
          {([
            { value: String(pairs.length), label: '총 팀' },
            { value: String(pairs.length * 2), label: '참가자' },
            { value: avgRating, label: '평균 레이팅' },
          ] as const).map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 검색 */}
      <input
        className="input-field"
        placeholder="이름으로 검색..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* 정렬/필터 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          className="input-field"
          style={{ flex: 1 }}
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
        >
          <option value="team">팀 번호순</option>
          <option value="rating_desc">합산 레이팅 높은순</option>
          <option value="rating_asc">합산 레이팅 낮은순</option>
        </select>
        {clubs.length > 0 && (
          <select
            className="input-field"
            style={{ flex: 1 }}
            value={clubFilter}
            onChange={e => setClubFilter(e.target.value)}
          >
            <option value="">전체 동호회</option>
            {clubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* 카드 그리드 */}
      <div style={isDesktop
        ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }
        : { display: 'flex', flexDirection: 'column', gap: 7 }
      }>
        {sorted.map((pair) => {
          const highlight =
            pair.participant_a_id === highlightId ||
            pair.participant_b_id === highlightId
          const originalIndex = pairs.indexOf(pair)
          const color = teamColor(originalIndex)
          const combined = combinedRating(pair).toFixed(2)
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: highlight ? 'var(--neon-cyan)' : color }}>
                  {pair.group_label ?? `팀 ${pair.team_number}`}{highlight ? ' ← 내 팀' : ''}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
                  합산 {combined}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ParticipantInfo
                  name={pair.participant_a?.name ?? ''}
                  club={pair.participant_a?.club ?? null}
                  rating={pair.participant_a?.rating ?? 0}
                  isDesktop={isDesktop}
                  clubColor={pair.participant_a?.club ? clubColors.get(pair.participant_a.club) : undefined}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>×</span>
                <ParticipantInfo
                  name={pair.participant_b?.name ?? ''}
                  club={pair.participant_b?.club ?? null}
                  rating={pair.participant_b?.rating ?? 0}
                  isDesktop={isDesktop}
                  clubColor={pair.participant_b?.club ? clubColors.get(pair.participant_b.club) : undefined}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
