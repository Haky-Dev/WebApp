# 배정 애니메이션 화면 레이아웃 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AssignmentAnimation과 GroupDrawCeremony의 드럼롤 화면을 3-zone 레이아웃으로 재구성해 슬롯머신 위치 고정, 카드 줄바꿈, 정보 위계 개선을 달성한다.

**Architecture:** 현재 슬롯머신·카드·버튼이 하나의 flex 컬럼에 섞여 있는 구조를 Zone A(헤더, fixed height) + Zone B(슬롯머신+버튼, flex:1) + Zone C(카드, fixed height 110px) 3-zone으로 분리한다. Zone B가 `flex: 1`을 차지하므로 Zone C에 카드가 쌓여도 슬롯머신 위치가 변하지 않는다.

**Tech Stack:** React 18, TypeScript, inline styles (기존 패턴 유지)

---

### Task 1: AssignmentAnimation.tsx — 드럼롤 페이즈 3-zone 재구성

**Files:**
- Modify: `components/animation/AssignmentAnimation.tsx`

- [ ] **Step 1: 상수 정리 — BOTTOM_H 제거, CARD_ZONE_H 추가**

`components/animation/AssignmentAnimation.tsx` 116–118번 줄:

```tsx
// 현재
  const REEL_H = ITEM_H * VISIBLE
  const hasBottomCards = revealedPairs.length > 0
  const BOTTOM_H = isDesktop ? 130 : 80
```

→

```tsx
// 변경
  const REEL_H = ITEM_H * VISIBLE
  const CARD_ZONE_H = isDesktop ? 110 : 80
```

- [ ] **Step 2: drumroll 페이즈 Zone B + Zone C로 분리**

136번 줄 `{phase === 'drumroll' && (` 블록 내부의 Zone B(148–259번 줄 `<div style={{ flex: 1, ...}}> ... </div>`)를 아래 코드로 통째로 교체한다.

> 핵심 변경: (1) 기존 Zone B에서 카드 섹션 제거 → Zone C로 이동, (2) `FIRST`/`SECOND` 레이블 `#555`→`#aaa`, (3) `×` 구분자 `#1e1e1e`→`#555`, (4) 카드 `minWidth` 320→160px, 이름 폰트 30→16px

