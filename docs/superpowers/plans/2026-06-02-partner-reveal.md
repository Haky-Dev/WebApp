# 파트너 공개 애니메이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결과 페이지 최초 방문 시 내 파트너 이름을 드라마틱한 드럼롤 애니메이션으로 공개한다.

**Architecture:** `PartnerRevealAnimation` 컴포넌트를 신규 생성하고, 결과 페이지에서 `sessionStorage` 기반으로 1회만 트리거한다. pairs 로드 후 내 pair를 찾아 partner + allNames를 컴포넌트에 전달하고, 애니메이션 종료 시 sessionStorage에 기록하여 재표시를 방지한다.

**Tech Stack:** Next.js 16, canvas-confetti, Supabase, CSS 변수 디자인 시스템

---

## 파일 구조

| 파일 | 변경 유형 | 역할 |
|------|-----------|------|
| `components/results/PartnerRevealAnimation.tsx` | 신규 | 드럼롤 → 파트너 공개 → 컨페티 애니메이션 |
| `app/events/[id]/results/page.tsx` | 수정 | showReveal 상태, pairs 로드 후 트리거 로직 추가 |

---

## Task 1: PartnerRevealAnimation 컴포넌트

**Files:**
- Create: `components/results/PartnerRevealAnimation.tsx`

- [ ] **Step 1: 파일 작성**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'

interface Props {
  partner: Participant
  allNames: string[]
  onEnd: () => void
}

export default function PartnerRevealAnimation({ partner, allNames, onEnd }: Props) {
  const [spinning, setSpinning] = useState(true)
  const [spinName, setSpinName] = useState('...')
  const spinInterval = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let speed = 60
    let elapsed = 0
    const totalDuration = 2500

    function tick() {
      setSpinName(allNames[Math.floor(Math.random() * allNames.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      if (elapsed < totalDuration) {
        spinInterval.current = setTimeout(tick, speed)
      } else {
        setSpinName(partner.name)
        setSpinning(false)
        setTimeout(() => {
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#ff2d78', '#39ff14', '#00d4ff'] })
          setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 }, colors: ['#ff2d78', '#39ff14'] }), 400)
          setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 }, colors: ['#00d4ff', '#39ff14'] }), 700)
        }, 300)
      }
    }

    tick()
    return () => { if (spinInterval.current) clearTimeout(spinInterval.current) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#010101',
      color: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      zIndex: 100,
    }}>
      {/* 스캔라인 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
        opacity: 0.3, pointerEvents: 'none',
      }} />

      {/* 앰비언트 글로우 */}
      <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.18), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,45,120,0.15), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 32px', width: '100%', maxWidth: 480 }}>
        {/* 라벨 */}
        <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', marginBottom: 32, textTransform: 'uppercase' }}>
          내 파트너
        </div>

        {/* 스핀 이름 */}
        <div style={{
          fontSize: 40, fontWeight: 900,
          color: spinning ? '#555' : '#39ff14',
          textShadow: spinning ? 'none' : '0 0 16px #39ff14, 0 0 32px rgba(57,255,20,0.5)',
          transition: 'color 0.3s, text-shadow 0.3s',
          minHeight: '3rem',
          letterSpacing: '-1px',
          marginBottom: 16,
        }}>
          {spinName}
        </div>

        {/* 파트너 정보 (공개 후) */}
        {!spinning && (
          <div style={{ marginBottom: 40, animation: 'fadeIn 0.4s ease both' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>
              {partner.club ? `${partner.club} · ` : ''}레이팅 {partner.rating}
            </div>
          </div>
        )}

        {/* 확인 버튼 (공개 후) */}
        {!spinning && (
          <button
            onClick={onEnd}
            className="btn-cta"
            style={{ animation: 'fadeIn 0.4s ease 0.3s both' }}
          >
            파트너 확인 ✓
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
git add components/results/PartnerRevealAnimation.tsx
git commit -m "feat: add PartnerRevealAnimation component"
```

---

## Task 2: 결과 페이지 트리거 로직

**Files:**
- Modify: `app/events/[id]/results/page.tsx`

- [ ] **Step 1: import + 상태 추가**

`PartnerRevealAnimation` import 추가:
```tsx
import PartnerRevealAnimation from '@/components/results/PartnerRevealAnimation'
```

`Pair` import에 `Participant` 추가:
```tsx
import type { Pair, Participant } from '@/lib/types'
```

기존 state 선언들 아래에 추가:
```tsx
  const [showReveal, setShowReveal] = useState(false)
  const [revealPartner, setRevealPartner] = useState<Participant | null>(null)
  const [allNames, setAllNames] = useState<string[]>([])
```

- [ ] **Step 2: useEffect 수정**

기존 pairs fetch useEffect:
```tsx
  useEffect(() => {
    fetch(`/api/pairs/${id}`).then(r => r.json()).then(setPairs)
    setAdminToken(localStorage.getItem(`admin_token_${id}`))
  }, [id])
```

를 다음으로 교체:

```tsx
  useEffect(() => {
    fetch(`/api/pairs/${id}`)
      .then(r => r.json())
      .then((data: Pair[]) => {
        setPairs(data)
        if (participantId && !sessionStorage.getItem(`seen_partner_${id}`)) {
          const myPair = data.find(p =>
            p.participant_a_id === participantId || p.participant_b_id === participantId
          )
          if (myPair) {
            const partner = myPair.participant_a_id === participantId
              ? myPair.participant_b!
              : myPair.participant_a!
            const names = data
              .flatMap(p => [p.participant_a?.name, p.participant_b?.name])
              .filter(Boolean) as string[]
            setRevealPartner(partner)
            setAllNames(names)
            setShowReveal(true)
          }
        }
      })
    setAdminToken(localStorage.getItem(`admin_token_${id}`))
  }, [id])
```

- [ ] **Step 3: handleRevealEnd 함수 추가**

기존 `handleReset` 함수 아래에 추가:

```tsx
  function handleRevealEnd() {
    sessionStorage.setItem(`seen_partner_${id}`, '1')
    setShowReveal(false)
  }
```

- [ ] **Step 4: 조건부 렌더링 추가**

`return (` 바로 위에 추가:

```tsx
  if (showReveal && revealPartner) {
    return (
      <PartnerRevealAnimation
        partner={revealPartner}
        allNames={allNames}
        onEnd={handleRevealEnd}
      />
    )
  }
```

- [ ] **Step 5: TypeScript 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add "app/events/[id]/results/page.tsx"
git commit -m "feat: trigger partner reveal animation on first results page visit"
```

---

## 자기 검토

### 스펙 커버리지

| 스펙 항목 | 구현 태스크 |
|----------|------------|
| participantId 있음 + sessionStorage 기록 없음 → showReveal | Task 2 Step 2 |
| pairs에서 내 pair 탐색, partner 추출 | Task 2 Step 2 |
| allNames = 모든 참가자 이름 (스핀 풀) | Task 2 Step 2 |
| PartnerRevealAnimation: allNames로 2.5초 스핀 | Task 1 |
| 공개 시 partner.name 그린 네온 글로우 | Task 1 |
| 공개 후 partner.club + rating 표시 | Task 1 |
| 컨페티 3연발 | Task 1 |
| "파트너 확인 ✓" 버튼 → onEnd | Task 1 |
| handleRevealEnd → sessionStorage 기록 → showReveal false | Task 2 Step 3 |
| 풀스크린 #010101 + 스캔라인 + 앰비언트 글로우 | Task 1 |
