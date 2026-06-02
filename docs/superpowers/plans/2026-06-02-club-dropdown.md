# 동호회 드롭다운 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전체 공용 동호회 목록을 마스터 PIN으로 관리하고, 모든 폼의 동호회 입력을 드롭다운으로 교체한다.

**Architecture:** `lib/auth/admin-token.ts`에 마스터 토큰 sign/verify 추가 → 마스터 PIN API → clubs CRUD API → 기존 어드민 API에 마스터 토큰 허용 패턴 추가 → 홈 페이지 마스터 어드민 UI → 드롭다운 교체 순으로 진행.

**Tech Stack:** Next.js 16 App Router, Supabase service client, jose JWT, CSS 변수 디자인 시스템

---

## 파일 구조

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `supabase/migrations/002_clubs.sql` | 신규 | clubs 테이블 DDL (Supabase에서 수동 실행) |
| `lib/types.ts` | 수정 | Club 인터페이스 추가 |
| `lib/auth/admin-token.ts` | 수정 | signMasterToken, verifyMasterToken, resolveEventId 추가 |
| `app/api/admin/verify-master-pin/route.ts` | 신규 | 마스터 PIN 검증 → JWT |
| `app/api/clubs/route.ts` | 신규 | GET (공개) + POST (마스터) |
| `app/api/clubs/[id]/route.ts` | 신규 | DELETE (마스터) |
| `app/api/admin/participants/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/admin/participants/[id]/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/admin/pairs/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/admin/assign/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/events/[id]/route.ts` | 수정 | DELETE에 마스터 토큰 허용 |
| `app/page.tsx` | 수정 | 마스터 PIN 모달, 동호회 관리 UI |
| `app/events/[id]/admin/page.tsx` | 수정 | 마스터 토큰 fallback |
| `components/registration/RegistrationForm.tsx` | 수정 | 동호회 드롭다운 |
| `components/admin/AdminParticipantPanel.tsx` | 수정 | 동호회 드롭다운 (추가+수정) |
| `components/admin/AssignmentPanel.tsx` | 수정 | tempClub 드롭다운 |

---

## Task 1: DB 마이그레이션 파일 + Club 타입

**Files:**
- Create: `supabase/migrations/002_clubs.sql`
- Modify: `lib/types.ts`

- [ ] **Step 1: `supabase/migrations/002_clubs.sql` 작성**

```sql
CREATE TABLE IF NOT EXISTS clubs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clubs_public_read" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "clubs_service_all" ON clubs
  USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Supabase 대시보드에서 SQL 실행**

Supabase 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run

Expected: "Success. No rows returned"

- [ ] **Step 3: `lib/types.ts`에 Club 인터페이스 추가**

기존 파일 맨 아래에 추가:

```ts
export interface Club {
  id: string
  name: string
  created_at: string
}
```

- [ ] **Step 4: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/002_clubs.sql lib/types.ts
git commit -m "feat: add clubs table migration and Club type"
```

---

## Task 2: 마스터 토큰 시스템

**Files:**
- Modify: `lib/auth/admin-token.ts`
- Create: `app/api/admin/verify-master-pin/route.ts`

- [ ] **Step 1: `lib/auth/admin-token.ts`에 마스터 함수 추가**

현재 파일 맨 아래에 추가:

```ts
export async function signMasterToken(): Promise<string> {
  return new SignJWT({ role: 'master' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyMasterToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload.role === 'master'
  } catch {
    return false
  }
}

// 이벤트 토큰 또는 마스터 토큰으로 eventId를 resolve하는 헬퍼
export async function resolveEventId(
  token: string,
  fallbackEventId?: string
): Promise<string | null> {
  const payload = await verifyAdminToken(token)
  if (payload) return payload.eventId
  if (await verifyMasterToken(token)) return fallbackEventId ?? null
  return null
}
```

