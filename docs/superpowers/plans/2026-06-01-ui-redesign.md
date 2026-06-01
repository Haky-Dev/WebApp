# UI/UX 전면 리디자인 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전체 앱에 다크(맥스 글로우 네온 그래피티) + 라이트(클린 인디고 볼드) 이중 테마를 적용한다.

**Architecture:** `globals.css`에 CSS 변수 두 세트(`[data-theme="dark"]` / `:root`)를 정의하고, `<html data-theme="...">` 속성 하나로 전체 색상이 전환된다. 복잡한 글로우·스캔라인 효과는 `globals.css`의 재사용 CSS 클래스로 분리하고, 컴포넌트는 해당 클래스와 CSS 변수 기반 인라인 스타일을 사용한다.

**Tech Stack:** Next.js 16, Tailwind CSS v4 (`@import "tailwindcss"`), CSS 변수, `localStorage` 기반 테마 저장

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `app/globals.css` | CSS 변수 2세트 + `.btn-cta`, `.btn-secondary`, `.card-surface`, `.page-scanline`, `.neon-text-green` 등 재사용 클래스 |
| `app/layout.tsx` | `<html data-theme>` 초기값 주입 스크립트 (깜빡임 방지) |
| `app/page.tsx` | 홈 페이지 + 테마 토글 버튼 |
| `app/events/[id]/page.tsx` | 참가 등록 페이지 |
| `app/events/[id]/admin/page.tsx` | 어드민 페이지 쉘 (탭 + 헤더) |
| `app/events/[id]/results/page.tsx` | 결과 페이지 |
| `components/admin/AdminPinModal.tsx` | PIN 인증 모달 |
| `components/admin/ExpectedList.tsx` | 명단 관리 패널 |
| `components/admin/AttendanceTracker.tsx` | 참가 확인 패널 |
| `components/admin/AssignmentPanel.tsx` | 마감·배정 패널 |
| `components/animation/AssignmentAnimation.tsx` | 배정 애니메이션 (드럼롤 + 피날레) |
| `components/results/MyPartnerTab.tsx` | 내 파트너 탭 |
| `components/results/AllResultsTab.tsx` | 전체 결과 탭 |

---

## Task 1: CSS 변수 기반 + 재사용 클래스 (globals.css + layout.tsx)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: `app/globals.css` 전체 교체**

