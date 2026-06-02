# 참가자 관리 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 등록 페이지에 참가자 명단을 표시하고, 어드민이 참가자를 직접 추가·수정·삭제할 수 있도록 어드민 명단 관리 탭을 전면 개편한다.

**Architecture:** 신규 어드민 전용 API 라우트(`/api/admin/participants`)를 추가해 이벤트 상태 무관 참가자 CRUD를 지원한다. 기존 `ExpectedList`와 `AttendanceTracker` 컴포넌트를 제거하고 `AdminParticipantPanel`로 대체한다. 등록 페이지는 기존 5초 폴링을 `Participant[]` 전체 배열로 확장하고 정렬·카드 렌더링을 추가한다.

**Tech Stack:** Next.js 16 App Router, Supabase (service client), CSS 변수 기반 디자인 시스템 (globals.css), TypeScript

---

## 파일 구조

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `app/api/admin/participants/route.ts` | 신규 | POST: 어드민 참가자 추가 |
| `app/api/admin/participants/[id]/route.ts` | 신규 | PATCH: 수정, DELETE: 삭제 |
| `components/admin/AdminParticipantPanel.tsx` | 신규 | 추가·수정·삭제 패널 UI |
| `app/events/[id]/admin/page.tsx` | 수정 | 탭 2개로 변경, 컴포넌트 교체 |
| `app/events/[id]/page.tsx` | 수정 | 참가자 배열 상태, 명단 카드 렌더링 |
| `components/admin/ExpectedList.tsx` | 삭제 | |
| `components/admin/AttendanceTracker.tsx` | 삭제 | |
| `app/api/admin/expected/route.ts` | 삭제 | |
| `app/api/admin/expected/[personId]/route.ts` | 삭제 | |

---

## Task 1: 어드민 참가자 API 라우트

**Files:**
- Create: `app/api/admin/participants/route.ts`
- Create: `app/api/admin/participants/[id]/route.ts`

- [ ] **Step 1: `app/api/admin/participants/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, club, rating } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  const r = Number(rating)
  if (isNaN(r) || r < 0 || r > 30) {
    return NextResponse.json({ error: 'rating must be 0–30' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .insert({
      event_id: payload.eventId,
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

- [ ] **Step 2: `app/api/admin/participants/[id]/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyAdminToken } from '@/lib/auth/admin-token'

