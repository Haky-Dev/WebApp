# 그룹 팀 추첨 세리머니 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** unidarts 배정 시스템에 프로토타입의 "그룹 팀 추첨"(레이팅 기반 그룹 분할 + 그룹별 인터랙티브 빅스크린 세리머니)을 통합하고, 기존 그룹 랜덤을 교체한다.

**Architecture:** 추첨 시작 시 서버가 그룹·랜덤 짝을 모두 계산해 `pairs`에 저장하고 이벤트를 `drawing` 상태로 잠근다(등록 차단, 결과 비공개). 클라이언트는 이미 확정된 결과를 그룹별로 연출 공개하고, 관리자가 "결과 발표"를 누르면 `publish`로 `closed` 전환되어 참가자 기기가 결과로 자동 이동한다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Supabase (PostgreSQL) · Tailwind 4 · vitest · canvas-confetti

**Spec:** `docs/superpowers/specs/2026-06-04-group-draw-ceremony-design.md`

---

## File Structure

**신규**
- `lib/algorithms/group-draw.ts` — 그룹 분할(`buildGroups`, 결정적) + 랜덤 짝 추첨(`groupDraw`)
- `__tests__/algorithms/group-draw.test.ts` — 알고리즘 단위 테스트
- `app/api/admin/publish/route.ts` — `drawing → closed` 전환
- `components/animation/GroupDrawCeremony.tsx` — ②③④ 빅스크린 세리머니
- `supabase/migrations/003_group_draw.sql` — `status` 제약 + `pairs.group_label`

**수정**
- `lib/types.ts` — `EventStatus`, `Pair.group_label`
- `app/api/admin/assign/route.ts` — `group-draw` 분기, `drawing` 상태, `group_label` 저장
- `app/api/pairs/[eventId]/route.ts` — select에 `group_label` 추가
- `components/admin/AssignmentPanel.tsx` — 그룹당 팀수 스테퍼, 모드 라벨, group-draw 호출
- `app/events/[id]/admin/page.tsx` — 세리머니 분기, `drawing` 재진입 배너
- `app/events/[id]/page.tsx` — 미등록자 마감 조건
- `components/results/AllResultsTab.tsx`, `MyPartnerTab.tsx`, `CopyButton.tsx` — `group_label` 표시

**삭제 (마지막)**
- `lib/algorithms/group-random.ts`, `__tests__/algorithms/group-random.test.ts`

> **상태 그린 유지 전략:** 알고리즘·타입·신규 라우트를 먼저 추가하고, UI를 group-draw로 전환한 뒤, **마지막에** group-random을 제거한다. 각 태스크 종료 시 빌드/테스트가 통과해야 한다.

---

## Task 1: 그룹 분할 알고리즘 `buildGroups` (결정적)

**Files:**
- Create: `lib/algorithms/group-draw.ts`
- Test: `__tests__/algorithms/group-draw.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/algorithms/group-draw.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildGroups } from '@/lib/algorithms/group-draw'
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- group-draw`
Expected: FAIL — `buildGroups`를 `@/lib/algorithms/group-draw`에서 찾을 수 없음.

- [ ] **Step 3: `buildGroups` 구현**