```css
@import "tailwindcss";

/* ─── 라이트 모드 (기본값) ───────────────────────── */
:root {
  --bg-base:        #ffffff;
  --bg-surface:     #f8fafc;
  --bg-elevated:    #f1f5f9;
  --text-primary:   #0a0a0a;
  --text-muted:     #64748b;
  --border:         #e2e8f0;

  --accent:         #4338ca;
  --accent-bg:      #eef2ff;
  --accent-success: #16a34a;
  --accent-danger:  #e11d48;

  --cta-bg:         #0a0a0a;
  --cta-border:     transparent;
  --cta-text:       #ffffff;

  --neon-pink:      #d81b60;
  --neon-green:     #16a34a;
  --neon-cyan:      #0288d1;

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* ─── 다크 모드 ──────────────────────────────────── */
[data-theme="dark"] {
  --bg-base:        #010101;
  --bg-surface:     #0d0d0d;
  --bg-elevated:    #1a1a1a;
  --text-primary:   #f1f5f9;
  --text-muted:     #64748b;
  --border:         #1e1e1e;

  --accent:         #39ff14;
  --accent-bg:      rgba(57, 255, 20, 0.08);
  --accent-success: #39ff14;
  --accent-danger:  #e11d48;

  --cta-bg:         #111111;
  --cta-border:     #39ff14;
  --cta-text:       #39ff14;

  --neon-pink:      #ff2d78;
  --neon-green:     #39ff14;
  --neon-cyan:      #00d4ff;
}

/* ─── 공통 베이스 ────────────────────────────────── */
body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
  transition: background 0.2s, color 0.2s;
}

/* ─── 재사용 클래스 ──────────────────────────────── */

/* 스캔라인 텍스처 (다크 전용 - data-theme="dark"일 때만 표시) */
.page-scanline::before {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.18) 3px,
    rgba(0, 0, 0, 0.18) 4px
  );
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
[data-theme="dark"] .page-scanline::before {
  opacity: 0.3;
}

/* CTA 버튼 */
.btn-cta {
  width: 100%;
  background: var(--cta-bg);
  border: 1.5px solid var(--cta-border);
  color: var(--cta-text);
  border-radius: 6px;
  padding: 13px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 1px;
  text-align: center;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-cta:disabled { opacity: 0.4; cursor: not-allowed; }
[data-theme="dark"] .btn-cta {
  text-shadow: 0 0 10px rgba(57, 255, 20, 0.7);
  box-shadow: 0 0 16px rgba(57, 255, 20, 0.22), 0 0 6px rgba(57, 255, 20, 0.12) inset;
}
[data-theme="light"] .btn-cta,
:root:not([data-theme]) .btn-cta {
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
}

/* 보조 버튼 */
.btn-secondary {
  background: var(--accent-bg);
  border: 1.5px solid var(--accent);
  color: var(--accent);
  border-radius: 6px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
[data-theme="dark"] .btn-secondary {
  text-shadow: 0 0 8px rgba(57, 255, 20, 0.5);
  box-shadow: 0 0 10px rgba(57, 255, 20, 0.15);
}

/* 고스트 버튼 (취소 등) */
.btn-ghost {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 6px;
  padding: 11px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

/* 위험 버튼 */
.btn-danger {
  background: var(--accent-danger);
  border: none;
  color: #ffffff;
  border-radius: 6px;
  padding: 11px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}
[data-theme="dark"] .btn-danger {
  box-shadow: 0 0 14px rgba(225, 29, 72, 0.35);
}

/* 카드 서피스 */
.card-surface {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}
[data-theme="light"] .card-surface,
:root:not([data-theme]) .card-surface {
  border-width: 1.5px;
}

/* 모달 오버레이 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

/* 모달 패널 */
.modal-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 22px;
  width: 100%;
  max-width: 360px;
  margin: 0 16px;
}

/* 탭 활성 스타일 */
.tab-active {
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
}
[data-theme="dark"] .tab-active {
  text-shadow: 0 0 8px rgba(57, 255, 20, 0.6);
}
[data-theme="light"] .tab-active,
:root:not([data-theme]) .tab-active {
  color: #0a0a0a;
  border-bottom-width: 2.5px;
}

/* 인풋 필드 */
.input-field {
  width: 100%;
  background: var(--bg-surface);
  border: 1.5px solid var(--border);
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}
.input-field:focus {
  border-color: var(--accent);
}
[data-theme="dark"] .input-field:focus {
  background: rgba(57, 255, 20, 0.03);
  box-shadow: 0 0 8px rgba(57, 255, 20, 0.08) inset;
}

/* 라벨 */
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 7px;
}
[data-theme="dark"] .field-label {
  text-shadow: 0 0 6px rgba(57, 255, 20, 0.4);
}

/* 네온 로고타입 텍스트 (다크 전용) */
.logo-neon-pink  { color: var(--neon-pink); }
.logo-neon-green { color: var(--neon-green); }
.logo-neon-cyan  { color: var(--neon-cyan); }
[data-theme="dark"] .logo-neon-pink  { text-shadow: 0 0 10px var(--neon-pink),  0 0 20px rgba(255, 45, 120, 0.4); }
[data-theme="dark"] .logo-neon-green { text-shadow: 0 0 10px var(--neon-green), 0 0 20px rgba(57, 255, 20, 0.4); }
[data-theme="dark"] .logo-neon-cyan  { text-shadow: 0 0 10px var(--neon-cyan),  0 0 20px rgba(0, 212, 255, 0.4); }

/* 상태 배지 */
.badge-collecting {
  color: var(--neon-pink);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}
[data-theme="dark"] .badge-collecting {
  text-shadow: 0 0 8px rgba(255, 45, 120, 0.8);
}
[data-theme="light"] .badge-collecting,
:root:not([data-theme]) .badge-collecting {
  color: var(--accent);
}

.badge-closed {
  color: var(--neon-green);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
}
[data-theme="dark"] .badge-closed {
  text-shadow: 0 0 8px rgba(57, 255, 20, 0.8);
}
[data-theme="light"] .badge-closed,
:root:not([data-theme]) .badge-closed {
  color: var(--accent-success);
}

/* 슬라이드업 애니메이션 (피날레) */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: `app/layout.tsx` 수정 — 테마 초기 주입 + 메타데이터**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tournament Draft",
  description: "토너먼트 파트너 배정 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* 깜빡임 방지: hydration 전에 테마 속성 적용 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);})();`,
        }}
      />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 개발 서버 실행 후 시각 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 열기. body 배경이 흰색(라이트)인지 확인.  
