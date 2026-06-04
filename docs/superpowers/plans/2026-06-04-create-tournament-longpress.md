# Create Tournament Long-press Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "진행 중인 토너먼트" 섹션 타이틀 3초 롱프레스 시 토너먼트 개설 모달이 열리도록 `app/page.tsx`를 수정한다.

**Architecture:** 기존 마스터 어드민 롱프레스 패턴(로고 3초 롱프레스 → PIN 모달)을 그대로 따른다. `showCreateModal` state와 `createPressTimer` ref를 추가하고, "진행 중인 토너먼트" 타이틀에 마우스/터치 이벤트를 바인딩한다. 모달 내 폼 제출은 기존 `handleCreate` 함수를 재사용한다.

**Tech Stack:** Next.js 14 App Router, React (useState/useRef), TypeScript

---

### Task 1: state와 ref 추가

**Files:**
- Modify: `app/page.tsx` (상태 선언부, 대략 line 46–68)

- [ ] **Step 1: `showCreateModal` state와 `createPressTimer` ref 추가**

`app/page.tsx`의 기존 ref/state 선언부(`pressTimer` ref 바로 아래)에 두 줄을 추가한다.

변경 전 (`app/page.tsx:68`):
```tsx
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
```

변경 후:
```tsx
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const createPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
```

- [ ] **Step 2: 롱프레스 핸들러 함수 추가**

`endPress` 함수 바로 아래에 추가한다.

변경 전 (`app/page.tsx:148-150`):
```tsx
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }
```

변경 후:
```tsx
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  function startCreatePress() {
    if (showCreateModal) return
    createPressTimer.current = setTimeout(() => setShowCreateModal(true), 3000)
  }
  function endCreatePress() {
    if (createPressTimer.current) clearTimeout(createPressTimer.current)
  }
```

- [ ] **Step 3: 빌드 오류 없는지 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음 (또는 기존과 동일한 오류만)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add showCreateModal state and createPressTimer ref"
```

---

### Task 2: "진행 중인 토너먼트" 타이틀에 롱프레스 이벤트 바인딩

**Files:**
- Modify: `app/page.tsx` (JSX 섹션, 대략 line 272)

- [ ] **Step 1: 타이틀 div에 이벤트 핸들러 추가**

변경 전 (`app/page.tsx:272-274`):
```tsx
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>
          진행 중인 토너먼트
        </div>
```

변경 후:
```tsx
        <div
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10, cursor: 'default', userSelect: 'none' }}
          onMouseDown={startCreatePress} onMouseUp={endCreatePress} onMouseLeave={endCreatePress}
          onTouchStart={startCreatePress} onTouchEnd={endCreatePress} onTouchCancel={endCreatePress}
        >
          진행 중인 토너먼트
        </div>
```

- [ ] **Step 2: 빌드 오류 없는지 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: bind long-press events to tournament section title"
```

---

### Task 3: 토너먼트 개설 모달 JSX 추가

**Files:**
- Modify: `app/page.tsx` (모달 렌더링 섹션, 대략 line 156–190)

- [ ] **Step 1: 모달 JSX 추가**

기존 마스터 PIN 모달(`{showMasterPinModal && (...)}`) 바로 아래에 추가한다.

변경 전 (`app/page.tsx:183-190`):
```tsx
        {/* 이벤트별 어드민 PIN 모달 */}
        {adminTarget && (
```

변경 후:
```tsx
        {/* 토너먼트 개설 모달 */}
        {showCreateModal && (
          <div className="modal-overlay">
            <form
              className="modal-panel"
              style={{ borderTop: '2px solid var(--neon-cyan)' }}
              onSubmit={handleCreate}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
                🏆 토너먼트 개설
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 18 }}>
                새 토너먼트 만들기
              </div>
              <label className="field-label">토너먼트 이름</label>
              <input
                className="input-field"
                style={{ marginBottom: 12 }}
                placeholder="예: 봄 클럽 드래프트"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
              <label className="field-label">관리자 PIN (4자리 이상)</label>
              <input
                type="password"
                className="input-field"
                style={{ marginBottom: 12, letterSpacing: '6px' }}
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                minLength={4}
              />
              {createError && (
                <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{createError}</p>
              )}
              <button type="submit" disabled={creating} className="btn-cta" style={{ marginBottom: 10 }}>
                {creating ? '생성 중...' : '+ 만들기'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ width: '100%' }}
                onClick={() => {
                  setShowCreateModal(false)
                  setName('')
                  setPin('')
                  setCreateError('')
                }}
              >
                취소
              </button>
            </form>
          </div>
        )}

        {/* 이벤트별 어드민 PIN 모달 */}
        {adminTarget && (
```

- [ ] **Step 2: `handleCreate` 동작 확인**

`handleCreate` 함수(`app/page.tsx:82-95`)의 두 가지 경로:
- **성공:** `router.push(/events/${event.id})` → 페이지 이동으로 모달 자연 소멸
- **실패:** `setCreateError(d.error)` 세팅 후 early return → 모달 유지, 에러 표시

`onSubmit={handleCreate}` 직접 연결이 가장 안전하다. React state는 비동기이므로 `await` 후 state 값을 읽는 방식은 stale value를 읽을 수 있다.

- [ ] **Step 3: 빌드 오류 없는지 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add create tournament modal triggered by long-press on section title"
```

---

### Task 4: 동작 검증

**Files:**
- Read: `app/page.tsx` (최종 상태 확인)

- [ ] **Step 1: 개발 서버 실행**

```bash
npm run dev
```

Expected: `http://localhost:3000` 에서 홈 화면 로드

- [ ] **Step 2: 롱프레스 동작 확인**

브라우저에서 "진행 중인 토너먼트" 텍스트를 마우스로 3초 클릭 유지 → 토너먼트 개설 모달 표시 확인

- [ ] **Step 3: 모달 필드 및 취소 확인**

- 모달에 토너먼트 이름과 관리자 PIN 필드가 표시되는지 확인
- "취소" 클릭 시 모달 닫히고 입력값 초기화 확인

- [ ] **Step 4: 토너먼트 생성 확인**

- 이름과 PIN 입력 후 `+ 만들기` 클릭
- 성공 시 `/events/{id}` 페이지로 이동 확인
- 실패 시(중복 PIN 등) 에러 메시지 표시 및 모달 유지 확인

- [ ] **Step 5: 기존 기능 회귀 확인**

- 로고 3초 롱프레스 → 마스터 PIN 모달 여전히 동작하는지 확인
- 마스터 어드민 로그인 후 동호회 관리 + 토너먼트 생성 패널 정상 표시 확인
