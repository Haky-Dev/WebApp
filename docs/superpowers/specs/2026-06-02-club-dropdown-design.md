# 동호회 드롭다운 시스템 스펙 (그룹 B)

**날짜:** 2026-06-02
**범위:** 마스터 PIN 시스템 / 동호회 CRUD / 폼 드롭다운 교체

---

## 1. 마스터 PIN & 토큰 시스템

### 환경변수
- `.env.local`에 `MASTER_ADMIN_PIN=<값>` 추가
- 기존 `ADMIN_JWT_SECRET`으로 마스터 JWT 서명

### `lib/auth/admin-token.ts` 확장
기존 `signAdminToken` / `verifyAdminToken` 유지 + 추가:

```ts
// 마스터 JWT payload: { role: 'master' }
export async function signMasterToken(): Promise<string>
export function verifyMasterToken(token: string): Promise<boolean>
```

### `POST /api/admin/verify-master-pin`
- Body: `{ pin: string }` (eventId 없음)
- 검증: `pin === process.env.MASTER_ADMIN_PIN`
- 성공: `signMasterToken()` → `{ token }` 반환 (200)
- 실패: 401

### 마스터 토큰 저장
- `localStorage.setItem('master_token', token)`
- 이벤트 토큰과 별개로 관리

### 어드민 API 마스터 토큰 허용 패턴
기존 모든 어드민 라우트에서:

```ts
// 기존
const payload = await verifyAdminToken(token)
if (!payload) return 401
const eventId = payload.eventId

// 변경 후
const payload = await verifyAdminToken(token)
let eventId: string
if (payload) {
  eventId = payload.eventId
} else if (await verifyMasterToken(token)) {
  eventId = /* URL params에서 추출 */
} else {
  return 401
}
```

대상 API:
- `DELETE /api/events/[id]`
- `POST /api/admin/participants`
- `PATCH/DELETE /api/admin/participants/[id]`
- `DELETE /api/admin/pairs`
- `POST /api/admin/assign`
- `GET/POST /api/admin/expected` (미사용이나 코드 잔존 시)

### 홈 페이지 마스터 로그인
- 3초 롱프레스 → 기존 어드민 모드 토글 대신: 마스터 PIN 모달 표시
- 모달: 기존 `AdminPinModal`과 동일 패턴, `eventId` prop 없음
- 새 컴포넌트 `MasterPinModal` 또는 `AdminPinModal`을 eventId 선택적으로 처리
- 성공 → `master_token` 저장 → `isMasterAdmin = true` 상태
- 이미 `master_token`이 localStorage에 있으면 마운트 시 자동으로 어드민 모드 진입

### 이벤트 어드민 페이지의 마스터 토큰 지원
`app/events/[id]/admin/page.tsx` 마운트 시:
```ts
const saved = localStorage.getItem(`admin_token_${id}`) 
           ?? localStorage.getItem('master_token')
if (saved) setToken(saved)
```
마스터 토큰으로 이벤트 어드민 API 호출 가능 (모든 이벤트 접근).

---

## 2. 동호회 CRUD

### DB 마이그레이션
파일: `supabase/migrations/002_clubs.sql`

```sql
CREATE TABLE IF NOT EXISTS clubs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- 전체 공개 읽기
CREATE POLICY "clubs_public_read" ON clubs
  FOR SELECT USING (true);

-- service role 전체 접근
CREATE POLICY "clubs_service_all" ON clubs
  USING (true) WITH CHECK (true);
```

> **실행:** Supabase 대시보드 → SQL Editor에서 위 SQL 실행

### API 3개

#### `GET /api/clubs`
- 인증: 없음 (공개)
- 반환: `Club[]` (id, name, created_at), name 가나다순 정렬

#### `POST /api/clubs`
- 인증: 마스터 토큰 필수
- Body: `{ name: string }`
- 검증: name 필수, trim 후 비어있으면 400, UNIQUE 위반 시 409
- 반환: 생성된 Club 객체 (201)

#### `DELETE /api/clubs/[id]`
- 인증: 마스터 토큰 필수
- 반환: 204

### Club 타입 추가 (`lib/types.ts`)
```ts
export interface Club {
  id: string
  name: string
  created_at: string
}
```

### 홈 페이지 동호회 관리 UI
마스터 어드민 모드에서 "새 토너먼트 만들기" 폼 위에 동호회 관리 섹션 추가:

