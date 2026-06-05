# Notice Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `notice-example/notice.html` into a Next.js page at `/events/[id]/notice` — participants can read it, event admins can edit text inline and save to Supabase.

**Architecture:** Code-defined default slides (`lib/notice-defaults.ts`) stored as `SlideData[]`; per-event overrides in an `events.notice_content` JSONB column (NULL = use defaults). The page is a fullscreen scroll-snap client component that preserves the original HTML's CSS animations verbatim (scoped under `.notice-root`). Edit mode uses React `contentEditable` on text spans, updating state on blur; save POSTs the current state to a new API route.

**Tech Stack:** Next.js 15 App Router, Supabase (service client), `next/font/google` (Unbounded + Space Grotesk), `@/lib/auth/admin-token` for JWT verification

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/005_notice_content.sql` | Create | Add `notice_content jsonb` column to `events` |
| `lib/notice-defaults.ts` | Create | `SlideData` type + `DEFAULT_SLIDES` constant |
| `app/api/events/[id]/notice/route.ts` | Create | GET (public) + PATCH (admin-auth) |
| `app/globals.css` | Modify | Append `.notice-*` scoped CSS ported from original |
| `public/House Tournament Logo.png` | Copy | Logo image served statically |
| `app/events/[id]/notice/page.tsx` | Create | Full notice page: viewer + edit mode |
| `app/events/[id]/page.tsx` | Modify | Add "공지 보기" button |
| `app/events/[id]/results/page.tsx` | Modify | Add "공지 보기" button |
| `app/events/[id]/admin/page.tsx` | Modify | Add "공지 보기" button |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/005_notice_content.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/005_notice_content.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS notice_content jsonb DEFAULT NULL;
```

- [ ] **Step 2: Apply migration**

Run in Supabase SQL editor or via CLI:
```bash
npx supabase db push
```
Or paste the SQL directly into the Supabase dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_notice_content.sql
git commit -m "feat: add notice_content jsonb column to events"
```

---

## Task 2: Types + Default Slides

**Files:**
- Create: `lib/notice-defaults.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/notice-defaults.ts

export type SlideFields = Record<string, string>

export type SlideData = {
  type: 'title' | 'rule' | 'prize' | 'event' | 'closing'
  fields: SlideFields
}

export const DEFAULT_SLIDES: SlideData[] = [
  {
    type: 'title',
    fields: {
      eyebrow: '// WeRO Darts Team Presents',
      sub: '위로 하우스 토너먼트',
      badge: '규칙 안내',
    },
  },
  {
    type: 'rule',
    fields: {
      phaseTag: 'Phase 01',
      phaseStyle: 'qualifying',
      title: '예선전',
      card1Label: '방식',
      card1Value: '라운드 로빈',
      card2Label: '핸디캡',
      card2Value: '오피셜 핸디캡',
      card3Label: '매치 구성',
      card3Value: '501 — S.Cri — 501',
      card4Label: '선공 규칙',
      card4Value: '코인 토스 / 패자 선공 / 코인 토스',
      card5Label: '참가 & 진출',
      card5Value: '상위 3위까지 본선 진출',
      card5Note: '(총 15팀, 1팀 부전승)',
      callout: '레이팅 B13 이상 — 마스터 아웃 적용',
    },
  },
  {
    type: 'rule',
    fields: {
      phaseTag: 'Phase 02',
      phaseStyle: 'finals',
      title: '본선전',
      card1Label: '방식',
      card1Value: '싱글 엘리미네이션',
      card2Label: '핸디캡',
      card2Value: '오피셜 핸디캡',
      card3Label: '매치 구성',
      card3Value: '501 — S.Cri — Choice',
      card4Label: '선공 규칙',
      card4Value: '코인 토스 / 패자 선공 / Cork 선',
      card5Label: '',
      card5Value: '',
      card5Note: '',
      callout: '레이팅 B13 이상 — 마스터 아웃 적용',
    },
  },
  {
    type: 'prize',
    fields: {
      totalLabel: '총 상금',
      total: '800,000원',
      item1Rank: '🥇',
      item1Desc: '1등',
      item1Sub: '참가비 40% + 피닉스컵 참가권 2장',
      item1Amount: '32만원',
      item2Rank: '🥈',
      item2Desc: '2등',
      item2Sub: '참가비 40%',
      item2Amount: '32만원',
      item3Rank: '🥉',
      item3Desc: '공동 3등',
      item3Sub: '참가비 20%',
      item3Amount: '16만원',
    },
  },
  {
    type: 'event',
    fields: {
      neonLabel: '참가자 이벤트 게임',
      gameName: '오픈 히든 크리켓',
      gameSubtitle: 'Open Hidden Cricket',
      class1Name: 'B · C 클래스',
      class1Rule: '두 발 기회',
      class2Name: 'A 클래스 이상',
      class2Rule: '한 발 기회',
      eventRule: "숨겨진 영역을 찾아 '오픈'까지 완료해야 성공!",
    },
  },
  {
    type: 'closing',
    fields: {
      neonLabel: 'WeRO Dart House',
      mainLine1: '그럼 이제',
      mainAccent: 'GAME ON!',
      sub: '모든 참가자분들의 대진운을 빕니다',
      cta: 'Good Luck & Have Fun',
    },
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add lib/notice-defaults.ts
git commit -m "feat: add notice SlideData type and DEFAULT_SLIDES"
```

---

## Task 3: API Route

**Files:**
- Create: `app/api/events/[id]/notice/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/events/[id]/notice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveEventId } from '@/lib/auth/admin-token'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('notice_content')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ slides: data.notice_content ?? null })
}