`lib/algorithms/group-draw.ts`:
```ts
import type { Participant } from '@/lib/types'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export interface RatingGroup {
  letter: string
  tops: Participant[]
  bottoms: Participant[]
}

/**
 * 레이팅 내림차순으로 정렬한 뒤 그룹당 팀수(N)에 따라 그룹을 나눈다.
 * 그룹 크기 = 2N. 나누어떨어지지 않는 여유 인원은 최상위/최하위로 A그룹에 우선 배치하고,
 * 나머지는 레이팅 순으로 B·C·D… 그룹에 묶는다. (멤버십은 결정적)
 */
export function buildGroups(participants: Participant[], teamsPerGroup: number): RatingGroup[] {
  if (participants.length % 2 !== 0) {
    throw new Error('Odd number of participants')
  }
  const sorted = [...participants].sort((a, b) => b.rating - a.rating)
  const total = sorted.length
  if (total < 2) return []

  const groupSize = teamsPerGroup * 2
  const fullGroups = Math.floor(total / groupSize)
  const remainder = total % groupSize

  let topIdx = 0
  let bottomIdx = total - 1
  const takeTop = (n: number) => {
    const arr: Participant[] = []
    for (let i = 0; i < n; i++) arr.push(sorted[topIdx++])
    return arr
  }
  const takeBottom = (n: number) => {
    const arr: Participant[] = []
    for (let i = 0; i < n; i++) arr.push(sorted[bottomIdx--])
    return arr
  }

  const groups: RatingGroup[] = []
  let letterIdx = 0

  // 여유 인원(remainder) → A그룹 (최상위 + 최하위). groupSize·total이 짝수이므로 remainder도 짝수.
  if (remainder > 0) {
    groups.push({
      letter: LETTERS[letterIdx++],
      tops: takeTop(Math.ceil(remainder / 2)),
      bottoms: takeBottom(Math.floor(remainder / 2)),
    })
  }

  // 나머지는 레이팅 순으로 B·C·D… (각 N+N)
  for (let g = 0; g < fullGroups; g++) {
    groups.push({
      letter: LETTERS[letterIdx++],
      tops: takeTop(teamsPerGroup),
      bottoms: takeBottom(teamsPerGroup),
    })
  }

  return groups
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- group-draw`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/algorithms/group-draw.ts __tests__/algorithms/group-draw.test.ts
git commit -m "feat: add buildGroups rating-based group split algorithm"
```

---

## Task 2: 그룹 내 랜덤 짝 추첨 `groupDraw`

**Files:**
- Modify: `lib/algorithms/group-draw.ts`
- Test: `__tests__/algorithms/group-draw.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`__tests__/algorithms/group-draw.test.ts` 하단에 추가:
```ts
import { groupDraw } from '@/lib/algorithms/group-draw'

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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- group-draw`
Expected: FAIL — `groupDraw` export 없음.

- [ ] **Step 3: `groupDraw` + 타입 구현**

