# 그룹 팀 추첨 세리머니 — 인터랙티브 빅스크린 배정 설계

**날짜:** 2026-06-04
**스택:** Next.js 16 (App Router) + React 19 + Supabase + Tailwind 4
**관련 프로토타입:** `토너먼트 드래프트/` (team-draw.js, rating-draw.js)
**기반 설계:** [2026-06-01-tournament-draft-design.md](2026-06-01-tournament-draft-design.md)

---

## 1. 개요

`토너먼트 드래프트/` 프로토타입의 **그룹 팀 추첨**(레이팅 기반 그룹 분할 + 그룹별 인터랙티브 추첨)과 **레이팅 순 팀 생성**을 현재 WebApp(`unidarts`)의 배정 시스템에 통합한다.

현재 WebApp에는 이미 두 알고리즘이 존재한다:
- `snakeDraft` — 프로토타입의 "레이팅 순 팀 생성"과 동일(상위 절반 ↔ 하위 절반 순서 매칭)
- `groupRandom(2|4)` — 그룹 랜덤(고정 2/4 그룹, 중간 그룹 대칭 배분)

본 작업의 핵심은 **그룹 추첨**을 프로토타입 방식으로 가져오는 것이다:
1. 그룹 분할 **알고리즘 교체** — 프로토타입의 `그룹당 팀수(N)` 방식으로
2. **인터랙티브 추첨 UX** — 그룹을 하나씩 골라 팀을 한 팀씩 추첨하는 빅스크린 세리머니
3. **레이팅 순**을 명시적 모드로 정리(기존 `snake` 유지, 라벨만 변경)

---

## 2. 배정 모드 정리 (2개)

| 모드 (algorithm) | 설명 | 연출 |
|---|---|---|
| `group-draw` (신규) | 프로토타입 그룹 분할 + 그룹 내 랜덤 짝 추첨 | **인터랙티브 4단계 세리머니** |
| `snake` (기존 유지) | 레이팅 순 상위↔하위 매칭 | 기존 원샷 드럼롤 (`AssignmentAnimation`) |

- UI 라벨: "스네이크 드래프트" → **"레이팅 순"**, "그룹 랜덤" → **"그룹 팀 추첨"**
- 기존 **`group-random` 알고리즘은 제거**한다(`lib/algorithms/group-random.ts`, `__tests__/algorithms/group-random.test.ts`, `AssignmentPanel`의 2/4 그룹 수 UI, `assign` 라우트의 `group-random` 분기).

---

## 3. 그룹 분할 알고리즘 — `lib/algorithms/group-draw.ts` (신규)

프로토타입 `team-draw.js`의 `createGroups`를 그대로 이식한다.

**입력:** `participants: Participant[]`, `teamsPerGroup: number` (기본 6, 범위 2–20)

**절차:**
1. 레이팅 내림차순 정렬
2. `groupSize = teamsPerGroup * 2`
3. `remainder = total % groupSize`
4. `remainder > 0`이면 **A그룹** = 최상위 `ceil(remainder/2)`명 + 최하위 `floor(remainder/2)`명 (여유 인원)
5. 이후 남은 인원을 레이팅 순으로 묶어 **B, C, D…** 그룹 생성 (각 `groupSize`명)
6. 각 그룹 = 상위 절반(tops) + 하위 절반(bottoms)으로 구성

**그룹 내 팀 짝짓기(추첨):** tops에서 랜덤 1명 + bottoms에서 랜덤 1명을 뽑아 한 팀. 소진까지 반복. 팀 라벨 = `그룹문자 + 순번` (예: `A1`, `A2`, `B1`).

**반환 구조:**
```ts
interface DrawnTeam { a: Participant; b: Participant; label: string }   // label: "A1"
interface DrawnGroup { letter: string; teams: DrawnTeam[] }
function groupDraw(participants: Participant[], teamsPerGroup: number): DrawnGroup[]
```
- flat한 `AlgorithmPair[]`도 파생 가능(`{ a, b }` + group_label).

**불변식 / 엣지:**
- 전체 인원은 **짝수**여야 한다(기존 홀수 처리 — 제외 1명 또는 임시 참가자 — 재사용). `groupSize`가 짝수이므로 `remainder`도 항상 짝수가 되어 A그룹 분배가 대칭.
- `teamsPerGroup`이 커서 `groupSize > total`이면 `remainder = total`, 전원이 A그룹 한 개로 묶임(정상 동작).
- 그룹 멤버십(누가 어느 그룹인가)은 **결정적**(레이팅 순), 랜덤은 **그룹 내 짝짓기에만** 적용.

---