export async function PATCH(
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

  const { slides } = await req.json()
  if (!Array.isArray(slides)) {
    return NextResponse.json({ error: 'slides must be an array' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('events')
    .update({ notice_content: slides })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/events/[id]/notice/route.ts
git commit -m "feat: add GET/PATCH /api/events/[id]/notice"
```

---

## Task 4: CSS + Logo

**Files:**
- Modify: `app/globals.css` (append at end)
- Copy: `public/House Tournament Logo.png`

- [ ] **Step 1: Copy the logo image**

Copy `notice-example/House Tournament Logo.png` → `public/House Tournament Logo.png`

```bash
cp "notice-example/House Tournament Logo.png" "public/House Tournament Logo.png"
```

- [ ] **Step 2: Append notice CSS to `app/globals.css`**

Add the following block at the **end** of `app/globals.css`. All class names are prefixed `.notice-` to avoid conflicts. CSS variables are scoped inside `.notice-root {}` so they don't affect the rest of the app. The original `html`/`body` scroll-snap rules are replaced by `.notice-root` scroll handling. All `@keyframes` are prefixed `notice-` to avoid conflicts.

```css
/* =============================================
   NOTICE PAGE — scoped to .notice-root
   Ported from notice-example/notice.html
   ============================================= */

/* === ROOT CONTAINER (replaces html/body scroll rules) === */
.notice-root {
  height: 100vh;
  height: 100dvh;
  overflow-y: scroll;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;

  /* scoped design tokens */
  --bg-primary:   #0a0a12;
  --bg-secondary: #12121e;
  --green:   #71ea5d;
  --yellow:  #f3f36a;
  --cyan:    #02f5fd;
  --magenta: #fe54f2;
  --cream:   #f5f5ff;
  --text-primary: #f5f5ff;
  --text-dim: #ffffff;
  --glow-cyan:    0 0 25px rgba(2,245,253,0.6),  0 0 60px rgba(2,245,253,0.3);
  --glow-magenta: 0 0 25px rgba(254,84,242,0.6), 0 0 60px rgba(254,84,242,0.3);
  --glow-yellow:  0 0 25px rgba(243,243,106,0.6),0 0 60px rgba(243,243,106,0.3);
  --glow-green:   0 0 25px rgba(113,234,93,0.6), 0 0 60px rgba(113,234,93,0.3);
  --font-display: 'Unbounded', sans-serif;
  --font-body:    'Space Grotesk', sans-serif;
  --title-size: clamp(2.2rem, 6.5vw, 5.5rem);
  --h2-size: clamp(2.35rem, 6.2vw, 5.25rem);
  --body-size: clamp(1.05rem, 2.2vw, 1.6rem);
  --small-size: clamp(0.9rem, 1.4vw, 1.15rem);
  --slide-padding: clamp(1rem, 4vw, 4rem);
  --content-gap: clamp(0.6rem, 2vw, 2rem);
  --element-gap: clamp(0.35rem, 1vw, 1rem);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

  font-family: var(--font-body);
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* === SLIDE === */
.notice-slide {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  position: relative;
}
.notice-slide-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  max-height: 100%;
  overflow: hidden;
  padding: var(--slide-padding);
}

/* === PROGRESS BAR === */
.notice-progress-bar {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--green), var(--yellow), var(--cyan), var(--magenta));
  transition: width 0.4s var(--ease-out-expo);
  z-index: 9999;
  box-shadow: 0 0 12px rgba(255,255,255,0.35);
}

/* === NAV DOTS === */
.notice-nav-dots {
  position: fixed;
  right: clamp(0.75rem, 2vw, 1.5rem);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  z-index: 9999;
}
.notice-nav-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  border: none; padding: 0;
}
.notice-nav-dot:nth-child(4n+1).active { background: var(--cyan);    box-shadow: var(--glow-cyan); }
.notice-nav-dot:nth-child(4n+2).active { background: var(--magenta); box-shadow: var(--glow-magenta); }
.notice-nav-dot:nth-child(4n+3).active { background: var(--yellow);  box-shadow: var(--glow-yellow); }
.notice-nav-dot:nth-child(4n).active   { background: var(--green);   box-shadow: var(--glow-green); }
.notice-nav-dot.active { transform: scale(1.8); }

/* === GRID BACKGROUND === */
.notice-slide::before {
  content: '';
  position: absolute;
  inset: -40px;
  background-image:
    linear-gradient(rgba(245,245,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245,245,255,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
  animation: notice-grid-drift 25s linear infinite;
}

/* === SCAN OVERLAY === */
.notice-slide::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0,0,0,0.06) 3px,
    rgba(0,0,0,0.06) 4px
  );
  pointer-events: none;
  opacity: 0.5;
  z-index: 0;
}

#notice-particle-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}

.notice-slide > * { position: relative; z-index: 1; }

/* === REVEAL === */
.notice-reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.55s var(--ease-out-expo), transform 0.55s var(--ease-out-expo);
}
.notice-visible .notice-reveal { opacity: 1; transform: translateY(0); }
.notice-reveal:nth-child(1) { transition-delay: 0.04s; }
.notice-reveal:nth-child(2) { transition-delay: 0.14s; }
.notice-reveal:nth-child(3) { transition-delay: 0.24s; }
.notice-reveal:nth-child(4) { transition-delay: 0.34s; }
.notice-reveal:nth-child(5) { transition-delay: 0.44s; }
.notice-reveal:nth-child(6) { transition-delay: 0.54s; }

/* === KEYFRAMES === */
@keyframes notice-glitch-1 {
  0%, 85%, 100% { clip-path: none; transform: translate(0); }
  86% { clip-path: polygon(0 20%, 100% 20%, 100% 35%, 0 35%); transform: translate(-4px, 0); }
  88% { clip-path: polygon(0 55%, 100% 55%, 100% 70%, 0 70%); transform: translate(4px, 0); }
  90% { clip-path: polygon(0 10%, 100% 10%, 100% 25%, 0 25%); transform: translate(-3px, 0); }
  92% { clip-path: none; transform: translate(0); }
}
@keyframes notice-glitch-2-img {
  0%, 85%, 100% { clip-path: none; transform: translate(0); opacity: 0; }
  86% { clip-path: polygon(0 45%, 100% 45%, 100% 60%, 0 60%); transform: translate(6px, 0); opacity: 0.8; filter: hue-rotate(280deg) drop-shadow(0 0 20px rgba(254,84,242,0.6)); }
  88% { clip-path: polygon(0 75%, 100% 75%, 100% 90%, 0 90%); transform: translate(-6px, 0); opacity: 0.8; filter: hue-rotate(90deg) drop-shadow(0 0 20px rgba(113,234,93,0.6)); }
  89% { clip-path: polygon(0 15%, 100% 15%, 100% 28%, 0 28%); transform: translate(4px, 0); opacity: 0.6; filter: hue-rotate(40deg) drop-shadow(0 0 15px rgba(243,243,106,0.6)); }
  90% { clip-path: none; transform: translate(0); opacity: 0; }
}
@keyframes notice-flicker {
  0%, 92%, 96%, 100% { opacity: 1; }
  93% { opacity: 0.5; }
  94% { opacity: 1; }
  95% { opacity: 0.25; }
}
@keyframes notice-orb-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.15); }
}
@keyframes notice-gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes notice-pulse-border-green {
  0%, 100% { box-shadow: inset 0 0 20px rgba(113,234,93,0.06), 0 0 25px rgba(113,234,93,0.2); }
  50%      { box-shadow: inset 0 0 40px rgba(113,234,93,0.15), 0 0 50px rgba(113,234,93,0.45); }
}
@keyframes notice-callout-pulse {
  0%, 100% { border-color: rgba(243,243,106,0.35); box-shadow: 0 0 0 rgba(243,243,106,0); }
  50%      { border-color: rgba(243,243,106,0.7);  box-shadow: 0 0 25px rgba(243,243,106,0.2); }
}
@keyframes notice-prize-shine {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes notice-logo-flicker {
  0%, 92%, 96%, 100% {
    filter: drop-shadow(0 0 25px rgba(2,245,253,0.5)) drop-shadow(0 0 50px rgba(254,84,242,0.35)) drop-shadow(0 0 80px rgba(113,234,93,0.2));
  }
  93% { filter: drop-shadow(0 0 10px rgba(2,245,253,0.2)); }
  94% { filter: drop-shadow(0 0 25px rgba(2,245,253,0.5)) drop-shadow(0 0 50px rgba(254,84,242,0.35)); }
  95% { filter: drop-shadow(0 0 3px rgba(2,245,253,0.1)); }
}
@keyframes notice-bracket-draw {
  from { opacity: 0; transform: scale(0.75); }
  to   { opacity: 0.75; transform: scale(1); }
}
@keyframes notice-grid-drift {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(60px, 60px); }
}