DevTools > Elements에서 `<html>` 속성에 `data-theme="light"` 또는 `"dark"` 붙었는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: CSS variable theme system (dark neon + light indigo)"
```

---

## Task 2: 홈 페이지 (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: `app/page.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminPinModal from '@/components/admin/AdminPinModal'
import type { TournamentEvent } from '@/lib/types'

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
    <button
      onClick={toggle}
      style={{ fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
      aria-label="테마 전환"
    >
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
  const [error, setError] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminTarget, setAdminTarget] = useState<string | null>(null)
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

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
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    const event = await res.json()
    router.push(`/events/${event.id}`)
  }

  function handleAdminSuccess(token: string) {
    if (!adminTarget) return
    localStorage.setItem(`admin_token_${adminTarget}`, token)
    router.push(`/events/${adminTarget}/admin`)
  }

  function startPress() {
    const t = setTimeout(() => setIsAdminMode(m => !m), 3000)
    setPressTimer(t)
  }
  function endPress() {
    if (pressTimer) clearTimeout(pressTimer)
  }

  return (
    <main
      className="page-scanline relative"
      style={{ minHeight: '100vh', background: 'var(--bg-base)' }}
    >
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 24px' }}>
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
              onTouchStart={startPress} onTouchEnd={endPress}
            >
              <LogoType />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1.05 }}>
              드래프트<br />매니저{isAdminMode && ' 🔒'}
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* 관리자 토너먼트 생성 폼 */}
        {isAdminMode && (
          <div style={{
            marginBottom: 28,
            padding: 20,
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--accent)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', marginBottom: 16, textTransform: 'uppercase' }}>
              🔒 새 토너먼트 만들기
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="field-label">토너먼트 이름</label>
                <input
                  className="input-field"
                  placeholder="예: 봄 클럽 드래프트"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label">관리자 PIN (4자리 이상)</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  required
                  minLength={4}
                />
              </div>
              {error && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{error}</p>}
              <button type="submit" disabled={creating} className="btn-cta">
                {creating ? '생성 중...' : '+ 토너먼트 만들기'}
              </button>
            </form>
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
            <div
              key={ev.id}
              style={{ display: 'flex', gap: 8 }}
            >
              <button
                onClick={() => router.push(`/events/${ev.id}`)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${borderColor(ev.status)}`,
                  borderRadius: 6,
                  padding: '13px 14px',
                  cursor: 'pointer',
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
              {isAdminMode && (
                <button
                  onClick={() => setAdminTarget(ev.id)}
                  style={{
                    padding: '0 14px',
                    background: 'var(--accent-bg)',
                    border: '1.5px solid var(--accent)',
                    borderRadius: 6,
                    color: 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
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

- [ ] **Step 2: 브라우저 시각 확인**

`http://localhost:3000`에서:
- 우상단 🌑/☀️ 토글 버튼 클릭 → 테마 전환 확인
- 토너먼트 목록 카드에 왼쪽 컬러 보더 확인
- 로고타입 다크 모드에서 핑크/그린/사이언 글로우 확인
- 스캔라인 텍스처(다크) 확인

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx
git commit -m "feat: redesign home page with theme toggle and neon card list"
```

---

## Task 3: 참가 등록 페이지 (`app/events/[id]/page.tsx`)

**Files:**
- Modify: `app/events/[id]/page.tsx`
- Modify: `components/registration/RegistrationForm.tsx`

- [ ] **Step 1: `components/registration/RegistrationForm.tsx` 확인 후 스타일 업데이트**

현재 파일을 읽고, 인풋/버튼 클래스를 새 스타일로 교체한다.

```bash
cat components/registration/RegistrationForm.tsx
```

파일 내용에서 `className="w-full border rounded px-3 py-2"` → `className="input-field"` 로,  
`className="w-full bg-blue-600 text-white py-2 rounded ..."` → `className="btn-cta"` 로 교체.

- [ ] **Step 2: `app/events/[id]/page.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useState } from 'react'
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

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const event = useRealtimeEvent(id)
  const [registered, setRegistered] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (event?.status === 'closed' && registered) {
      const pid = localStorage.getItem(PARTICIPANT_KEY)
      router.push(`/events/${id}/results${pid ? `?p=${pid}` : ''}`)
    }
  }, [event?.status, registered, id, router])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const res = await fetch(`/api/participants?eventId=${id}`).catch(() => null)
      if (res?.ok) { const data = await res.json(); setParticipantCount(data.length ?? 0) }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id])

  function handleSuccess(participant: Participant) {
    localStorage.setItem(PARTICIPANT_KEY, participant.id)
    setRegistered(true)
    setParticipantCount(c => c + 1)
  }

  function startPress() {
    const t = setTimeout(() => router.push(`/events/${id}/admin`), 3000)
    setPressTimer(t)
  }
  function endPress() { if (pressTimer) clearTimeout(pressTimer) }

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
        {/* 로고 + 이벤트명 */}
        <div
          style={{ textAlign: 'center', marginBottom: 30, cursor: 'pointer', userSelect: 'none' }}
          onMouseDown={startPress} onMouseUp={endPress}
          onTouchStart={startPress} onTouchEnd={endPress}
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
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 16 }}>
              주최자가 배정을 시작하면<br />자동으로 결과가 표시됩니다.
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              현재 등록:{' '}
              <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{participantCount}명</span>
            </p>
          </div>
        ) : (
          <>
            <RegistrationForm eventId={id} onSuccess={handleSuccess} />
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginTop: 16 }}>
              현재 등록:{' '}
              <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{participantCount}명</span>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: `components/registration/RegistrationForm.tsx` 스타일 교체**