```tsx
          {/* Zone B: 슬롯머신 존 — flex:1, 항상 중앙 고정 */}
          <div style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: '100%',
            position: 'relative', zIndex: 1,
            padding: `0 ${isDesktop ? 48 : 20}px`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: isDesktop ? 700 : 440 }}>

              {/* 왼쪽: 퍼스트 플레이어 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isDesktop ? 8 : 5 }}>
                <div style={{ fontSize: 10, letterSpacing: '2px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>FIRST</div>
                <div style={{ fontSize: 'clamp(18px, 2.8vw, 38px)', fontWeight: 900, color: '#f1f5f9', textShadow: '0 0 20px rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 1.1 }}>
                  {pairs[currentTeam]?.a.name}
                </div>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {pairs[currentTeam]?.a.club && (
                    <><ClubBadge name={pairs[currentTeam].a.club!} color={clubColors.get(pairs[currentTeam].a.club!)} fontSize={11} fontWeight={700} /><span>·</span></>
                  )}
                  {pairs[currentTeam] && <RatingBadge rating={pairs[currentTeam].a.rating} fontSize={11} />}
                </div>
              </div>

              {/* 구분자 */}
              <div style={{ fontSize: isDesktop ? 22 : 16, color: '#555', fontWeight: 900, flexShrink: 0, padding: `0 ${isDesktop ? 18 : 10}px` }}>×</div>

              {/* 오른쪽: 세컨드 슬롯머신 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isDesktop ? 8 : 5 }}>
                <div style={{ fontSize: 10, letterSpacing: '2px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>SECOND</div>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: REEL_H,
                  overflow: 'hidden',
                  borderRadius: 14,
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${spinState === 'locked' ? 'rgba(57,255,20,0.35)' : '#111'}`,
                  boxShadow: spinState === 'locked'
                    ? '0 0 32px rgba(57,255,20,0.25), inset 0 0 20px rgba(57,255,20,0.05)'
                    : '0 0 20px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.3)',
                  transition: 'border-color 0.4s, box-shadow 0.4s',
                }}>
                  <div style={{
                    position: 'absolute', top: ITEM_H * CENTER, left: 0, right: 0, height: ITEM_H,
                    background: spinState === 'locked' ? 'rgba(57,255,20,0.06)' : 'rgba(255,255,255,0.02)',
                    borderTop: `1px solid ${spinState === 'locked' ? 'rgba(57,255,20,0.5)' : '#1a1a1a'}`,
                    borderBottom: `1px solid ${spinState === 'locked' ? 'rgba(57,255,20,0.5)' : '#1a1a1a'}`,
                    zIndex: 2, pointerEvents: 'none', transition: 'background 0.4s, border-color 0.4s',
                  }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to bottom, #010101, transparent)', zIndex: 3, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to top, #010101, transparent)', zIndex: 3, pointerEvents: 'none' }} />
                  <div ref={reelRef}>
                    {reelItems.map((name, i) => (
                      <div key={i} style={{
                        height: ITEM_H,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'clamp(18px, 2.5vw, 28px)',
                        fontWeight: 900,
                        color: spinState === 'locked' && i === SPIN_BEFORE ? '#39ff14' : '#e2e8f0',
                        textShadow: spinState === 'locked' && i === SPIN_BEFORE
                          ? '0 0 20px #39ff14, 0 0 40px rgba(57,255,20,0.4)'
                          : 'none',
                        animation: spinState === 'locked' && i === SPIN_BEFORE ? 'spinBounce 0.3s ease both' : 'none',
                        transition: 'color 0.3s, text-shadow 0.3s',
                        userSelect: 'none', letterSpacing: '-0.5px',
                      }}>
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
                {spinState === 'locked' && pairs[currentTeam] && (
                  <div style={{
                    fontSize: 11, color: '#555', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap',
                    animation: 'slideUp 0.3s ease both',
                  }}>
                    {pairs[currentTeam].b.club && (
                      <><ClubBadge name={pairs[currentTeam].b.club!} color={clubColors.get(pairs[currentTeam].b.club!)} fontSize={11} fontWeight={700} /><span>·</span></>
                    )}
                    <RatingBadge rating={pairs[currentTeam].b.rating} fontSize={11} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Zone C: 카드 존 — 고정 높이, flex-wrap */}
          <div style={{
            height: CARD_ZONE_H,
            flexShrink: 0,
            width: '100%',
            padding: '8px 12px',
            overflowY: 'auto',
            position: 'relative', zIndex: 1,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
              {revealedPairs.map((p, i) => {
                const combined = ((p.a.rating ?? 0) + (p.b.rating ?? 0)).toFixed(2)
                return (
                  <div key={i} style={{
                    background: `linear-gradient(135deg, rgba(10,10,10,0.95), ${teamColorRgba(i)})`,
                    border: `1px solid ${teamColor(i)}25`,
                    borderRadius: 8,
                    padding: isDesktop ? '10px 14px' : '8px 10px',
                    minWidth: isDesktop ? 160 : 130,
                    animation: 'slideUp 0.4s ease both',
                  }}>
                    <div style={{ fontSize: isDesktop ? 11 : 10, fontWeight: 800, color: teamColor(i), letterSpacing: '2px', marginBottom: isDesktop ? 4 : 3 }}>
                      팀 {i + 1}
                    </div>
                    <div style={{ fontSize: isDesktop ? 16 : 13, fontWeight: 900, color: '#f1f5f9', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
                      {p.a.name} <span style={{ color: '#333', margin: '0 3px', fontWeight: 700 }}>×</span> {p.b.name}
                    </div>
                    <div style={{ fontSize: isDesktop ? 11 : 10, color: '#444', marginTop: isDesktop ? 4 : 2 }}>
                      합산 {combined}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
```

- [ ] **Step 3: TypeScript 오류 확인**

```bash
cd D:/Repository/WebApp && npx tsc --noEmit
```

Expected: 오류 없음. 오류가 나면 제거한 `hasBottomCards` 또는 `BOTTOM_H`가 다른 곳에서 참조되는지 확인.

- [ ] **Step 4: Commit**

```bash
git add components/animation/AssignmentAnimation.tsx
git commit -m "refactor: 3-zone layout for AssignmentAnimation drumroll"
```

---

### Task 2: GroupDrawCeremony.tsx — draw 스테이지 3-zone 재구성

**Files:**
- Modify: `components/animation/GroupDrawCeremony.tsx`

- [ ] **Step 1: BOTTOM_H 제거, CARD_ZONE_H 추가**

draw 스테이지 블록 내부(209번 줄 `if (stage === 'draw') {` 직후) 상수 선언 부분:

```tsx
// 현재 (214–217번 줄 근처)
    const hasCards = revealedTeams.length > 0
    const REEL_H = ITEM_H * VISIBLE
    const groupColor = colorFor(groupIdx)
    const BOTTOM_H = isDesktop ? 200 : 145
```

→

```tsx
// 변경
    const REEL_H = ITEM_H * VISIBLE
    const groupColor = colorFor(groupIdx)
    const CARD_ZONE_H = isDesktop ? 110 : 80
```

- [ ] **Step 2: draw 스테이지 Zone B + Zone C로 분리**

230번 줄 `{/* 메인: 슬롯머신+카드+버튼... */}` 블록(`<div style={{ flex: 1, ...}}>` 부터 닫는 `</div>`까지)을 아래 코드로 통째로 교체한다.

> 핵심 변경: (1) 버튼을 카드 영역에서 Zone B(슬롯 바로 아래)로 이동, (2) 카드를 Zone C(flex-wrap)로 분리, (3) `FIRST`/`SECOND` `#555`→`#aaa`, `×` `#1e1e1e`→`#555`, (4) 카드 compact 크기

```tsx
        {/* Zone B: 슬롯머신 + 버튼 — flex:1, 중앙 고정 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: `0 ${isDesktop ? 48 : 20}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: isDesktop ? 700 : 440 }}>

            {/* 왼쪽: 퍼스트 플레이어 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isDesktop ? 8 : 5 }}>
              <div style={{ fontSize: 10, letterSpacing: '2px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>FIRST</div>
              <div style={{ fontSize: 'clamp(18px, 2.8vw, 38px)', fontWeight: 900, color: '#f1f5f9', textAlign: 'center', lineHeight: 1.1, letterSpacing: -1 }}>
                {activeTeam?.a.name}
              </div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                {activeTeam?.a.club && (
                  <><ClubBadge name={activeTeam.a.club} color={clubColors.get(activeTeam.a.club)} fontSize={11} fontWeight={700} /><span>·</span></>
                )}
                {activeTeam && <RatingBadge rating={activeTeam.a.rating} fontSize={11} />}
              </div>
            </div>

            {/* 구분자 */}
            <div style={{ fontSize: isDesktop ? 22 : 16, color: '#555', fontWeight: 900, flexShrink: 0, padding: `0 ${isDesktop ? 18 : 10}px` }}>×</div>

            {/* 오른쪽: 세컨드 슬롯머신 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isDesktop ? 8 : 5 }}>
              <div style={{ fontSize: 10, letterSpacing: '2px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' }}>SECOND</div>
              <div style={{
                position: 'relative',
                width: '100%',
                height: REEL_H,
                overflow: 'hidden',
                borderRadius: 14,
                background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${phase === 'locked' ? `${groupColor}55` : '#111'}`,
                boxShadow: phase === 'locked'
                  ? `0 0 32px ${groupColor}30, inset 0 0 20px ${groupColor}08`
                  : '0 0 20px rgba(0,0,0,0.8)',
                transition: 'border-color 0.4s, box-shadow 0.4s',
              }}>
                <div style={{
                  position: 'absolute', top: ITEM_H * CENTER, left: 0, right: 0, height: ITEM_H,
                  background: phase === 'locked' ? `${groupColor}0a` : 'rgba(255,255,255,0.02)',
                  borderTop: `1px solid ${phase === 'locked' ? `${groupColor}55` : '#1a1a1a'}`,
                  borderBottom: `1px solid ${phase === 'locked' ? `${groupColor}55` : '#1a1a1a'}`,
                  zIndex: 2, pointerEvents: 'none', transition: 'background 0.4s, border-color 0.4s',
                }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to bottom, #010101, transparent)', zIndex: 3, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to top, #010101, transparent)', zIndex: 3, pointerEvents: 'none' }} />
                <div ref={reelRef}>
                  {reelItems.map((name, i) => (
                    <div key={i} style={{
                      height: ITEM_H,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(18px, 2.5vw, 26px)',
                      fontWeight: 900,
                      color: phase === 'locked' && i === SPIN_BEFORE
                        ? groupColor
                        : name === '?' ? '#2a2a2a' : '#e2e8f0',
                      textShadow: phase === 'locked' && i === SPIN_BEFORE
                        ? `0 0 20px ${groupColor}, 0 0 40px ${groupColor}66`
                        : 'none',
                      animation: phase === 'locked' && i === SPIN_BEFORE ? 'spinBounce 0.3s ease both' : 'none',
                      transition: 'color 0.3s, text-shadow 0.3s',
                      userSelect: 'none', letterSpacing: '-0.5px',
                    }}>
                      {name}
                    </div>
                  ))}
                </div>
              </div>
              {phase === 'locked' && activeTeam && (
                <div style={{
                  fontSize: 11, color: '#555', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap',
                  animation: 'slideUp 0.3s ease both',
                }}>
                  {activeTeam.b.club && (
                    <><ClubBadge name={activeTeam.b.club} color={clubColors.get(activeTeam.b.club)} fontSize={11} fontWeight={700} /><span>·</span></>
                  )}
                  <RatingBadge rating={activeTeam.b.rating} fontSize={11} />
                </div>
              )}
            </div>
          </div>

          {/* 버튼 — 슬롯머신 바로 아래 (Zone B 내부) */}
          <button
            onClick={phase === 'idle' ? startSpin : phase === 'locked' ? proceed : undefined}
            disabled={phase === 'spinning'}
            className="btn-cta"
            style={{ maxWidth: 320, width: '100%', marginTop: isDesktop ? 16 : 12 }}
          >
            {phase === 'spinning'
              ? 'DRAWING...'
              : phase === 'idle'
                ? '▸ 팀 추첨'
                : revealCount < group.teams.length
                  ? '다음 팀 →'
                  : '그룹 완료 ✓'}
          </button>
        </div>

        {/* Zone C: 카드 존 — 고정 높이, flex-wrap */}
        <div style={{
          height: CARD_ZONE_H,
          flexShrink: 0,
          width: '100%',
          padding: '8px 12px',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
            {revealedTeams.map((t, i) => {
              const combined = ((t.a.rating ?? 0) + (t.b.rating ?? 0)).toFixed(2)
              return (
                <div key={t.label} style={{
                  background: `linear-gradient(135deg, rgba(10,10,10,0.95), ${groupColor}15)`,
                  border: `1px solid ${groupColor}25`,
                  borderRadius: 8,
                  padding: isDesktop ? '10px 14px' : '8px 10px',
                  minWidth: isDesktop ? 160 : 130,
                  animation: 'slideUp 0.4s ease both',
                }}>
                  <div style={{ fontSize: isDesktop ? 11 : 10, fontWeight: 800, color: groupColor, letterSpacing: '2px', marginBottom: isDesktop ? 4 : 3 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: isDesktop ? 16 : 13, fontWeight: 900, color: '#f1f5f9', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
                    {t.a.name} <span style={{ color: '#333', margin: '0 3px', fontWeight: 700 }}>×</span> {t.b.name}
                  </div>
                  <div style={{ fontSize: isDesktop ? 11 : 10, color: '#444', marginTop: isDesktop ? 4 : 2 }}>합산 {combined}</div>
                </div>
              )
            })}
          </div>
        </div>
```

- [ ] **Step 3: TypeScript 오류 확인**

```bash
cd D:/Repository/WebApp && npx tsc --noEmit
```

Expected: 오류 없음. 오류가 나면 제거한 `hasCards` 또는 `BOTTOM_H`가 다른 곳에서 참조되는지 확인.

- [ ] **Step 4: Commit**

```bash
git add components/animation/GroupDrawCeremony.tsx
git commit -m "refactor: 3-zone layout for GroupDrawCeremony draw stage"
```

---

### Task 3: 수동 검증

**Files:**
- Read (검증 후): `components/animation/AssignmentAnimation.tsx`
- Read (검증 후): `components/animation/GroupDrawCeremony.tsx`

- [ ] **Step 1: 개발 서버 시작**

```bash
cd D:/Repository/WebApp && npm run dev
```

브라우저에서 `http://localhost:3000` 열기

- [ ] **Step 2: AssignmentAnimation 검증 체크리스트**

어드민 페이지(`/events/[id]/admin`)에서 레이팅순 파트너 배정 실행:

| 항목 | 기대 결과 |
|------|-----------|
| 첫 팀 공개 전 | 슬롯머신이 화면 수직 중앙에 위치 |
| 첫 팀 공개 후 | 슬롯머신 위치 변화 없음. Zone C에 카드 등장 |
| 팀 4개 이상 공개 | Zone C에서 카드가 두 번째 줄로 줄바꿈 |
| FIRST/SECOND 레이블 | 기존보다 밝게 표시됨 (#aaa) |
| × 구분자 | 기존보다 밝게 표시됨 (#555) |
| 모바일 뷰포트 (375px) | Zone C 높이 80px, 카드 minWidth 130px |

- [ ] **Step 3: GroupDrawCeremony 검증 체크리스트**

어드민 페이지에서 그룹 팀 추첨 실행:

| 항목 | 기대 결과 |
|------|-----------|
| "▸ 팀 추첨" 버튼 위치 | 슬롯머신 릴 바로 아래 |
| 팀 공개 시 슬롯머신 위치 | 변화 없음 |
| 버튼 상태 변경 | idle→spinning→locked 시 버튼 텍스트만 변하고 위치는 고정 |
| 카드 줄바꿈 | 3개 이상 시 두 번째 줄로 넘어감 |
| grid / finale 스테이지 | 영향 없음 — 기존과 동일하게 동작 |