/* === SHARED COMPONENTS === */
.notice-neon-label {
  font-family: var(--font-display);
  font-size: var(--small-size);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--green);
  text-shadow: var(--glow-green);
  margin-bottom: var(--element-gap);
  animation: notice-flicker 9s infinite;
}
.notice-neon-divider {
  height: 3px;
  background: linear-gradient(90deg, var(--green), var(--yellow), var(--cyan), var(--magenta));
  margin: var(--element-gap) 0;
  width: 100%;
  max-width: min(92vw, 960px);
  border-radius: 2px;
  box-shadow: 0 0 15px rgba(255,255,255,0.3);
}
.notice-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}

/* === SLIDE 1: TITLE === */
.notice-title-slide { background: var(--bg-primary); overflow: hidden; }
.notice-title-slide .notice-orb-1 {
  width: clamp(300px, 45vw, 550px); height: clamp(300px, 45vw, 550px);
  background: radial-gradient(circle, rgba(2,245,253,0.18), transparent 65%);
  bottom: -10%; left: -10%;
  animation: notice-orb-pulse 6s ease-in-out infinite;
}
.notice-title-slide .notice-orb-2 {
  width: clamp(260px, 40vw, 480px); height: clamp(260px, 40vw, 480px);
  background: radial-gradient(circle, rgba(254,84,242,0.2), transparent 65%);
  top: -5%; right: -5%;
  animation: notice-orb-pulse 8s ease-in-out infinite reverse;
}
.notice-title-slide .notice-orb-3 {
  width: clamp(220px, 35vw, 420px); height: clamp(220px, 35vw, 420px);
  background: radial-gradient(circle, rgba(113,234,93,0.16), transparent 65%);
  top: 55%; right: 20%;
  animation: notice-orb-pulse 7s ease-in-out infinite 1.5s;
}
.notice-title-slide .notice-orb-4 {
  width: clamp(180px, 30vw, 360px); height: clamp(180px, 30vw, 360px);
  background: radial-gradient(circle, rgba(243,243,106,0.14), transparent 65%);
  top: 15%; left: 35%;
  animation: notice-orb-pulse 5s ease-in-out infinite 2.5s;
}
.notice-title-eyebrow {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(0.85rem, 1.4vw, 1.2rem);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--cyan);
  text-shadow: var(--glow-cyan);
  margin-bottom: var(--element-gap);
  animation: notice-flicker 6s infinite 1s;
}
.notice-title-wrapper { position: relative; display: inline-block; line-height: 0; }
.notice-title-logo {
  display: block;
  max-width: min(88vw, 900px); max-height: min(62vh, 560px);
  width: auto; height: auto;
  filter: drop-shadow(0 0 25px rgba(2,245,253,0.5)) drop-shadow(0 0 50px rgba(254,84,242,0.35)) drop-shadow(0 0 80px rgba(113,234,93,0.2));
  animation: notice-glitch-1 10s infinite 3s, notice-logo-flicker 8s infinite 1.5s;
}
.notice-title-logo-ghost {
  position: absolute; top: 0; left: 0;
  display: block;
  max-width: min(88vw, 900px); max-height: min(62vh, 560px);
  pointer-events: none; opacity: 0;
  animation: notice-glitch-2-img 10s infinite 3s;
  mix-blend-mode: screen;
}
.notice-title-sub {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--body-size);
  color: var(--text-dim);
  letter-spacing: 0.1em;
  margin-top: var(--content-gap);
}
.notice-title-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6em 1.3em;
  border: 2px solid var(--magenta);
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--small-size);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--magenta);
  text-shadow: var(--glow-magenta);
  box-shadow: inset 0 0 20px rgba(254,84,242,0.08), 0 0 25px rgba(254,84,242,0.2);
  margin-top: var(--content-gap);
  animation: notice-flicker 9s infinite 2s;
}
.notice-bracket-tl, .notice-bracket-br {
  position: absolute;
  width: clamp(40px, 6vw, 80px); height: clamp(40px, 6vh, 80px);
}
.notice-bracket-tl {
  top: clamp(1.2rem, 3vh, 2.5rem); left: clamp(1.2rem, 3vw, 2.5rem);
  border-top: 3px solid var(--cyan); border-left: 3px solid var(--cyan);
  opacity: 0; box-shadow: -2px -2px 12px rgba(2,245,253,0.4);
  border-radius: 14px 0 0 0;
}
.notice-bracket-br {
  bottom: clamp(1.2rem, 3vh, 2.5rem); right: clamp(1.2rem, 3vw, 2.5rem);
  border-bottom: 3px solid var(--magenta); border-right: 3px solid var(--magenta);
  opacity: 0; box-shadow: 2px 2px 12px rgba(254,84,242,0.4);
  border-radius: 0 0 14px 0;
}
.notice-visible .notice-bracket-tl { animation: notice-bracket-draw 0.55s var(--ease-out-expo) 0.6s forwards; }
.notice-visible .notice-bracket-br { animation: notice-bracket-draw 0.55s var(--ease-out-expo) 0.8s forwards; }