파일을 읽어 모든 입력 필드와 버튼의 Tailwind 색상 클래스를 CSS 클래스로 교체:
- `className="w-full border rounded px-3 py-2"` → `className="input-field"`
- `className="... bg-blue-600 text-white ..."` 버튼 → `className="btn-cta"`
- 라벨 `className="text-sm ..."` → `className="field-label"`

- [ ] **Step 4: 시각 확인**

`http://localhost:3000/events/[실제 이벤트 id]`에서:
- 인풋 포커스 시 accent 색 테두리 확인
- 다크/라이트 모드 양쪽에서 레이아웃 깨짐 없음 확인

- [ ] **Step 5: 커밋**

```bash
git add app/events/[id]/page.tsx components/registration/RegistrationForm.tsx
git commit -m "feat: redesign registration page with CSS variable styles"
```

---

## Task 4: AdminPinModal

**Files:**
- Modify: `components/admin/AdminPinModal.tsx`

- [ ] **Step 1: `components/admin/AdminPinModal.tsx` 전체 교체**

```tsx
'use client'
import { useState } from 'react'

interface Props {
  eventId: string
  onSuccess: (token: string) => void
  onCancel?: () => void
}

export default function AdminPinModal({ eventId, onSuccess, onCancel }: Props) {
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
    <div className="modal-overlay">
      <form onSubmit={handleSubmit} className="modal-panel" style={{ borderTop: '2px solid var(--neon-green)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
          🔒 주최자 인증
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 18 }}>
          PIN 번호를 입력하세요
        </div>
        <label className="field-label">PIN</label>
        <input
          type="password"
          className="input-field"
          style={{ marginBottom: 12, letterSpacing: '6px' }}
          placeholder="••••"
          value={pin}
          onChange={e => setPin(e.target.value)}
          autoFocus
        />
        {error && (
          <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</p>
        )}
        <button type="submit" disabled={loading} className="btn-cta" style={{ marginBottom: onCancel ? 10 : 0 }}>
          {loading ? '확인 중...' : '확인'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost" style={{ width: '100%' }}>
            취소
          </button>
        )}
      </form>
    </div>
  )
}
```

- [ ] **Step 2: 시각 확인**

어드민 페이지 접근 시 모달 등장 확인. 다크 모드에서 그린 상단 보더 글로우 확인.

- [ ] **Step 3: 커밋**

```bash
git add components/admin/AdminPinModal.tsx
git commit -m "feat: redesign AdminPinModal with green top border and CSS vars"
```

---

## Task 5: 어드민 페이지 쉘 + ExpectedList

**Files:**
- Modify: `app/events/[id]/admin/page.tsx`
- Modify: `components/admin/ExpectedList.tsx`

- [ ] **Step 1: `app/events/[id]/admin/page.tsx` 전체 교체**

