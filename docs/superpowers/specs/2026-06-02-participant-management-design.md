# 참가자 관리 개편 + 등록 페이지 명단 스펙

**날짜:** 2026-06-02
**범위:** 등록 페이지 참가자 명단 / 어드민 명단 관리 탭 전면 개편

---

## 1. 배경 및 목표

### 현재 문제
- 등록 페이지에서 참가자 수만 표시되고 누가 등록했는지 알 수 없음
- `expected_participants` (예상 참가자) 개념이 실제 배정과 무관 — 단순 체크리스트에 불과
- 주최자가 참가자를 직접 추가하거나 레이팅·동호회를 수정할 방법이 없음

### 목표
- 등록 페이지에서 현재 참가자 명단(이름·동호회·레이팅)을 볼 수 있게
- 어드민이 참가자를 직접 추가·수정·삭제할 수 있게
- `expected_participants` 시스템 완전 제거

---

## 2. 기능 1 — 등록 페이지 참가자 명단

### 대상 파일
- `app/events/[id]/page.tsx`

### 변경 사항

**데이터 확장:**
- 기존: 5초 폴링으로 `data.length`만 추출
- 변경: 전체 `Participant[]` 배열 상태로 저장

**UI — 등록 전 / 등록 후 공통:**
- "현재 등록: N명" 옆에 🔄 새로고침 버튼 추가
- 클릭 시 즉시 `load()` 호출 (5초 폴링은 유지)
- 폼(등록 전) 또는 성공 메시지(등록 후) 아래에 참가자 목록 표시

**카드 레이아웃 (1개 항목):**
```
┌──────────────────────────────────┐
│ 동호회 (일반 폰트, 10px, muted)   │
│ 이름 (bold 13px)          레이팅  │
└──────────────────────────────────┘
```
- 동호회 없으면 `—` 표시

**정렬 기준:**
1. 동호회 가나다순 (없으면 맨 뒤)
2. 같은 동호회 내 레이팅 내림차순
3. 이름 가나다순

**등록 후 내 항목:**
- 그린 테두리 + 배경 하이라이트 (`← 나` 라벨)
- localStorage의 `my_participant_id`로 본인 판별

---

## 3. 기능 2 — 어드민 명단 관리 개편

### 3-1. 제거 대상 (완전 삭제)

| 항목 | 이유 |
|------|------|
| `components/admin/ExpectedList.tsx` | 참가자 직접 관리 패널로 대체 |
| `components/admin/AttendanceTracker.tsx` | 참가 확인 탭 자체 제거 |
| `app/api/admin/expected/route.ts` | expected 개념 폐기 |
| `app/api/admin/expected/[personId]/route.ts` | expected 개념 폐기 |

### 3-2. 어드민 탭 구조 변경

**변경 전:** 명단 관리 · 참가 확인 · 마감/배정 (3개)
**변경 후:** 명단 관리 · 마감/배정 (2개)

`app/events/[id]/admin/page.tsx`에서 `attendance` 탭 제거, `TABS` 상수 갱신.

### 3-3. 신규 API 라우트

#### `POST /api/admin/participants`
- 어드민 토큰 필요
- Body: `{ name: string, club?: string, rating: number }`
- 이벤트 상태(collecting/closed) **무관**하게 삽입 가능
- `participants` 테이블에 직접 insert
- 반환: 생성된 Participant 객체 (201)

#### `PATCH /api/admin/participants/[id]`
- 어드민 토큰 필요
- Body: `{ club?: string, rating?: number }` (이름 수정 불가)
- 해당 participant가 이 event 소속인지 검증
- 반환: 수정된 Participant 객체

#### `DELETE /api/admin/participants/[id]`
- 어드민 토큰 필요
- 해당 participant가 이 event 소속인지 검증
- DB ON DELETE CASCADE로 pairs도 자동 삭제
- 반환: 204

### 3-4. 신규 컴포넌트 `AdminParticipantPanel`

**파일:** `components/admin/AdminParticipantPanel.tsx`
**기존 ExpectedList.tsx 대체**