```
[동호회 이름 입력] [추가]

서울TC    [×]
위로      [×]
한강클럽  [×]
```

- 마운트 시 `GET /api/clubs` 로드
- 추가: `POST /api/clubs` (master_token)
- 삭제: `DELETE /api/clubs/[id]` (master_token), 즉시 목록에서 제거

---

## 3. 드롭다운 교체

### 공통 규칙
- 각 컴포넌트 마운트 시 `GET /api/clubs` 1회 fetch
- 첫 번째 옵션: `value=""` → "동호회 선택 안 함"
- 선택값 `""` 전송 시 API에서 `null` 처리 (기존 `club?.trim() || null` 로직 유지)
- 동호회 목록이 비어있으면 텍스트 input fallback

### 교체 대상 4곳

#### 1. `components/registration/RegistrationForm.tsx`
```tsx
// 기존
<input className="input-field" value={club} onChange={e => setClub(e.target.value)} placeholder="위로" />

// 변경
<select className="input-field" value={club} onChange={e => setClub(e.target.value)} style={{ fontWeight: 400 }}>
  <option value="">— 선택 안 함</option>
  {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
</select>
```

#### 2. `components/admin/AdminParticipantPanel.tsx` — 추가 폼
```tsx
// addClub 입력을 select로 교체
<select className="input-field" style={{ flex: 2, fontWeight: 400 }} value={addClub} onChange={e => setAddClub(e.target.value)}>
  <option value="">— 선택 안 함</option>
  {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
</select>
```

#### 3. `components/admin/AdminParticipantPanel.tsx` — 수정 인라인 폼
```tsx
// editClub 입력을 select로 교체
<select className="input-field" style={{ flex: 2, fontWeight: 400, padding: '8px 10px', fontSize: 13 }} value={editClub} onChange={e => setEditClub(e.target.value)}>
  <option value="">— 선택 안 함</option>
  {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
</select>
```

#### 4. `components/admin/AssignmentPanel.tsx` — 임시 참가자
```tsx
// tempClub 입력을 select로 교체
<select style={inputStyle} value={tempClub} onChange={e => setTempClub(e.target.value)}>
  <option value="">— 선택 안 함</option>
  {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
</select>
```

---

## 4. 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `supabase/migrations/002_clubs.sql` | 신규 | clubs 테이블 생성 (Supabase에서 수동 실행) |
| `lib/types.ts` | 수정 | Club 인터페이스 추가 |
| `lib/auth/admin-token.ts` | 수정 | signMasterToken, verifyMasterToken 추가 |
| `app/api/admin/verify-master-pin/route.ts` | 신규 | 마스터 PIN 검증 → JWT |
| `app/api/clubs/route.ts` | 신규 | GET (공개) + POST (마스터) |
| `app/api/clubs/[id]/route.ts` | 신규 | DELETE (마스터) |
| `app/api/admin/participants/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/admin/participants/[id]/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/admin/pairs/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/admin/assign/route.ts` | 수정 | 마스터 토큰 허용 |
| `app/api/events/[id]/route.ts` | 수정 | DELETE에 마스터 토큰 허용 |
| `app/page.tsx` | 수정 | 마스터 PIN 모달, 동호회 관리 UI, 마스터 토큰 상태 |
| `app/events/[id]/admin/page.tsx` | 수정 | 마스터 토큰 fallback 추가 |
| `components/registration/RegistrationForm.tsx` | 수정 | club 드롭다운 |
| `components/admin/AdminParticipantPanel.tsx` | 수정 | club 드롭다운 (추가+수정) |
| `components/admin/AssignmentPanel.tsx` | 수정 | tempClub 드롭다운 |

---

## 5. 확정 결정 요약

| 항목 | 결정 |
|------|------|
| 동호회 범위 | 전체 공용 (단일 clubs 테이블) |
| 드롭다운 유형 | 선택 전용 (자유 입력 불가) |
| 목록 비어있을 때 | 텍스트 input fallback |
| 마스터 PIN 저장 | 환경변수 `MASTER_ADMIN_PIN` |
| 마스터 토큰 저장 | `localStorage.master_token` |
| 마스터 토큰 이벤트 접근 | URL params에서 eventId 추출 |
| DB 마이그레이션 실행 | Supabase 대시보드 수동 실행 |
