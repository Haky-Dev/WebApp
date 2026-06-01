# UI/UX 전면 리디자인 스펙

**날짜:** 2026-06-01  
**프로젝트:** Tournament Draft  
**범위:** 전체 페이지 + 공통 컴포넌트

---

## 1. 디자인 방향

### 다크 모드 — 맥스 글로우 그래피티
- **컨셉:** 도시 밤거리 네온사인 + 그래피티. 거칠고 강렬한 분위기.
- **배경:** `#010101` 베이스. 배경 전체에 네온 색 빛이 번지는 ambient glow (radial-gradient).
- **스캔라인:** 배경 위에 `repeating-linear-gradient` 텍스처로 CRT/그래피티 질감 부여.
- **강조색 (네온 3종):**
  - 핑크 `#ff2d78` — 상태 표시, 모집 중 배지, 모달 상단 보더
  - 그린 `#39ff14` — CTA 버튼, 탭 활성 언더라인, 완료 상태, 드럼롤 강조
  - 사이언 `#00d4ff` — 보조 버튼, 내 파트너 카드, 피날레 팀 색상 순환

### 라이트 모드 — 클린 볼드
- **컨셉:** 선명하고 읽기 좋은 낮 버전. 다크와 완전히 다른 분위기로 강한 대비.
- **배경:** 순백 `#ffffff`. 서피스 `#f8fafc`.
- **강조색:** 인디고 `#4338ca` — 라벨, 탭 활성, 보조 버튼, 인풋 포커스 테두리
- **CTA 버튼:** 새까만 `#0a0a0a` 솔리드

---

## 2. 디자인 토큰 (CSS 변수)

### `globals.css` — `:root` (라이트 기본)

```css
:root {
  --bg-base:        #ffffff;
  --bg-surface:     #f8fafc;
  --bg-elevated:    #f1f5f9;
  --text-primary:   #0a0a0a;
  --text-muted:     #64748b;
  --border:         #e2e8f0;

  --accent:         #4338ca;   /* 인디고 */
  --accent-bg:      #eef2ff;
  --accent-success: #16a34a;
  --accent-danger:  #e11d48;

  --cta-bg:         #0a0a0a;
  --cta-border:     transparent;
  --cta-text:       #ffffff;

  --scanline:       none;
  --ambient-pink:   none;
  --ambient-green:  none;
  --ambient-cyan:   none;
}
```

### `globals.css` — `[data-theme="dark"]`

```css
[data-theme="dark"] {
  --bg-base:        #010101;
  --bg-surface:     #0d0d0d;
  --bg-elevated:    #1a1a1a;
  --text-primary:   #f1f5f9;
  --text-muted:     #64748b;
  --border:         #1e1e1e;

  --neon-pink:      #ff2d78;
  --neon-green:     #39ff14;
  --neon-cyan:      #00d4ff;
  --accent:         #39ff14;
  --accent-success: #39ff14;
  --accent-danger:  #e11d48;

  --cta-bg:         #111111;
  --cta-border:     #39ff14;
  --cta-text:       #39ff14;

  --scanline: repeating-linear-gradient(
    0deg,
    transparent, transparent 3px,
    rgba(0, 0, 0, 0.18) 3px, rgba(0, 0, 0, 0.18) 4px
  );
}
```

### `tailwind.config.ts`

```ts
darkMode: ['attribute', 'data-theme']
```

---

## 3. 타이포그래피

| 용도 | 크기 | 굵기 | 비고 |
|------|------|------|------|
| 페이지 제목 | 32px | 900 | `letter-spacing: -1px`, `line-height: 1.05` |
| 섹션 서브타이틀 | 26px | 900 | 참가 등록, 결과 페이지 |
| 카드 제목 | 16px | 900 | 토너먼트 이름 |
| 버튼 | 14–15px | 900 | `letter-spacing: 1px` |
| 본문 / 보조 정보 | 12px | 700 | 참가자 수, 날짜 |
| 라벨 / 배지 | 11px | 800 | `letter-spacing: 2–3px`, uppercase |
| 파트너 이름 (결과) | 30px | 900 | `letter-spacing: -0.5px` |

