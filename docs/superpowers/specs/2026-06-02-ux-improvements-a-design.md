# UX 개선 그룹 A 스펙

**날짜:** 2026-06-02
**범위:** 뒤로 가기 버튼 / 배정 결과 리셋 / 결과 카드 동호회 표시

---

## 1. 뒤로 가기 버튼

### 대상 페이지
- `app/events/[id]/page.tsx` (등록 페이지)
- `app/events/[id]/admin/page.tsx` (어드민 페이지)
- `app/events/[id]/results/page.tsx` (결과 페이지)

### 스펙
- 각 페이지 헤더 좌상단에 `← 홈` 버튼 추가
- 동작: `router.push('/')`
- 스타일: `fontSize: 12, fontWeight: 700, color: 'var(--text-muted)'`, background/border 없음
- 등록 페이지: 로고타입 위 (long-press 영역 바깥)
- 어드민 페이지: 헤더 좌상단 "🔒 주최자 모드" 라벨 위
- 결과 페이지: "배정 결과" 라벨 위

---

## 2. 배정 결과 리셋

### 새 API 엔드포인트: `DELETE /api/admin/pairs`

- **인증:** Authorization: Bearer 어드민 토큰 필수
- **동작:**
  1. `pairs` 테이블에서 해당 `event_id`의 모든 행 삭제
  2. `events` 테이블의 `status`를 `'collecting'`으로 업데이트
- **반환:** 204 No Content
- **에러:** 401 (인증 실패), 500 (DB 오류)

### UI — 어드민 마감/배정 탭

- 이벤트 `status === 'closed'`일 때만 "배정 초기화" 버튼 표시
- 버튼 클릭 → 확인 모달:
  - 상단 보더: `var(--accent-danger)` (레드)
  - 제목: "배정을 초기화할까요?"
  - 설명: "배정 결과가 삭제되고 다시 배정할 수 있습니다. 참가자는 유지됩니다."
  - 버튼: [취소] (btn-ghost) / [초기화] (btn-danger)
- 성공 시:
  - 탭을 '명단 관리'(`participants`)로 전환
  - 모달 닫기

### 어드민 페이지 이벤트 상태 로드

- `AdminPage`에서 현재 이벤트 상태(status)를 알아야 리셋 버튼 표시 여부를 결정할 수 있음
- 마운트 시 `GET /api/events/[id]`로 이벤트 상태 조회, `eventStatus` 상태로 관리
- 리셋 성공 시 `eventStatus`를 `'collecting'`으로 갱신

---

## 3. 결과 카드에 동호회 표시

### 대상 파일: `components/results/AllResultsTab.tsx`

**현재 카드 레이아웃:**
```
팀 N
이름A × 이름B                 레이팅A · 레이팅B
```

**변경 후:**
```
팀 N
이름A (동호회A) × 이름B (동호회B)    레이팅A · 레이팅B
```

- 동호회 있으면: `{name} (동호회)` 형태로 표시
- 동호회 없으면: `{name}` 만 표시 (괄호 생략)
- 동호회 텍스트: `color: 'var(--text-muted)'`, `fontSize: 12` (이름보다 작게)

---

## 4. 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `app/api/admin/pairs/route.ts` | 신규 | DELETE: pairs 삭제 + 이벤트 상태 복구 |
| `app/events/[id]/page.tsx` | 수정 | ← 홈 버튼 추가 |
| `app/events/[id]/admin/page.tsx` | 수정 | ← 홈 버튼, 이벤트 상태 로드, 리셋 모달 |
| `app/events/[id]/results/page.tsx` | 수정 | ← 홈 버튼 추가 |
| `components/results/AllResultsTab.tsx` | 수정 | 카드에 동호회 표시 |
| `components/admin/AssignmentPanel.tsx` | 수정 | 리셋 버튼 (closed 상태 시) |

---

## 5. 확정 결정 요약

| 항목 | 결정 |
|------|------|
| 뒤로 가기 대상 페이지 | 등록·어드민·결과 전체 |
| 뒤로 가기 목적지 | 항상 홈(`/`) |
| 리셋 범위 | pairs 삭제 + 상태 복구 (참가자 유지) |
| 리셋 버튼 노출 조건 | 이벤트 status === 'closed'일 때만 |
| 리셋 후 동작 | 명단 관리 탭으로 이동 |
| 동호회 표시 위치 | AllResultsTab 카드만 (MyPartnerTab은 이미 표시 중) |
