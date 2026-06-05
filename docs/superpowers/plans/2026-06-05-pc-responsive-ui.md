# PC 반응형 UI 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배정 결과 페이지·배정 애니메이션·그룹 추첨 세리머니를 PC에서 2열 그리드·확대 폰트·풍부한 정보로 표시하고, 스핀 애니메이션에 슬롯머신+블러+바운스+글로우 효과를 추가한다.

**Architecture:** `useIsDesktop` 훅 하나로 768px 브레이크포인트를 관리하고, 모든 반응형 조건을 인라인 스타일로 처리한다. 새로운 CSS 키프레임(`spinBounce`)은 `globals.css`에 추가한다. 모바일 레이아웃은 변경하지 않는다.

**Tech Stack:** Next.js 16 App Router, React 18 (`useState`/`useEffect`), TypeScript, inline styles + CSS variables, `canvas-confetti`, Vitest (알고리즘 테스트용)

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `hooks/useIsDesktop.ts` | 신규 생성 |
| `app/globals.css` | `@keyframes spinBounce` 추가 |
| `app/events/[id]/results/page.tsx` | 컨테이너 반응형 |
| `components/results/AllResultsTab.tsx` | 전면 개편 |
| `components/animation/AssignmentAnimation.tsx` | 전면 개편 |
| `components/animation/GroupDrawCeremony.tsx` | 전면 개편 |

---

## Task 1: 공통 기반 — `useIsDesktop` 훅 + `spinBounce` 키프레임

**Files:**
- Create: `hooks/useIsDesktop.ts`
- Modify: `app/globals.css` (line 309 이후)

- [ ] **Step 1: `hooks/useIsDesktop.ts` 생성**

```ts
'use client'
import { useEffect, useState } from 'react'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}
```

- [ ] **Step 2: `app/globals.css`에 `spinBounce` 키프레임 추가**

`slideUp` 키프레임(line 309) 바로 아래에 추가:

```css
@keyframes spinBounce {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 3: 커밋**

```bash
git add hooks/useIsDesktop.ts app/globals.css
git commit -m "feat: add useIsDesktop hook and spinBounce keyframe"
```

---

## Task 2: 결과 페이지 컨테이너 반응형

**Files:**
- Modify: `app/events/[id]/results/page.tsx` (line 111)

현재 코드:
```tsx
<div style={{ maxWidth: 512, margin: '0 auto', padding: '24px' }}>
```

- [ ] **Step 1: `useIsDesktop` 임포트 추가**

`app/events/[id]/results/page.tsx` 상단 임포트에 추가:

```tsx
import { useIsDesktop } from '@/hooks/useIsDesktop'
```

- [ ] **Step 2: `useIsDesktop` 훅 사용 선언**

컴포넌트 안 `useState` 선언부 근처에 추가:

```tsx
const isDesktop = useIsDesktop()
```

- [ ] **Step 3: 컨테이너 스타일 반응형으로 교체**

```tsx
// 변경 전
<div style={{ maxWidth: 512, margin: '0 auto', padding: '24px' }}>

// 변경 후
<div style={{
  maxWidth: isDesktop ? 1100 : 512,
  margin: '0 auto',
  padding: isDesktop ? '40px 48px' : '24px',
}}>
```

- [ ] **Step 4: 브라우저에서 확인**

`npm run dev` 실행 후 결과 페이지를 열어 창 너비를 768px 이상/이하로 조절하며 컨테이너 폭이 바뀌는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/events/[id]/results/page.tsx
git commit -m "feat: responsive container on results page"
```

---

## Task 3: `AllResultsTab` 전면 개편

**Files:**
- Modify: `components/results/AllResultsTab.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체를 아래 코드로 교체**

```tsx
'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'
import { useIsDesktop } from '@/hooks/useIsDesktop'

interface Props { pairs: Pair[]; highlightId?: string | null }

type SortOption = 'team' | 'rating_desc' | 'rating_asc'