```tsx
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

const TABS: [Tab, string][] = [
  ['expected', '명단 관리'],
  ['attendance', '참가 확인'],
  ['assign', '마감 / 배정'],
]

export default function AdminPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('expected')
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

        {/* 삭제 확인 모달 */}
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

        {/* 탭 */}
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
              className={tab === key ? 'tab-active' : ''}
            >
              {label}
            </button>
          ))}
        </div>

        {token && (
          <>
            {tab === 'expected' && <ExpectedList token={token} eventId={id} />}
            {tab === 'attendance' && <AttendanceTracker token={token} eventId={id} />}
            {tab === 'assign' && <AssignmentPanel token={token} eventId={id} onAssignStart={setAnimationPairs} />}
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: `components/admin/ExpectedList.tsx` 전체 교체**

```tsx
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
    const res = await fetch('/api/admin/expected', { method: 'POST', headers, body: JSON.stringify({ name }) })
    if (res.ok) { const item = await res.json(); setList(l => [...l, item]); setName('') }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/expected/${id}`, { method: 'DELETE', headers })
    setList(l => l.filter(p => p.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={add} style={{ display: 'flex', gap: 8 }}>
        <input
          className="input-field"
          style={{ flex: 1 }}
          placeholder="예상 참가자 이름"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit" className="btn-secondary">추가</button>
      </form>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
        {list.length}명 등록됨
      </p>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {list.map(p => (
          <li
            key={p.id}
            className="card-surface"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px' }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</span>
            <button
              onClick={() => remove(p.id)}
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: 시각 확인**

어드민 페이지에서 탭 전환, 명단 추가/삭제, 삭제 확인 모달 동작 확인.

- [ ] **Step 4: 커밋**

```bash
git add app/events/[id]/admin/page.tsx components/admin/ExpectedList.tsx
git commit -m "feat: redesign admin page shell and ExpectedList"
```

---

## Task 6: AttendanceTracker + AssignmentPanel

**Files:**
- Modify: `components/admin/AttendanceTracker.tsx`
- Modify: `components/admin/AssignmentPanel.tsx`

- [ ] **Step 1: `components/admin/AttendanceTracker.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ExpectedParticipant, Participant } from '@/lib/types'

