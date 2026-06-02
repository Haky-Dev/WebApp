# UX 개선 그룹 A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 이벤트 페이지에 홈 뒤로 가기 버튼 추가, 배정 결과 리셋 기능 추가, 결과 카드에 동호회 표시.

**Architecture:** 리셋은 새 `DELETE /api/admin/pairs` 엔드포인트로 처리. `AssignmentPanel`이 이벤트 상태(`eventStatus`)와 리셋 콜백(`onReset`)을 `admin/page.tsx`에서 props로 받아 리셋 UI를 렌더링. 뒤로 가기 버튼은 3개 페이지에 각각 `← 홈` 텍스트 버튼으로 추가.

**Tech Stack:** Next.js 16 App Router, Supabase service client, CSS 변수 기반 디자인 시스템

---

## 파일 구조

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `app/api/admin/pairs/route.ts` | 신규 | DELETE: pairs 삭제 + 이벤트 상태 'collecting' 복구 |
| `components/results/AllResultsTab.tsx` | 수정 | 카드에 동호회 표시 추가 |
| `app/events/[id]/page.tsx` | 수정 | ← 홈 버튼 추가 |
| `app/events/[id]/results/page.tsx` | 수정 | ← 홈 버튼 추가 |
| `app/events/[id]/admin/page.tsx` | 수정 | ← 홈 버튼, 이벤트 상태 로드, onReset 콜백 |
| `components/admin/AssignmentPanel.tsx` | 수정 | eventStatus prop + 리셋 버튼/모달 추가 |

---

## Task 1: DELETE /api/admin/pairs 엔드포인트

**Files:**
- Create: `app/api/admin/pairs/route.ts`

- [ ] **Step 1: 파일 작성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { error: pairsError } = await supabase
    .from('pairs')
    .delete()
    .eq('event_id', payload.eventId)

  if (pairsError) return NextResponse.json({ error: pairsError.message }, { status: 500 })

  const { error: statusError } = await supabase
    .from('events')
    .update({ status: 'collecting' })
    .eq('id', payload.eventId)

  if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/api/admin/pairs/route.ts
git commit -m "feat: add DELETE /api/admin/pairs to reset assignment results"
```

---

## Task 2: 결과 카드에 동호회 표시

**Files:**
- Modify: `components/results/AllResultsTab.tsx`

- [ ] **Step 1: 카드 내 이름 표시 부분 수정**

`components/results/AllResultsTab.tsx`의 52~58번째 줄 현재:

```tsx
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {pair.participant_a?.name} × {pair.participant_b?.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {pair.participant_a?.rating} · {pair.participant_b?.rating}
                </span>
              </div>
```

다음으로 교체:

```tsx
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {pair.participant_a?.name}
                  {pair.participant_a?.club && (
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}> ({pair.participant_a.club})</span>
                  )}
                  {' × '}
                  {pair.participant_b?.name}
                  {pair.participant_b?.club && (
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}> ({pair.participant_b.club})</span>
                  )}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {pair.participant_a?.rating} · {pair.participant_b?.rating}
                </span>
              </div>
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/results/AllResultsTab.tsx
git commit -m "feat: show club names in result pair cards"
```

---

## Task 3: 뒤로 가기 버튼 (3개 페이지)

**Files:**
- Modify: `app/events/[id]/page.tsx`
- Modify: `app/events/[id]/results/page.tsx`
- Modify: `app/events/[id]/admin/page.tsx`

뒤로 가기 버튼 공통 스타일:
```tsx
<button
  onClick={() => router.push('/')}
  style={{
    background: 'none',
    border: 'none',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
    marginBottom: 8,
    display: 'block',
  }}
>
  ← 홈
</button>
```

- [ ] **Step 1: 등록 페이지 (`app/events/[id]/page.tsx`) — ← 홈 버튼 추가**

로고타입 long-press 영역 바깥, 페이지 최상단에 추가. 현재 `return` 본문에서 `<main>` 안의 첫 `<div>` 시작 부분:

```tsx
      <div style={{ maxWidth: 384, margin: '0 auto', padding: '24px' }}>
        <div
          style={{ textAlign: 'center', marginBottom: 30, cursor: 'pointer', userSelect: 'none' }}
