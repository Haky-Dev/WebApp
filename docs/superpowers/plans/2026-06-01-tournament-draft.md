# Tournament Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QR 코드 기반 다트 토너먼트 파트너 배정 웹앱 — 참가자가 QR을 스캔해 이름/동호회/레이팅을 등록하면 주최자가 알고리즘으로 2인 팀을 배정하고, 배정 완료 시 참가자 기기에 실시간으로 결과가 표시된다.

**Architecture:** Next.js 15 App Router(프론트+API) + Supabase(PostgreSQL+Realtime) + Vercel 배포. 알고리즘(순수 함수)은 `lib/algorithms/`에 분리해 TDD로 구현. 관리자 인증은 bcrypt PIN + JWT(jose)로 처리한다.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase JS v2, @supabase/ssr, bcryptjs, jose, qrcode.react, canvas-confetti, Vitest

---

## 파일 구조

```
tournament-draft/
├── app/
│   ├── page.tsx                              # 홈: 이벤트 목록 + 새 이벤트 생성
│   ├── events/[id]/
│   │   ├── page.tsx                          # 참가자 등록 페이지 (QR 대상)
│   │   ├── results/page.tsx                  # 결과 화면
│   │   └── admin/page.tsx                    # 주최자 패널
│   └── api/
│       ├── events/route.ts                   # GET 목록, POST 생성
│       ├── events/[id]/route.ts              # GET 단건
│       ├── participants/route.ts             # POST 등록
│       ├── pairs/[eventId]/route.ts          # GET 배정 결과
│       ├── admin/verify-pin/route.ts         # POST PIN 검증 → JWT
│       ├── admin/expected/route.ts           # GET/POST 예상 명단
│       ├── admin/expected/[personId]/route.ts # DELETE
│       └── admin/assign/route.ts             # POST 알고리즘 실행 + pairs 저장
├── lib/
│   ├── types.ts                              # 공유 타입
│   ├── supabase/client.ts                    # 브라우저 클라이언트
│   ├── supabase/server.ts                    # 서버 클라이언트
│   ├── supabase/service.ts                   # 서비스 롤 클라이언트
│   ├── auth/admin-token.ts                   # JWT sign/verify
│   └── algorithms/
│       ├── snake-draft.ts
│       └── group-random.ts
├── components/
│   ├── LogoLongPress.tsx                     # 로고 3초 누르기 트리거
│   ├── QRCodeDisplay.tsx                     # QR 코드 + PNG 다운로드
│   ├── registration/RegistrationForm.tsx
│   ├── admin/
│   │   ├── AdminPinModal.tsx
│   │   ├── ExpectedList.tsx
│   │   ├── AttendanceTracker.tsx
│   │   └── AssignmentPanel.tsx
│   ├── animation/AssignmentAnimation.tsx     # 드럼롤 + 컨페티
│   └── results/
│       ├── MyPartnerTab.tsx
│       ├── AllResultsTab.tsx
│       └── CopyButton.tsx
├── hooks/
│   ├── useRealtimeEvent.ts
│   └── useAdminToken.ts
├── supabase/migrations/001_initial_schema.sql
└── __tests__/algorithms/
    ├── snake-draft.test.ts
    └── group-random.test.ts
```

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `vitest.config.ts`
- Create: `.env.local`
- Modify: `package.json`

- [ ] **Step 1: Next.js 프로젝트 생성**

현재 디렉토리(`C:\Users\hatae\Downloads\Unidarts`)에서 실행:

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Expected: `Success! Created tournament-draft` 또는 현재 디렉토리에 파일 생성

- [ ] **Step 2: 의존성 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr bcryptjs jose canvas-confetti qrcode.react
npm install -D vitest @vitejs/plugin-react jsdom @types/bcryptjs @types/canvas-confetti
```

- [ ] **Step 3: Vitest 설정**

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 4: package.json에 test 스크립트 추가**

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 환경변수 파일 생성**

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_JWT_SECRET=a-random-secret-at-least-32-chars-long
```

> `.env.local`은 `.gitignore`에 이미 포함됨 (Next.js 기본값)

- [ ] **Step 6: 커밋**

```bash
git init
git add -A
git commit -m "chore: initialize Next.js 15 project with Supabase and Vitest"
```

---

## Task 2: Supabase DB 스키마

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/001_initial_schema.sql`:
```sql
-- Events
CREATE TABLE IF NOT EXISTS events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  status     text NOT NULL DEFAULT 'collecting'
               CHECK (status IN ('collecting', 'closed')),
  admin_pin  text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Expected participants (organizer pre-list)
CREATE TABLE IF NOT EXISTS expected_participants (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name     text NOT NULL
);

-- Actual registered participants
CREATE TABLE IF NOT EXISTS participants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name          text NOT NULL,
  club          text,
  rating        numeric(4,2) NOT NULL
                  CHECK (rating >= 0 AND rating <= 30),
  registered_at timestamptz DEFAULT now()
);

-- Paired results
CREATE TABLE IF NOT EXISTS pairs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_number      integer NOT NULL,
  participant_a_id uuid NOT NULL REFERENCES participants(id),
  participant_b_id uuid NOT NULL REFERENCES participants(id)
);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expected_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;

-- Public read on everything (business logic enforced in API routes)
CREATE POLICY "public read events" ON events FOR SELECT USING (true);
CREATE POLICY "public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "public read pairs" ON pairs FOR SELECT USING (true);
CREATE POLICY "public read expected" ON expected_participants FOR SELECT USING (true);