/* === SLIDE 2+3: RULE === */
.notice-rule-slide { background: var(--bg-primary); }
.notice-rule-slide .notice-orb-a {
  width: clamp(220px, 38vw, 450px); height: clamp(220px, 38vw, 450px);
  background: radial-gradient(circle, rgba(2,245,253,0.13), transparent 65%);
  top: -10%; right: -5%;
  animation: notice-orb-pulse 7s ease-in-out infinite;
}
.notice-rule-slide .notice-orb-b {
  width: clamp(180px, 30vw, 380px); height: clamp(180px, 30vw, 380px);
  background: radial-gradient(circle, rgba(113,234,93,0.12), transparent 65%);
  bottom: -5%; left: -5%;
  animation: notice-orb-pulse 6s ease-in-out infinite 2s;
}
.notice-rule-slide.notice-finals-slide .notice-orb-a { background: radial-gradient(circle, rgba(254,84,242,0.15), transparent 65%); }
.notice-rule-slide.notice-finals-slide .notice-orb-b { background: radial-gradient(circle, rgba(243,243,106,0.12), transparent 65%); }
.notice-slide-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--element-gap);
  margin-bottom: var(--content-gap);
  width: 100%;
  flex-wrap: wrap;
}
.notice-phase-tag {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(0.85rem, 1.4vw, 1.2rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 0.4em 1em;
  border: 2px solid currentColor;
  border-radius: 999px;
}
.notice-phase-tag.qualifying {
  color: var(--cyan);
  text-shadow: var(--glow-cyan);
  box-shadow: inset 0 0 15px rgba(2,245,253,0.08), 0 0 20px rgba(2,245,253,0.18);
  animation: notice-flicker 7s infinite;
}
.notice-phase-tag.finals {
  color: var(--magenta);
  text-shadow: var(--glow-magenta);
  box-shadow: inset 0 0 15px rgba(254,84,242,0.08), 0 0 20px rgba(254,84,242,0.18);
  animation: notice-flicker 7s infinite 1s;
}
.notice-slide-title {
  font-family: var(--font-display);
  font-size: var(--h2-size);
  font-weight: 700;
  color: var(--cream);
}
.notice-rule-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(0.5rem, 1.5vw, 1.2rem);
  width: 100%;
  max-width: min(92vw, 960px);
}
.notice-rule-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(2,245,253,0.15);
  border-radius: 14px;
  padding: clamp(0.85rem, 2.2vw, 1.4rem);
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s;
  text-align: center;
}
.notice-rule-card:hover {
  border-color: rgba(2,245,253,0.5);
  box-shadow: 0 0 30px rgba(2,245,253,0.15);
  transform: translateY(-2px);
}
.notice-rule-card.magenta-accent { border-color: rgba(254,84,242,0.15); }
.notice-rule-card.magenta-accent:hover { border-color: rgba(254,84,242,0.5); box-shadow: 0 0 30px rgba(254,84,242,0.15); }
.notice-rule-card::before {
  content: '';
  position: absolute; top: 0; left: 0;
  width: 100%; height: 3px;
  background: var(--cyan);
  box-shadow: 0 0 12px var(--cyan);
}
.notice-rule-card.magenta-accent::before { background: var(--magenta); box-shadow: 0 0 12px var(--magenta); }
.notice-rule-card::after {
  content: '';
  position: absolute; top: 0; left: -120%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
  transition: left 0.55s ease;
  pointer-events: none;
}
.notice-rule-card:hover::after { left: 160%; }
.notice-rule-label {
  font-family: var(--font-body);
  font-size: var(--small-size);
  color: rgba(245,245,255,0.85);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  margin-bottom: 0.45em;
}
.notice-rule-value {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.3rem, 3vw, 2.25rem);
  color: var(--cream);
}
.notice-rule-value .hi { color: var(--cyan); text-shadow: var(--glow-cyan); }
.notice-rule-value .hi-m { color: var(--magenta); text-shadow: var(--glow-magenta); }
.notice-master-out-callout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--element-gap);
  background: rgba(243,243,106,0.06);
  border: 2px solid rgba(243,243,106,0.35);
  border-radius: 14px;
  padding: clamp(0.7rem, 1.8vw, 1rem) clamp(0.85rem, 2.2vw, 1.4rem);
  margin-top: var(--element-gap);
  width: 100%;
  max-width: min(92vw, 960px);
  animation: notice-callout-pulse 2.6s ease-in-out infinite;
}
.notice-callout-icon { font-size: clamp(1.2rem, 2.2vw, 1.6rem); flex-shrink: 0; }
.notice-callout-text {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1rem, 2vw, 1.4rem);
  color: var(--yellow);
  text-shadow: var(--glow-yellow);
}

/* === SLIDE 4: PRIZE === */
.notice-prize-slide { background: var(--bg-primary); }
.notice-prize-slide .notice-orb-a {
  width: clamp(280px, 45vw, 520px); height: clamp(280px, 45vw, 520px);
  background: radial-gradient(circle, rgba(243,243,106,0.14), transparent 65%);
  top: -5%; right: -5%;
  animation: notice-orb-pulse 5s ease-in-out infinite;
}
.notice-prize-slide .notice-orb-b {
  width: clamp(220px, 40vw, 440px); height: clamp(220px, 40vw, 440px);
  background: radial-gradient(circle, rgba(254,84,242,0.13), transparent 65%);
  bottom: -10%; left: 5%;
  animation: notice-orb-pulse 7s ease-in-out infinite reverse;
}
.notice-prize-total-label {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--small-size);
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.22em;
  margin-bottom: 0.2em;
}
.notice-prize-total {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 9.25vw, 8.75rem);
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(90deg, var(--yellow) 0%, var(--green) 30%, var(--cyan) 55%, var(--magenta) 80%, var(--yellow) 100%);
  background-size: 250% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: notice-prize-shine 6s linear infinite;
  filter: drop-shadow(0 0 30px rgba(243,243,106,0.35));
}
.notice-prize-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.4vw, 1.1rem);
  margin-top: var(--content-gap);
  width: 100%;
  max-width: min(92vw, 800px);
}
.notice-prize-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--element-gap);
  padding: clamp(0.7rem, 1.8vw, 1rem) clamp(0.85rem, 2.2vw, 1.4rem);
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
}
.notice-prize-item:hover { border-color: rgba(243,243,106,0.4); box-shadow: 0 0 30px rgba(243,243,106,0.12); transform: translateX(4px); }
.notice-prize-rank { font-family: var(--font-display); font-size: clamp(1.6rem, 3.2vw, 2.6rem); min-width: 2.5ch; }
.notice-prize-desc { font-family: var(--font-display); font-weight: 700; font-size: var(--body-size); color: var(--cream); }
.notice-prize-desc small {
  display: block;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: clamp(1.2rem, 2.1vw, 1.75rem);
  color: var(--cyan);
  text-shadow: 0 0 10px rgba(2,245,253,0.4);
  margin-top: 0.4em;
  letter-spacing: 0.01em;
}
.notice-prize-amount {
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 2.6vw, 2rem);
  font-weight: 700;
  color: var(--yellow);
  text-align: right;
  white-space: nowrap;
  text-shadow: var(--glow-yellow);
}