## 4. 데이터 흐름 & 상태 (방식 1: 서버 계산 + `drawing` 상태)

**원칙:** "추첨 완료 후 발표" — 인터랙티브 추첨이 진행되는 동안 참가자 기기는 결과를 보지 않고, 관리자가 마지막에 "결과 발표"를 눌러야 전환된다.

### 4-1. 마이그레이션 `supabase/migrations/003_group_draw.sql`
```sql
-- 중간 상태 추가
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('collecting', 'drawing', 'closed'));

-- 그룹 라벨 (snake 모드는 NULL)
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS group_label text;
```
> RLS `insert participant when collecting`은 `status = 'collecting'`만 허용하므로 `'drawing'`에서 등록이 자동 차단된다(추가 변경 불필요).

### 4-2. 상태 전이
```
collecting ──(group-draw 추첨 시작)──▶ drawing ──(결과 발표)──▶ closed
collecting ──(snake 배정)─────────────────────────────────────▶ closed
closed/drawing ──(배정 초기화)──▶ collecting
```

### 4-3. API
- **`POST /api/admin/assign` 확장**
  - 입력: `algorithm: 'snake' | 'group-draw'`, `teamsPerGroup?`, 기존 `excludeId` / `tempParticipant`.
  - `group-draw`: 그룹·랜덤 짝 계산 → `pairs`에 저장(`team_number` 순번 + `group_label`) → `events.status = 'drawing'` → **그룹 구조(DrawnGroup[]) 반환**.
  - `snake`: 기존대로 → `events.status = 'closed'` → `{ success, teamCount }` 반환.
- **`POST /api/admin/publish` (신규)**
  - 인증 + `eventId`. `status`가 `'drawing'`일 때만 `'closed'`로 전이. 멱등 처리(이미 closed면 200).
- **`DELETE /api/admin/pairs` (기존, 동작 확장)**
  - `pairs` 삭제 + `status → 'collecting'`. `'drawing'` 상태에서도 동작(중단·재배정 지원).

### 4-4. 타입 (`lib/types.ts`)
- `EventStatus = 'collecting' | 'drawing' | 'closed'`
- `Pair`에 `group_label: string | null` 추가.

### 4-5. 참가자 페이지 (`app/events/[id]/page.tsx`)
- **등록자:** 변경 없음 — `status === 'closed'`에서만 결과로 전환되므로, `'drawing'` 동안 기존 "등록 완료! 곧 결과가 표시됩니다" 대기 화면을 그대로 유지.
- **미등록자 마감 화면 조건:** `event.status === 'closed'` → **`event.status !== 'collecting'`** 로 변경(= `drawing`/`closed` 모두 마감 화면 표시, 추첨 중 신규 등록 시도 방지).

### 4-6. 관리자 재진입 (`drawing` 상태로 페이지 로드)
- 관리자가 추첨 중 새로고침/이탈 후 재진입하면 `status === 'drawing'` 감지 → 저장된 `pairs`를 불러와 **세리머니 "결과 발표" 단계로 복귀**(또는 결과 발표 버튼 노출). 데이터는 이미 durable하므로 유실 없음.

---

## 5. UI — 빅스크린 프레젠테이션 세리머니

**스타일 방향 (ui-ux-pro-max 합성):** Retro-Futurism + Vibrant Block-based 기반, Dark Mode(OLED) 베이스에 HUD/Sci-Fi FUI의 코너 브래킷 프레이밍. 기존 `AssignmentAnimation`의 네온 팔레트(`--bg #010101`, green `#39ff14`, pink `#ff2d78`, cyan `#00d4ff`)와 스캔라인 오버레이 재사용.

**공통 원칙:**
- 각 단계 = 전체화면 16:9 "무대" 프레이밍, 단일 포커스 요소, 넉넉한 여백
- 대형 타이포: 이름 `clamp(48px, 8vw, 140px)` / weight 900 / 음수 트래킹, 라벨은 14–18px 대문자 letter-spacing 3px, 숫자는 탭형(`tabular-nums`)
- 코너 HUD 브래킷 4개, 상단 중앙 phase eyebrow + 우상단 카운터
- 그룹별 **색 로테이션**: A=pink, B=green, C=cyan, … (순환)
- 호스트 조작용 **단일 대형 CTA**(하단 중앙)
- `prefers-reduced-motion` 대응: 롤링/셰이크/스태거 축소

