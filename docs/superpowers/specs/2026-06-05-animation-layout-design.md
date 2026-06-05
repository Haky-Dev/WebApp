# 배정 애니메이션 화면 레이아웃 개선

## 개요

`AssignmentAnimation.tsx`와 `GroupDrawCeremony.tsx`의 드럼롤 화면 레이아웃을 개선한다.

**현재 문제:**
- 슬롯머신과 하단 카드가 동일한 flex 컬럼 안에 있어, 팀이 공개될 때마다 슬롯머신이 위로 밀린다
- 하단 카드가 가로 스크롤(`overflow-x: auto`, `flexWrap` 없음)로 많은 팀을 확인하기 불편하다
- FIRST/SECOND 레이블(`#555`)과 × 구분자(`#1e1e1e`)가 너무 어두워 정보 위계가 약하다

---

## 레이아웃 구조

드럼롤 화면을 3개의 수직 존으로 분리한다.

```
┌─────────────────────────────────────┐
│  Zone A: 헤더 (48px desktop / 38px mobile) │  flex-shrink: 0
│  TEAM 02 / 05                       │
├─────────────────────────────────────┤
│  Zone B: 슬롯머신 존 (flex: 1)       │  항상 이 영역 중앙에 고정
│                                     │
│    FIRST         ✕        SECOND    │
│    [이름]                 [릴박스]   │
│    [클럽·레이팅]           [클럽·레이팅]│
│                                     │
│    [버튼 — GroupDrawCeremony 전용]   │  슬롯 바로 아래
├─────────────────────────────────────┤
│  Zone C: 카드 존 (110px fixed)       │  flex-shrink: 0
│  [팀1] [팀2] [팀3]                   │  flex-wrap: wrap
│  [팀4] [팀5]                         │  overflow-y: auto
└─────────────────────────────────────┘
```

Zone B가 `flex: 1`을 차지하므로 Zone C의 카드가 늘어나도 슬롯머신 위치는 변하지 않는다.

---

## 변경 상세

### Zone B: 슬롯머신 존

```tsx
// 기존: 슬롯+카드가 함께 있어 카드 증가 시 슬롯 이동
<div style={{ flex: 1, justifyContent: 'center', flexDirection: 'column' }}>
  {/* 슬롯머신 */}
  {/* 하단 카드 — minHeight로 이동 방지 시도했으나 불완전 */}
</div>

// 변경: 슬롯만 Zone B에, 카드는 Zone C로 분리
<div style={{ flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: `0 ${isDesktop ? 48 : 20}px` }}>
  {/* 슬롯머신 페어 디스플레이 */}
  {/* 버튼 (GroupDrawCeremony 전용) */}
</div>
```

### Zone C: 카드 존

```tsx
// 기존
<div style={{ minHeight: BOTTOM_H, overflowX: 'auto' }}>
  <div style={{ display: 'flex', gap: 10 }}>  {/* no wrap */}

// 변경
<div style={{ height: isDesktop ? 110 : 80, flexShrink: 0,
              padding: '8px 12px', overflowY: 'auto' }}>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6,
                alignContent: 'flex-start' }}>
```

**카드 크기 조정** (wrap을 위해 compact하게):
- Desktop: `minWidth: 160px`, padding `10px 14px`, 이름 폰트 `16px`
- Mobile: `minWidth: 130px`, padding `8px 10px`, 이름 폰트 `13px`

### 정보 위계

| 요소 | 기존 | 변경 |
|------|------|------|
| FIRST/SECOND 레이블 | `color: '#555'` | `color: '#aaa'` |
| × 구분자 | `color: '#1e1e1e'` | `color: '#555'` |

### 버튼 위치 (GroupDrawCeremony 전용)

Zone B 내부에서 슬롯머신 페어 디스플레이 바로 아래에 배치한다. 기존에는 Zone C(카드 영역)와 같은 flex 컨테이너 안에 있었다.

---

## 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `components/animation/AssignmentAnimation.tsx` | drumroll 페이즈 레이아웃 재구성 (Zone B/C 분리, 카드 wrap) |
| `components/animation/GroupDrawCeremony.tsx` | draw 스테이지 레이아웃 재구성 (동일 패턴 + 버튼 이동) |

finale 페이즈, grid 스테이지, AssignmentPanel은 변경하지 않는다.

---

## 비변경 항목

- 슬롯머신 릴 애니메이션 로직 (ITEM_H, SPIN_BEFORE, SPIN_DUR 등)
- 팀 카드 색상 및 그라디언트 스타일
- 피날레 화면 레이아웃
- GroupDrawCeremony의 grid 스테이지
- `confetti` 효과