async function authorize(req: NextRequest, participantId: string) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const payload = await verifyAdminToken(token)
  if (!payload) return null

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('participants')
    .select('id')
    .eq('id', participantId)
    .eq('event_id', payload.eventId)
    .single()

  return data ? payload : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payload = await authorize(req, id)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { club, rating } = await req.json()
  const updates: Record<string, unknown> = {}

  if (club !== undefined) updates.club = club?.trim() || null
  if (rating !== undefined) {
    const r = Number(rating)
    if (isNaN(r) || r < 0 || r > 30) {
      return NextResponse.json({ error: 'rating must be 0–30' }, { status: 400 })
    }
    updates.rating = Math.round(r * 100) / 100
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('participants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payload = await authorize(req, id)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id)

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
git add app/api/admin/participants/route.ts app/api/admin/participants/[id]/route.ts
git commit -m "feat: add admin participant CRUD API routes (POST/PATCH/DELETE)"
```

---

## Task 2: AdminParticipantPanel 컴포넌트

**Files:**
- Create: `components/admin/AdminParticipantPanel.tsx`

- [ ] **Step 1: `components/admin/AdminParticipantPanel.tsx` 작성**

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { Participant } from '@/lib/types'

interface Props { token: string; eventId: string }

export default function AdminParticipantPanel({ token, eventId }: Props) {
  const [list, setList] = useState<Participant[]>([])
  const [addName, setAddName] = useState('')
  const [addClub, setAddClub] = useState('')
  const [addRating, setAddRating] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editClub, setEditClub] = useState('')
  const [editRating, setEditRating] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch(`/api/participants?eventId=${eventId}`)
      .then(r => r.json())
      .then(setList)
  }, [eventId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    const res = await fetch('/api/admin/participants', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: addName, club: addClub, rating: parseFloat(addRating) }),
    })
    setAdding(false)
    if (!res.ok) { const d = await res.json(); setAddError(d.error); return }
    const created: Participant = await res.json()
    setList(l => [created, ...l])
    setAddName('')
    setAddClub('')
    setAddRating('')
  }

  function startEdit(p: Participant) {
    setEditingId(p.id)
    setEditClub(p.club ?? '')
    setEditRating(String(p.rating))
  }

  async function handleSave(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/participants/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ club: editClub, rating: parseFloat(editRating) }),
    })
    setSaving(false)
    if (!res.ok) return
    const updated: Participant = await res.json()
    setList(l => l.map(p => p.id === id ? updated : p))
    setEditingId(null)
  }

  async function handleDelete() {
    if (!deleteTargetId) return
    setDeleting(true)
    const res = await fetch(`/api/admin/participants/${deleteTargetId}`, {
      method: 'DELETE',
      headers,
    })
    setDeleting(false)
    if (!res.ok) return
    setList(l => l.filter(p => p.id !== deleteTargetId))
    setDeleteTargetId(null)
  }

  const deleteTarget = list.find(p => p.id === deleteTargetId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 삭제 확인 모달 */}
      {deleteTargetId && (
        <div className="modal-overlay">
          <div className="modal-panel" style={{ borderTop: '2px solid var(--accent-danger)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-danger)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
              ⚠ 참가자 삭제
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
              {deleteTarget?.name}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 20 }}>
              이 참가자를 삭제할까요?<br />배정 결과에서도 제거됩니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeleteTargetId(null)}
                disabled={deleting}
                className="btn-ghost"
                style={{ flex: 1 }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 참가자 추가 폼 */}
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input-field"
            style={{ flex: 2 }}
            placeholder="이름"
            value={addName}
            onChange={e => setAddName(e.target.value)}
            required
          />
          <input
            className="input-field"
            style={{ flex: 2, fontWeight: 400 }}
            placeholder="동호회"
            value={addClub}
            onChange={e => setAddClub(e.target.value)}
          />
          <input
            className="input-field"
            style={{ flex: 1, textAlign: 'center' }}
            placeholder="레이팅"
            type="number"
            min="0"
            max="30"
            step="0.01"
            value={addRating}
            onChange={e => setAddRating(e.target.value)}
            required
          />
        </div>
        {addError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{addError}</p>}
        <button type="submit" disabled={adding} className="btn-secondary" style={{ width: '100%' }}>
          {adding ? '추가 중...' : '+ 참가자 추가'}
        </button>
      </form>

      {/* 참가자 수 */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        참가자 <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{list.length}명</span>
      </p>

      {/* 참가자 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.map(p => (
          <div key={p.id}>
            {editingId === p.id ? (
              /* 수정 모드 */
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid rgba(0,212,255,0.4)',
                borderRadius: 6,
                padding: '12px 13px',
                boxShadow: '0 0 10px rgba(0,212,255,0.08) inset',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '1px', marginBottom: 8 }}>
                  수정 중
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {p.name}{' '}
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>(이름 잠금)</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    className="input-field"
                    style={{ flex: 2, fontWeight: 400, padding: '8px 10px', fontSize: 13 }}
                    placeholder="동호회"
                    value={editClub}
                    onChange={e => setEditClub(e.target.value)}
                  />
                  <input
                    className="input-field"
                    style={{ flex: 1, textAlign: 'center', padding: '8px 10px', fontSize: 13 }}
                    type="number"
                    min="0"
                    max="30"
                    step="0.01"
                    value={editRating}
                    onChange={e => setEditRating(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setEditingId(null)}
                    className="btn-ghost"
                    style={{ flex: 1, padding: '8px' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleSave(p.id)}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '8px',
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--neon-cyan)',
                      borderRadius: 6,
                      fontSize: 12, fontWeight: 900,
                      color: 'var(--neon-cyan)',
                      cursor: 'pointer',
                    }}
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              /* 기본 카드 */
              <div
                className="card-surface"
                style={{
                  padding: '10px 13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: editingId && editingId !== p.id ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {p.club || '—'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {p.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                    {p.rating}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => startEdit(p)}
                      disabled={!!editingId}
                      style={{
                        fontSize: 10, fontWeight: 800,
                        color: 'var(--neon-cyan)',
                        background: 'none',
                        border: '1px solid rgba(0,212,255,0.3)',
                        borderRadius: 4,
                        padding: '3px 7px',
                        cursor: 'pointer',
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(p.id)}
                      disabled={!!editingId}
                      style={{
                        fontSize: 10, fontWeight: 800,
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '3px 7px',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/admin/AdminParticipantPanel.tsx
git commit -m "feat: add AdminParticipantPanel with add/edit/delete and confirm modal"
```

---

## Task 3: 어드민 페이지 탭 교체 + 구 파일 삭제

**Files:**
- Modify: `app/events/[id]/admin/page.tsx`
- Delete: `components/admin/ExpectedList.tsx`
- Delete: `components/admin/AttendanceTracker.tsx`
- Delete: `app/api/admin/expected/route.ts`
- Delete: `app/api/admin/expected/[personId]/route.ts`

- [ ] **Step 1: `app/events/[id]/admin/page.tsx` 수정**

다음 내용으로 전체 교체:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import AdminParticipantPanel from '@/components/admin/AdminParticipantPanel'
import AssignmentPanel from '@/components/admin/AssignmentPanel'
import AssignmentAnimation from '@/components/animation/AssignmentAnimation'
import type { Participant } from '@/lib/types'

type Tab = 'participants' | 'assign'

const TABS: [Tab, string][] = [
  ['participants', '명단 관리'],
  ['assign', '마감 / 배정'],
]

export default function AdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('participants')
  const [animationPairs, setAnimationPairs] = useState<{ a: Participant; b: Participant }[] | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(`admin_token_${id}`)
    if (saved) setToken(saved)
  }, [])

  function handleTokenSet(t: string) {
    localStorage.setItem(`admin_token_${id}`, t)
    setToken(t)
  }

  function handleAnimationEnd() {
    router.push(`/events/${id}/results`)
  }

  async function handleDelete() {
    if (!token) return
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      localStorage.removeItem(`admin_token_${id}`)
      router.push('/')
    } else {
      const data = await res.json()
      setDeleteError(data.error ?? '삭제 실패')
      setDeleting(false)
    }
  }

  if (animationPairs) {
    return <AssignmentAnimation pairs={animationPairs} onEnd={handleAnimationEnd} />
  }

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px' }}>
        {!token && <AdminPinModal eventId={id} onSuccess={handleTokenSet} />}

        {/* 토너먼트 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-panel" style={{ borderTop: '2px solid var(--accent-danger)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-danger)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                ⚠ 토너먼트 삭제
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>정말 삭제할까요?</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 20 }}>
                참가자, 명단, 배정 결과 포함<br />모든 데이터가 삭제됩니다.
              </p>
              {deleteError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{deleteError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                  disabled={deleting}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger"
                  style={{ flex: 1 }}
                >
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 5 }}>
              🔒 주최자 모드
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {id.slice(0, 8)}...
            </div>
          </div>
          {token && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              토너먼트 삭제
            </button>
          )}
        </div>

        {/* 탭 (2개) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: tab === key ? 900 : 700,
                color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {token && (
          <>
            {tab === 'participants' && <AdminParticipantPanel token={token} eventId={id} />}
            {tab === 'assign' && <AssignmentPanel token={token} eventId={id} onAssignStart={setAnimationPairs} />}
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: 구 파일 삭제**

```bash
rm components/admin/ExpectedList.tsx
rm components/admin/AttendanceTracker.tsx
rm app/api/admin/expected/route.ts
rm "app/api/admin/expected/[personId]/route.ts"
```

Windows PowerShell인 경우:
```powershell
Remove-Item components/admin/ExpectedList.tsx
Remove-Item components/admin/AttendanceTracker.tsx
Remove-Item app/api/admin/expected/route.ts
Remove-Item "app/api/admin/expected/[personId]/route.ts"
```

- [ ] **Step 3: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (삭제된 파일을 참조하는 import가 없어야 함)

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: replace admin tabs with AdminParticipantPanel, remove expected participant system"
```

---

## Task 4: 등록 페이지 참가자 명단

**Files:**
- Modify: `app/events/[id]/page.tsx`

- [ ] **Step 1: `app/events/[id]/page.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import RegistrationForm from '@/components/registration/RegistrationForm'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import type { Participant } from '@/lib/types'

const PARTICIPANT_KEY = 'my_participant_id'

function LogoType() {
  return (
    <span className="text-[11px] font-black tracking-[3px] uppercase">
      <span className="logo-neon-pink">TOUR</span>
      <span className="logo-neon-green">NA</span>
      <span className="logo-neon-cyan">MENT</span>
    </span>
  )
}

function sortParticipants(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => {
    const aClub = a.club ?? ''
    const bClub = b.club ?? ''
    if (!aClub && bClub) return 1
    if (aClub && !bClub) return -1
    if (aClub !== bClub) return aClub.localeCompare(bClub, 'ko')
    if (b.rating !== a.rating) return b.rating - a.rating
    return a.name.localeCompare(b.name, 'ko')
  })
}

function ParticipantCard({ p, myId }: { p: Participant; myId: string | null }) {
  const isMe = !!myId && p.id === myId
  return (
    <div style={{
      background: isMe ? '#0d1a0d' : 'var(--bg-surface)',
      border: isMe ? '1px solid rgba(57,255,20,0.35)' : '1px solid var(--border)',
      borderRadius: 6,
      padding: '10px 13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: isMe ? '0 0 10px rgba(57,255,20,0.07) inset' : 'none',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
          {p.club || '—'}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 800,
          color: isMe ? '#39ff14' : 'var(--text-primary)',
          textShadow: isMe ? '0 0 6px rgba(57,255,20,0.5)' : 'none',
        }}>
          {p.name}{isMe && ' ← 나'}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        {p.rating}
      </span>
    </div>
  )
}

function ParticipantList({ participants, myId, onRefresh }: {
  participants: Participant[]
  myId: string | null
  onRefresh: () => void
}) {
  const sorted = sortParticipants(participants)
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
          현재 등록:{' '}
          <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{participants.length}명</span>
        </span>
        <button
          onClick={onRefresh}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        >
          🔄 새로고침
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(p => (
          <ParticipantCard key={p.id} p={p} myId={myId} />
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const event = useRealtimeEvent(id)
  const [registered, setRegistered] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async () => {
    const res = await fetch(`/api/participants?eventId=${id}`).catch(() => null)
    if (res?.ok) setParticipants(await res.json())
  }

  useEffect(() => {
    setMyId(localStorage.getItem(PARTICIPANT_KEY))
  }, [])

  useEffect(() => {
    if (event?.status === 'closed' && registered) {
      const pid = localStorage.getItem(PARTICIPANT_KEY)
      router.push(`/events/${id}/results${pid ? `?p=${pid}` : ''}`)
    }
  }, [event?.status, registered, id, router])

  useEffect(() => {
    if (!id) return
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id])

  function handleSuccess(participant: Participant) {
    localStorage.setItem(PARTICIPANT_KEY, participant.id)
    setMyId(participant.id)
    setRegistered(true)
    setParticipants(prev => [...prev, participant])
  }

  function startPress() {
    pressTimer.current = setTimeout(() => router.push(`/events/${id}/admin`), 3000)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  if (!event) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>불러오는 중...</span>
    </div>
  )

  if (event.status === 'closed' && !registered) {
    return (
      <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 384, width: '100%', padding: '24px', textAlign: 'center' }}>
          <LogoType />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0 8px', letterSpacing: '-0.5px' }}>{event.name}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>참가 신청이 마감되었습니다.</p>
          <button className="btn-cta" onClick={() => router.push(`/events/${id}/results`)}>
            결과 보기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 384, margin: '0 auto', padding: '24px' }}>
        <div
          style={{ textAlign: 'center', marginBottom: 30, cursor: 'pointer', userSelect: 'none' }}
          onMouseDown={startPress} onMouseUp={endPress}
          onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress}
        >
          <div style={{ marginBottom: 10 }}><LogoType /></div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 5 }}>
            {event.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>참가 신청</div>
        </div>

        {registered ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--accent-success)' }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>등록 완료!</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6 }}>
              주최자가 배정을 시작하면<br />자동으로 결과가 표시됩니다.
            </p>
            <ParticipantList participants={participants} myId={myId} onRefresh={load} />
          </div>
        ) : (
          <>
            <RegistrationForm eventId={id} onSuccess={handleSuccess} />
            <ParticipantList participants={participants} myId={myId} onRefresh={load} />
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/events/[id]/page.tsx
git commit -m "feat: show participant list with sort and highlight on registration page"
```

---

## 자기 검토

### 스펙 커버리지

| 스펙 항목 | 구현 태스크 |
|----------|------------|
| POST /api/admin/participants | Task 1 |
| PATCH /api/admin/participants/[id] | Task 1 |
| DELETE /api/admin/participants/[id] | Task 1 |
| AdminParticipantPanel 추가 폼 | Task 2 |
| 수정 인라인 모드 (이름 잠금) | Task 2 |
| 수정 중 나머지 카드 opacity 0.4 | Task 2 |
| 삭제 확인 모달 (레드 상단 보더) | Task 2 |
| 어드민 탭 2개로 변경 | Task 3 |
| ExpectedList/AttendanceTracker 제거 | Task 3 |
| expected API 파일 삭제 | Task 3 |
| 등록 페이지 Participant[] 배열 상태 | Task 4 |
| 카드 레이아웃 (동호회↑/이름↓/레이팅) | Task 4 |
| 정렬 (동호회→레이팅↓→이름) | Task 4 |
| 🔄 새로고침 버튼 | Task 4 |
| 내 항목 그린 하이라이트 | Task 4 |