-- Participants: anyone can insert when event is collecting
CREATE POLICY "insert participant when collecting"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND status = 'collecting'
    )
  );
```

- [ ] **Step 2: Supabase 대시보드에서 실행**

  1. https://supabase.com/dashboard 접속 → 프로젝트 선택
  2. SQL Editor → 위 SQL 붙여넣기 → Run
  3. Table Editor에서 `events`, `expected_participants`, `participants`, `pairs` 테이블 확인

- [ ] **Step 3: 커밋**

```bash
git add supabase/
git commit -m "feat: add initial database schema with RLS"
```

---

## Task 3: 공유 타입 + Supabase 클라이언트

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/service.ts`

- [ ] **Step 1: 공유 타입 정의**

`lib/types.ts`:
```typescript
export type EventStatus = 'collecting' | 'closed'

export interface TournamentEvent {
  id: string
  name: string
  status: EventStatus
  created_at: string
}

export interface ExpectedParticipant {
  id: string
  event_id: string
  name: string
}

export interface Participant {
  id: string
  event_id: string
  name: string
  club: string | null
  rating: number
  registered_at: string
}

export interface Pair {
  id: string
  event_id: string
  team_number: number
  participant_a_id: string
  participant_b_id: string
  participant_a?: Participant
  participant_b?: Participant
}
```

- [ ] **Step 2: 브라우저 Supabase 클라이언트**

`lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: 서버 Supabase 클라이언트**

`lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list) {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: 서비스 롤 클라이언트 (API routes 전용)**

`lib/supabase/service.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add lib/
git commit -m "feat: add shared types and Supabase clients"
```

---

## Task 4: 관리자 JWT 인증

**Files:**
- Create: `lib/auth/admin-token.ts`
- Create: `app/api/admin/verify-pin/route.ts`

- [ ] **Step 1: JWT 유틸리티 작성**

`lib/auth/admin-token.ts`:
```typescript
import { SignJWT, jwtVerify } from 'jose'

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
}

export async function signAdminToken(eventId: string): Promise<string> {
  return new SignJWT({ eventId, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyAdminToken(
  token: string
): Promise<{ eventId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.role !== 'admin' || typeof payload.eventId !== 'string') return null
    return { eventId: payload.eventId }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: PIN 검증 API 라우트**

`app/api/admin/verify-pin/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/service'
import { signAdminToken } from '@/lib/auth/admin-token'

export async function POST(req: NextRequest) {
  const { eventId, pin } = await req.json()
  if (!eventId || !pin) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: event } = await supabase
    .from('events')
    .select('admin_pin')
    .eq('id', eventId)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(pin, event.admin_pin)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = await signAdminToken(eventId)
  return NextResponse.json({ token })
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/auth/ app/api/admin/verify-pin/
git commit -m "feat: add admin JWT auth and PIN verification endpoint"
```

---

## Task 5: 스네이크 드래프트 알고리즘 (TDD)

**Files:**
- Create: `__tests__/algorithms/snake-draft.test.ts`
- Create: `lib/algorithms/snake-draft.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/algorithms/snake-draft.test.ts`:
```typescript
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
    // 내림차순 정렬 후 sorted[0]↔sorted[4], [1]↔[5], [2]↔[6], [3]↔[7]
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npm test -- snake-draft
```

Expected: `FAIL` — `Cannot find module '@/lib/algorithms/snake-draft'`

- [ ] **Step 3: 구현**

`lib/algorithms/snake-draft.ts`:
```typescript
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- snake-draft
```

Expected: `PASS` — 4 tests passed

- [ ] **Step 5: 커밋**

```bash
git add lib/algorithms/snake-draft.ts __tests__/algorithms/snake-draft.test.ts
git commit -m "feat: snake draft pairing algorithm (TDD)"
```

---

## Task 6: 그룹 랜덤 알고리즘 (TDD)

**Files:**
- Create: `__tests__/algorithms/group-random.test.ts`
- Create: `lib/algorithms/group-random.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/algorithms/group-random.test.ts`:
```typescript
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npm test -- group-random
```

Expected: `FAIL` — `Cannot find module '@/lib/algorithms/group-random'`

- [ ] **Step 3: 구현**

`lib/algorithms/group-random.ts`:
```typescript
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- group-random
```

Expected: `PASS` — 10 tests passed

- [ ] **Step 5: 전체 테스트**

```bash
npm test
```

Expected: `PASS` — 14 tests passed

- [ ] **Step 6: 커밋**

```bash
git add lib/algorithms/group-random.ts __tests__/algorithms/group-random.test.ts
git commit -m "feat: group random pairing algorithm (TDD)"
```

---

## Task 7: Events API

**Files:**
- Create: `app/api/events/route.ts`
- Create: `app/api/events/[id]/route.ts`

- [ ] **Step 1: 이벤트 목록 + 생성 라우트**

`app/api/events/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json()
  if (!name?.trim() || !pin?.trim()) {
    return NextResponse.json({ error: 'name and pin required' }, { status: 400 })
  }
  if (pin.length < 4) {
    return NextResponse.json({ error: 'PIN must be at least 4 characters' }, { status: 400 })
  }

  const admin_pin = await bcrypt.hash(pin, 10)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .insert({ name: name.trim(), admin_pin })
    .select('id, name, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: 이벤트 단건 조회 라우트**

`app/api/events/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, name, status, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/events/
git commit -m "feat: events API (list, create, get)"
```

---

## Task 8: 참가자 등록 API

**Files:**
- Create: `app/api/participants/route.ts`

- [ ] **Step 1: 참가자 등록 라우트**

`app/api/participants/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { eventId, name, club, rating } = await req.json()

  if (!eventId || !name?.trim()) {
    return NextResponse.json({ error: 'eventId and name required' }, { status: 400 })
  }
  const r = Number(rating)
  if (isNaN(r) || r < 0 || r > 30) {
    return NextResponse.json({ error: 'rating must be 0–30' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check event is still collecting
  const { data: event } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status !== 'collecting') {
    return NextResponse.json({ error: 'Registration is closed' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({
      event_id: eventId,
      name: name.trim(),
      club: club?.trim() || null,
      rating: Math.round(r * 100) / 100,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/participants/
git commit -m "feat: participant registration API"
```

---

## Task 9: 예상 참가자 API (관리자 전용)

**Files:**
- Create: `app/api/admin/expected/route.ts`
- Create: `app/api/admin/expected/[personId]/route.ts`

- [ ] **Step 1: 예상 명단 조회 + 추가**

`app/api/admin/expected/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'

async function getAdminEventId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const payload = await verifyAdminToken(token)
  return payload?.eventId ?? null
}

export async function GET(req: NextRequest) {
  const eventId = await getAdminEventId(req)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('expected_participants')
    .select('*')
    .eq('event_id', eventId)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const eventId = await getAdminEventId(req)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('expected_participants')
    .insert({ event_id: eventId, name: name.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: 예상 참가자 삭제**

`app/api/admin/expected/[personId]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { personId } = await params
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('expected_participants')
    .delete()
    .eq('id', personId)
    .eq('event_id', payload.eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/admin/expected/
git commit -m "feat: expected participants CRUD API"
```

---

## Task 10: 배정 실행 API

**Files:**
- Create: `app/api/admin/assign/route.ts`

- [ ] **Step 1: 배정 API 작성**

`app/api/admin/assign/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'
import { snakeDraft } from '@/lib/algorithms/snake-draft'
import { groupRandom } from '@/lib/algorithms/group-random'
import type { Participant } from '@/lib/types'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { algorithm, groupCount, excludeId, tempParticipant } = await req.json()
  // algorithm: 'snake' | 'group-random'
  // groupCount: 2 | 4  (group-random only)
  // excludeId?: string  (participant id to exclude for odd handling)
  // tempParticipant?: { name, club, rating }  (add temp for odd handling)

  const supabase = createServiceClient()
  const eventId = payload.eventId

  // Load participants
  const { data: allParticipants, error: pErr } = await supabase
    .from('participants')
    .select('*')
    .eq('event_id', eventId)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  let participants: Participant[] = allParticipants ?? []

  // Odd handling: exclude
  if (excludeId) {
    participants = participants.filter(p => p.id !== excludeId)
  }

  // Odd handling: add temp participant
  if (tempParticipant) {
    const { data: temp, error: tErr } = await supabase
      .from('participants')
      .insert({
        event_id: eventId,
        name: tempParticipant.name,
        club: tempParticipant.club || null,
        rating: tempParticipant.rating,
      })
      .select()
      .single()
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
    participants.push(temp)
  }

  if (participants.length % 2 !== 0) {
    return NextResponse.json({ error: 'Odd number of participants' }, { status: 400 })
  }

  // Run algorithm
  let pairs
  try {
    if (algorithm === 'snake') {
      pairs = snakeDraft(participants)
    } else if (algorithm === 'group-random') {
      pairs = groupRandom(participants, groupCount as 2 | 4)
    } else {
      return NextResponse.json({ error: 'Unknown algorithm' }, { status: 400 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Algorithm error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Save pairs
  const pairRows = pairs.map((p, i) => ({
    event_id: eventId,
    team_number: i + 1,
    participant_a_id: p.a.id,
    participant_b_id: p.b.id,
  }))

  const { error: insertErr } = await supabase.from('pairs').insert(pairRows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Close event
  await supabase.from('events').update({ status: 'closed' }).eq('id', eventId)

  return NextResponse.json({ success: true, teamCount: pairs.length })
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/admin/assign/
git commit -m "feat: assignment execution API"
```

---

## Task 11: 배정 결과 API

**Files:**
- Create: `app/api/pairs/[eventId]/route.ts`

- [ ] **Step 1: pairs 조회 (참가자 정보 포함)**

`app/api/pairs/[eventId]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pairs')
    .select(`
      id,
      event_id,
      team_number,
      participant_a_id,
      participant_b_id,
      participant_a:participants!pairs_participant_a_id_fkey(id, name, club, rating),
      participant_b:participants!pairs_participant_b_id_fkey(id, name, club, rating)
    `)
    .eq('event_id', eventId)
    .order('team_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/pairs/
git commit -m "feat: pairs result API with participant join"
```

---

## Task 12: 공유 훅 + 컴포넌트

**Files:**
- Create: `hooks/useRealtimeEvent.ts`
- Create: `hooks/useAdminToken.ts`
- Create: `components/LogoLongPress.tsx`
- Create: `components/QRCodeDisplay.tsx`

- [ ] **Step 1: Realtime 이벤트 훅**

`hooks/useRealtimeEvent.ts`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TournamentEvent } from '@/lib/types'

export function useRealtimeEvent(eventId: string) {
  const [event, setEvent] = useState<TournamentEvent | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('events')
      .select('id, name, status, created_at')
      .eq('id', eventId)
      .single()
      .then(({ data }) => { if (data) setEvent(data) })

    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => setEvent(payload.new as TournamentEvent)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  return event
}
```

- [ ] **Step 2: 관리자 토큰 훅**

`hooks/useAdminToken.ts`:
```typescript
'use client'
import { useState, useCallback } from 'react'

const TOKEN_KEY = 'admin_token'

export function useAdminToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  })

  const setToken = useCallback((t: string) => {
    localStorage.setItem(TOKEN_KEY, t)
    setTokenState(t)
  }, [])

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setTokenState(null)
  }, [])

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

  return { token, setToken, clearToken, authHeader }
}
```

- [ ] **Step 3: 로고 롱프레스 컴포넌트**

`components/LogoLongPress.tsx`:
```typescript
'use client'
import { useRef, useCallback } from 'react'

interface Props {
  onLongPress: () => void
  durationMs?: number
  children: React.ReactNode
}

export default function LogoLongPress({ onLongPress, durationMs = 3000, children }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(() => {
    timer.current = setTimeout(onLongPress, durationMs)
  }, [onLongPress, durationMs])

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <div
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      className="select-none cursor-pointer"
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 4: QR 코드 컴포넌트**

`components/QRCodeDisplay.tsx`:
```typescript
'use client'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback } from 'react'

interface Props {
  url: string
  size?: number
}

export default function QRCodeDisplay({ url, size = 200 }: Props) {
  const download = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const svgEl = document.querySelector('#qr-svg svg') as SVGSVGElement
    if (!svgEl) return
    const data = new XMLSerializer().serializeToString(svgEl)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const a = document.createElement('a')
      a.download = 'tournament-qr.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
  }, [size, url])

  return (
    <div className="flex flex-col items-center gap-3">
      <div id="qr-svg">
        <QRCodeSVG value={url} size={size} />
      </div>
      <button
        onClick={download}
        className="text-sm text-blue-600 underline"
      >
        PNG 다운로드
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add hooks/ components/LogoLongPress.tsx components/QRCodeDisplay.tsx
git commit -m "feat: realtime hook, admin token hook, logo long-press, QR display"
```

---

## Task 13: 홈 페이지

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 홈 페이지 구현**

`app/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TournamentEvent } from '@/lib/types'

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = useState<TournamentEvent[]>([])
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(setEvents)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreating(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    })
    setCreating(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      return
    }
    const event = await res.json()
    router.push(`/events/${event.id}`)
  }

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8">Tournament Draft</h1>

      <form onSubmit={handleCreate} className="mb-10 p-4 border rounded-lg space-y-3">
        <h2 className="font-semibold text-lg">새 이벤트 만들기</h2>
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="이벤트 이름"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="관리자 PIN (4자리 이상)"
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          required
          minLength={4}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {creating ? '생성 중...' : '이벤트 생성'}
        </button>
      </form>

      <h2 className="font-semibold text-lg mb-3">이벤트 목록</h2>
      {events.length === 0 && <p className="text-gray-400">이벤트가 없습니다.</p>}
      <ul className="space-y-2">
        {events.map(ev => (
          <li key={ev.id}>
            <button
              onClick={() => router.push(`/events/${ev.id}`)}
              className="w-full text-left p-3 border rounded hover:bg-gray-50 flex justify-between"
            >
              <span className="font-medium">{ev.name}</span>
              <span className={`text-sm px-2 py-0.5 rounded ${
                ev.status === 'collecting'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {ev.status === 'collecting' ? '수집 중' : '마감'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: 개발 서버 실행 후 홈 페이지 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 이벤트 생성 폼 확인

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: home page with event list and creation form"
```

---

## Task 14: 참가자 등록 페이지

**Files:**
- Create: `components/registration/RegistrationForm.tsx`
- Create: `app/events/[id]/page.tsx`

- [ ] **Step 1: 등록 폼 컴포넌트**

`components/registration/RegistrationForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import type { Participant } from '@/lib/types'

interface Props {
  eventId: string
  onSuccess: (participant: Participant) => void
}

export default function RegistrationForm({ eventId, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [club, setClub] = useState('')
  const [rating, setRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, name, club, rating: parseFloat(rating) }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      return
    }
    const participant = await res.json()
    onSuccess(participant)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">이름 *</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="홍길동"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">동호회 (선택)</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={club}
          onChange={e => setClub(e.target.value)}
          placeholder="한강다트클럽"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">레이팅 (0.00 ~ 30.00) *</label>
        <input
          className="w-full border rounded px-3 py-2"
          type="number"
          min="0"
          max="30"
          step="0.01"
          value={rating}
          onChange={e => setRating(e.target.value)}
          placeholder="15.00"
          required
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? '등록 중...' : '등록하기'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: 참가자 등록 페이지**

`app/events/[id]/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import RegistrationForm from '@/components/registration/RegistrationForm'
import LogoLongPress from '@/components/LogoLongPress'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import type { Participant } from '@/lib/types'

const PARTICIPANT_KEY = 'my_participant_id'

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const event = useRealtimeEvent(id)
  const [registered, setRegistered] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)

  // 배정 완료 시 결과 페이지로 자동 이동
  useEffect(() => {
    if (event?.status === 'closed' && registered) {
      const pid = localStorage.getItem(PARTICIPANT_KEY)
      router.push(`/events/${id}/results${pid ? `?p=${pid}` : ''}`)
    }
  }, [event?.status, registered, id, router])

  // 참가자 수 실시간 표시
  useEffect(() => {
    if (!id) return
    fetch(`/api/events/${id}`)
    const interval = setInterval(async () => {
      const res = await fetch(`/api/participants?eventId=${id}`)
        .catch(() => null)
      if (res?.ok) {
        const data = await res.json()
        setParticipantCount(data.length ?? 0)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [id])

  function handleSuccess(participant: Participant) {
    localStorage.setItem(PARTICIPANT_KEY, participant.id)
    setRegistered(true)
    setParticipantCount(c => c + 1)
  }

  function handleLongPress() {
    router.push(`/events/${id}/admin`)
  }

  if (!event) return <div className="p-6 text-center">불러오는 중...</div>

  if (event.status === 'closed' && !registered) {
    return (
      <main className="max-w-sm mx-auto p-6 text-center">
        <h1 className="text-xl font-bold mb-4">{event.name}</h1>
        <p className="text-gray-500 mb-4">등록이 마감되었습니다.</p>
        <button
          onClick={() => router.push(`/events/${id}/results`)}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          결과 보기
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <LogoLongPress onLongPress={handleLongPress}>
        <h1 className="text-xl font-bold text-center mb-1 select-none">
          🎯 Tournament Draft
        </h1>
      </LogoLongPress>
      <p className="text-center text-gray-500 text-sm mb-6">{event.name}</p>

      {registered ? (
        <div className="text-center space-y-4">
          <div className="text-4xl">✓</div>
          <p className="font-semibold">등록 완료!</p>
          <p className="text-sm text-gray-500">
            주최자가 배정을 시작하면 자동으로 결과가 표시됩니다.
          </p>
          <p className="text-sm text-blue-600">현재 등록: {participantCount}명</p>
        </div>
      ) : (
        <>
          <RegistrationForm eventId={id} onSuccess={handleSuccess} />
          <p className="text-center text-xs text-gray-400 mt-4">
            현재 등록: {participantCount}명
          </p>
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 3: 참가자 수 조회 API 추가 (GET)**

`app/api/participants/route.ts` 상단에 GET 추가:
```typescript
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId')
  if (!eventId) return NextResponse.json([], { status: 200 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .select('id, name, club, rating, registered_at')
    .eq('event_id', eventId)
    .order('registered_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: 커밋**

```bash
git add components/registration/ app/events/
git commit -m "feat: participant registration page with realtime auto-redirect"
```

---

## Task 15: 관리자 패널

**Files:**
- Create: `components/admin/AdminPinModal.tsx`
- Create: `components/admin/ExpectedList.tsx`
- Create: `components/admin/AttendanceTracker.tsx`
- Create: `components/admin/AssignmentPanel.tsx`
- Create: `app/events/[id]/admin/page.tsx`

- [ ] **Step 1: PIN 입력 모달**

`components/admin/AdminPinModal.tsx`:
```typescript
'use client'
import { useState } from 'react'

interface Props {
  eventId: string
  onSuccess: (token: string) => void
}

export default function AdminPinModal({ eventId, onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, pin }),
    })
    setLoading(false)
    if (!res.ok) { setError('PIN이 올바르지 않습니다.'); return }
    const { token } = await res.json()
    onSuccess(token)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-80 space-y-4">
        <h2 className="font-bold text-lg text-center">관리자 인증</h2>
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="PIN 입력"
          value={pin}
          onChange={e => setPin(e.target.value)}
          autoFocus
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? '확인 중...' : '확인'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: 예상 명단 탭**

`components/admin/ExpectedList.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import type { ExpectedParticipant } from '@/lib/types'

interface Props { token: string; eventId: string }

export default function ExpectedList({ token, eventId }: Props) {
  const [list, setList] = useState<ExpectedParticipant[]>([])
  const [name, setName] = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch('/api/admin/expected', { headers }).then(r => r.json()).then(setList)
  }, [token])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const res = await fetch('/api/admin/expected', {
      method: 'POST', headers,
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const item = await res.json()
      setList(l => [...l, item])
      setName('')
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/expected/${id}`, { method: 'DELETE', headers })
    setList(l => l.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="예상 참가자 이름"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">추가</button>
      </form>
      <p className="text-sm text-gray-500">{list.length}명 등록됨</p>
      <ul className="space-y-2">
        {list.map(p => (
          <li key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span>{p.name}</span>
            <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-500">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: 참가 확인 탭**

`components/admin/AttendanceTracker.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ExpectedParticipant, Participant } from '@/lib/types'

interface Props { token: string; eventId: string }

export default function AttendanceTracker({ token, eventId }: Props) {
  const [expected, setExpected] = useState<ExpectedParticipant[]>([])
  const [registered, setRegistered] = useState<Participant[]>([])

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/admin/expected', { headers }).then(r => r.json()).then(setExpected)
    fetch(`/api/participants?eventId=${eventId}`).then(r => r.json()).then(setRegistered)

    const supabase = createClient()
    const channel = supabase
      .channel(`participants:${eventId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` },
        (payload) => setRegistered(r => [...r, payload.new as Participant])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId, token])

  const registeredNames = new Set(registered.map(p => p.name))
  const done = expected.filter(e => registeredNames.has(e.name))
  const missing = expected.filter(e => !registeredNames.has(e.name))
  const extra = registered.filter(p => !expected.some(e => e.name === p.name))

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        등록 <span className="text-green-600 font-bold">{registered.length}명</span>
        {' / '}미등록 <span className="text-red-500 font-bold">{missing.length}명</span>
      </p>

      {done.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-600 mb-1">✓ 등록 완료</p>
          {done.map(p => {
            const reg = registered.find(r => r.name === p.name)
            return (
              <div key={p.id} className="flex justify-between p-2 bg-green-50 rounded mb-1 text-sm">
                <span>{p.name}</span>
                <span className="text-gray-500">{reg?.rating.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 mb-1">✗ 미등록</p>
          {missing.map(p => (
            <div key={p.id} className="p-2 bg-red-50 rounded mb-1 text-sm">{p.name}</div>
          ))}
        </div>
      )}

      {extra.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-orange-500 mb-1">＋ 명단 외 등록</p>
          {extra.map(p => (
            <div key={p.id} className="flex justify-between p-2 bg-orange-50 rounded mb-1 text-sm">
              <span>{p.name}{p.club ? ` (${p.club})` : ''}</span>
              <span className="text-gray-500">{p.rating.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 배정 패널 컴포넌트**

`components/admin/AssignmentPanel.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import type { Participant, AlgorithmPair } from '@/lib/types'

// AlgorithmPair는 lib/types.ts에 추가 필요 (Task 3 이후):
// export interface AlgorithmConfig {
//   algorithm: 'snake' | 'group-random'
//   groupCount?: 2 | 4
// }

interface Props {
  token: string
  eventId: string
  onAssignStart: (pairs: { a: Participant; b: Participant }[]) => void
}

export default function AssignmentPanel({ token, eventId, onAssignStart }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [algorithm, setAlgorithm] = useState<'snake' | 'group-random'>('snake')
  const [groupCount, setGroupCount] = useState<2 | 4>(2)
  const [excludeId, setExcludeId] = useState<string>('')
  const [tempName, setTempName] = useState('')
  const [tempClub, setTempClub] = useState('')
  const [tempRating, setTempRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/participants?eventId=${eventId}`)
      .then(r => r.json()).then(setParticipants)
  }, [eventId])

  const isOdd = participants.length % 2 !== 0

  async function handleAssign() {
    setError('')
    setLoading(true)
    const body: Record<string, unknown> = { algorithm, groupCount }
    if (excludeId) body.excludeId = excludeId
    if (tempName) body.tempParticipant = {
      name: tempName, club: tempClub || null,
      rating: parseFloat(tempRating)
    }

    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      return
    }
    // Fetch pairs and start animation
    const pairsRes = await fetch(`/api/pairs/${eventId}`)
    const pairs = await pairsRes.json()
    onAssignStart(pairs.map((p: { participant_a: Participant; participant_b: Participant }) => ({
      a: p.participant_a,
      b: p.participant_b,
    })))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm">참가자 {participants.length}명</p>

      {isOdd && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm space-y-3">
          <p className="font-semibold text-yellow-700">⚠ 홀수 인원 — 조정 필요</p>
          <div>
            <label className="block text-xs mb-1">제외할 참가자 선택:</label>
            <select className="w-full border rounded px-2 py-1"
              value={excludeId} onChange={e => setExcludeId(e.target.value)}>
              <option value="">-- 선택 --</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.rating})</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-center text-gray-400">또는 임시 참가자 추가:</p>
          <div className="space-y-2">
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="이름"
              value={tempName} onChange={e => { setTempName(e.target.value); setExcludeId('') }} />
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="동호회 (선택)"
              value={tempClub} onChange={e => setTempClub(e.target.value)} />
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="레이팅"
              type="number" min="0" max="30" step="0.01"
              value={tempRating} onChange={e => setTempRating(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">배정 방식</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={algorithm === 'snake'}
              onChange={() => setAlgorithm('snake')} />
            <span className="text-sm">스네이크 드래프트</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={algorithm === 'group-random'}
              onChange={() => setAlgorithm('group-random')} />
            <span className="text-sm">그룹 랜덤</span>
          </label>
        </div>
        {algorithm === 'group-random' && (
          <div className="mt-3 ml-6">
            <p className="text-xs text-gray-500 mb-1">그룹 수</p>
            <div className="flex gap-2">
              {([2, 4] as const).map(g => (
                <button key={g}
                  onClick={() => setGroupCount(g)}
                  className={`px-4 py-1 rounded text-sm font-bold ${groupCount === g
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'}`}
                >{g}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleAssign}
        disabled={loading || (isOdd && !excludeId && !tempName)}
        className="w-full bg-red-600 text-white py-3 rounded-lg font-bold disabled:opacity-40"
      >
        {loading ? '배정 중...' : '🎯 파트너 배정 시작'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 관리자 페이지**

`app/events/[id]/admin/page.tsx`:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import ExpectedList from '@/components/admin/ExpectedList'
import AttendanceTracker from '@/components/admin/AttendanceTracker'
import AssignmentPanel from '@/components/admin/AssignmentPanel'
import AssignmentAnimation from '@/components/animation/AssignmentAnimation'
import type { Participant } from '@/lib/types'

type Tab = 'expected' | 'attendance' | 'assign'

export default function AdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('expected')
  const [animationPairs, setAnimationPairs] = useState<
    { a: Participant; b: Participant }[] | null
  >(null)

  useEffect(() => {
    const saved = localStorage.getItem('admin_token')
    if (saved) setToken(saved)
  }, [])

  function handleTokenSet(t: string) {
    localStorage.setItem('admin_token', t)
    setToken(t)
  }

  function handleAnimationEnd() {
    router.push(`/events/${id}/results`)
  }

  if (animationPairs) {
    return (
      <AssignmentAnimation
        pairs={animationPairs}
        onEnd={handleAnimationEnd}
      />
    )
  }

  return (
    <main className="max-w-lg mx-auto p-6">
      {!token && (
        <AdminPinModal eventId={id} onSuccess={handleTokenSet} />
      )}

      <h1 className="text-xl font-bold mb-1">🔒 주최자 모드</h1>
      <p className="text-sm text-gray-400 mb-6">Event: {id.slice(0, 8)}...</p>

      <div className="flex border-b mb-6">
        {([
          ['expected', '명단 관리'],
          ['attendance', '참가 확인'],
          ['assign', '마감 / 배정'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm ${tab === key
              ? 'border-b-2 border-blue-600 font-semibold'
              : 'text-gray-400'}`}
          >{label}</button>
        ))}
      </div>

      {token && (
        <>
          {tab === 'expected' && <ExpectedList token={token} eventId={id} />}
          {tab === 'attendance' && <AttendanceTracker token={token} eventId={id} />}
          {tab === 'assign' && (
            <AssignmentPanel
              token={token}
              eventId={id}
              onAssignStart={setAnimationPairs}
            />
          )}
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 6: 커밋**

```bash
git add components/admin/ app/events/
git commit -m "feat: admin panel with PIN auth, expected list, attendance tracker, assignment panel"
```

---

## Task 16: 배정 애니메이션

**Files:**
- Create: `components/animation/AssignmentAnimation.tsx`

- [ ] **Step 1: 드럼롤 + 컨페티 애니메이션**

`components/animation/AssignmentAnimation.tsx`:
```typescript
'use client'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'

interface Props {
  pairs: { a: Participant; b: Participant }[]
  onEnd: () => void
}

type Phase = 'drumroll' | 'finale'

export default function AssignmentAnimation({ pairs, onEnd }: Props) {
  const [phase, setPhase] = useState<Phase>('drumroll')
  const [currentTeam, setCurrentTeam] = useState(0)
  const [spinning, setSpinning] = useState(true)
  const [spinName, setSpinName] = useState('...')
  const [revealedPairs, setRevealedPairs] = useState<typeof pairs>([])
  const spinInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const names = pairs.map(p => p.b.name)

  useEffect(() => {
    runDrumroll(0)
  }, [])

  function runDrumroll(teamIdx: number) {
    if (teamIdx >= pairs.length) {
      setPhase('finale')
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } })
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 } }), 400)
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 } }), 700)
      }, 300)
      return
    }

    setCurrentTeam(teamIdx)
    setSpinning(true)
    setSpinName('...')

    let speed = 60
    let elapsed = 0
    const totalDuration = 2000 + teamIdx * 200

    function tick() {
      setSpinName(names[Math.floor(Math.random() * names.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      if (elapsed < totalDuration) {
        spinInterval.current = setTimeout(tick, speed)
      } else {
        setSpinName(pairs[teamIdx].b.name)
        setSpinning(false)
        setRevealedPairs(prev => [...prev, pairs[teamIdx]])
        setTimeout(() => runDrumroll(teamIdx + 1), 1200)
      }
    }
    tick()
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center">
      {phase === 'drumroll' && (
        <div className="text-center space-y-8 px-6">
          <p className="text-gray-400 text-lg">
            팀 {currentTeam + 1} / {pairs.length} 배정 중...
          </p>
          <div className="space-y-4">
            <div className="text-3xl font-bold text-blue-300">
              {pairs[currentTeam]?.a.name}
            </div>
            <div className="text-2xl text-gray-400">+</div>
            <div
              className={`text-3xl font-bold transition-all ${
                spinning ? 'text-yellow-300 opacity-70' : 'text-green-300 scale-110'
              }`}
              style={{ minHeight: '2.5rem' }}
            >
              {spinName}
            </div>
          </div>
          {revealedPairs.length > 0 && (
            <div className="text-sm text-gray-500 space-y-1">
              {revealedPairs.map((p, i) => (
                <div key={i}>팀{i + 1}: {p.a.name} + {p.b.name}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'finale' && (
        <div className="w-full max-w-lg px-6 space-y-4">
          <h2 className="text-center text-2xl font-bold mb-6">
            🎉 Tournament Draft — 오늘의 파트너
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            {pairs.map((p, i) => (
              <div
                key={i}
                className="bg-white/10 rounded-xl px-5 py-4 flex justify-between items-center"
                style={{
                  animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                }}
              >
                <div>
                  <span className="text-gray-400 text-xs">팀 {i + 1}</span>
                  <div className="font-semibold">{p.a.name} <span className="text-gray-400">+</span> {p.b.name}</div>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  {p.a.rating.toFixed(2)}<br />{p.b.rating.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onEnd}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold"
          >
            결과 페이지로 이동
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/animation/
git commit -m "feat: drum roll + confetti assignment animation"
```

---

## Task 17: 결과 페이지

**Files:**
- Create: `components/results/MyPartnerTab.tsx`
- Create: `components/results/AllResultsTab.tsx`
- Create: `components/results/CopyButton.tsx`
- Create: `app/events/[id]/results/page.tsx`

- [ ] **Step 1: 내 파트너 탭**

`components/results/MyPartnerTab.tsx`:
```typescript
import type { Pair, Participant } from '@/lib/types'

interface Props {
  pairs: Pair[]
  participantId: string | null
}

export default function MyPartnerTab({ pairs, participantId }: Props) {
  const myPair = participantId
    ? pairs.find(p => p.participant_a_id === participantId || p.participant_b_id === participantId)
    : null

  if (!myPair) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>본인의 파트너를 확인하려면</p>
        <p>QR 코드로 등록한 기기에서 확인해주세요.</p>
      </div>
    )
  }

  const me = myPair.participant_a_id === participantId
    ? myPair.participant_a!
    : myPair.participant_b!
  const partner = myPair.participant_a_id === participantId
    ? myPair.participant_b!
    : myPair.participant_a!

  return (
    <div className="space-y-6 py-4">
      <div className="text-center p-6 bg-blue-50 rounded-2xl">
        <p className="text-xs text-gray-400 mb-1">팀 {myPair.team_number}</p>
        <p className="font-semibold mb-4">{me.name}의 파트너</p>
        <div className="text-3xl font-bold text-blue-700">{partner.name}</div>
        {partner.club && <p className="text-sm text-gray-500 mt-1">{partner.club}</p>}
        <p className="text-lg text-gray-600 mt-2">레이팅 {partner.rating.toFixed(2)}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 전체 결과 탭**

`components/results/AllResultsTab.tsx`:
```typescript
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
```

- [ ] **Step 3: 구글 시트 복사 버튼**

`components/results/CopyButton.tsx`:
```typescript
'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'

interface Props { pairs: Pair[] }

export default function CopyButton({ pairs }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const header = '팀\t파트너A 이름\t파트너A 동호회\t파트너A 레이팅\t파트너B 이름\t파트너B 동호회\t파트너B 레이팅'
    const rows = pairs.map(p =>
      [
        p.team_number,
        p.participant_a?.name ?? '',
        p.participant_a?.club ?? '',
        p.participant_a?.rating.toFixed(2) ?? '',
        p.participant_b?.name ?? '',
        p.participant_b?.club ?? '',
        p.participant_b?.rating.toFixed(2) ?? '',
      ].join('\t')
    )
    navigator.clipboard.writeText([header, ...rows].join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-sm border rounded px-3 py-2 hover:bg-gray-50"
    >
      {copied ? '복사됨 ✓' : '구글 시트 복사'}
    </button>
  )
}
```

- [ ] **Step 4: 결과 페이지**

`app/events/[id]/results/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import MyPartnerTab from '@/components/results/MyPartnerTab'
import AllResultsTab from '@/components/results/AllResultsTab'
import type { Pair } from '@/lib/types'

type Tab = 'my' | 'all'

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const participantId = searchParams.get('p') ||
    (typeof window !== 'undefined' ? localStorage.getItem('my_participant_id') : null)

  const [pairs, setPairs] = useState<Pair[]>([])
  const [tab, setTab] = useState<Tab>(participantId ? 'my' : 'all')

  useEffect(() => {
    fetch(`/api/pairs/${id}`).then(r => r.json()).then(setPairs)
  }, [id])

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold mb-1">🎯 Tournament Draft</h1>
      <p className="text-sm text-gray-400 mb-6">파트너 배정 결과</p>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setTab('my')}
          className={`flex-1 py-2 text-sm ${tab === 'my'
            ? 'border-b-2 border-blue-600 font-semibold'
            : 'text-gray-400'}`}
        >내 파트너</button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2 text-sm ${tab === 'all'
            ? 'border-b-2 border-blue-600 font-semibold'
            : 'text-gray-400'}`}
        >전체 결과</button>
      </div>

      {tab === 'my' && (
        <MyPartnerTab pairs={pairs} participantId={participantId} />
      )}
      {tab === 'all' && (
        <AllResultsTab pairs={pairs} highlightId={participantId} />
      )}
    </main>
  )
}
```

- [ ] **Step 5: 최종 테스트**

```bash
npm test
npm run build
```

Expected: 14 tests passed, build succeeds with no errors

- [ ] **Step 6: 최종 커밋**

```bash
git add components/results/ app/events/
git commit -m "feat: results page with my-partner tab, all-results tab, and Google Sheets copy"
```

---

## Self-Review

**스펙 커버리지 체크:**
- ✓ QR 코드 기반 등록 (Task 14 + Task 12 QRCodeDisplay)
- ✓ 이름 + 동호회(선택) + 레이팅 입력 (Task 14)
- ✓ 주최자 로고 롱프레스 + PIN 인증 (Task 12, 15)
- ✓ 예상 명단 관리 (Task 9, 15)
- ✓ 실시간 참가 확인 (Task 15 AttendanceTracker)
- ✓ 스네이크 드래프트 알고리즘 (Task 5)
- ✓ 그룹 랜덤 알고리즘 + 그룹 수 선택 (Task 6)
- ✓ 홀수 처리 — 제외 또는 임시 참가자 (Task 15 AssignmentPanel)
- ✓ 드럼롤 + 컨페티 애니메이션 (Task 16)
- ✓ 참가자 기기 자동 전환 (Task 14 useRealtimeEvent + localStorage)
- ✓ 결과 화면 내 파트너 탭 + 전체 결과 탭 (Task 17)
- ✓ 구글 시트 복사 (Task 17 CopyButton)
- ✓ 이벤트 히스토리 (Task 13 홈 페이지)
- ✓ QR PNG 다운로드 (Task 12 QRCodeDisplay)
