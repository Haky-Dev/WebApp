'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { useClubColors } from '@/hooks/useClubColors'
import RatingBadge from '@/components/ui/RatingBadge'
import ClubBadge from '@/components/ui/ClubBadge'

interface Props { pairs: Pair[]; highlightId?: string | null }

type SortOption = 'team' | 'rating_desc' | 'rating_asc'

const NEON_COLORS = ['var(--neon-pink)', 'var(--neon-green)', 'var(--neon-cyan)']

function pairColor(pair: Pair, originalIndex: number): string {
  if (pair.group_label) {
    const letterIdx = pair.group_label.charCodeAt(0) - 65 // 'A' = 65
    return NEON_COLORS[Math.max(0, letterIdx) % NEON_COLORS.length]
  }
  return NEON_COLORS[originalIndex % NEON_COLORS.length]
}

function combinedRating(pair: Pair): number {
  return (pair.participant_a?.rating ?? 0) + (pair.participant_b?.rating ?? 0)
}

function MemberCard({
  name, club, rating, isDesktop, color, isMe, clubColor,
}: {
  name: string; club: string | null; rating: number
  isDesktop: boolean; color: string; isMe: boolean; clubColor?: string
}) {
  return (
    <div
      className="card-surface"
      style={{
        flex: 1,
        padding: isDesktop ? '12px 14px' : '9px 11px',
        borderLeft: `3px solid ${isMe ? 'var(--neon-cyan)' : color}`,
        background: isMe ? 'var(--accent-bg)' : 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {club && <ClubBadge name={club} color={clubColor} fontSize={isDesktop ? 11 : 10} />}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: isDesktop ? 18 : 14,
          fontWeight: 800,
          color: isMe ? 'var(--neon-cyan)' : 'var(--text-primary)',
        }}>
          {name}{isMe ? ' ←' : ''}
        </span>
        <RatingBadge rating={rating} fontSize={isDesktop ? 13 : 11} />
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

      {/* 팀 그리드 */}
      <div style={isDesktop
        ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }
        : { display: 'flex', flexDirection: 'column', gap: 10 }
      }>
        {sorted.map((pair) => {
          const isHighlightA = pair.participant_a_id === highlightId
          const isHighlightB = pair.participant_b_id === highlightId
          const originalIndex = pairs.indexOf(pair)
          const color = pairColor(pair, originalIndex)
          const combined = combinedRating(pair).toFixed(2)
          return (
            <div key={pair.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#ffffff' }}>
                합산 {combined}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <MemberCard
                  name={pair.participant_a?.name ?? ''}
                  club={pair.participant_a?.club ?? null}
                  rating={pair.participant_a?.rating ?? 0}
                  isDesktop={isDesktop}
                  color={color}
                  isMe={isHighlightA}
                  clubColor={pair.participant_a?.club ? clubColors.get(pair.participant_a.club) : undefined}
                />
                <MemberCard
                  name={pair.participant_b?.name ?? ''}
                  club={pair.participant_b?.club ?? null}
                  rating={pair.participant_b?.rating ?? 0}
                  isDesktop={isDesktop}
                  color={color}
                  isMe={isHighlightB}
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