**공통 규칙:** 최소 `font-weight: 700`. `font-weight: 400/500` 사용 금지.

---

## 4. 컴포넌트 스펙

### 4-1. CTA 버튼

**다크:**
```
background: #111
border: 1.5px solid #39ff14
color: #39ff14
text-shadow: 0 0 10px rgba(57,255,20,0.7)
box-shadow: 0 0 16px rgba(57,255,20,0.22), 0 0 6px rgba(57,255,20,0.12) inset
border-radius: 6px
padding: 13px
font-size: 14–15px, font-weight: 900
```

**라이트:**
```
background: #0a0a0a
color: #ffffff
box-shadow: 0 4px 18px rgba(0,0,0,0.18)
border-radius: 6px
padding: 13px
```

### 4-2. 보조 버튼

**다크:** 사이언 테두리 + 사이언 텍스트 + 사이언 내부 글로우  
**라이트:** 인디고 테두리 + 인디고 텍스트 + 인디고 배경 (`#eef2ff`)

### 4-3. 탭 네비게이션

| 상태 | 다크 | 라이트 |
|------|------|--------|
| 활성 | 그린 텍스트 + 2px 그린 언더라인 + text-shadow | 블랙 텍스트 + 2.5px 인디고 언더라인 |
| 비활성 | `#444` 텍스트 | `#bbb` 텍스트 |

### 4-4. 카드 / 리스트 아이템

- **다크:** `bg: #0d0d0d`, `border: 1px solid #1e1e1e`, 왼쪽 3px 컬러 보더 (핑크/그린/사이언 상태별)
- **라이트:** `bg: #f8fafc`, `border: 1.5px solid #e2e8f0`, 왼쪽 4px 컬러 보더

### 4-5. 인풋 필드

- **다크:** `border: 1px solid rgba(neon, 0.3)`, `background: rgba(neon, 0.04)`, 내부 글로우
- **라이트:** 기본 `border: 1.5px solid #e2e8f0` → 포커스 시 `border-color: #4338ca`

### 4-6. 모달

공통 구조:
```
background: var(--bg-surface)
border: 1px solid var(--border)
border-top: 2px solid <성격 색>   ← 인증=그린, 삭제=레드
border-radius: 10px
padding: 22px
```

| 모달 | 상단 보더 색 |
|------|------------|
| PIN 인증 | `#39ff14` (그린) |
| 삭제 확인 | `#e11d48` (레드) |

### 4-7. 상태 배지

| 상태 | 다크 | 라이트 |
|------|------|--------|
| 모집 중 | 핑크 텍스트 + 핑크 글로우 | 인디고 텍스트 |
| 배정 완료 | 그린 텍스트 + 그린 글로우 | `#16a34a` 그린 |
| 종료 | `#444` | `#cbd5e1` |

---

## 5. 페이지별 스펙

### 5-1. 홈 (`app/page.tsx`)

- 좌상단: 멀티 네온 TOURNAMENT 로고타입 (다크) / 인디고 단색 (라이트)
- 페이지 제목: "드래프트 매니저" 32px/900
- 토너먼트 목록: 카드 리스트, 상태별 왼쪽 보더 색상 구분
- 우상단: 🌑 / ☀️ 테마 토글 버튼
- CTA: "+ 새 토너먼트 만들기"

### 5-2. 참가 등록 (`app/events/[id]/page.tsx`)

- 상단 중앙: 로고타입 + 토너먼트 이름 26px
- 인풋 라벨: 사이언 (다크) / 인디고 (라이트), 11px/800/uppercase
- 현재 참가자 수: 그린 네온 강조 (다크)
- 성공 상태: 대형 체크마크 → 그린 네온 글로우 (다크) / 그린 솔리드 (라이트)

### 5-3. 어드민 (`app/events/[id]/admin/page.tsx`)