**참가자 추가 폼 (상단):**
```
[ 이름 입력 ] [ 동호회 입력 ] [ 레이팅 ] [ + 추가 ]
```
- 이름 필수, 동호회 선택, 레이팅 필수 (0~30)
- POST `/api/admin/participants` 호출
- 성공 시 목록에 즉시 반영

**참가자 목록:**
- 마운트 시 GET `/api/participants?eventId=...` 로 전체 로드
- 카드 당: 동호회(위, 일반) / 이름(아래, bold) + 레이팅 + [수정] [×]

**수정 모드 (인라인):**
- [수정] 클릭 시 해당 카드가 펼쳐짐
- 이름은 읽기 전용으로 표시 (잠금)
- 동호회·레이팅 인풋 + [저장] [취소]
- 수정 중일 때 나머지 카드 opacity 0.4
- PATCH `/api/admin/participants/[id]` 호출
- 성공 시 목록 즉시 갱신

**삭제:**
- [×] 클릭 시 인라인 확인 모달 표시
- 모달: "**{이름}** 참가자를 삭제할까요?" + [취소] [삭제] 버튼
- [삭제] 클릭 시 DELETE `/api/admin/participants/[id]` 호출
- 성공 시 목록에서 제거, 모달 닫기
- 기존 어드민 삭제 모달과 동일한 `.modal-overlay` + `.modal-panel` 패턴 사용 (상단 보더: 레드)

---

## 4. 데이터 흐름

### 등록 페이지 참가자 목록
```
page.tsx load() → GET /api/participants?eventId
→ Participant[] 저장 → 정렬(동호회→레이팅↓→이름) → 렌더링
```

### 어드민 참가자 추가
```
AdminParticipantPanel 폼 submit
→ POST /api/admin/participants (어드민 토큰)
→ 신규 Participant 반환 → 목록 prepend
```

### 어드민 참가자 수정
```
[수정] 클릭 → editingId 상태 세팅 → 인라인 폼 표시
→ [저장] → PATCH /api/admin/participants/[id]
→ 수정된 Participant 반환 → 목록 해당 항목 교체
```

### 어드민 참가자 삭제
```
[×] 클릭 → deleteTargetId 상태 세팅 → 확인 모달 표시
→ [삭제] → DELETE /api/admin/participants/[id]
→ 204 → 목록에서 해당 항목 제거, 모달 닫기
```

---

## 5. 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `app/events/[id]/page.tsx` | 수정 | 참가자 배열 상태, 정렬 함수, 명단 렌더링, 새로고침 버튼 |
| `app/events/[id]/admin/page.tsx` | 수정 | 탭 2개로 변경, AttendanceTracker import 제거, AdminParticipantPanel 추가 |
| `components/admin/AdminParticipantPanel.tsx` | 신규 | 참가자 추가·수정·삭제 패널 |
| `components/admin/ExpectedList.tsx` | 삭제 | |
| `components/admin/AttendanceTracker.tsx` | 삭제 | |
| `app/api/admin/participants/route.ts` | 신규 | POST (참가자 추가) |
| `app/api/admin/participants/[id]/route.ts` | 신규 | PATCH (수정), DELETE (삭제) |
| `app/api/admin/expected/route.ts` | 삭제 | |
| `app/api/admin/expected/[personId]/route.ts` | 삭제 | |

---

## 6. 확정 결정 요약

| 항목 | 결정 |
|------|------|
| expected_participants | 앱에서 완전 제거 (DB 테이블은 유지, 미사용) |
| 어드민 탭 | 2개 (명단 관리·마감배정) |
| 참가자 추가 시 이벤트 상태 체크 | 없음 (어드민은 항상 추가 가능) |
| 수정 가능 필드 | 동호회·레이팅만 (이름 잠금) |
| 삭제 확인 모달 | 있음 — "{이름} 삭제할까요?" + 취소/삭제 버튼, 레드 상단 보더 |
| 등록 페이지 목록 정렬 | 동호회 가나다→레이팅 내림차순→이름 |
| 내 항목 하이라이트 | 등록 후만, 그린 테두리+배경 |