const NEON_COLORS = ['var(--neon-pink)', 'var(--neon-green)', 'var(--neon-cyan)']
function teamColor(index: number) { return NEON_COLORS[index % NEON_COLORS.length] }

function combinedRating(pair: Pair): number {
  return (pair.participant_a?.rating ?? 0) + (pair.participant_b?.rating ?? 0)
}

function ParticipantInfo({
  name, club, rating, isDesktop,
}: { name: string; club: string | null; rating: number; isDesktop: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {club && (
        <span style={{ fontSize: isDesktop ? 12 : 10, fontWeight: 400, color: 'var(--text-muted)' }}>
          {club}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: isDesktop ? 20 : 15, fontWeight: 800, color: 'var(--text-primary)' }}>
          {name}
        </span>
        <span style={{ fontSize: isDesktop ? 14 : 11, fontWeight: 700, color: 'var(--text-muted)' }}>
          {rating}
        </span>
      </div>
    </div>
  )
}

export default function AllResultsTab({ pairs, highlightId }: Props) {
  const isDesktop = useIsDesktop()
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
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>×</span>
                <ParticipantInfo
                  name={pair.participant_b?.name ?? ''}
                  club={pair.participant_b?.club ?? null}
                  rating={pair.participant_b?.rating ?? 0}
                  isDesktop={isDesktop}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

- PC(768px↑): 통계 헤더 표시, 2열 그리드, 카드에 동호회+이름+레이팅, 합산 레이팅 배지
- 모바일(767px↓): 통계 헤더 없음, 1열, 기존 폰트 크기
- 정렬 드롭다운: 합산 레이팅 높은순 선택 시 카드 순서 변경
- 동호회 필터: 특정 동호회 선택 시 해당 동호회 포함 팀만 표시
- 동호회 없는 참가자: 동호회 줄 생략됨

- [ ] **Step 3: 커밋**

```bash
git add components/results/AllResultsTab.tsx
git commit -m "feat: redesign AllResultsTab with stats, sort/filter, 2-col grid"
```

---

## Task 4: `AssignmentAnimation` 전면 개편

**Files:**
- Modify: `components/animation/AssignmentAnimation.tsx` (전체 교체)

주요 변경:
- `spinning: boolean` → `spinPhase: 'idle' | 'fast' | 'slow' | 'locked'`
- 드럼롤 이름 폰트: `30px` → `clamp(30px, 4vw, 64px)`
- 드럼롤 컨테이너 maxWidth: PC에서 `700px`
- 공개된 팀 목록: 동호회·레이팅 포함
- 피날레: PC에서 2열 그리드, maxWidth `900px`, 카드에 동호회·레이팅

- [ ] **Step 1: 파일 전체를 아래 코드로 교체**

```tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'
import { useIsDesktop } from '@/hooks/useIsDesktop'

interface Props {
  pairs: { a: Participant; b: Participant }[]
  onEnd: () => void
}

type Phase = 'drumroll' | 'finale'
type SpinPhase = 'idle' | 'fast' | 'slow' | 'locked'

const TEAM_COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const TEAM_COLORS_RGBA = [
  'rgba(255, 45, 120, 0.13)',
  'rgba(57, 255, 20, 0.13)',
  'rgba(0, 212, 255, 0.13)',
]
function teamColor(i: number) { return TEAM_COLORS[i % TEAM_COLORS.length] }
function teamColorRgba(i: number) { return TEAM_COLORS_RGBA[i % TEAM_COLORS_RGBA.length] }

function participantLabel(p: Participant): string {
  const club = p.club ? `${p.club} ` : ''
  return `${club}${p.name} (${p.rating})`
}

export default function AssignmentAnimation({ pairs, onEnd }: Props) {
  const isDesktop = useIsDesktop()
  const [phase, setPhase] = useState<Phase>('drumroll')
  const [currentTeam, setCurrentTeam] = useState(0)
  const [spinPhase, setSpinPhase] = useState<SpinPhase>('idle')
  const [spinName, setSpinName] = useState('...')
  const [revealedPairs, setRevealedPairs] = useState<typeof pairs>([])
  const spinInterval = useRef<ReturnType<typeof setTimeout> | null>(null)

  const names = pairs.map(p => p.b.name)

  useEffect(() => {
    runDrumroll(0)
    return () => { if (spinInterval.current) clearTimeout(spinInterval.current) }
  }, [])

  function runDrumroll(teamIdx: number) {
    if (teamIdx >= pairs.length) {
      setPhase('finale')
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#ff2d78', '#39ff14', '#00d4ff'] })
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 }, colors: ['#ff2d78', '#39ff14'] }), 400)
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 }, colors: ['#00d4ff', '#39ff14'] }), 700)
      }, 300)
      return
    }

    setCurrentTeam(teamIdx)
    setSpinPhase('fast')
    setSpinName('...')

    let speed = 60, elapsed = 0
    const totalDuration = 2000 + teamIdx * 200

    function tick() {
      setSpinName(names[Math.floor(Math.random() * names.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      setSpinPhase(speed < 250 ? 'fast' : 'slow')
      if (elapsed < totalDuration) {
        spinInterval.current = setTimeout(tick, speed)
      } else {
        setSpinName(pairs[teamIdx].b.name)
        setSpinPhase('locked')
        setRevealedPairs(prev => [...prev, pairs[teamIdx]])
        setTimeout(() => runDrumroll(teamIdx + 1), 1200)
      }
    }
    tick()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#010101',
      color: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* 스캔라인 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
        opacity: 0.3, pointerEvents: 'none', zIndex: 0,
      }} />

      {phase === 'drumroll' && (
        <>
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.18), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,45,120,0.15), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px', maxWidth: isDesktop ? 700 : 480, width: '100%' }}>
            <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', marginBottom: 24, textTransform: 'uppercase' }}>
              TEAM {String(currentTeam + 1).padStart(2, '0')} / {pairs.length}
            </div>

            {/* 팀A 이름 */}
            <div style={{ fontSize: 'clamp(30px, 4vw, 64px)', fontWeight: 900, color: '#f1f5f9', textShadow: '0 0 20px rgba(255,255,255,0.2)', marginBottom: 4 }}>
              {pairs[currentTeam]?.a.name}
            </div>
            {pairs[currentTeam]?.a.club && (
              <div style={{ fontSize: 13, color: '#555', fontWeight: 700, marginBottom: 4 }}>
                {pairs[currentTeam].a.club} · {pairs[currentTeam].a.rating}
              </div>
            )}
            {!pairs[currentTeam]?.a.club && (
              <div style={{ fontSize: 13, color: '#555', fontWeight: 700, marginBottom: 4 }}>
                {pairs[currentTeam]?.a.rating}
              </div>
            )}

            <div style={{ fontSize: 16, color: '#444', fontWeight: 700, margin: '8px 0' }}>+</div>

            {/* 스핀 이름 */}
            <div style={{
              fontSize: 'clamp(30px, 4vw, 64px)', fontWeight: 900,
              color: spinPhase === 'locked' ? '#39ff14' : '#555',
              textShadow: spinPhase === 'locked' ? '0 0 22px #39ff14, 0 0 50px rgba(57,255,20,0.5)' : 'none',
              filter: spinPhase === 'fast' ? 'blur(2px)' : 'blur(0)',
              opacity: spinPhase === 'fast' ? 0.7 : 1,
              animation: spinPhase === 'locked' ? 'spinBounce 0.3s ease both' : 'none',
              transition: 'color 0.2s, text-shadow 0.2s, filter 0.15s, opacity 0.15s',
              minHeight: '2.5rem',
            }}>
              {spinName}
            </div>
            {spinPhase === 'locked' && pairs[currentTeam] && (
              <div style={{ fontSize: 13, color: '#555', fontWeight: 700, marginTop: 4 }}>
                {pairs[currentTeam].b.club
                  ? `${pairs[currentTeam].b.club} · ${pairs[currentTeam].b.rating}`
                  : String(pairs[currentTeam].b.rating)}
              </div>
            )}

            {/* 공개된 팀 목록 */}
            {revealedPairs.length > 0 && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #111' }}>
                {revealedPairs.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#444', fontWeight: 700, marginBottom: 4 }}>
                    팀{i + 1}: {participantLabel(p.a)} × {participantLabel(p.b)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {phase === 'finale' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 0%, rgba(255,45,120,0.18), transparent 50%), radial-gradient(ellipse at 10% 100%, rgba(57,255,20,0.15), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.07), transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: isDesktop ? 900 : 480, padding: '0 24px' }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '2px', marginBottom: 20, textTransform: 'uppercase' }}>
              배정 완료!
            </div>

            <div style={isDesktop
              ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, overflowY: 'auto', maxHeight: '60vh', marginBottom: 16 }
              : { display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: '60vh', marginBottom: 16 }
            }>
              {pairs.map((p, i) => {
                const combined = ((p.a.rating ?? 0) + (p.b.rating ?? 0)).toFixed(2)
                return (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${teamColor(i)}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                      boxShadow: `0 0 12px ${teamColorRgba(i)}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: teamColor(i), textShadow: `0 0 8px ${teamColor(i)}` }}>
                        팀 {i + 1}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>합산 {combined}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        {p.a.club && <div style={{ fontSize: 11, color: '#555', fontWeight: 400 }}>{p.a.club}</div>}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: '#f1f5f9' }}>{p.a.name}</span>
                          <span style={{ fontSize: 12, color: '#555', fontWeight: 700 }}>{p.a.rating}</span>
                        </div>
                      </div>
                      <span style={{ color: '#444', fontWeight: 700, flexShrink: 0 }}>×</span>
                      <div style={{ flex: 1 }}>
                        {p.b.club && <div style={{ fontSize: 11, color: '#555', fontWeight: 400 }}>{p.b.club}</div>}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: '#f1f5f9' }}>{p.b.name}</span>
                          <span style={{ fontSize: 12, color: '#555', fontWeight: 700 }}>{p.b.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={onEnd} className="btn-cta">
              결과 페이지로 이동
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

배정 애니메이션 트리거 방법: 어드민 페이지에서 snake 배정 실행.

- 드럼롤 단계:
  - 스핀 중: 이름이 빠르게 변하면서 blur 효과
  - 감속: blur 해제
  - 확정: 초록 글로우 + 바운스 애니메이션
  - 확정 후 이름 아래 동호회·레이팅 표시
  - 하단 목록에 `동호회 이름 (레이팅) × ...` 형식

- 피날레 단계:
  - PC: 2열 그리드, 이름 20px
  - 카드에 동호회·레이팅·합산 레이팅 표시

- [ ] **Step 3: 커밋**

```bash
git add components/animation/AssignmentAnimation.tsx
git commit -m "feat: redesign AssignmentAnimation with spin effects and rich card info"
```

---

## Task 5: `GroupDrawCeremony` 전면 개편

**Files:**
- Modify: `components/animation/GroupDrawCeremony.tsx` (전체 교체)

주요 변경:
- `phase: 'idle' | 'spinning' | 'locked'` 유지, `spinVisualPhase` 추가
- 추첨 단계 이름에 blur/bounce/glow 효과
- 추첨 단계 팀A·팀B에 동호회·레이팅 표시
- 그리드 단계: PC에서 최대 6열, 버튼 minWidth `160px`
- 피날레: PC에서 5열, maxWidth `1200px`, 카드에 동호회·레이팅

- [ ] **Step 1: 파일 전체를 아래 코드로 교체**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type { DrawnGroup } from '@/lib/algorithms/group-draw'
import { useIsDesktop } from '@/hooks/useIsDesktop'

interface Props {
  groups: DrawnGroup[]
  publishing: boolean
  onPublish: () => void
}

type Stage = 'grid' | 'draw' | 'finale'
type Phase = 'idle' | 'spinning' | 'locked'
type SpinVisualPhase = 'idle' | 'fast' | 'slow' | 'locking' | 'locked'

const COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const colorFor = (i: number) => COLORS[i % COLORS.length]

const bracket: React.CSSProperties = {
  position: 'absolute', width: 34, height: 34,
  borderColor: 'rgba(57,255,20,0.4)', borderStyle: 'solid',
}

function Scan() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35,
      background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.22) 3px,rgba(0,0,0,0.22) 4px)',
    }} />
  )
}

