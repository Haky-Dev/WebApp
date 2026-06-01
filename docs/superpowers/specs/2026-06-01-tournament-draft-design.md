# Tournament Draft — 다트 토너먼트 파트너 배정 시스템 설계

**날짜:** 2026-06-01  
**스택:** Next.js 15 (App Router) + Supabase + Vercel

---

## 1. 개요

QR 코드를 스캔한 참가자가 자신의 이름과 레이팅(0.00~30.00)을 입력하면, 주최자가 수집을 마감하고 토너먼트 파트너(2인 1팀)를 자동 배정해주는 웹 애플리케이션.

---

## 2. 아키텍처

```
[참가자 기기]  →  QR 스캔  →  Next.js App Router (Vercel)
                                        ↕ API Routes
                                  Supabase (PostgreSQL)
                                        ↕ Realtime 구독
[주최자 기기]  →  관리자 모드  →  Next.js App Router (Vercel)
```

- **Next.js 15 App Router**: 프론트엔드 + API Routes 통합
- **Supabase**: PostgreSQL DB + Realtime (참가자 등록 시 주최자 화면 자동 갱신)
- **Vercel**: 배포 및 호스팅 (URL이 QR 코드 대상)

---

## 3. URL 구조

| URL | 역할 |
|---|---|
| `/` | 이벤트 목록 — 주최자가 새 이벤트 생성 |
| `/events/[id]` | 참가자 등록 페이지 ← **QR 코드 대상** |
| `/events/[id]/results` | 파트너 배정 결과 (전체 목록 + 이름 검색) |
| `/events/[id]/admin` | 주최자 모드 (로고 3초 누르면 PIN 입력창 표시) |

---

## 4. DB 스키마

```sql
-- 이벤트
events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  status       text NOT NULL DEFAULT 'collecting',  -- 'collecting' | 'closed'  (이벤트 생성 시 바로 수집 시작)
  admin_pin    text NOT NULL,                  -- bcrypt 해시
  created_at   timestamptz DEFAULT now()
)

-- 주최자가 미리 등록한 예상 참가자 명단
expected_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES events(id) ON DELETE CASCADE,
  name         text NOT NULL
)

-- 실제 QR 스캔 후 등록한 참가자
participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid REFERENCES events(id) ON DELETE CASCADE,
  name         text NOT NULL,
  club         text,                             -- 동호회명 (선택, NULL 허용)
  rating       numeric(4,2) NOT NULL CHECK (rating >= 0 AND rating <= 30),
  registered_at timestamptz DEFAULT now()
)

-- 파트너 배정 결과
pairs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid REFERENCES events(id) ON DELETE CASCADE,
  team_number      integer NOT NULL,
  participant_a_id uuid REFERENCES participants(id),
  participant_b_id uuid REFERENCES participants(id)
)
```

---

## 5. 화면 흐름

### 5-1. 참가자 흐름

1. **QR 스캔** → `/events/[id]` 접속
2. **이름 + 동호회(선택) + 레이팅 입력** → 등록 버튼
3. **등록 완료 화면** — "주최자가 마감하면 파트너가 배정됩니다" 안내, 현재 등록 인원 실시간 표시
4. **배정 완료 시 자동 전환** — 등록 완료 시 발급된 `participant_id`를 localStorage에 저장. Supabase Realtime으로 event status가 `closed`로 바뀌는 순간, 저장된 `participant_id`를 이용해 참가자 기기 화면이 자동으로 **자신의 파트너 결과 화면**으로 전환 (페이지 새로고침 없이)
5. **결과 화면** — 자신의 팀(하이라이트) + 전체 팀 목록 탭 전환 가능

### 5-2. 주최자 흐름

1. `/` 에서 **새 이벤트 생성** (이벤트명 + PIN 설정) → QR 코드 자동 생성
2. `/events/[id]` 참가자 등록 페이지에서 **로고 3초 누르기** → PIN 입력창 표시 → 인증 성공 시 `/events/[id]/admin` 진입
3. **탭 1 — 명단 관리**: 예상 참가자 이름 추가/삭제 (이벤트 전 미리 작성)
4. **탭 2 — 참가 확인**: 등록 완료(초록) / 미등록(빨강) / 명단 외 신규 등록자(주황) 실시간 표시
5. **탭 3 — 마감 및 배정**:
   - 홀수 인원 시 제외할 1명 선택 또는 임시 참가자 추가
   - 배정 알고리즘 선택
   - "파트너 배정 시작" 버튼 → 배정 애니메이션 재생 → 결과 저장

---

## 6. 파트너 배정 알고리즘

주최자가 마감 시 두 가지 방식 중 선택한다.

### 6-1. 스네이크 드래프트

1. 참가자를 레이팅 내림차순으로 정렬
2. 1위 ↔ N위, 2위 ↔ N-1위, ... 순서로 짝짓기
3. 결과가 항상 동일하며 팀 간 실력 균형이 최대화됨

```
예: 8명 → [①25.5, ②22.0, ③18.75, ④15.0, ⑤9.5, ⑥7.2, ⑦5.8, ⑧3.1]
팀1: ①+⑤  팀2: ②+⑥  팀3: ③+⑦  팀4: ④+⑧
```

### 6-2. 그룹 랜덤

주최자가 **그룹 수(G)** 를 선택. 그룹끼리 대칭으로 매칭되므로 **짝수만 가능 (2 또는 4)**.

