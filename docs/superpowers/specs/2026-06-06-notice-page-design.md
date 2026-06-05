# 공지 페이지 스펙

**날짜:** 2026-06-06
**범위:** 참가자 접근 가능한 공지 슬라이드 페이지 + 어드민 인라인 편집

---

## 1. 배경 및 목표

`notice-example/notice.html`에 구현된 네온/사이버펑크 스타일 풀스크린 슬라이드 프레젠테이션을 Next.js 앱으로 이식한다. 참가자는 공지를 열람할 수 있고, 이벤트 어드민과 마스터 어드민은 브라우저에서 직접 텍스트를 편집하여 Supabase에 저장할 수 있다.

---

## 2. URL 구조

| URL | 역할 | 접근 |
|-----|------|------|
| `/events/[id]/notice` | 공지 슬라이드 뷰어 | 모든 참가자 |
| `/events/[id]/notice` (EDIT 모드) | 인라인 편집 → 저장 | 이벤트 어드민 + 마스터 어드민만 |

---

## 3. 진입점

다음 세 페이지의 헤더 영역에 **"공지 보기"** 버튼 추가:

- `app/events/[id]/page.tsx` (등록 페이지)
- `app/events/[id]/results/page.tsx` (결과 페이지)
- `app/events/[id]/admin/page.tsx` (어드민 페이지)

버튼 동작: `router.push(`/events/${id}/notice`)`
스타일: 기존 "← 홈" 버튼과 동일한 텍스트 버튼 스타일

---

## 4. 데이터 모델

### DB 마이그레이션

```sql
ALTER TABLE events
  ADD COLUMN notice_content jsonb DEFAULT NULL;
```

- `NULL` → 코드에 정의된 기본 슬라이드(`DEFAULT_SLIDES`) 사용
- 값 있음 → 해당 이벤트의 커스텀 슬라이드 사용 (전체 교체)

### TypeScript 타입

```ts
// lib/notice-defaults.ts
export type SlideFields = Record<string, string>

export type SlideData = {
  type: 'title' | 'rule' | 'prize' | 'event' | 'closing'
  fields: SlideFields
}
```

---

## 5. 기본 슬라이드 콘텐츠

`lib/notice-defaults.ts`에 원본 HTML 6개 슬라이드의 편집 가능한 텍스트 필드를 상수로 정의.

| 슬라이드 | type | 주요 fields |
|---------|------|------------|
| 1. 타이틀 | `title` | eyebrow, sub, badge |
| 2. 예선전 | `rule` | phaseTag, phaseStyle, title, card1~5, callout |
| 3. 본선전 | `rule` | phaseTag, phaseStyle, title, card1~4, callout |
| 4. 상금 | `prize` | totalLabel, total, item1~3 rank/desc/amount |
| 5. 이벤트 게임 | `event` | neonLabel, gameName, gameSubtitle, class1~2 name/rule, eventRule |
| 6. 클로징 | `closing` | neonLabel, mainLine1, mainLine2, sub, cta |

배경 orb, 파티클 캔버스, CSS 애니메이션은 고정값 (편집 대상 아님).

로고 이미지: `notice-example/House Tournament Logo.png` → `public/House Tournament Logo.png` 복사, 경로 고정.

---

## 6. 공지 페이지 구현

### 파일: `app/events/[id]/notice/page.tsx`

**데이터 로드:**
1. 마운트 시 `GET /api/events/[id]/notice` 호출
2. 응답에 `slides` 있으면 사용, 없으면 `DEFAULT_SLIDES` 사용
3. localStorage에서 어드민 토큰 확인 → `isAdmin` 상태

**CSS 전략:**
- 원본 HTML의 `<style>` 블록을 `<style jsx global>` 또는 `globals.css`의 `.notice-*` 네임스페이스로 이식
- 파티클 캔버스, 슬라이드 컨트롤러 JS는 `useEffect` 내에서 초기화

**슬라이드 렌더링:**
- `slides` 배열을 순회하며 `type`에 따라 슬라이드 HTML 렌더링
- 텍스트 요소에 `data-field="fieldName"` 속성 부여 (편집 모드에서 식별용)

---

## 7. 편집 모드

### 진입 조건
- `isAdmin === true`일 때만 EDIT 버튼 렌더링
- `localStorage.getItem(`admin_token_${id}`)` 또는 `localStorage.getItem('master_token')` 존재 시 `isAdmin = true`

### 편집 흐름

```
EDIT 버튼 클릭
→ editActive = true
→ data-field 속성 가진 요소에 contenteditable="true" 적용
→ 상단 배너 표시: "편집 모드 — 텍스트 클릭 후 수정 · 저장 버튼 또는 Ctrl+S"
→ [저장] 클릭 or Ctrl+S
→ DOM 순회하여 data-field 값 추출 → SlideData[] 재구성
→ PATCH /api/events/[id]/notice { slides: [...] }
→ 성공 → editActive = false, 배너 숨김
```

### UI 요소
- EDIT 버튼: 좌상단 고정, `isAdmin`일 때만 렌더링
- 편집 배너: 상단 고정, 편집 모드 중에만 표시
- contenteditable 활성 시 점선 outline (원본 스타일 유지)
- Ctrl+S 키보드 단축키 지원

---

## 8. API 라우트

### `GET /api/events/[id]/notice`
- 인증 불필요
- `events.notice_content` 조회
- 있으면 `{ slides: [...] }` 반환
- 없으면 `{ slides: null }` 반환 (클라이언트가 DEFAULT_SLIDES 사용)

### `PATCH /api/events/[id]/notice`
- **인증:** Authorization: Bearer 어드민 토큰 필수
- Body: `{ slides: SlideData[] }`
- `events.notice_content` 업데이트
- 반환: 200 OK

---

## 9. 변경 파일 목록

| 파일 | 유형 | 내용 |
|------|------|------|
| `app/events/[id]/notice/page.tsx` | 신규 | 공지 슬라이드 페이지 (뷰어 + 편집 모드) |
| `app/api/events/[id]/notice/route.ts` | 신규 | GET (조회), PATCH (저장) |
| `lib/notice-defaults.ts` | 신규 | 기본 슬라이드 콘텐츠 상수 + 타입 |
| `supabase/migrations/add_notice_content.sql` | 신규 | events 테이블 notice_content JSONB 추가 |
| `app/events/[id]/page.tsx` | 수정 | 헤더에 "공지 보기" 버튼 추가 |
| `app/events/[id]/results/page.tsx` | 수정 | 헤더에 "공지 보기" 버튼 추가 |
| `app/events/[id]/admin/page.tsx` | 수정 | 헤더에 "공지 보기" 버튼 추가 |
| `public/House Tournament Logo.png` | 신규 | 원본 로고 이미지 복사 |

---

## 10. 확정 결정 요약

| 항목 | 결정 |
|------|------|
| 이식 방식 | 원본 HTML 충실 이식 (CSS·JS 보존) |
| 콘텐츠 저장 | events.notice_content JSONB (NULL = 기본값) |
| 편집 방식 | contenteditable 인라인 편집 → PATCH API |
| 편집 권한 | 이벤트 어드민 + 마스터 어드민 (localStorage 토큰 확인) |
| 이미지 | /public 고정 경로 (편집 불가) |
| 저장 트리거 | 저장 버튼 + Ctrl+S |
| 진입점 | 등록·결과·어드민 페이지 헤더 |