- 헤더: "🔒 주최자 모드" 라벨 + 토너먼트 이름 22px
- 우상단: 삭제 버튼 (레드 텍스트, 소형)
- 탭: 명단 관리 / 참가 확인 / 마감·배정
- 각 패널: 기존 기능 유지, 새 스타일 적용

### 5-4. 결과 (`app/events/[id]/results/page.tsx`)

- 내 파트너 카드: 사이언 테두리 + 사이언 내부 글로우 (다크) / 인디고 테두리 (라이트)
- 파트너 이름: 30px/900
- 팀 목록: 팀 번호 색상 핑크→그린→사이언 순환 (다크)

### 5-5. 배정 애니메이션 (`AssignmentAnimation.tsx`) — 다크 전용

**드럼롤 단계:**
- 풀스크린 `#010101` + 스캔라인 텍스처
- 배경 ambient glow: 그린 중앙 + 핑크 우상단
- 팀 번호: 그린 네온
- 이름 A: 흰색 + 흰색 글로우
- 이름 B (공개 전 회전): 그린 → 공개 시 그린 강한 글로우

**피날레 단계:**
- 배경 3색 ambient glow (핑크/그린/사이언)
- 스캔라인 텍스처 유지
- 팀 카드: 팀번호 순서대로 핑크→그린→사이언 보더 순환
- CTA: 그린 네온 테두리 버튼
- 컨페티 유지 (기존 canvas-confetti)

---

## 6. 테마 전환 구현

### `app/layout.tsx` — ThemeProvider

```tsx
// 초기 로드 시 깜빡임 방지용 인라인 스크립트
<script dangerouslySetInnerHTML={{__html: `
  const t = localStorage.getItem('theme') 
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
`}} />
```

### 테마 토글 버튼

- 홈 페이지 우상단에 배치
- 클릭 시 `data-theme` 속성 토글 + `localStorage` 저장
- 아이콘: 🌑 (다크일 때) / ☀️ (라이트일 때)

---

## 7. 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `app/globals.css` | CSS 변수 전체 재작성, 스캔라인 변수 추가 |
| `tailwind.config.ts` | `darkMode: ['attribute', 'data-theme']` |
| `app/layout.tsx` | 초기 테마 주입 스크립트, ThemeProvider |
| `app/page.tsx` | 테마 토글 버튼, 새 디자인 |
| `app/events/[id]/page.tsx` | 새 디자인 |
| `app/events/[id]/admin/page.tsx` | 새 디자인 |
| `app/events/[id]/results/page.tsx` | 새 디자인 |
| `components/animation/AssignmentAnimation.tsx` | 맥스 글로우 + 스캔라인 |
| `components/admin/ExpectedList.tsx` | 새 스타일 |
| `components/admin/AttendanceTracker.tsx` | 새 스타일 |
| `components/admin/AssignmentPanel.tsx` | 새 스타일 |
| `components/admin/AdminPinModal.tsx` | 새 모달 스타일 |

---

## 8. 확정 디자인 결정 요약

| 항목 | 결정 |
|------|------|
| 다크 모드 스타일 | 맥스 글로우 멀티 네온 + 스캔라인 텍스처 |
| 라이트 모드 스타일 | 클린 화이트, 인디고 강조색 |
| 구현 방식 | CSS 변수 + `data-theme` 속성 |
| 폰트 크기 | 라지 (제목 32px · 카드 16px · 본문 12px · 라벨 11px) |
| 최소 font-weight | 700 |
| CTA 버튼 (다크) | 블랙 배경 + 그린 네온 테두리 |
| CTA 버튼 (라이트) | 블랙 솔리드 |
| 탭 활성 (다크) | 그린 언더라인 |
| 탭 활성 (라이트) | 인디고 언더라인 |
| 모달 상단 보더 | 인증=그린, 삭제=레드 |
| 애니메이션 | 다크 전용, 팀별 핑크→그린→사이언 순환 |