**인원 배분 규칙:**

```
base = floor(N / G)
나머지 = N mod G

최상위 그룹(G1) = base명  (가장 작게)
최하위 그룹(Glast) = base명  (가장 작게)
나머지 인원 → 중간 그룹 쌍에 2명씩 대칭 배분
  (G2·G3에 동시에 +1씩, G4·G5에 동시에 +1씩 …)
```

대칭 배분 불가 시(나머지가 홀수이거나 중간 그룹에 균등 분배가 안 되는 경우) → 홀수 처리 흐름(6-3)으로 위임.

**매칭:**
- G1(최상위) ↔ G_last(최하위) 간 랜덤 매칭
- G2 ↔ G_(last-1) 간 랜덤 매칭
- 매칭되는 두 그룹은 항상 인원이 동일함을 보장

```
예: 10명 / 4그룹
  base=2, 나머지=2 → G2·G3에 각 +1
  → G1(2) + G2(3) + G3(3) + G4(2) = 10
  G1↔G4 랜덤 매칭 / G2↔G3 랜덤 매칭
```

### 6-3. 홀수 처리 (공통)

배정 전에 주최자가 다음 중 선택:
- 제외할 참가자 1명 직접 선택
- 임시 참가자 1명 추가 (이름 + 레이팅 수동 입력)

---

## 7. 배정 애니메이션 (주최자 PC 전용)

"파트너 배정 시작" 버튼을 누르면 `/events/[id]/admin` 에서 전체화면 애니메이션이 재생된다.

**2단계 연출:**

1. **드럼롤 단계** — 팀 1부터 순차적으로 배정
   - 화면 중앙에 "팀 N 배정 중..." 텍스트 표시
   - 상위 파트너 이름은 고정, 하위 파트너 자리에서 후보 이름들이 빠르게 전환
   - 점점 느려지다가 최종 파트너 이름이 잠기며 효과음(선택사항)
   - 팀 배정 완료 → 다음 팀으로 전환, 전체 팀 수만큼 반복

2. **피날레 단계** — 모든 팀 공개 후
   - "Tournament Draft — 오늘의 파트너" 헤더와 함께 전체 결과 카드가 화면 가득 펼쳐짐
   - 카드들이 아래에서 위로 순차적으로 슬라이드인
   - 배경에 컨페티(confetti) 파티클 효과

**구현 방식:**
- 순수 CSS 애니메이션 + JavaScript 타이머로 구현 (외부 애니메이션 라이브러리 불필요)
- 컨페티는 `canvas-confetti` 라이브러리 사용
- 애니메이션 중 Supabase에 pairs 데이터 저장은 배정 시작 직후 백그라운드에서 처리 (애니메이션과 병렬)

---

## 8. 결과 화면 (`/events/[id]/results`)

참가자 기기에서 자동 전환되거나 직접 URL 접근 시 표시된다.

### 8-1. 내 파트너 탭 (기본)

- 등록 시 입력한 이름으로 자신의 팀을 자동 식별하여 상단에 하이라이트
- 표시: 팀 번호, 파트너 이름, 파트너 동호회(있을 경우), 파트너 레이팅

### 8-2. 전체 결과 탭

- 모든 팀 목록: 팀 번호 / A 파트너(이름·동호회·레이팅) / B 파트너(이름·동호회·레이팅)
- 이름 검색으로 특정 팀 하이라이트 가능

### 8-3. 구글 시트 복사

전체 결과 탭 상단에 **"결과 복사 (구글 시트용)"** 버튼 제공.

클릭 시 클립보드에 탭 구분 텍스트 복사 → 구글 시트에 바로 붙여넣기 가능.

```
팀	파트너A 이름	파트너A 동호회	파트너A 레이팅	파트너B 이름	파트너B 동호회	파트너B 레이팅
1	김철수	한강다트	25.50	홍길동		4.20
2	이영희	강남클럽	22.00	최지수	분당다트	6.80
```

- 동호회 미입력 시 해당 셀은 빈 문자열
- `navigator.clipboard.writeText()` 사용, 복사 완료 시 버튼 텍스트가 "복사됨 ✓"로 2초간 변경

### 8-4. 이벤트 히스토리

`/` 에서 과거 이벤트 목록 조회 및 결과 재확인 가능

---

## 8. 보안

- 주최자 PIN은 bcrypt 해시로 저장, 서버에서만 검증
- PIN 검증 성공 시 서버에서 서명된 세션 토큰(JWT) 발급, 쿠키 저장
- Supabase Row Level Security(RLS): 참가자는 자신이 속한 이벤트 데이터만 읽기 가능

---

## 9. QR 코드

- 이벤트 생성 시 `/events/[id]` URL 기반으로 자동 생성
- 주최자 화면에서 QR 코드 이미지 표시 및 PNG 다운로드 가능
- 라이브러리: `qrcode.react`

---

## 10. 주요 의존성

| 패키지 | 용도 |
|---|---|
| `next` 15 | 프레임워크 |
| `@supabase/supabase-js` | DB 클라이언트 + Realtime |
| `@supabase/ssr` | 서버 사이드 Supabase 세션 |
| `qrcode.react` | QR 코드 생성 |
| `bcryptjs` | PIN 해싱 |
| `jose` | JWT 서명/검증 |
| `canvas-confetti` | 배정 완료 피날레 파티클 효과 |