/* === SLIDE 5: EVENT === */
.notice-event-slide { background: var(--bg-primary); }
.notice-event-slide .notice-orb-a {
  width: clamp(300px, 45vw, 550px); height: clamp(300px, 45vw, 550px);
  background: radial-gradient(circle, rgba(113,234,93,0.15), transparent 65%);
  top: -15%; left: 50%; transform: translateX(-50%);
  animation: notice-orb-pulse 6s ease-in-out infinite;
}
.notice-event-slide .notice-orb-b {
  width: clamp(220px, 35vw, 400px); height: clamp(220px, 35vw, 400px);
  background: radial-gradient(circle, rgba(2,245,253,0.12), transparent 65%);
  bottom: -10%; right: -5%;
  animation: notice-orb-pulse 7s ease-in-out infinite reverse;
}
.notice-event-title-box {
  background: rgba(113,234,93,0.06);
  border: 1px solid rgba(113,234,93,0.3);
  border-radius: 14px;
  padding: clamp(0.9rem, 2.4vw, 1.5rem);
  margin-bottom: var(--content-gap);
  position: relative; overflow: hidden;
  width: 100%; max-width: min(92vw, 800px);
}
.notice-event-title-box::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, var(--green), var(--cyan), var(--yellow));
  box-shadow: 0 0 12px rgba(113,234,93,0.6);
}
.notice-event-game-name {
  font-family: var(--font-display);
  font-size: var(--h2-size);
  font-weight: 700;
  color: var(--green);
  text-shadow: var(--glow-green);
  animation: notice-flicker 8s infinite 2s;
}
.notice-event-subtitle {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--small-size);
  color: var(--text-dim);
  letter-spacing: 0.16em;
  margin-top: 0.4em;
  text-transform: uppercase;
}
.notice-class-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(0.5rem, 1.5vw, 1.2rem);
  margin-bottom: var(--element-gap);
  width: 100%; max-width: min(92vw, 800px);
}
.notice-class-card {
  padding: clamp(0.85rem, 2.2vw, 1.4rem);
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  transition: box-shadow 0.3s, border-color 0.3s, transform 0.3s;
  text-align: center;
}
.notice-class-card:hover { transform: translateY(-3px); }
.notice-class-card.bc { border-color: rgba(254,84,242,0.25); background: rgba(254,84,242,0.04); }
.notice-class-card.bc:hover { border-color: rgba(254,84,242,0.55); box-shadow: 0 0 30px rgba(254,84,242,0.15); }
.notice-class-card.a { border-color: rgba(2,245,253,0.25); background: rgba(2,245,253,0.04); }
.notice-class-card.a:hover { border-color: rgba(2,245,253,0.55); box-shadow: 0 0 30px rgba(2,245,253,0.15); }
.notice-class-name { font-family: var(--font-display); font-size: clamp(1.55rem, 3.5vw, 2.6rem); font-weight: 700; margin-bottom: 0.3em; }
.notice-class-card.bc .notice-class-name { color: var(--magenta); text-shadow: var(--glow-magenta); }
.notice-class-card.a  .notice-class-name { color: var(--cyan);    text-shadow: var(--glow-cyan); }
.notice-class-rule { font-family: var(--font-body); font-weight: 600; font-size: var(--body-size); color: var(--cream); }
.notice-event-rule {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--body-size);
  color: var(--text-dim);
  padding: clamp(0.7rem, 1.8vw, 0.9rem) clamp(0.85rem, 2.2vw, 1.4rem);
  border: 1px solid rgba(243,243,106,0.3);
  border-left: 4px solid rgba(243,243,106,0.6);
  background: rgba(243,243,106,0.04);
  border-radius: 0 14px 14px 0;
  width: 100%; max-width: min(92vw, 800px);
  text-align: center;
}

/* === SLIDE 6: CLOSING === */
.notice-closing-slide { background: var(--bg-primary); text-align: center; }
.notice-closing-slide .notice-slide-content { align-items: center; }
.notice-closing-slide .notice-orb-1 {
  width: clamp(400px, 65vw, 750px); height: clamp(400px, 65vw, 750px);
  background: radial-gradient(circle, rgba(113,234,93,0.1) 0%, rgba(2,245,253,0.08) 30%, rgba(254,84,242,0.08) 60%, transparent 80%);
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  animation: notice-orb-pulse 5s ease-in-out infinite;
}
.notice-closing-slide .notice-orb-2 {
  width: clamp(200px, 35vw, 400px); height: clamp(200px, 35vw, 400px);
  background: radial-gradient(circle, rgba(243,243,106,0.1), transparent 65%);
  top: 20%; right: 10%;
  animation: notice-orb-pulse 7s ease-in-out infinite reverse 1s;
}
.notice-closing-main {
  font-family: var(--font-display);
  font-size: clamp(3rem, 11vw, 10rem);
  font-weight: 800;
  text-transform: uppercase;
  line-height: 0.95;
  color: var(--cream);
}
.notice-closing-main .accent {
  background: linear-gradient(90deg, var(--green), var(--yellow), var(--cyan), var(--magenta));
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: notice-gradient-shift 4s ease infinite;
  filter: drop-shadow(0 0 25px rgba(2,245,253,0.35));
}
.notice-closing-sub {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--body-size);
  color: var(--text-dim);
  letter-spacing: 0.14em;
  margin-top: var(--content-gap);
}
.notice-closing-cta {
  display: inline-block;
  margin-top: var(--content-gap);
  padding: 0.75em 2.3em;
  border: 2px solid var(--green);
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--body-size);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--green);
  text-shadow: var(--glow-green);
  animation: notice-pulse-border-green 2s ease-in-out infinite;
}

/* === EDIT MODE === */
.notice-edit-toggle {
  position: fixed;
  top: 1rem; left: 1rem;
  background: rgba(10,10,18,0.9);
  border: 2px solid var(--cyan);
  color: var(--cyan);
  font-family: var(--font-display);
  font-size: 0.9rem;
  padding: 0.4em 0.9em;
  border-radius: 999px;
  cursor: pointer;
  z-index: 10001;
  transition: opacity 0.3s;
}
.notice-edit-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: linear-gradient(90deg, rgba(2,245,253,0.12), rgba(254,84,242,0.12));
  border-bottom: 1px solid rgba(2,245,253,0.3);
  padding: 0.4rem 1rem;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--cyan);
  letter-spacing: 0.08em;
  text-align: center;
  z-index: 9998;
}
.notice-save-btn {
  position: fixed;
  top: 1rem; right: 1rem;
  background: var(--green);
  border: none;
  color: #0a0a12;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.4em 1.2em;
  border-radius: 999px;
  cursor: pointer;
  z-index: 10001;
}
.notice-root.edit-active [contenteditable] {
  outline: 1px dashed rgba(2,245,253,0.4);
  border-radius: 4px;
  min-width: 2ch;
}
.notice-root.edit-active [contenteditable]:focus {
  outline: 1px solid var(--cyan);
  box-shadow: 0 0 10px rgba(2,245,253,0.3);
}