`lib/algorithms/group-draw.ts` 하단에 추가:
```ts
export interface DrawnTeam {
  label: string       // "A1"
  a: Participant      // 상위
  b: Participant      // 하위
}

export interface DrawnGroup {
  letter: string      // "A"
  teams: DrawnTeam[]
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * buildGroups로 그룹을 나눈 뒤, 그룹 내에서 상위·하위를 무작위로 짝지어 팀을 만든다.
 * (그룹 멤버십은 결정적, 짝짓기만 랜덤)
 */
export function groupDraw(participants: Participant[], teamsPerGroup: number): DrawnGroup[] {
  const groups = buildGroups(participants, teamsPerGroup)
  return groups.map((g) => {
    const tops = shuffle(g.tops)
    const bottoms = shuffle(g.bottoms)
    const teams: DrawnTeam[] = tops.map((top, i) => ({
      label: `${g.letter}${i + 1}`,
      a: top,
      b: bottoms[i],
    }))
    return { letter: g.letter, teams }
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- group-draw`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/algorithms/group-draw.ts __tests__/algorithms/group-draw.test.ts
git commit -m "feat: add groupDraw random in-group pairing"
```

---

## Task 3: 타입 확장 (`EventStatus`, `Pair.group_label`)

**Files:**
- Modify: `lib/types.ts:1`, `lib/types.ts:25-33`

- [ ] **Step 1: `EventStatus`에 `drawing` 추가**

`lib/types.ts` 1행 교체:
```ts
export type EventStatus = 'collecting' | 'drawing' | 'closed'
```

- [ ] **Step 2: `Pair`에 `group_label` 추가**

`lib/types.ts`의 `Pair` 인터페이스에 필드 추가:
```ts
export interface Pair {
  id: string
  event_id: string
  team_number: number
  group_label: string | null
  participant_a_id: string
  participant_b_id: string
  participant_a?: Participant
  participant_b?: Participant
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS (에러 없음 — `group_label`은 선택 표시가 아닌 신규 필드지만 기존 사용처는 객체 생성 시 DB에서 채워지므로 컴파일 영향 없음. 에러 발생 시 해당 사용처는 이후 태스크에서 처리)

- [ ] **Step 4: 커밋**

```bash
git add lib/types.ts
git commit -m "feat: add drawing status and pair group_label type"
```

---

## Task 4: 마이그레이션 003 (status 제약 + group_label)

**Files:**
- Create: `supabase/migrations/003_group_draw.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/003_group_draw.sql`:
```sql
-- 인터랙티브 추첨용 중간 상태 추가 (등록은 잠기되 결과는 비공개)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('collecting', 'drawing', 'closed'));

-- 그룹 라벨 (예: 'A1'). snake 모드는 NULL.
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS group_label text;
```

- [ ] **Step 2: Supabase에 적용**

Supabase SQL Editor(또는 마이그레이션 도구)에서 위 SQL을 실행한다. 적용 후 확인:
```sql
SELECT conname FROM pg_constraint WHERE conname = 'events_status_check';
-- group_label 컬럼 존재 확인
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'pairs' AND column_name = 'group_label';
```
Expected: 제약 1행 + `group_label` 1행 반환.

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/003_group_draw.sql
git commit -m "feat: migration for drawing status and pairs.group_label"
```

---

## Task 5: `/api/pairs/[eventId]` GET에 group_label 추가

**Files:**
- Modify: `app/api/pairs/[eventId]/route.ts:13-21`

- [ ] **Step 1: select에 group_label 추가**

`app/api/pairs/[eventId]/route.ts`의 `.select(...)` 문자열을 교체:
```ts
    .select(`
      id,
      event_id,
      team_number,
      group_label,
      participant_a_id,
      participant_b_id,
      participant_a:participants!pairs_participant_a_id_fkey(id, name, club, rating),
      participant_b:participants!pairs_participant_b_id_fkey(id, name, club, rating)
    `)
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add app/api/pairs/[eventId]/route.ts
git commit -m "feat: include group_label in pairs query"
```

---

## Task 6: assign 라우트에 group-draw 분기 추가

**Files:**
- Modify: `app/api/admin/assign/route.ts`

> group-random 분기는 **유지**한 채 group-draw를 추가한다(상태 그린 유지). group-random 제거는 Task 13.

- [ ] **Step 1: import 추가**

`app/api/admin/assign/route.ts` 상단 import에 추가:
```ts
import { groupDraw, type DrawnGroup } from '@/lib/algorithms/group-draw'
```

- [ ] **Step 2: body에서 teamsPerGroup 수신**

`const { algorithm, groupCount, excludeId, tempParticipant } = body` 를 교체:
```ts
  const { algorithm, groupCount, teamsPerGroup, excludeId, tempParticipant } = body
```

- [ ] **Step 3: 알고리즘 실행 블록에 group-draw 분기 추가**

기존 알고리즘 실행 블록(`let pairs ... try { ... }`)을 아래로 교체. group-draw는 그룹 구조를 만든 뒤 평탄화한 `pairs`와 그룹별 `group_label`을 함께 보관한다:
```ts
  // Run algorithm
  let pairs: { a: Participant; b: Participant }[]
  let drawnGroups: DrawnGroup[] | null = null
  const labelByPairIndex: (string | null)[] = []
  try {
    if (algorithm === 'snake') {
      pairs = snakeDraft(participants)
    } else if (algorithm === 'group-random') {
      pairs = groupRandom(participants, groupCount as 2 | 4)
    } else if (algorithm === 'group-draw') {
      drawnGroups = groupDraw(participants, Number(teamsPerGroup))
      pairs = []
      for (const g of drawnGroups) {
        for (const t of g.teams) {
          pairs.push({ a: t.a, b: t.b })
          labelByPairIndex.push(t.label)
        }
      }
    } else {
      return NextResponse.json({ error: 'Unknown algorithm' }, { status: 400 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Algorithm error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
```

- [ ] **Step 4: pairRows에 group_label 포함**

`const pairRows = pairs.map(...)` 를 교체:
```ts
  const pairRows = pairs.map((p, i) => ({
    event_id: eventId,
    team_number: i + 1,
    group_label: labelByPairIndex[i] ?? null,
    participant_a_id: p.a.id,
    participant_b_id: p.b.id,
  }))
```

- [ ] **Step 5: 상태 전환 + 응답 분기**

기존 마지막 두 줄
```ts
  await supabase.from('events').update({ status: 'closed' }).eq('id', eventId)
  return NextResponse.json({ success: true, teamCount: pairs.length })
```
를 교체:
```ts
  const nextStatus = algorithm === 'group-draw' ? 'drawing' : 'closed'
  await supabase.from('events').update({ status: nextStatus }).eq('id', eventId)

  if (algorithm === 'group-draw') {
    return NextResponse.json({ success: true, status: 'drawing', groups: drawnGroups })
  }
  return NextResponse.json({ success: true, status: 'closed', teamCount: pairs.length })
```

- [ ] **Step 6: 타입체크 & 빌드**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add app/api/admin/assign/route.ts
git commit -m "feat: support group-draw in assign route with drawing status"
```

---

## Task 7: publish 라우트 (`drawing → closed`)

**Files:**
- Create: `app/api/admin/publish/route.ts`

- [ ] **Step 1: 라우트 작성**

`app/api/admin/publish/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveEventId } from '@/lib/auth/admin-token'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const eventId = await resolveEventId(token, body.eventId)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status === 'closed') {
    return NextResponse.json({ success: true, status: 'closed' }) // 멱등
  }
  if (event.status !== 'drawing') {
    return NextResponse.json({ error: 'Not in drawing state' }, { status: 409 })
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('id', eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, status: 'closed' })
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add app/api/admin/publish/route.ts
git commit -m "feat: add publish route to reveal drawing results"
```

---

## Task 8: GroupDrawCeremony 컴포넌트 (②③④ 세리머니)

**Files:**
- Create: `components/animation/GroupDrawCeremony.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`components/animation/GroupDrawCeremony.tsx`:
```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type { DrawnGroup, DrawnTeam } from '@/lib/algorithms/group-draw'

interface Props {
  groups: DrawnGroup[]
  publishing: boolean
  onPublish: () => void
}

type Stage = 'grid' | 'draw' | 'finale'

const COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const colorFor = (i: number) => COLORS[i % COLORS.length]

const bracket: React.CSSProperties = { position: 'absolute', width: 34, height: 34, borderColor: 'rgba(57,255,20,0.4)', borderStyle: 'solid' }

export default function GroupDrawCeremony({ groups, publishing, onPublish }: Props) {
  const [stage, setStage] = useState<Stage>('grid')
  const [groupIdx, setGroupIdx] = useState(0)
  const [done, setDone] = useState<boolean[]>(() => groups.map(() => false))
  const [revealCount, setRevealCount] = useState(0) // 현재 그룹에서 확정된 팀 수
  const [spinning, setSpinning] = useState(false)
  const [spinName, setSpinName] = useState('???')
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (spinTimer.current) clearTimeout(spinTimer.current) }, [])

  const group = groups[groupIdx]
  const allDone = done.every(Boolean)

  function openGroup(idx: number) {
    setGroupIdx(idx)
    setRevealCount(0)
    setSpinName('???')
    setSpinning(false)
    setStage('draw')
  }

  function drawNext() {
    if (spinning) return
    const g = groups[groupIdx]
    const team = g.teams[revealCount]
    if (!team) return
    setSpinning(true)
    const candidates = g.teams.map(t => t.b.name)
    let speed = 80
    let elapsed = 0
    const total = 1000
    const tick = () => {
      setSpinName(candidates[Math.floor(Math.random() * candidates.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      if (elapsed < total) {
        spinTimer.current = setTimeout(tick, speed)
      } else {
        setSpinName(team.b.name)
        setSpinning(false)
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.55 }, colors: COLORS })
        const next = revealCount + 1
        setRevealCount(next)
        if (next >= g.teams.length) {
          setDone(prev => { const c = [...prev]; c[groupIdx] = true; return c })
          setTimeout(() => {
            const nowAllDone = groups.every((_, i) => (i === groupIdx ? true : done[i]))
            if (nowAllDone) {
              setStage('finale')
              setTimeout(() => confetti({ particleCount: 220, spread: 100, origin: { y: 0.5 }, colors: COLORS }), 300)
            } else {
              setStage('grid')
            }
          }, 900)
        }
      }
    }
    tick()
  }

  const stageBox: React.CSSProperties = {
    position: 'fixed', inset: 0, background: '#010101', color: '#f1f5f9',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  }
  const Scan = () => (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35,
      background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.22) 3px,rgba(0,0,0,0.22) 4px)' }} />
  )
  const Brackets = () => (
    <>
      <div style={{ ...bracket, top: 16, left: 16, borderRight: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, top: 16, right: 16, borderLeft: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, left: 16, borderRight: 0, borderTop: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, right: 16, borderLeft: 0, borderTop: 0, borderWidth: 2 }} />
    </>
  )

  // ② 그룹 선택
  if (stage === 'grid') {
    return (
      <div style={stageBox}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#39ff14', textShadow: '0 0 10px #39ff14', textTransform: 'uppercase' }}>
          SELECT GROUP · {done.filter(Boolean).length} / {groups.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(groups.length, 4)}, 1fr)`, gap: 20, maxWidth: '80vw' }}>
          {groups.map((g, i) => (
            <button
              key={g.letter}
              onClick={() => !done[i] && openGroup(i)}
              disabled={done[i]}
              style={{
                aspectRatio: '1 / 1.05', minWidth: 120, cursor: done[i] ? 'default' : 'pointer',
                background: 'transparent', borderRadius: 14,
                border: `1.5px solid ${done[i] ? '#262626' : colorFor(i)}`,
                boxShadow: done[i] ? 'none' : `0 0 24px ${colorFor(i)}22`,
                opacity: done[i] ? 0.4 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, color: done[i] ? '#888' : colorFor(i), textShadow: done[i] ? 'none' : `0 0 16px ${colorFor(i)}` }}>{g.letter}</span>
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

  // ③ 그룹 내 팀 추첨
  if (stage === 'draw') {
    const team: DrawnTeam | undefined = group.teams[Math.min(revealCount, group.teams.length - 1)]
    const showingTeam = group.teams[revealCount] ?? team
    const moreToDraw = revealCount < group.teams.length
    return (
      <div style={stageBox}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: colorFor(groupIdx), textShadow: `0 0 10px ${colorFor(groupIdx)}`, textTransform: 'uppercase' }}>
          GROUP {group.letter} · 팀 {Math.min(revealCount + 1, group.teams.length)} / {group.teams.length}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(30px,6.5vw,86px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
            {showingTeam?.a.name}
          </div>
          <div style={{ fontSize: 14, color: '#666', fontWeight: 700, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            RATING {showingTeam?.a.rating}
          </div>
          <div style={{ fontSize: 26, color: '#3a3a3a', fontWeight: 700, margin: '14px 0' }}>+</div>
          <div style={{
            fontSize: 'clamp(34px,7.2vw,98px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1,
            color: spinning ? '#555' : '#39ff14',
            textShadow: spinning ? 'none' : '0 0 22px #39ff14, 0 0 60px rgba(57,255,20,.45)',
            transition: 'color .2s, text-shadow .2s', minHeight: '1.1em',
          }}>
            {spinName}
          </div>
          {!spinning && revealCount > 0 && (
            <div style={{ fontSize: 14, color: '#666', fontWeight: 700, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
              RATING {group.teams[revealCount - 1]?.b.rating}
            </div>
          )}
        </div>

        {revealCount > 0 && (
          <div style={{ position: 'absolute', bottom: 30, left: 34, fontSize: 11, color: '#3f3f3f', fontWeight: 700, lineHeight: 1.7, textAlign: 'left' }}>
            {group.teams.slice(0, revealCount).map(t => (
              <div key={t.label}>{t.label} · {t.a.name} + {t.b.name}</div>
            ))}
          </div>
        )}

        <button
          onClick={drawNext}
          disabled={spinning || !moreToDraw}
          className="btn-cta"
          style={{ position: 'absolute', bottom: 34, maxWidth: 320 }}
        >
          {spinning ? 'DRAWING...' : moreToDraw ? '▸ 팀 추첨' : '그룹 완료 ✓'}
        </button>
      </div>
    )
  }

  // ④ 전체 결과 발표
  return (
    <div style={stageBox}>
      <Scan /><Brackets />
      <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 10px #00d4ff', textTransform: 'uppercase' }}>
        TOURNAMENT DRAFT · 오늘의 팀
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '84vw', maxWidth: 900, maxHeight: '64vh', overflowY: 'auto', marginTop: 24 }}>
        {groups.flatMap((g, gi) => g.teams.map(t => (
          <div key={t.label} style={{ border: `1px solid ${colorFor(gi)}`, borderRadius: 9, padding: '11px 13px', boxShadow: `0 0 12px ${colorFor(gi)}22`, animation: 'slideUp 0.4s ease both' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: colorFor(gi), marginBottom: 5 }}>{t.label}</div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4 }}>{t.a.name} <span style={{ color: '#444' }}>×</span> {t.b.name}</div>
          </div>
        )))}
      </div>
      <button onClick={onPublish} disabled={publishing} className="btn-cta" style={{ marginTop: 20, maxWidth: 320 }}>
        {publishing ? '발표 중...' : '결과 발표 ✓'}
      </button>
    </div>
  )
}
```

> `slideUp` 키프레임과 `btn-cta`는 기존 `app/globals.css`에 정의돼 있다(`AssignmentAnimation`에서 사용 중). 없으면 globals.css 확인.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add components/animation/GroupDrawCeremony.tsx
git commit -m "feat: add GroupDrawCeremony big-screen presentation component"
```

---

## Task 9: AssignmentPanel — 그룹당 팀수 스테퍼 + group-draw 호출

**Files:**
- Modify: `components/admin/AssignmentPanel.tsx`

- [ ] **Step 1: import & props 변경**

상단 import에 추가:
```ts
import type { DrawnGroup } from '@/lib/algorithms/group-draw'
```
`Props`의 `onAssignStart` 옆에 group-draw 콜백 추가:
```ts
interface Props {
  token: string
  eventId: string
  eventStatus: EventStatus
  onAssignStart: (pairs: { a: Participant; b: Participant }[]) => void
  onGroupDrawStart: (groups: DrawnGroup[]) => void
  onReset: () => void
}
```
구조 분해도 갱신:
```ts
export default function AssignmentPanel({ token, eventId, eventStatus, onAssignStart, onGroupDrawStart, onReset }: Props) {
```

- [ ] **Step 2: 상태 교체 (groupCount → teamsPerGroup)**

```ts
  const [algorithm, setAlgorithm] = useState<'snake' | 'group-draw'>('snake')
  const [teamsPerGroup, setTeamsPerGroup] = useState(6)
```
(`const [groupCount, setGroupCount] = useState<2 | 4>(2)` 행 삭제)

- [ ] **Step 3: handleAssign 교체**

```ts
  async function handleAssign() {
    setError('')
    setLoading(true)
    const body: Record<string, unknown> = { algorithm, eventId }
    if (algorithm === 'group-draw') body.teamsPerGroup = teamsPerGroup
    if (excludeId) body.excludeId = excludeId
    if (tempName) body.tempParticipant = { name: tempName, club: tempClub || null, rating: parseFloat(tempRating) }

    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error); setLoading(false); return }
    const data = await res.json()
    setLoading(false)

    if (algorithm === 'group-draw') {
      onGroupDrawStart(data.groups as DrawnGroup[])
      return
    }
    const pairsRes = await fetch(`/api/pairs/${eventId}`)
    const pairsData = await pairsRes.json()
    onAssignStart(pairsData.map((p: { participant_a: Participant; participant_b: Participant }) => ({
      a: p.participant_a,
      b: p.participant_b,
    })))
  }
```

- [ ] **Step 4: 모드 라디오 라벨 + 그룹당 팀수 스테퍼 UI 교체**

배정 방식 블록(`{(['snake', 'group-random'] as const).map ...}` 부터 group-random groupCount 블록 끝까지)을 교체:
```tsx
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(['snake', 'group-draw'] as const).map(alg => (
            <label key={alg} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="radio" checked={algorithm === alg} onChange={() => setAlgorithm(alg)} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {alg === 'snake' ? '레이팅 순' : '그룹 팀 추첨'}
              </span>
            </label>
          ))}
        </div>
        {algorithm === 'group-draw' && (
          <div style={{ marginTop: 12, marginLeft: 24 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>그룹당 팀수</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setTeamsPerGroup(v => Math.max(2, v - 1))}
                style={{ width: 36, height: 36, borderRadius: 6, fontSize: 18, fontWeight: 900, cursor: 'pointer', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border)' }}
              >−</button>
              <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', minWidth: 32, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{teamsPerGroup}</span>
              <button
                onClick={() => setTeamsPerGroup(v => Math.min(20, v + 1))}
                style={{ width: 36, height: 36, borderRadius: 6, fontSize: 18, fontWeight: 900, cursor: 'pointer', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border)' }}
              >+</button>
            </div>
          </div>
        )}
```

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: FAIL — `app/events/[id]/admin/page.tsx`가 아직 `onGroupDrawStart`를 전달하지 않음. (다음 태스크에서 해결) 변경 파일 자체 문법 오류가 없는지만 확인.

- [ ] **Step 6: 커밋**

```bash
git add components/admin/AssignmentPanel.tsx
git commit -m "feat: teamsPerGroup stepper and group-draw mode in AssignmentPanel"
```

---

## Task 10: admin 페이지 — 세리머니 분기 + drawing 재진입

**Files:**
- Modify: `app/events/[id]/admin/page.tsx`

- [ ] **Step 1: import 추가**

```ts
import GroupDrawCeremony from '@/components/animation/GroupDrawCeremony'
import type { DrawnGroup } from '@/lib/algorithms/group-draw'
```

- [ ] **Step 2: 상태 추가**

기존 `animationPairs` 상태 아래에 추가:
```ts
  const [ceremonyGroups, setCeremonyGroups] = useState<DrawnGroup[] | null>(null)
  const [publishing, setPublishing] = useState(false)
```

- [ ] **Step 3: publish 핸들러 추가**

`handleAnimationEnd` 아래에 추가:
```ts
  async function handlePublish() {
    if (!token) return
    setPublishing(true)
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: id }),
    })
    setPublishing(false)
    if (res.ok) router.push(`/events/${id}/results`)
  }