interface Props { token: string; eventId: string }

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        등록{' '}
        <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{registered.length}명</span>
        {' / '}미등록{' '}
        <span style={{ color: 'var(--accent-danger)', fontWeight: 900 }}>{missing.length}명</span>
      </p>

      {done.length > 0 && (
        <Section label="✓ 등록 완료" color="var(--accent-success)">
          {done.map(p => {
            const reg = registered.find(r => r.name === p.name)
            return (
              <div key={p.id} className="card-surface" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderLeft: '3px solid var(--accent-success)' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{reg?.rating.toFixed(2)}</span>
              </div>
            )
          })}
        </Section>
      )}

      {missing.length > 0 && (
        <Section label="✗ 미등록" color="var(--accent-danger)">
          {missing.map(p => (
            <div key={p.id} className="card-surface" style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-danger)' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</span>
            </div>
          ))}
        </Section>
      )}

      {extra.length > 0 && (
        <Section label="＋ 명단 외 등록" color="var(--neon-cyan)">
          {extra.map(p => (
            <div key={p.id} className="card-surface" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderLeft: '3px solid var(--neon-cyan)' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}{p.club ? ` (${p.club})` : ''}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{p.rating.toFixed(2)}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `components/admin/AssignmentPanel.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { Participant } from '@/lib/types'

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
    fetch(`/api/participants?eventId=${eventId}`).then(r => r.json()).then(setParticipants)
  }, [eventId])

  const isOdd = participants.length % 2 !== 0

  async function handleAssign() {
    setError('')
    setLoading(true)
    const body: Record<string, unknown> = { algorithm, groupCount }
    if (excludeId) body.excludeId = excludeId
    if (tempName) body.tempParticipant = { name: tempName, club: tempClub || null, rating: parseFloat(tempRating) }

    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    const pairsRes = await fetch(`/api/pairs/${eventId}`)
    const pairsData = await pairsRes.json()
    onAssignStart(pairsData.map((p: { participant_a: Participant; participant_b: Participant }) => ({
      a: p.participant_a,
      b: p.participant_b,
    })))
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'var(--bg-surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 6, padding: '10px 12px',
    fontSize: 14, fontWeight: 700,
    color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        참가자 <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{participants.length}명</span>
      </p>

      {isOdd && (
        <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1.5px solid var(--accent-danger)', borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-danger)', marginBottom: 14 }}>⚠ 홀수 인원 — 조정 필요</p>
          <div style={{ marginBottom: 12 }}>
            <label className="field-label" style={{ color: 'var(--text-muted)' }}>제외할 참가자 선택</label>
            <select
              style={{ ...inputStyle }}
              value={excludeId}
              onChange={e => setExcludeId(e.target.value)}
            >
              <option value="">-- 선택 --</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.rating})</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>또는 임시 참가자 추가</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={inputStyle} placeholder="이름"
              value={tempName} onChange={e => { setTempName(e.target.value); setExcludeId('') }} />
            <input style={inputStyle} placeholder="동호회 (선택)"
              value={tempClub} onChange={e => setTempClub(e.target.value)} />
            <input style={inputStyle} placeholder="레이팅" type="number" min="0" max="30" step="0.01"
              value={tempRating} onChange={e => setTempRating(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>배정 방식</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(['snake', 'group-random'] as const).map(alg => (
            <label key={alg} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="radio" checked={algorithm === alg} onChange={() => setAlgorithm(alg)} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {alg === 'snake' ? '스네이크 드래프트' : '그룹 랜덤'}
              </span>
            </label>
          ))}
        </div>
        {algorithm === 'group-random' && (
          <div style={{ marginTop: 12, marginLeft: 24 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>그룹 수</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {([2, 4] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupCount(g)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: groupCount === g ? 'var(--accent)' : 'var(--bg-surface)',
                    color: groupCount === g ? '#fff' : 'var(--text-muted)',
                    border: `1.5px solid ${groupCount === g ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{error}</p>}

      <button
        onClick={handleAssign}
        disabled={loading || (isOdd && !excludeId && !tempName)}
        className="btn-cta"
      >
        {loading ? '배정 중...' : '🎯 파트너 배정 시작'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: 시각 확인**

어드민 탭 전환하며 AttendanceTracker(참가 확인), AssignmentPanel(마감·배정) 각각 확인.

- [ ] **Step 4: 커밋**

```bash
git add components/admin/AttendanceTracker.tsx components/admin/AssignmentPanel.tsx
git commit -m "feat: redesign AttendanceTracker and AssignmentPanel"
```

---

## Task 7: 결과 페이지

**Files:**
- Modify: `app/events/[id]/results/page.tsx`
- Modify: `components/results/MyPartnerTab.tsx`
- Modify: `components/results/AllResultsTab.tsx`

- [ ] **Step 1: `components/results/MyPartnerTab.tsx` 현재 코드 읽기 후 교체**

```bash
cat components/results/MyPartnerTab.tsx
```

교체할 파일:

```tsx
'use client'
import type { Pair } from '@/lib/types'

interface Props {
  pairs: Pair[]
  participantId: string | null
}

export default function MyPartnerTab({ pairs, participantId }: Props) {
  const myPair = pairs.find(p =>
    p.participant_a?.id === participantId || p.participant_b?.id === participantId
  )

  if (!myPair) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, textAlign: 'center', marginTop: 40 }}>파트너 정보를 찾을 수 없습니다.</p>
  }

  const me = myPair.participant_a?.id === participantId ? myPair.participant_a : myPair.participant_b
  const partner = myPair.participant_a?.id === participantId ? myPair.participant_b : myPair.participant_a

  return (
    <div>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1.5px solid var(--neon-cyan)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        boxShadow: 'var(--partner-glow, none)',
      }}
        className="partner-card"
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
          내 파트너
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
          팀 {myPair.team_number}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 5 }}>
          {partner?.name ?? '—'}
        </div>
        {partner && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
            {partner.club ? `${partner.club} · ` : ''}레이팅 {partner.rating}
          </div>
        )}
      </div>
    </div>
  )
}
```

그리고 `globals.css` 맨 아래에 추가:

```css
[data-theme="dark"] .partner-card {
  box-shadow: 0 0 24px rgba(0, 212, 255, 0.12) inset, 0 0 16px rgba(0, 212, 255, 0.1);
}
```

- [ ] **Step 2: `components/results/AllResultsTab.tsx` 현재 코드 읽기 후 교체**

```bash
cat components/results/AllResultsTab.tsx
```

팀 번호에 따른 색상 순환 함수를 추가하고 카드 스타일 교체:

```tsx
'use client'
import { useState } from 'react'
import type { Pair } from '@/lib/types'

interface Props {
  pairs: Pair[]
  highlightId: string | null
}

const NEON_COLORS = ['var(--neon-pink)', 'var(--neon-green)', 'var(--neon-cyan)']

function teamColor(index: number) {
  return NEON_COLORS[index % NEON_COLORS.length]
}

export default function AllResultsTab({ pairs, highlightId }: Props) {
  const [search, setSearch] = useState('')

  const filtered = pairs.filter(p =>
    !search ||
    p.participant_a?.name.includes(search) ||
    p.participant_b?.name.includes(search)
  )

  const isMyPair = (p: Pair) =>
    p.participant_a?.id === highlightId || p.participant_b?.id === highlightId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input-field"
          style={{ flex: 1 }}
          placeholder="이름으로 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {filtered.map((p, i) => {
          const highlight = isMyPair(p)
          const color = teamColor(i)
          return (
            <div
              key={p.id}
              className="card-surface"
              style={{
                padding: '11px 14px',
                borderLeft: `3px solid ${highlight ? 'var(--neon-cyan)' : color}`,
                background: highlight ? 'var(--accent-bg)' : 'var(--bg-surface)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: highlight ? 'var(--neon-cyan)' : color, marginBottom: 5 }}>
                팀 {p.team_number}{highlight ? ' ← 내 팀' : ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {p.participant_a?.name} × {p.participant_b?.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {p.participant_a?.rating} · {p.participant_b?.rating}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `app/events/[id]/results/page.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import MyPartnerTab from '@/components/results/MyPartnerTab'
import AllResultsTab from '@/components/results/AllResultsTab'
import type { Pair } from '@/lib/types'

type Tab = 'my' | 'all'

function LogoType() {
  return (
    <span className="text-[11px] font-black tracking-[3px] uppercase">
      <span className="logo-neon-pink">TOUR</span>
      <span className="logo-neon-green">NA</span>
      <span className="logo-neon-cyan">MENT</span>
    </span>
  )
}

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
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
            배정 결과
          </div>
          <LogoType />
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {(['my', 'all'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: tab === t ? 900 : 700,
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
              }}
              className={tab === t ? 'tab-active' : ''}
            >
              {t === 'my' ? '내 파트너' : '전체 결과'}
            </button>
          ))}
        </div>

        {tab === 'my' && <MyPartnerTab pairs={pairs} participantId={participantId} />}
        {tab === 'all' && <AllResultsTab pairs={pairs} highlightId={participantId} />}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: 시각 확인**

결과 페이지에서 내 파트너 탭 / 전체 결과 탭 전환 확인.  
다크에서 팀별 핑크→그린→사이언 색상 순환 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/events/[id]/results/page.tsx components/results/MyPartnerTab.tsx components/results/AllResultsTab.tsx
git commit -m "feat: redesign results page with neon team color cycling"
```

---

## Task 8: 배정 애니메이션

**Files:**
- Modify: `components/animation/AssignmentAnimation.tsx`

- [ ] **Step 1: `components/animation/AssignmentAnimation.tsx` 전체 교체**

```tsx
'use client'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'

interface Props {
  pairs: { a: Participant; b: Participant }[]
  onEnd: () => void
}

type Phase = 'drumroll' | 'finale'

const TEAM_COLORS = ['#ff2d78', '#39ff14', '#00d4ff']

function teamColor(i: number) {
  return TEAM_COLORS[i % TEAM_COLORS.length]
}

export default function AssignmentAnimation({ pairs, onEnd }: Props) {
  const [phase, setPhase] = useState<Phase>('drumroll')
  const [currentTeam, setCurrentTeam] = useState(0)
  const [spinning, setSpinning] = useState(true)
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
    setSpinning(true)
    setSpinName('...')

    let speed = 60, elapsed = 0
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
          {/* ambient glow */}
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.18), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,45,120,0.15), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', marginBottom: 24, textTransform: 'uppercase' }}>
              TEAM {String(currentTeam + 1).padStart(2, '0')} / {pairs.length}
            </div>

            <div style={{ fontSize: 30, fontWeight: 900, color: '#f1f5f9', textShadow: '0 0 20px rgba(255,255,255,0.2)', marginBottom: 12 }}>
              {pairs[currentTeam]?.a.name}
            </div>
            <div style={{ fontSize: 16, color: '#444', fontWeight: 700, marginBottom: 12 }}>+</div>
            <div style={{
              fontSize: 30, fontWeight: 900,
              color: spinning ? '#555' : '#39ff14',
              textShadow: spinning ? 'none' : '0 0 14px #39ff14, 0 0 30px rgba(57,255,20,0.5)',
              transition: 'color 0.2s, text-shadow 0.2s',
              minHeight: '2.5rem',
            }}>
              {spinName}
            </div>

            {revealedPairs.length > 0 && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #111' }}>
                {revealedPairs.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#333', fontWeight: 700, marginBottom: 4 }}>
                    팀{i + 1}: {p.a.name} + {p.b.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {phase === 'finale' && (
        <>
          {/* 3색 ambient glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 0%, rgba(255,45,120,0.18), transparent 50%), radial-gradient(ellipse at 10% 100%, rgba(57,255,20,0.15), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.07), transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, padding: '0 24px' }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '2px', marginBottom: 20, textTransform: 'uppercase' }}>
              배정 완료!
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: '60vh', marginBottom: 16 }}>
              {pairs.map((p, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${teamColor(i)}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                    boxShadow: `0 0 12px ${teamColor(i)}22`,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: teamColor(i), textShadow: `0 0 8px ${teamColor(i)}`, marginBottom: 5 }}>
                    팀 {i + 1}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9' }}>
                      {p.a.name} <span style={{ color: '#444' }}>×</span> {p.b.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#555', fontWeight: 700, textAlign: 'right' }}>
                      {p.a.rating}<br />{p.b.rating}
                    </div>
                  </div>
                </div>
              ))}
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

- [ ] **Step 2: 시각 확인**

어드민 → 마감·배정 탭 → "🎯 파트너 배정 시작" 클릭 → 드럼롤 애니메이션 확인:
- 스캔라인 텍스처 (가로 줄)
- 그린 ambient glow (상단), 핑크 glow (우상단)
- 팀 번호 그린 네온 텍스트
- 이름 B 공개 시 그린 글로우
- 피날레 팀 카드: 핑크→그린→사이언 순환 보더
- CTA 버튼: 그린 네온 테두리

- [ ] **Step 3: 커밋**

```bash
git add components/animation/AssignmentAnimation.tsx
git commit -m "feat: redesign animation with max glow scanline and neon team colors"
```

---

## Task 9: `globals.css` 파트너 카드 글로우 추가 + 최종 점검

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: `globals.css` 맨 아래에 파트너 카드 글로우 규칙 추가**

```css
[data-theme="dark"] .partner-card {
  box-shadow: 0 0 24px rgba(0, 212, 255, 0.12) inset, 0 0 16px rgba(0, 212, 255, 0.1);
}
```

- [ ] **Step 2: TypeScript 최종 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 전체 흐름 통합 확인**

1. `http://localhost:3000` — 홈 (토글 버튼, 카드 목록, 관리자 모드 3초 롱프레스)
2. 토너먼트 클릭 → 등록 페이지 (폼, 인풋 포커스)
3. 어드민 → PIN 모달 → 명단/참가확인/배정 탭
4. 배정 시작 → 드럼롤 → 피날레 → 결과 페이지
5. 다크/라이트 모드 전환 후 새로고침 → 모드 유지 확인 (localStorage)

- [ ] **Step 4: 최종 커밋**

```bash
git add app/globals.css
git commit -m "feat: complete UI/UX redesign - neon dark + clean light theme"
```

---

## 자기 검토

### 스펙 커버리지 확인

| 스펙 항목 | 구현 태스크 |
|----------|------------|
| CSS 변수 `:root` + `[data-theme="dark"]` | Task 1 |
| `layout.tsx` 깜빡임 방지 스크립트 | Task 1 |
| 테마 토글 버튼 (홈 우상단) | Task 2 |
| 홈 페이지 멀티 네온 로고타입, 카드 | Task 2 |
| 참가 등록 인풋/버튼 스타일 | Task 3 |
| AdminPinModal 그린 상단 보더 | Task 4 |
| 어드민 탭 그린 언더라인 | Task 5 |
| 삭제 모달 레드 상단 보더 | Task 5 |
| ExpectedList 카드 스타일 | Task 5 |
| AttendanceTracker 3색 카드 | Task 6 |
| AssignmentPanel 인풋/버튼/배지 | Task 6 |
| 결과 파트너 카드 사이언 글로우 | Task 7 |
| 팀 색상 핑크→그린→사이언 순환 | Task 7 |
| 애니메이션 스캔라인 + ambient glow | Task 8 |
| 피날레 팀 카드 네온 보더 + CTA | Task 8 |
| 컨페티 색상 네온 3색 | Task 8 |

모든 스펙 항목 커버 완료. ✓