function Brackets() {
  return (
    <>
      <div style={{ ...bracket, top: 16, left: 16, borderRight: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, top: 16, right: 16, borderLeft: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, left: 16, borderRight: 0, borderTop: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, right: 16, borderLeft: 0, borderTop: 0, borderWidth: 2 }} />
    </>
  )
}

export default function GroupDrawCeremony({ groups, publishing, onPublish }: Props) {
  const isDesktop = useIsDesktop()
  const [stage, setStage] = useState<Stage>('grid')
  const [groupIdx, setGroupIdx] = useState(0)
  const [done, setDone] = useState<boolean[]>(() => groups.map(() => false))
  const [revealCount, setRevealCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [spinVisualPhase, setSpinVisualPhase] = useState<SpinVisualPhase>('idle')
  const [spinName, setSpinName] = useState('???')
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (spinTimer.current) clearTimeout(spinTimer.current) }, [])

  const group = groups[groupIdx]
  const allDone = done.every(Boolean)

  function openGroup(idx: number) {
    setGroupIdx(idx)
    setRevealCount(0)
    setPhase('idle')
    setSpinVisualPhase('idle')
    setSpinName('???')
    setStage('draw')
  }

  function startSpin() {
    if (phase !== 'idle') return
    const g = groups[groupIdx]
    const team = g.teams[revealCount]
    if (!team) return
    setPhase('spinning')
    setSpinVisualPhase('fast')
    const candidates = g.teams.map(t => t.b.name)
    let speed = 80
    let elapsed = 0
    const total = 1000
    const tick = () => {
      setSpinName(candidates[Math.floor(Math.random() * candidates.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      setSpinVisualPhase(speed < 250 ? 'fast' : 'slow')
      if (elapsed < total) {
        spinTimer.current = setTimeout(tick, speed)
      } else {
        setSpinName(team.b.name)
        setSpinVisualPhase('locking')
        setRevealCount(revealCount + 1)
        setPhase('locked')
        setTimeout(() => setSpinVisualPhase('locked'), 300)
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.55 }, colors: COLORS })
      }
    }
    tick()
  }

  function proceed() {
    if (phase !== 'locked') return
    const g = groups[groupIdx]
    if (revealCount < g.teams.length) {
      setPhase('idle')
      setSpinVisualPhase('idle')
      setSpinName('???')
      return
    }
    const nextDone = done.map((d, i) => (i === groupIdx ? true : d))
    setDone(nextDone)
    if (nextDone.every(Boolean)) {
      setStage('finale')
      setTimeout(() => confetti({ particleCount: 220, spread: 100, origin: { y: 0.5 }, colors: COLORS }), 300)
    } else {
      setStage('grid')
    }
  }

  const stageBox: React.CSSProperties = {
    position: 'fixed', inset: 0, background: '#010101', color: '#f1f5f9',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  }

  // 그룹 선택 단계
  if (stage === 'grid') {
    const cols = isDesktop ? Math.min(groups.length, 6) : Math.min(groups.length, 4)
    return (
      <div style={stageBox}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#39ff14', textShadow: '0 0 10px #39ff14', textTransform: 'uppercase' }}>
          SELECT GROUP · {done.filter(Boolean).length} / {groups.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20, maxWidth: '80vw' }}>
          {groups.map((g, i) => (
            <button
              key={g.letter}
              onClick={() => !done[i] && openGroup(i)}
              disabled={done[i]}
              style={{
                aspectRatio: '1 / 1.05',
                minWidth: isDesktop ? 160 : 120,
                cursor: done[i] ? 'default' : 'pointer',
                background: 'transparent', borderRadius: 14,
                border: `1.5px solid ${done[i] ? '#262626' : colorFor(i)}`,
                boxShadow: done[i] ? 'none' : `0 0 24px ${colorFor(i)}22`,
                opacity: done[i] ? 0.4 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: isDesktop ? 'clamp(36px,5vw,80px)' : 'clamp(36px,5vw,64px)', fontWeight: 900, color: done[i] ? '#888' : colorFor(i), textShadow: done[i] ? 'none' : `0 0 16px ${colorFor(i)}` }}>{g.letter}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>
                {done[i] ? '✓ 완료' : `${g.teams.length}팀 · 추첨 대기`}
              </span>
            </button>
          ))}
        </div>
        {allDone && (
          <button onClick={onPublish} disabled={publishing} className="btn-cta" style={{ marginTop: 36, maxWidth: 320 }}>
            {publishing ? '발표 중...' : '결과 발표 ✓'}
          </button>
        )}
      </div>
    )
  }

  // 추첨 단계
  if (stage === 'draw') {
    const activeIdx = phase === 'locked' ? revealCount - 1 : revealCount
    const activeTeam = group.teams[Math.min(activeIdx, group.teams.length - 1)]
    const teamNo = Math.min(activeIdx + 1, group.teams.length)
    return (
      <div style={stageBox}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: colorFor(groupIdx), textShadow: `0 0 10px ${colorFor(groupIdx)}`, textTransform: 'uppercase' }}>
          GROUP {group.letter} · 팀 {teamNo} / {group.teams.length}
        </div>
        <div style={{ textAlign: 'center' }}>
          {/* 팀A */}
          <div style={{ fontSize: 'clamp(30px,6.5vw,86px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
            {activeTeam?.a.name}
          </div>
          <div style={{ fontSize: 14, color: '#555', fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
            {activeTeam?.a.club ? `${activeTeam.a.club} · ` : ''}{activeTeam?.a.rating}
          </div>

          <div style={{ fontSize: 26, color: '#3a3a3a', fontWeight: 700, margin: '14px 0' }}>+</div>

          {/* 스핀 이름 */}
          <div style={{
            fontSize: 'clamp(34px,7.2vw,98px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1,
            color: spinVisualPhase === 'locked' || spinVisualPhase === 'locking' ? '#39ff14' : '#555',
            textShadow: spinVisualPhase === 'locked' || spinVisualPhase === 'locking'
              ? '0 0 22px #39ff14, 0 0 60px rgba(57,255,20,.45)'
              : 'none',
            filter: spinVisualPhase === 'fast' ? 'blur(2px)' : 'blur(0)',
            opacity: spinVisualPhase === 'fast' ? 0.7 : 1,
            animation: spinVisualPhase === 'locking' ? 'spinBounce 0.3s ease both' : 'none',
            transition: 'color .2s, text-shadow .2s, filter 0.15s, opacity 0.15s',
            minHeight: '1.1em',
          }}>
            {phase === 'idle' ? '???' : spinName}
          </div>
          {(spinVisualPhase === 'locked' || spinVisualPhase === 'locking') && activeTeam && (
            <div style={{ fontSize: 14, color: '#555', fontWeight: 700, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
              {activeTeam.b.club ? `${activeTeam.b.club} · ` : ''}{activeTeam.b.rating}
            </div>
          )}
        </div>

        {revealCount > 0 && (
          <div style={{ position: 'absolute', bottom: 30, left: 34, fontSize: 11, color: '#3f3f3f', fontWeight: 700, lineHeight: 1.7, textAlign: 'left' }}>
            {group.teams.slice(0, revealCount).map(t => (
              <div key={t.label}>{t.label} · {t.a.name} ({t.a.rating}) + {t.b.name} ({t.b.rating})</div>
            ))}
          </div>
        )}

        <button
          onClick={phase === 'idle' ? startSpin : phase === 'locked' ? proceed : undefined}
          disabled={phase === 'spinning'}
          className="btn-cta"
          style={{ position: 'absolute', bottom: 34, maxWidth: 320 }}
        >
          {phase === 'spinning'
            ? 'DRAWING...'
            : phase === 'idle'
              ? '▸ 팀 추첨'
              : revealCount < group.teams.length
                ? '다음 팀 →'
                : '그룹 완료 ✓'}
        </button>
      </div>
    )
  }

  // 피날레 단계
  const finaleColumns = isDesktop ? 5 : 3
  const finaleMaxWidth = isDesktop ? 1200 : 900
  return (
    <div style={stageBox}>
      <Scan /><Brackets />
      <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 10px #00d4ff', textTransform: 'uppercase' }}>
        TOURNAMENT DRAFT · 오늘의 팀
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${finaleColumns}, 1fr)`, gap: 12, width: '84vw', maxWidth: finaleMaxWidth, maxHeight: '64vh', overflowY: 'auto', marginTop: 24 }}>
        {groups.flatMap((g, gi) => g.teams.map(t => {
          const combined = ((t.a.rating ?? 0) + (t.b.rating ?? 0)).toFixed(2)
          return (
            <div key={t.label} style={{ border: `1px solid ${colorFor(gi)}`, borderRadius: 9, padding: '11px 13px', boxShadow: `0 0 12px ${colorFor(gi)}22`, animation: 'slideUp 0.4s ease both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: colorFor(gi) }}>{t.label}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{combined}</div>
              </div>
              <div style={{ marginBottom: 2 }}>
                {t.a.club && <div style={{ fontSize: 10, color: '#555', fontWeight: 400 }}>{t.a.club}</div>}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4 }}>{t.a.name}</span>
                  <span style={{ fontSize: 11, color: '#666', fontWeight: 700 }}>{t.a.rating}</span>
                </div>
              </div>
              <div>
                {t.b.club && <div style={{ fontSize: 10, color: '#555', fontWeight: 400 }}>{t.b.club}</div>}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4 }}>{t.b.name}</span>
                  <span style={{ fontSize: 11, color: '#666', fontWeight: 700 }}>{t.b.rating}</span>
                </div>
              </div>
            </div>
          )
        }))}
      </div>
      <button onClick={onPublish} disabled={publishing} className="btn-cta" style={{ marginTop: 20, maxWidth: 320 }}>
        {publishing ? '발표 중...' : '결과 발표 ✓'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 확인**

group-draw 배정으로 트리거:

- 그리드 단계:
  - PC: 최대 6열, 버튼 더 큼
  - 모바일: 최대 4열 유지
- 추첨 단계:
  - 스핀 중: blur 효과
  - 확정 직후: 바운스 애니메이션 (`spinBounce`) + 초록 글로우
  - 팀A 이름 아래: `동호회 · 레이팅`
  - 확정된 파트너 이름 아래: `동호회 · 레이팅`
  - 하단 목록: `이름 (레이팅) + 이름 (레이팅)` 형식
- 피날레:
  - PC: 5열, 더 넓게
  - 카드: 동호회·이름·레이팅·합산 레이팅

- [ ] **Step 3: 최종 커밋**

```bash
git add components/animation/GroupDrawCeremony.tsx
git commit -m "feat: redesign GroupDrawCeremony with spin effects and rich card info"
```

---

## 검증 체크리스트

- [ ] 모바일(767px): 결과 페이지 1열, 통계 헤더 없음, 기존 폰트
- [ ] PC(768px↑): 결과 페이지 2열, 통계 헤더, 큰 폰트, 합산 레이팅
- [ ] 정렬: 합산 레이팅 높은순/낮은순 정상 동작
- [ ] 동호회 필터: 선택된 동호회 포함 팀만 표시
- [ ] 애니메이션 blur: 스핀 중 텍스트 흐릿
- [ ] 애니메이션 바운스: 확정 시 scale 1→1.15→1
- [ ] 애니메이션 글로우: 확정 후 네온 빛
- [ ] 세리머니 피날레 PC: 5열
- [ ] 동호회 없는 참가자: 동호회 줄/텍스트 생략
