# 파트너 공개 애니메이션 스펙 (그룹 C)

**날짜:** 2026-06-02
**범위:** 결과 페이지 최초 방문 시 파트너 드라마틱 공개 애니메이션

---

## 1. 개요

배정 완료 후 결과 페이지로 자동 이동한 참가자에게, 처음 한 번만 파트너 이름을 드라마틱하게 공개하는 풀스크린 애니메이션을 보여준다.

---

## 2. 트리거 조건

결과 페이지(`app/events/[id]/results/page.tsx`) 마운트 시:

1. `participantId` 존재 여부 확인 (localStorage `my_participant_id`)
2. `sessionStorage.getItem(`seen_partner_${id}`)` 확인
3. **participantId 있음 + sessionStorage 기록 없음** → `showReveal = true`
4. 그 외 → 바로 일반 결과 화면 표시

---

## 3. 데이터 흐름

```
결과 페이지 마운트
  → GET /api/pairs/${id} 로 pairs 로드
  → pairs에서 내 pair 탐색 (participant_a_id 또는 participant_b_id === participantId)
  → partner = 상대방 Participant 객체
  → allNames = pairs 전체에서 추출한 모든 참가자 이름 배열 (스핀용)
  → showReveal === true이면 PartnerRevealAnimation 렌더링
```

---

## 4. PartnerRevealAnimation 컴포넌트

**파일:** `components/results/PartnerRevealAnimation.tsx`

### Props

```ts
interface Props {
  partner: Participant   // 내 파트너 객체 (name, club, rating)
  allNames: string[]    // 스핀 풀 (모든 참가자 이름)
  onEnd: () => void     // 애니메이션 종료 콜백
}
```

### 연출 단계

**스핀 단계 (2.5초):**
- `allNames`에서 랜덤 이름을 빠르게 교체 (60ms 시작 → 최대 600ms로 가속)
- 기존 `AssignmentAnimation`의 drumroll 로직과 동일한 tick 패턴
- 이름 표시: 32px/900, 스핀 중 `color: #555`, 공개 시 `color: #39ff14` + text-shadow

**공개 단계:**
- 스핀 종료 → `partner.name` 고정 표시, 그린 네온 글로우
- 0.3초 후 컨페티 3연발 (기존 AssignmentAnimation과 동일 패턴):
  ```ts
  confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#ff2d78', '#39ff14', '#00d4ff'] })
  setTimeout(() => confetti({ ... x: 0.2 }), 400)
  setTimeout(() => confetti({ ... x: 0.8 }), 700)
  ```
- 파트너 정보 표시:
  - 이름: 32px/900, `#39ff14`, 네온 글로우
  - 동호회 + 레이팅: 13px/700, `#64748b`

**확인 버튼:**
- `btn-cta` 클래스 "파트너 확인 ✓"
- 클릭 → `onEnd()` 호출

### 시각 스타일

기존 `AssignmentAnimation`과 동일:
- 풀스크린 `#010101` 배경
- 스캔라인 텍스처 overlay (opacity 0.3)
- Ambient glow: 그린 상단 + 핑크 우상단

---

## 5. 결과 페이지 변경

**파일:** `app/events/[id]/results/page.tsx`

### 추가 상태
```ts
const [showReveal, setShowReveal] = useState(false)
const [revealPartner, setRevealPartner] = useState<Participant | null>(null)
const [allNames, setAllNames] = useState<string[]>([])
```

### pairs 로드 후 처리 (useEffect 수정)
```ts
useEffect(() => {
  fetch(`/api/pairs/${id}`)
    .then(r => r.json())
    .then((data: Pair[]) => {
      setPairs(data)
      // 파트너 공개 조건 확인
      if (participantId && !sessionStorage.getItem(`seen_partner_${id}`)) {
        const myPair = data.find(p =>
          p.participant_a_id === participantId || p.participant_b_id === participantId
        )
        if (myPair) {
          const partner = myPair.participant_a_id === participantId
            ? myPair.participant_b!
            : myPair.participant_a!
          const names = data.flatMap(p => [p.participant_a?.name, p.participant_b?.name])
            .filter(Boolean) as string[]
          setRevealPartner(partner)
          setAllNames(names)
          setShowReveal(true)
        }
      }
    })
}, [id])
```

### 애니메이션 종료 처리
```ts
function handleRevealEnd() {
  sessionStorage.setItem(`seen_partner_${id}`, '1')
  setShowReveal(false)
}
```

### 렌더링
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
// 이후 일반 결과 화면
```

---

## 6. 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `components/results/PartnerRevealAnimation.tsx` | 신규 | 파트너 공개 애니메이션 컴포넌트 |
| `app/events/[id]/results/page.tsx` | 수정 | 트리거 로직 + PartnerRevealAnimation 렌더링 |

---

## 7. 확정 결정 요약

| 항목 | 결정 |
|------|------|
| 트리거 | participantId 있음 + sessionStorage 기록 없음 |
| 반복 표시 | 없음 — sessionStorage로 1회만 |
| 스핀 풀 | pairs 전체 참가자 이름 |
| 스핀 시간 | ~2.5초 (팀 수 무관 고정) |
| 컨페티 | 기존 AssignmentAnimation과 동일 3연발 |
| 종료 후 | 일반 결과 화면 (내 파트너 탭 기본) |