```

- [ ] **Step 4: drawing 재진입 처리**

이벤트 fetch useEffect(현재 `fetch(\`/api/events/${id}\`)...`)를 교체:
```ts
  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.status) setEventStatus(data.status)
        if (data.name) setEventName(data.name)
      })
  }, [id])
```
> 재진입은 별도 풀스크린 세리머니 복원 대신, `eventStatus === 'drawing'`일 때 배정 탭에 "결과 발표/초기화" 배너를 노출한다(Step 6). 데이터(`pairs`)는 이미 저장돼 있어 유실되지 않는다.

- [ ] **Step 5: 세리머니 렌더 분기 추가**

기존 `if (animationPairs) { return <AssignmentAnimation .../> }` 바로 아래에 추가:
```tsx
  if (ceremonyGroups) {
    return <GroupDrawCeremony groups={ceremonyGroups} publishing={publishing} onPublish={handlePublish} />
  }
```

- [ ] **Step 6: AssignmentPanel에 콜백 전달 + drawing 배너**

`{tab === 'assign' && ( ... )}` 블록을 교체:
```tsx
            {tab === 'assign' && (
              eventStatus === 'drawing' ? (
                <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1.5px solid var(--neon-cyan)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--neon-cyan)' }}>추첨이 진행 중입니다 (결과 비공개)</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6 }}>
                    결과를 발표하면 참가자 기기에 자동으로 표시됩니다.
                  </p>
                  <button onClick={handlePublish} disabled={publishing} className="btn-cta">
                    {publishing ? '발표 중...' : '결과 발표 ✓'}
                  </button>
                  <button onClick={() => setShowResetConfirm(true)} className="btn-ghost">배정 초기화</button>
                </div>
              ) : (
                <AssignmentPanel
                  token={token}
                  eventId={id}
                  eventStatus={eventStatus}
                  onAssignStart={(pairs) => { setEventStatus('closed'); setAnimationPairs(pairs) }}
                  onGroupDrawStart={(groups) => { setEventStatus('drawing'); setCeremonyGroups(groups) }}
                  onReset={handleReset}
                />
              )
            )}
```