```

를 다음으로 교체:

```tsx
      <div style={{ maxWidth: 384, margin: '0 auto', padding: '24px' }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
        >
          ← 홈
        </button>
        <div
          style={{ textAlign: 'center', marginBottom: 30, cursor: 'pointer', userSelect: 'none' }}
```

단, `event.status === 'closed' && !registered` 화면(마감 상태)의 return 블록에도 동일하게 추가:

```tsx
        <div style={{ maxWidth: 384, width: '100%', padding: '24px', textAlign: 'center' }}>
```

를:

```tsx
        <div style={{ maxWidth: 384, width: '100%', padding: '24px' }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
          >
            ← 홈
          </button>
          <div style={{ textAlign: 'center' }}>
```

로 교체하고, 닫는 `</div>` 하나 추가.

- [ ] **Step 2: 결과 페이지 (`app/events/[id]/results/page.tsx`) — ← 홈 버튼 추가**

현재 헤더 영역:

```tsx
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
            배정 결과
          </div>
          <LogoType />
        </div>
```

를 다음으로 교체:

```tsx
        <div style={{ marginBottom: 22 }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
          >
            ← 홈
          </button>
          <div style={{ fontSize: 11, letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
            배정 결과
          </div>
          <LogoType />
        </div>
```

- [ ] **Step 3: 어드민 페이지 (`app/events/[id]/admin/page.tsx`) — ← 홈 버튼 추가**

현재 헤더 영역:

```tsx
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 5 }}>
              🔒 주최자 모드
            </div>
```

를 다음으로 교체:

```tsx
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <button
              onClick={() => router.push('/')}
              style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
            >
              ← 홈
            </button>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 5 }}>
              🔒 주최자 모드
            </div>
```

- [ ] **Step 4: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add app/events/[id]/page.tsx app/events/[id]/results/page.tsx app/events/[id]/admin/page.tsx
git commit -m "feat: add home back button to all event pages"
```

---

## Task 4: 리셋 버튼 — admin/page.tsx + AssignmentPanel

**Files:**
- Modify: `app/events/[id]/admin/page.tsx`
- Modify: `components/admin/AssignmentPanel.tsx`

### 4-A: `app/events/[id]/admin/page.tsx` 수정

- [ ] **Step 1: eventStatus 상태 + 이벤트 fetch 추가**

기존 import에 `EventStatus` 타입 추가:

```tsx
import type { Participant, EventStatus } from '@/lib/types'
```

기존 state 선언들 아래에 추가:

```tsx
  const [eventStatus, setEventStatus] = useState<EventStatus>('collecting')
```

기존 `useEffect(() => { const saved = localStorage... }, [])` 아래에 추가:

```tsx
  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then(r => r.json())
      .then(data => { if (data.status) setEventStatus(data.status) })
  }, [id])
```

- [ ] **Step 2: onReset 콜백 추가**

`handleDelete` 함수 아래에 추가:

```tsx
  async function handleReset() {
    if (!token) return
    const res = await fetch('/api/admin/pairs', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setEventStatus('collecting')
      setTab('participants')
    }
  }
```

- [ ] **Step 3: AssignmentPanel에 props 전달**

기존:

```tsx
            {tab === 'assign' && <AssignmentPanel token={token} eventId={id} onAssignStart={setAnimationPairs} />}
```

를:

```tsx
            {tab === 'assign' && (
              <AssignmentPanel
                token={token}
                eventId={id}
                eventStatus={eventStatus}
                onAssignStart={(pairs) => { setEventStatus('closed'); setAnimationPairs(pairs) }}
                onReset={handleReset}
              />
            )}
```

로 교체.

> 참고: `onAssignStart`에서 `setEventStatus('closed')`를 호출해 배정 후 즉시 상태를 업데이트.

### 4-B: `components/admin/AssignmentPanel.tsx` 수정

- [ ] **Step 4: Props 인터페이스 확장**

기존:

```tsx
interface Props {
  token: string
  eventId: string
  onAssignStart: (pairs: { a: Participant; b: Participant }[]) => void
}
```

를:

```tsx
import type { EventStatus } from '@/lib/types'

interface Props {
  token: string
  eventId: string
  eventStatus: EventStatus
  onAssignStart: (pairs: { a: Participant; b: Participant }[]) => void
  onReset: () => void
}
```

로 교체. 함수 시그니처도:

```tsx
export default function AssignmentPanel({ token, eventId, eventStatus, onAssignStart, onReset }: Props) {
```

- [ ] **Step 5: 리셋 상태 추가**

기존 `const [error, setError] = useState('')` 아래에:

```tsx
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
```

- [ ] **Step 6: handleResetConfirm 함수 추가**

`handleAssign` 함수 아래에:

```tsx
  async function handleResetConfirm() {
    setResetting(true)
    await onReset()
    setResetting(false)
    setShowResetConfirm(false)
  }
```

- [ ] **Step 7: 리셋 모달 + 버튼 추가**

`return (` 바로 아래의 `<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>` 내부 맨 앞에 모달 추가:

```tsx
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* 리셋 확인 모달 */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-panel" style={{ borderTop: '2px solid var(--accent-danger)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-danger)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
              ⚠ 배정 초기화
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
              배정을 초기화할까요?
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 20 }}>
              배정 결과가 삭제되고 다시 배정할 수 있습니다.<br />참가자는 유지됩니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="btn-ghost"
                style={{ flex: 1 }}
              >
                취소
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {resetting ? '초기화 중...' : '초기화'}
              </button>
            </div>
          </div>
        </div>
      )}
```

기존 CTA 버튼 (`btn-cta`) 아래에 리셋 버튼 추가:

```tsx
      {eventStatus === 'closed' && (
        <button
          onClick={() => setShowResetConfirm(true)}
          style={{
            background: 'none',
            border: '1px solid var(--accent-danger)',
            borderRadius: 6,
            padding: '10px',
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--accent-danger)',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          배정 초기화
        </button>
      )}
```

- [ ] **Step 8: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 9: 커밋**

```bash
git add app/events/[id]/admin/page.tsx components/admin/AssignmentPanel.tsx
git commit -m "feat: add assignment reset button with confirmation modal"
```

---

## 자기 검토

### 스펙 커버리지

| 스펙 항목 | 구현 태스크 |
|----------|------------|
| DELETE /api/admin/pairs | Task 1 |
| 등록 페이지 ← 홈 | Task 3 Step 1 |
| 결과 페이지 ← 홈 | Task 3 Step 2 |
| 어드민 페이지 ← 홈 | Task 3 Step 3 |
| AllResultsTab 동호회 표시 | Task 2 |
| admin/page.tsx 이벤트 상태 로드 | Task 4 Step 1 |
| onReset 콜백 | Task 4 Step 2 |
| AssignmentPanel eventStatus prop | Task 4 Step 4 |
| 리셋 확인 모달 | Task 4 Step 7 |
| closed 상태에서만 리셋 버튼 노출 | Task 4 Step 7 |
| 리셋 성공 후 명단 관리 탭으로 이동 | Task 4 Step 3 (onReset → setTab) |