/* === RESPONSIVE === */
@media (max-width: 600px) {
  .notice-rule-grid, .notice-class-grid { grid-template-columns: 1fr; }
}
@media (max-height: 700px) {
  .notice-root {
    --slide-padding: clamp(0.75rem, 3vw, 2rem);
    --content-gap: clamp(0.4rem, 1.5vw, 1rem);
    --h2-size: clamp(1.6rem, 4.3vw, 3rem);
    --body-size: clamp(0.85rem, 1.6vw, 1.2rem);
    --small-size: clamp(0.72rem, 1.1vw, 0.95rem);
  }
}
@media (max-height: 600px) {
  .notice-root {
    --slide-padding: clamp(0.5rem, 2.5vw, 1.5rem);
    --content-gap: clamp(0.3rem, 1vw, 0.75rem);
    --body-size: clamp(0.75rem, 1.3vw, 1rem);
    --small-size: clamp(0.65rem, 1vw, 0.85rem);
    --h2-size: clamp(1.4rem, 3.6vw, 2.35rem);
  }
  .notice-nav-dots { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .notice-root *, .notice-root *::before, .notice-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.2s !important;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css "public/House Tournament Logo.png"
git commit -m "feat: add notice page CSS and logo asset"
```

---

## Task 5: Notice Page Component

**Files:**
- Create: `app/events/[id]/notice/page.tsx`

- [ ] **Step 1: Create the page file with fonts, state, and data loading**

```tsx
// app/events/[id]/notice/page.tsx
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Unbounded, Space_Grotesk } from 'next/font/google'
import { DEFAULT_SLIDES } from '@/lib/notice-defaults'
import type { SlideData } from '@/lib/notice-defaults'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['400', '600', '700', '800', '900'], display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' })

function EditableText({
  value,
  editActive,
  onUpdate,
  className,
  style,
}: {
  value: string
  editActive: boolean
  onUpdate: (v: string) => void
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={className}
      style={style}
      contentEditable={editActive ? true : undefined}
      suppressContentEditableWarning
      onBlur={e => { if (editActive) onUpdate(e.currentTarget.textContent ?? '') }}
    >
      {value}
    </span>
  )
}

export default function NoticePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES)
  const [editActive, setEditActive] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)

  function updateField(slideIdx: number, field: string, value: string) {
    setSlides(prev =>
      prev.map((s, i) =>
        i === slideIdx ? { ...s, fields: { ...s.fields, [field]: value } } : s
      )
    )
  }

  // Load slides + check admin
  useEffect(() => {
    fetch(`/api/events/${id}/notice`)
      .then(r => r.json())
      .then(data => { if (data.slides) setSlides(data.slides) })
      .catch(() => {})

    const token =
      localStorage.getItem(`admin_token_${id}`) ||
      localStorage.getItem('master_token')
    if (token) setIsAdmin(true)
  }, [id])

  // Particle canvas
  useEffect(() => {
    const canvas = document.getElementById('notice-particle-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const COUNT = 80, CONNECT_DIST = 130
    const COLORS = ['#71ea5d', '#f3f36a', '#02f5fd', '#fe54f2']

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    interface Pt { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string; baseAlpha: number; pulse: number; pulseSpeed: number }
    function makeParticle(init: boolean): Pt {
      return {
        x: Math.random() * canvas!.width,
        y: init ? Math.random() * canvas!.height : (Math.random() > 0.5 ? -5 : canvas!.height + 5),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        baseAlpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      }
    }
    const particles: Pt[] = Array.from({ length: COUNT }, () => makeParticle(true))

    let animId: number
    function loop() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = particles[i].color
            ctx!.globalAlpha = (1 - dist / CONNECT_DIST) * 0.1
            ctx!.lineWidth = 0.6
            ctx!.stroke()
            ctx!.globalAlpha = 1
          }
        }
      }
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        p.pulse += p.pulseSpeed
        p.alpha = p.baseAlpha * (0.7 + 0.3 * Math.sin(p.pulse))
        if (p.x < -10 || p.x > canvas!.width + 10 || p.y < -10 || p.y > canvas!.height + 10) {
          Object.assign(p, makeParticle(false))
        }
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.alpha
        ctx!.fill()
        ctx!.globalAlpha = 1
      })
      animId = requestAnimationFrame(loop)
    }
    loop()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  // Slide controller
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const slideEls = Array.from(root.querySelectorAll<HTMLElement>('.notice-slide'))
    let current = 0

    const progressBar = root.querySelector<HTMLElement>('.notice-progress-bar')
    const navDots = root.querySelector<HTMLElement>('.notice-nav-dots')

    if (navDots) {
      navDots.innerHTML = ''
      slideEls.forEach((_, i) => {
        const btn = document.createElement('button')
        btn.className = 'notice-nav-dot' + (i === 0 ? ' active' : '')
        btn.setAttribute('aria-label', `슬라이드 ${i + 1}`)
        btn.addEventListener('click', () => goTo(i))
        navDots.appendChild(btn)
      })
    }

    function goTo(idx: number) {
      idx = Math.max(0, Math.min(slideEls.length - 1, idx))
      slideEls[idx].scrollIntoView({ behavior: 'smooth' })
    }
    function updateProgress() {
      if (progressBar) progressBar.style.width = (slideEls.length > 1 ? (current / (slideEls.length - 1)) * 100 : 0) + '%'
    }
    function updateDots() {
      navDots?.querySelectorAll('.notice-nav-dot').forEach((d, i) => d.classList.toggle('active', i === current))
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('notice-visible')
          const idx = slideEls.indexOf(entry.target as HTMLElement)
          if (idx !== -1) { current = idx; updateProgress(); updateDots() }
        }
      })
    }, { threshold: 0.5, root })
    slideEls.forEach(s => obs.observe(s))

    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).getAttribute('contenteditable')) return
      if (['ArrowDown', 'ArrowRight', 'Space', 'PageDown'].includes(e.code)) { e.preventDefault(); goTo(current + 1) }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.code)) { e.preventDefault(); goTo(current - 1) }
    }
    document.addEventListener('keydown', onKey)

    let lastWheel = 0
    const onWheel = (e: WheelEvent) => {
      const now = Date.now()
      if (now - lastWheel < 800) return
      lastWheel = now
      e.preventDefault()
      goTo(current + (e.deltaY > 0 ? 1 : -1))
    }
    root.addEventListener('wheel', onWheel, { passive: false })

    let startY = 0
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startY - e.changedTouches[0].clientY
      if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1))
    }
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      obs.disconnect()
      document.removeEventListener('keydown', onKey)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchend', onTouchEnd)
    }
  }, [slides.length])

  // Ctrl+S save
  useEffect(() => {
    if (!editActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

  const handleSave = useCallback(async () => {
    const token =
      localStorage.getItem(`admin_token_${id}`) ||
      localStorage.getItem('master_token')
    if (!token) return
    setSaving(true)
    await fetch(`/api/events/${id}/notice`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slides }),
    })
    setSaving(false)
    setEditActive(false)
  }, [id, slides])

  // Slide renderers
  function renderSlide(slide: SlideData, idx: number) {
    const f = slide.fields
    const upd = (field: string, v: string) => updateField(idx, field, v)
    const E = ({ field, className, style }: { field: string; className?: string; style?: React.CSSProperties }) => (
      <EditableText value={f[field] ?? ''} editActive={editActive} onUpdate={v => upd(field, v)} className={className} style={style} />
    )

    switch (slide.type) {
      case 'title':
        return (
          <section key={idx} className="notice-slide notice-title-slide">
            <div className="notice-orb notice-orb-1 notice-decorative" />
            <div className="notice-orb notice-orb-2 notice-decorative" />
            <div className="notice-orb notice-orb-3 notice-decorative" />
            <div className="notice-orb notice-orb-4 notice-decorative" />
            <div className="notice-bracket-tl notice-decorative" />
            <div className="notice-bracket-br notice-decorative" />
            <div className="notice-slide-content">
              <E field="eyebrow" className="notice-title-eyebrow notice-reveal" />
              <div className="notice-title-wrapper notice-reveal">
                <img src="/House Tournament Logo.png" alt="Tournament Logo" className="notice-title-logo" />
                <img src="/House Tournament Logo.png" alt="" className="notice-title-logo-ghost" aria-hidden="true" />
              </div>
              <E field="sub" className="notice-title-sub notice-reveal" />
              <div className="notice-title-badge notice-reveal">
                <span>◆</span>
                <E field="badge" />
              </div>
            </div>
          </section>
        )

      case 'rule': {
        const isFinals = f.phaseStyle === 'finals'
        const accent = isFinals ? 'hi-m' : 'hi'
        const slideClass = `notice-slide notice-rule-slide${isFinals ? ' notice-finals-slide' : ''}`
        const cardAccent = isFinals ? 'magenta-accent' : ''
        return (
          <section key={idx} className={slideClass}>
            <div className="notice-orb notice-orb-a notice-decorative" />
            <div className="notice-orb notice-orb-b notice-decorative" />
            <div className="notice-slide-content">
              <div className="notice-slide-header notice-reveal">
                <span className={`notice-phase-tag ${f.phaseStyle}`}>
                  <E field="phaseTag" />
                </span>
                <E field="title" className="notice-slide-title" />
              </div>
              <div className="notice-neon-divider notice-reveal" />
              <div className="notice-rule-grid">
                <div className={`notice-rule-card ${cardAccent} notice-reveal`}>
                  <E field="card1Label" className="notice-rule-label" />
                  <p className="notice-rule-value"><span className={accent}><E field="card1Value" /></span></p>
                </div>
                <div className={`notice-rule-card ${cardAccent} notice-reveal`}>
                  <E field="card2Label" className="notice-rule-label" />
                  <p className="notice-rule-value"><span className={accent}><E field="card2Value" /></span></p>
                </div>
                <div className={`notice-rule-card ${cardAccent} notice-reveal`} style={{ gridColumn: '1/-1' }}>
                  <E field="card3Label" className="notice-rule-label" />
                  <p className="notice-rule-value" style={{ whiteSpace: 'nowrap' }}><E field="card3Value" /></p>
                </div>
                <div className={`notice-rule-card ${cardAccent} notice-reveal`} style={{ gridColumn: '1/-1' }}>
                  <E field="card4Label" className="notice-rule-label" />
                  <p className="notice-rule-value" style={{ whiteSpace: 'nowrap' }}><E field="card4Value" /></p>
                </div>
                {f.card5Value && (
                  <div className={`notice-rule-card ${cardAccent} notice-reveal`} style={{ gridColumn: '1/-1' }}>
                    <E field="card5Label" className="notice-rule-label" />
                    <p className="notice-rule-value">
                      <span className={accent}><E field="card5Value" /></span>
                      {f.card5Note && <small style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.75em', marginTop: '0.3em' }}><E field="card5Note" /></small>}
                    </p>
                  </div>
                )}
              </div>
              <div className="notice-master-out-callout notice-reveal">
                <span className="notice-callout-icon">⚡</span>
                <E field="callout" className="notice-callout-text" />
              </div>
            </div>
          </section>
        )
      }

      case 'prize':
        return (
          <section key={idx} className="notice-slide notice-prize-slide">
            <div className="notice-orb notice-orb-a notice-decorative" />
            <div className="notice-orb notice-orb-b notice-decorative" />
            <div className="notice-slide-content">
              <E field="totalLabel" className="notice-prize-total-label notice-reveal" />
              <E field="total" className="notice-prize-total notice-reveal" />
              <ul className="notice-prize-list">
                {([1, 2, 3] as const).map(n => (
                  <li key={n} className="notice-prize-item notice-reveal">
                    <E field={`item${n}Rank`} className="notice-prize-rank" />
                    <span className="notice-prize-desc">
                      <E field={`item${n}Desc`} />
                      <small><E field={`item${n}Sub`} /></small>
                    </span>
                    <E field={`item${n}Amount`} className="notice-prize-amount" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )

      case 'event':
        return (
          <section key={idx} className="notice-slide notice-event-slide">
            <div className="notice-orb notice-orb-a notice-decorative" />
            <div className="notice-orb notice-orb-b notice-decorative" />
            <div className="notice-slide-content">
              <E field="neonLabel" className="notice-neon-label notice-reveal" />
              <div className="notice-event-title-box notice-reveal">
                <E field="gameName" className="notice-event-game-name" />
                <E field="gameSubtitle" className="notice-event-subtitle" />
              </div>
              <div className="notice-class-grid">
                <div className="notice-class-card bc notice-reveal">
                  <E field="class1Name" className="notice-class-name" />
                  <E field="class1Rule" className="notice-class-rule" />
                </div>
                <div className="notice-class-card a notice-reveal">
                  <E field="class2Name" className="notice-class-name" />
                  <E field="class2Rule" className="notice-class-rule" />
                </div>
              </div>
              <E field="eventRule" className="notice-event-rule notice-reveal" />
            </div>
          </section>
        )

      case 'closing':
        return (
          <section key={idx} className="notice-slide notice-closing-slide">
            <div className="notice-orb notice-orb-1 notice-decorative" />
            <div className="notice-orb notice-orb-2 notice-decorative" />
            <div className="notice-bracket-tl notice-decorative" />
            <div className="notice-bracket-br notice-decorative" />
            <div className="notice-slide-content">
              <E field="neonLabel" className="notice-neon-label notice-reveal" />
              <h2 className="notice-closing-main notice-reveal">
                <E field="mainLine1" /><br />
                <span className="accent"><E field="mainAccent" /></span>
              </h2>
              <E field="sub" className="notice-closing-sub notice-reveal" />
              <E field="cta" className="notice-closing-cta notice-reveal" />
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <div
      ref={rootRef}
      className={`notice-root${editActive ? ' edit-active' : ''}`}
      style={{
        '--font-display': unbounded.style.fontFamily,
        '--font-body': spaceGrotesk.style.fontFamily,
      } as React.CSSProperties}
    >
      <canvas id="notice-particle-canvas" />
      <div className="notice-progress-bar" style={{ width: '0%' }} />
      <nav className="notice-nav-dots" aria-label="슬라이드 탐색" />

      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          position: 'fixed', top: '1rem', left: isAdmin ? '6rem' : '1rem',
          background: 'rgba(10,10,18,0.8)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.8rem', fontWeight: 700,
          padding: '0.35em 0.8em', borderRadius: 999,
          cursor: 'pointer', zIndex: 10001,
        }}
      >
        ← 뒤로
      </button>

      {/* Edit controls — admin only */}
      {isAdmin && (
        <button
          className="notice-edit-toggle"
          onClick={() => setEditActive(v => !v)}
        >
          {editActive ? 'DONE' : 'EDIT'}
        </button>
      )}
      {editActive && (
        <>
          <div className="notice-edit-banner">
            편집 모드 — 텍스트 클릭 후 수정 · 저장 버튼 또는 Ctrl+S
          </div>
          <button className="notice-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </>
      )}

      {slides.map((slide, idx) => renderSlide(slide, idx))}
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

```bash
npm run dev
```

Open `http://localhost:3000/events/<any-event-id>/notice`. Expected:
- Fullscreen neon slide presentation loads
- Particle canvas animates
- Scroll / arrow keys / swipe change slides
- Nav dots highlight current slide
- Progress bar advances

- [ ] **Step 3: Verify edit mode (as admin)**

1. In browser console, run: `localStorage.setItem('master_token', 'any')`
2. Reload — EDIT button should appear top-left
3. Click EDIT — text elements get dashed outlines
4. Click a text, change it
5. Click SAVE — request to `/api/events/[id]/notice` is sent

- [ ] **Step 4: Commit**

```bash
git add app/events/[id]/notice/page.tsx
git commit -m "feat: notice page — fullscreen slide viewer with admin inline edit"
```

---

## Task 6: Entry Point Buttons

**Files:**
- Modify: `app/events/[id]/page.tsx`
- Modify: `app/events/[id]/results/page.tsx`
- Modify: `app/events/[id]/admin/page.tsx`

- [ ] **Step 1: Add button to registration page (`app/events/[id]/page.tsx`)**

Find the `← 홈` button in `app/events/[id]/page.tsx` (appears twice — once in the "마감됨" early return, once in the main return). After each `← 홈` button, add:

```tsx
<button
  onClick={() => router.push(`/events/${id}/notice`)}
  style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
>
  📋 공지 보기
</button>
```

Both occurrences are inside `<div style={{ maxWidth: 384, ... }}>` containers. Add the button block immediately after the `← 홈` button in each location.

- [ ] **Step 2: Add button to results page (`app/events/[id]/results/page.tsx`)**

In `app/events/[id]/results/page.tsx`, find the header section (around line 164–170) where the `← 홈` button is rendered inside `<div>`. Add after the `← 홈` button:

```tsx
<button
  onClick={() => router.push(`/events/${id}/notice`)}
  style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
>
  📋 공지 보기
</button>
```

- [ ] **Step 3: Add button to admin page (`app/events/[id]/admin/page.tsx`)**

In `app/events/[id]/admin/page.tsx`, find the header section (around line 200–206) where the `← 홈` button is rendered. Add after it:

```tsx
<button
  onClick={() => router.push(`/events/${id}/notice`)}
  style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}
>
  📋 공지 보기
</button>
```

- [ ] **Step 4: Verify all three buttons**

```bash
npm run dev
```

Check:
- `/events/<id>` → "공지 보기" button visible, clicking navigates to notice page
- `/events/<id>/results` → same
- `/events/<id>/admin` → same

- [ ] **Step 5: Commit**

```bash
git add app/events/[id]/page.tsx app/events/[id]/results/page.tsx app/events/[id]/admin/page.tsx
git commit -m "feat: add '공지 보기' entry point button to registration, results, admin pages"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by |
|---|---|
| URL `/events/[id]/notice` | Task 5 (page file) |
| Participants can view | Task 5 (no auth required to view) |
| Event admin + master admin can edit | Task 5 (`isAdmin` detection via localStorage) |
| EDIT button inline editing | Task 5 (`EditableText` + `contentEditable`) |
| Ctrl+S save | Task 5 (`useEffect` keyboard handler) |
| Save button | Task 5 (`.notice-save-btn`) |
| PATCH API with token auth | Task 3 (`resolveEventId` checks both admin and master tokens) |
| GET API public | Task 3 (no auth header required) |
| Default slides in code | Task 2 (`DEFAULT_SLIDES`) |
| Per-event DB override | Task 1 (migration) + Task 3 (GET/PATCH) |
| events.notice_content JSONB | Task 1 |
| Logo in /public | Task 4 |
| CSS scoped to .notice-root | Task 4 |
| Particle canvas | Task 5 |
| Scroll-snap + nav dots | Task 5 |
| "공지 보기" on registration page | Task 6 |
| "공지 보기" on results page | Task 6 |
| "공지 보기" on admin page | Task 6 |

**No spec items without tasks. No placeholders found. Type `SlideData` is defined in Task 2 and used consistently in Tasks 3 and 5. `updateField` is defined and used within the same component in Task 5.**