- [ ] **Step 7: handleReset에서 세리머니 상태 정리**

`handleReset` 내 `if (res.ok) { ... }` 블록에 추가:
```ts
    if (res.ok) {
      setEventStatus('collecting')
      setCeremonyGroups(null)
      setShowResetConfirm(false)
      setTab('participants')
    }
```

- [ ] **Step 8: 타입체크 & 빌드**

Run: `npx tsc --noEmit`
Expected: PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add app/events/[id]/admin/page.tsx
git commit -m "feat: wire group-draw ceremony and drawing re-entry in admin page"
```

---

## Task 11: 참가자 페이지 — 미등록자 마감 조건

**Files:**
- Modify: `app/events/[id]/page.tsx:157`

- [ ] **Step 1: 조건 변경**

`if (event.status === 'closed' && !registered) {` 를 교체:
```tsx
  if (event.status !== 'collecting' && !registered) {
```
> 등록자의 결과 전환(123행 부근 `event?.status === 'closed'`)은 **그대로 유지** — `drawing` 동안 대기, `closed`에서만 전환.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add app/events/[id]/page.tsx
git commit -m "feat: block unregistered participants during drawing state"
```

---

## Task 12: 결과 페이지 컴포넌트 — group_label 표시

**Files:**
- Modify: `components/results/AllResultsTab.tsx:49-51`, `components/results/MyPartnerTab.tsx:42-43`, `components/results/CopyButton.tsx:12`

- [ ] **Step 1: AllResultsTab 팀 라벨**

`팀 {pair.team_number}{highlight ? ' ← 내 팀' : ''}` 를 교체:
```tsx
                {pair.group_label ?? `팀 ${pair.team_number}`}{highlight ? ' ← 내 팀' : ''}
```

- [ ] **Step 2: MyPartnerTab 팀 라벨**

`팀 {myPair.team_number}` 를 교체:
```tsx
          {myPair.group_label ?? `팀 ${myPair.team_number}`}
```

- [ ] **Step 3: CopyButton 팀 열**

`rows`의 첫 컬럼 `p.team_number,` 를 교체:
```ts
        p.group_label ?? p.team_number,
```

- [ ] **Step 4: 타입체크 & 빌드**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add components/results/AllResultsTab.tsx components/results/MyPartnerTab.tsx components/results/CopyButton.tsx
git commit -m "feat: show group_label in results and copy export"
```

---

## Task 13: group-random 제거

**Files:**
- Delete: `lib/algorithms/group-random.ts`, `__tests__/algorithms/group-random.test.ts`
- Modify: `app/api/admin/assign/route.ts`

- [ ] **Step 1: assign 라우트에서 group-random 분기 제거**

`app/api/admin/assign/route.ts`에서:
- import 행 `import { groupRandom } from '@/lib/algorithms/group-random'` 삭제
- 알고리즘 실행 블록의 아래 분기 삭제:
```ts
    } else if (algorithm === 'group-random') {
      pairs = groupRandom(participants, groupCount as 2 | 4)
```
- body 구조분해에서 더 이상 쓰지 않으면 `groupCount` 제거:
```ts
  const { algorithm, teamsPerGroup, excludeId, tempParticipant } = body
```

- [ ] **Step 2: 파일 삭제**

```bash
git rm lib/algorithms/group-random.ts __tests__/algorithms/group-random.test.ts
```

- [ ] **Step 3: 타입체크 & 전체 테스트**

Run: `npx tsc --noEmit`
Expected: PASS (group-random 참조가 남아 있지 않음)

Run: `npm test`
Expected: PASS (group-draw, snake-draft 테스트 통과, group-random 테스트 없음)

- [ ] **Step 4: 커밋**

```bash
git add app/api/admin/assign/route.ts
git commit -m "refactor: remove group-random algorithm in favor of group-draw"
```

---

## Task 14: 최종 검증

- [ ] **Step 1: 린트**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 전체 테스트**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 4: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 수동 E2E 체크리스트 (dev 서버)**

`npm run dev` 후:
1. 관리자 모드 → 배정 탭 → "그룹 팀 추첨" 선택 → 그룹당 팀수 조정
2. (홀수면) 제외/임시 참가자 처리 → "파트너 배정 시작"
3. 세리머니: ② 그룹 선택 → ③ 한 팀씩 추첨(롤링→확정 글로우+컨페티) → 그룹 완료 시 ②복귀 → 모든 그룹 완료 시 ④ 피날레
4. 추첨 중 참가자 기기는 "등록 완료/대기" 유지(결과 미노출), 신규 등록 차단 확인
5. "결과 발표" → 참가자 기기 결과 자동 전환, 결과 페이지에 `A1/B2` 라벨 표시, 구글 시트 복사 시 팀 열 라벨 확인
6. "레이팅 순" 모드는 기존 원샷 드럼롤대로 동작
7. 추첨 중 새로고침 → 배정 탭에 "결과 발표/초기화" 배너 노출 확인

---

## Self-Review 결과

**Spec coverage:** §2 모드정리(T9,T13) · §3 알고리즘(T1,T2) · §4-1 마이그레이션(T4) · §4-3 API(T6 assign, T7 publish, T5 pairs select) · §4-4 타입(T3) · §4-5 참가자페이지(T11) · §4-6 재진입(T10) · §5 UI/세리머니(T8,T9,T10) · §6 결과 group_label(T12) · §7 테스트(T1,T2,T13) — 모두 태스크 매핑됨. `/api/admin/pairs` DELETE는 이미 `status='collecting'`으로 갱신하므로 `drawing→collecting`에 추가 변경 불필요(별도 태스크 없음, 의도된 누락).

**Placeholder scan:** 코드 블록은 모두 실제 내용. 플레이스홀더 없음.

**Type consistency:** `DrawnGroup`/`DrawnTeam`(T2) ↔ assign 반환(T6) ↔ AssignmentPanel `onGroupDrawStart`(T9) ↔ admin `ceremonyGroups`(T10) ↔ GroupDrawCeremony props(T8) 일치. `group_label`(T3 타입 → T5 쿼리 → T6 저장 → T12 표시) 일치. `EventStatus 'drawing'`(T3 → T6 → T7 → T10 → T11) 일치.