**단계 구성:**
- **① 설정** — `AssignmentPanel` 내(별도 전체화면 아님). 모드 선택 + `group-draw` 선택 시 **'그룹당 팀수' 스테퍼(±, 기본 6)**. 홀수 처리 UI 기존 유지. "추첨 시작" → `assign` 호출 → 세리머니 진입.
- **② 그룹 선택** — A/B/C/D 대형 그리드. 진행 그룹 네온 테두리+글로우, 완료 그룹 디밍+✓, 상단 `PROGRESS n/총`. 그룹 클릭 → ③.
- **③ 그룹 내 팀 추첨** — 상위 멤버 흰색 대형 고정 → 하위 멤버 롤링(~80ms 가속 ~600ms) → **확정 시 글로우 블룸 + 스케일 펀치(1.0→1.15→1.0) + 소형 컨페티**. 좌하단 확정 팀 티커, "다음 팀" → 반복, 그룹 완료 시 ②로 복귀.
- **④ 전체 결과 발표** — 그룹 컬러 카드가 **스태거 등장(40ms)** + 대형 컨페티. **"결과 발표"** 버튼 → `POST /api/admin/publish` → `/events/[id]/results` 이동.

**컴포넌트:**
- `components/animation/GroupDrawCeremony.tsx` (신규) — ②③④ 단계, 전달받은 `DrawnGroup[]`를 연출 공개. (랜덤은 서버에서 이미 확정 → 연출은 기존 드럼롤과 동일하게 "정해진 결과 공개")
- `components/admin/AssignmentPanel.tsx` (수정) — 2/4 버튼 제거, 모드 라벨 변경, 그룹당 팀수 스테퍼 추가.
- `app/events/[id]/admin/page.tsx` (수정) — `group-draw` 결과는 `GroupDrawCeremony`로, `snake`는 기존 `AssignmentAnimation`으로 분기. 발표 후 결과 페이지 이동. `drawing` 재진입 처리.
- `components/animation/AssignmentAnimation.tsx` — `snake` 전용으로 유지(변경 없음).

---

## 6. 결과 페이지 (`/events/[id]/results`)

- `pairs.group_label`이 있으면 팀 식별자를 **`A1`/`B2`** 형식으로 표시(없으면 기존 `#01`).
- `components/results/AllResultsTab.tsx`, `MyPartnerTab.tsx`, `CopyButton.tsx`에 `group_label` 반영. 구글 시트 복사 텍스트의 '팀' 열도 `group_label` 사용(없으면 기존 번호).

---

## 7. 테스트 (vitest)

- **`__tests__/algorithms/group-draw.test.ts` (신규):**
  - 정확히 나뉘는 경우(예: 24명/N6 → groupSize 12 → 2그룹 A·B, remainder 0)
  - 여유 인원 A그룹 배치(예: 40명/N6 → groupSize 12 → remainder 4 → A=상위2+하위2, 이후 36명/12 = B·C·D)
  - `groupSize > total` (전원 A그룹)
  - 그룹 수·각 그룹 인원 합 = 전체, 멤버 중복 없음
  - 그룹 멤버십 결정성(같은 입력 → 같은 그룹 구성), 짝짓기만 랜덤
- 기존 `__tests__/algorithms/group-random.test.ts` 삭제. `snake-draft.test.ts` 유지.

---

## 8. 변경/생성 파일 요약

**신규**
- `lib/algorithms/group-draw.ts`
- `components/animation/GroupDrawCeremony.tsx`
- `app/api/admin/publish/route.ts`
- `supabase/migrations/003_group_draw.sql`
- `__tests__/algorithms/group-draw.test.ts`

**수정**
- `lib/types.ts` (EventStatus, Pair.group_label)
- `app/api/admin/assign/route.ts` (group-draw 분기, drawing 상태, group_label 저장)
- `app/api/admin/pairs/route.ts` (drawing→collecting 허용)
- `components/admin/AssignmentPanel.tsx` (스테퍼/라벨)
- `app/events/[id]/admin/page.tsx` (세리머니 분기, drawing 재진입)
- `app/events/[id]/page.tsx` (미등록자 마감 조건 `!== 'collecting'`)
- `app/api/participants/route.ts` (이미 `!== 'collecting'` 거부 — 확인만)
- `components/results/AllResultsTab.tsx`, `MyPartnerTab.tsx`, `CopyButton.tsx` (group_label)

**삭제**
- `lib/algorithms/group-random.ts`, `__tests__/algorithms/group-random.test.ts`

---

## 9. 비범위 (YAGNI)

- 재추첨(그룹 단위 다시 돌리기) — 미지원(한 번 추첨 = 확정)
- 추첨 중 참가자 실시간 부분 공개 — 미지원(완료 후 일괄 발표)
- 구글 시트 직접 연동(API) — 기존처럼 붙여넣기/복사 방식 유지