- [ ] **Step 2: `app/api/admin/verify-master-pin/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { signMasterToken } from '@/lib/auth/admin-token'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()
  if (!pin) return NextResponse.json({ error: 'Missing pin' }, { status: 400 })

  if (pin !== process.env.MASTER_ADMIN_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = await signMasterToken()
  return NextResponse.json({ token })
}
```

- [ ] **Step 3: `.env.local`에 환경변수 추가**

`.env.local` 파일을 열어 추가:
```
MASTER_ADMIN_PIN=your_master_pin_here
```

(실제 PIN 값으로 교체)

- [ ] **Step 4: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add lib/auth/admin-token.ts app/api/admin/verify-master-pin/route.ts
git commit -m "feat: add master token system (sign/verify/resolveEventId + verify-master-pin API)"
```

---

## Task 3: Clubs CRUD API

**Files:**
- Create: `app/api/clubs/route.ts`
- Create: `app/api/clubs/[id]/route.ts`

- [ ] **Step 1: `app/api/clubs/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyMasterToken } from '@/lib/auth/admin-token'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, created_at')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token || !await verifyMasterToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clubs')
    .insert({ name: name.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 동호회입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: `app/api/clubs/[id]/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyMasterToken } from '@/lib/auth/admin-token'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token || !await verifyMasterToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('clubs').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add app/api/clubs/route.ts "app/api/clubs/[id]/route.ts"
git commit -m "feat: add clubs CRUD API (GET public, POST/DELETE master)"
```

---

## Task 4: 어드민 API 마스터 토큰 허용

**Files:**
- Modify: `app/api/admin/participants/route.ts`
- Modify: `app/api/admin/participants/[id]/route.ts`
- Modify: `app/api/admin/pairs/route.ts`
- Modify: `app/api/admin/assign/route.ts`
- Modify: `app/api/events/[id]/route.ts`

각 파일에서 `verifyAdminToken` import에 `resolveEventId`를 추가하고, `payload.eventId` 대신 `resolveEventId`를 사용하도록 수정.

- [ ] **Step 1: `app/api/admin/participants/route.ts` 수정**

import 변경:
```ts
import { resolveEventId } from '@/lib/auth/admin-token'
```

POST 핸들러 상단:
```ts
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = await resolveEventId(token)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

(`verifyAdminToken` import 및 `payload.eventId` 사용 부분을 위 코드로 교체)

- [ ] **Step 2: `app/api/admin/participants/[id]/route.ts` 수정**

`authorize` 헬퍼 함수 내부를 수정:

```ts
import { resolveEventId } from '@/lib/auth/admin-token'

async function authorize(req: NextRequest, participantId: string) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createServiceClient()

  // 이벤트 토큰 또는 마스터 토큰으로 eventId resolve
  const { data: participant } = await supabase
    .from('participants')
    .select('id, event_id')
    .eq('id', participantId)
    .single()

  if (!participant) return null

  const eventId = await resolveEventId(token, participant.event_id)
  if (!eventId || eventId !== participant.event_id) return null

  return { eventId }
}
```

- [ ] **Step 3: `app/api/admin/pairs/route.ts` 수정**

```ts
import { resolveEventId } from '@/lib/auth/admin-token'

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // URL에 eventId 없으므로 토큰에서만 추출 (마스터 토큰은 이 엔드포인트 사용 불가)
  // → 마스터 토큰 지원을 위해 request body에서 eventId를 받거나
  //   결과 페이지에서 master_token으로 직접 호출 시 eventId가 없어 실패
  // → 결과 페이지 handleReset은 이벤트 어드민 토큰을 먼저 확인하므로 문제 없음
  // → 단, admin/page.tsx에서 master_token으로 호출 시 eventId 필요
  // 해결: body에서 eventId 선택적으로 수용

  const body = await req.json().catch(() => ({}))
  const eventId = await resolveEventId(token, body.eventId)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { error: pairsError } = await supabase
    .from('pairs')
    .delete()
    .eq('event_id', eventId)

  if (pairsError) return NextResponse.json({ error: pairsError.message }, { status: 500 })

  const { error: statusError } = await supabase
    .from('events')
    .update({ status: 'collecting' })
    .eq('id', eventId)

  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
```

> 참고: `admin/page.tsx`의 `handleReset`에서 마스터 토큰 사용 시 body에 `eventId: id` 추가 필요 (Task 6에서 처리)

- [ ] **Step 4: `app/api/admin/assign/route.ts` 수정**

import 변경:
```ts
import { resolveEventId } from '@/lib/auth/admin-token'
```

기존:
```ts
  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ...
  const eventId = payload.eventId
```

변경:
```ts
  const eventId = await resolveEventId(token)
  if (!eventId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

- [ ] **Step 5: `app/api/events/[id]/route.ts` DELETE 수정**

```ts
import { resolveEventId } from '@/lib/auth/admin-token'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = await resolveEventId(token, id)
  if (!eventId || eventId !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('events').delete().eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add app/api/admin/participants/route.ts "app/api/admin/participants/[id]/route.ts" app/api/admin/pairs/route.ts app/api/admin/assign/route.ts "app/api/events/[id]/route.ts"
git commit -m "feat: allow master token in all admin API routes"
```

---

## Task 5: 홈 페이지 마스터 PIN + 동호회 관리 UI

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: `app/page.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import type { TournamentEvent, Club } from '@/lib/types'

function LogoType() {
  return (
    <span className="text-[11px] font-black tracking-[3px] uppercase">
      <span className="logo-neon-pink">TOUR</span>
      <span className="logo-neon-green">NA</span>
      <span className="logo-neon-cyan">MENT</span>
    </span>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme') as 'dark' | 'light'
    setTheme(t || 'light')
  }, [])
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    setTheme(next)
  }
  return (
    <button onClick={toggle} style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }} aria-label="테마 전환">
      {theme === 'dark' ? '☀️' : '🌑'}
    </button>
  )
}

function statusLabel(status: string) {
  if (status === 'collecting') return <span className="badge-collecting">모집 중</span>
  return <span className="badge-closed">배정 완료</span>
}

function borderColor(status: string) {
  return status === 'collecting' ? 'var(--neon-pink)' : 'var(--neon-green)'
}

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = useState<TournamentEvent[]>([])
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // 마스터 어드민 상태
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [masterToken, setMasterToken] = useState<string | null>(null)
  const [showMasterPinModal, setShowMasterPinModal] = useState(false)

  // 이벤트별 어드민 접근
  const [adminTarget, setAdminTarget] = useState<string | null>(null)

  // 동호회 관리
  const [clubs, setClubs] = useState<Club[]>([])
  const [newClubName, setNewClubName] = useState('')
  const [clubError, setClubError] = useState('')

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(setEvents)
    // 저장된 마스터 토큰 확인
    const saved = localStorage.getItem('master_token')
    if (saved) { setMasterToken(saved); setIsMasterAdmin(true) }
  }, [])

  useEffect(() => {
    if (isMasterAdmin) {
      fetch('/api/clubs').then(r => r.json()).then(setClubs)
    }
  }, [isMasterAdmin])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    })
    setCreating(false)
    if (!res.ok) { const d = await res.json(); setCreateError(d.error); return }
    const event = await res.json()
    router.push(`/events/${event.id}`)
  }

  function handleMasterPinSuccess(token: string) {
    localStorage.setItem('master_token', token)
    setMasterToken(token)
    setIsMasterAdmin(true)
    setShowMasterPinModal(false)
  }

  function handleAdminSuccess(token: string) {
    if (!adminTarget) return
    localStorage.setItem(`admin_token_${adminTarget}`, token)
    router.push(`/events/${adminTarget}/admin`)
  }

  async function handleAddClub(e: React.FormEvent) {
    e.preventDefault()
    setClubError('')
    if (!newClubName.trim() || !masterToken) return
    const res = await fetch('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${masterToken}` },
      body: JSON.stringify({ name: newClubName }),
    })
    if (!res.ok) { const d = await res.json(); setClubError(d.error); return }
    const club = await res.json()
    setClubs(c => [...c, club])
    setNewClubName('')
  }

  async function handleDeleteClub(id: string) {
    if (!masterToken) return
    const res = await fetch(`/api/clubs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${masterToken}` },
    })
    if (res.ok) setClubs(c => c.filter(cl => cl.id !== id))
  }

  function startPress() {
    if (isMasterAdmin) return
    pressTimer.current = setTimeout(() => setShowMasterPinModal(true), 3000)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  return (
    <main className="page-scanline relative" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 24px' }}>

        {/* 마스터 PIN 모달 */}
        {showMasterPinModal && (
          <div className="modal-overlay">
            <form
              className="modal-panel"
              style={{ borderTop: '2px solid var(--neon-green)' }}
              onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const pinVal = (form.elements.namedItem('masterPin') as HTMLInputElement).value
                const res = await fetch('/api/admin/verify-master-pin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pin: pinVal }),
                })
                if (!res.ok) { alert('마스터 PIN이 올바르지 않습니다.'); return }
                const { token } = await res.json()
                handleMasterPinSuccess(token)
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                🔑 마스터 어드민
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 18 }}>
                마스터 PIN 입력
              </div>
              <label className="field-label">PIN</label>
              <input
                name="masterPin"
                type="password"
                className="input-field"
                style={{ marginBottom: 12, letterSpacing: '6px' }}
                placeholder="••••"
                autoFocus
              />
              <button type="submit" className="btn-cta" style={{ marginBottom: 10 }}>확인</button>
              <button type="button" onClick={() => setShowMasterPinModal(false)} className="btn-ghost" style={{ width: '100%' }}>취소</button>
            </form>
          </div>
        )}

        {/* 이벤트별 어드민 PIN 모달 */}
        {adminTarget && (
          <AdminPinModal
            eventId={adminTarget}
            onSuccess={handleAdminSuccess}
            onCancel={() => setAdminTarget(null)}
          />
        )}

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div
              style={{ marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
              onMouseDown={startPress} onMouseUp={endPress}
              onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress}
            >
              <LogoType />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1.05 }}>
              드래프트<br />매니저{isMasterAdmin && ' 🔑'}
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* 마스터 어드민 패널 */}
        {isMasterAdmin && (
          <div style={{ marginBottom: 28, padding: 20, background: 'var(--bg-surface)', border: '1.5px solid var(--accent)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', marginBottom: 16, textTransform: 'uppercase' }}>
              🔑 마스터 어드민
            </div>

            {/* 동호회 관리 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
                동호회 관리
              </div>
              <form onSubmit={handleAddClub} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="동호회 이름"
                  value={newClubName}
                  onChange={e => setNewClubName(e.target.value)}
                />
                <button type="submit" className="btn-secondary">추가</button>
              </form>
              {clubError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{clubError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {clubs.map(c => (
                  <div key={c.id} className="card-surface" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</span>
                    <button
                      onClick={() => handleDeleteClub(c.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
                {clubs.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>동호회가 없습니다.</p>
                )}
              </div>
            </div>

            {/* 새 토너먼트 만들기 */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
                새 토너먼트 만들기
              </div>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="field-label">토너먼트 이름</label>
                  <input className="input-field" placeholder="예: 봄 클럽 드래프트" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="field-label">관리자 PIN (4자리 이상)</label>
                  <input className="input-field" type="password" placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} required minLength={4} />
                </div>
                {createError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{createError}</p>}
                <button type="submit" disabled={creating} className="btn-cta">
                  {creating ? '생성 중...' : '+ 토너먼트 만들기'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 토너먼트 목록 */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>
          진행 중인 토너먼트
        </div>

        {events.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>토너먼트가 없습니다.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => router.push(`/events/${ev.id}`)}
                style={{
                  flex: 1, textAlign: 'left',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${borderColor(ev.status)}`,
                  borderRadius: 6, padding: '13px 14px', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>{ev.name}</span>
                  {statusLabel(ev.status)}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                  {new Date(ev.created_at).toLocaleDateString('ko-KR')}
                </div>
              </button>
              {isMasterAdmin && (
                <button
                  onClick={() => router.push(`/events/${ev.id}/admin`)}
                  style={{
                    padding: '0 14px',
                    background: 'var(--accent-bg)',
                    border: '1.5px solid var(--accent)',
                    borderRadius: 6, color: 'var(--accent)',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  관리
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
```

> 참고: 마스터 어드민 모드에서 "관리" 클릭 시 `admin_token_{eventId}`는 없지만 `master_token`으로 이벤트 어드민 접근 가능 (Task 6에서 처리).

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: master admin mode with PIN modal and club management on home page"
```

---

## Task 6: 이벤트 어드민 페이지 마스터 토큰 지원

**Files:**
- Modify: `app/events/[id]/admin/page.tsx`

- [ ] **Step 1: 마스터 토큰 fallback + handleReset에 eventId 추가**

`useEffect`에서 토큰 로드 시 마스터 토큰 fallback:

```ts
  useEffect(() => {
    const saved = localStorage.getItem(`admin_token_${id}`)
                ?? localStorage.getItem('master_token')
    if (saved) setToken(saved)
  }, [])
```

`handleReset` 함수에서 body에 `eventId` 추가:

```ts
  async function handleReset() {
    if (!token) return
    setResetting(true)
    const res = await fetch('/api/admin/pairs', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: id }),
    })
    setResetting(false)
    if (res.ok) {
      setEventStatus('collecting')
      setShowResetConfirm(false)
      setTab('participants')
    }
  }
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add "app/events/[id]/admin/page.tsx"
git commit -m "feat: support master token in event admin page"
```

---

## Task 7: 드롭다운 교체 (4곳)

**Files:**
- Modify: `components/registration/RegistrationForm.tsx`
- Modify: `components/admin/AdminParticipantPanel.tsx`
- Modify: `components/admin/AssignmentPanel.tsx`

공통: 각 컴포넌트 마운트 시 `GET /api/clubs` 호출 → `clubs: Club[]` 상태 관리. 목록 비면 텍스트 input fallback.

- [ ] **Step 1: `components/registration/RegistrationForm.tsx` 수정**

`Club` import 추가 후 clubs 상태 추가:
```ts
import type { Participant, Club } from '@/lib/types'
// ...
  const [clubs, setClubs] = useState<Club[]>([])
  useEffect(() => {
    fetch('/api/clubs').then(r => r.json()).then(setClubs)
  }, [])
```

동호회 input 교체:
```tsx
      <div>
        <label className="field-label" style={{ color: 'var(--text-muted)' }}>동호회 (선택)</label>
        {clubs.length > 0 ? (
          <select
            className="input-field"
            style={{ fontWeight: 400 }}
            value={club}
            onChange={e => setClub(e.target.value)}
          >
            <option value="">— 선택 안 함</option>
            {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        ) : (
          <input
            className="input-field"
            value={club}
            onChange={e => setClub(e.target.value)}
            placeholder="위로"
          />
        )}
      </div>
```

- [ ] **Step 2: `components/admin/AdminParticipantPanel.tsx` 수정**

`Club` import + clubs 상태 추가:
```ts
import type { Participant, Club } from '@/lib/types'
// ...
  const [clubs, setClubs] = useState<Club[]>([])
  useEffect(() => {
    fetch('/api/clubs').then(r => r.json()).then(setClubs)
  }, [eventId])
```

추가 폼의 동호회 input 교체 (addClub):
```tsx
          {clubs.length > 0 ? (
            <select
              className="input-field"
              style={{ flex: 2, fontWeight: 400 }}
              value={addClub}
              onChange={e => setAddClub(e.target.value)}
            >
              <option value="">— 선택 안 함</option>
              {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          ) : (
            <input className="input-field" style={{ flex: 2, fontWeight: 400 }} placeholder="동호회" value={addClub} onChange={e => setAddClub(e.target.value)} />
          )}
```

수정 인라인 폼의 동호회 input 교체 (editClub):
```tsx
                  {clubs.length > 0 ? (
                    <select
                      className="input-field"
                      style={{ flex: 2, fontWeight: 400, padding: '8px 10px', fontSize: 13 }}
                      value={editClub}
                      onChange={e => setEditClub(e.target.value)}
                    >
                      <option value="">— 선택 안 함</option>
                      {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  ) : (
                    <input className="input-field" style={{ flex: 2, fontWeight: 400, padding: '8px 10px', fontSize: 13 }} placeholder="동호회" value={editClub} onChange={e => setEditClub(e.target.value)} />
                  )}
```

- [ ] **Step 3: `components/admin/AssignmentPanel.tsx` 수정**

`Club` import + clubs 상태 추가:
```ts
import type { Participant, EventStatus, Club } from '@/lib/types'
// ...
  const [clubs, setClubs] = useState<Club[]>([])
  useEffect(() => {
    fetch('/api/clubs').then(r => r.json()).then(setClubs)
  }, [])
```

임시 참가자 동호회 input 교체 (tempClub):
```tsx
            {clubs.length > 0 ? (
              <select style={inputStyle} value={tempClub} onChange={e => setTempClub(e.target.value)}>
                <option value="">— 선택 안 함</option>
                {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            ) : (
              <input style={inputStyle} placeholder="동호회 (선택)" value={tempClub} onChange={e => setTempClub(e.target.value)} />
            )}
```

- [ ] **Step 4: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add components/registration/RegistrationForm.tsx components/admin/AdminParticipantPanel.tsx components/admin/AssignmentPanel.tsx
git commit -m "feat: replace club text inputs with dropdown selects"
```

---

## 자기 검토

### 스펙 커버리지

| 스펙 항목 | 구현 태스크 |
|----------|------------|
| clubs 테이블 DDL | Task 1 |
| Club 타입 | Task 1 |
| signMasterToken / verifyMasterToken | Task 2 |
| resolveEventId 헬퍼 | Task 2 |
| POST /api/admin/verify-master-pin | Task 2 |
| GET /api/clubs (공개) | Task 3 |
| POST /api/clubs (마스터) | Task 3 |
| DELETE /api/clubs/[id] (마스터) | Task 3 |
| admin/participants POST 마스터 허용 | Task 4 |
| admin/participants/[id] PATCH/DELETE 마스터 허용 | Task 4 |
| admin/pairs DELETE 마스터 허용 | Task 4 |
| admin/assign POST 마스터 허용 | Task 4 |
| events/[id] DELETE 마스터 허용 | Task 4 |
| 홈 페이지 마스터 PIN 모달 | Task 5 |
| 홈 페이지 동호회 관리 UI | Task 5 |
| 홈 페이지 마스터 토큰 저장/복원 | Task 5 |
| 어드민 페이지 마스터 토큰 fallback | Task 6 |
| handleReset에 eventId body 추가 | Task 6 |
| RegistrationForm 드롭다운 | Task 7 |
| AdminParticipantPanel 추가폼 드롭다운 | Task 7 |
| AdminParticipantPanel 수정폼 드롭다운 | Task 7 |
| AssignmentPanel tempClub 드롭다운 | Task 7 |
| 목록 비면 텍스트 input fallback | Task 7 |
