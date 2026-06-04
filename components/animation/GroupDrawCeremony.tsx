'use client'
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type { DrawnGroup } from '@/lib/algorithms/group-draw'

interface Props {
  groups: DrawnGroup[]
  publishing: boolean
  onPublish: () => void
}

type Stage = 'grid' | 'draw' | 'finale'
type Phase = 'idle' | 'spinning' | 'locked'

const COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const colorFor = (i: number) => COLORS[i % COLORS.length]

const bracket: React.CSSProperties = {
  position: 'absolute', width: 34, height: 34,
  borderColor: 'rgba(57,255,20,0.4)', borderStyle: 'solid',
}

export default function GroupDrawCeremony({ groups, publishing, onPublish }: Props) {
  const [stage, setStage] = useState<Stage>('grid')
  const [groupIdx, setGroupIdx] = useState(0)
  const [done, setDone] = useState<boolean[]>(() => groups.map(() => false))
  const [revealCount, setRevealCount] = useState(0) // 확정된 팀 수
  const [phase, setPhase] = useState<Phase>('idle')
  const [spinName, setSpinName] = useState('???')
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (spinTimer.current) clearTimeout(spinTimer.current) }, [])

  const group = groups[groupIdx]
  const allDone = done.every(Boolean)

  function openGroup(idx: number) {
    setGroupIdx(idx)
    setRevealCount(0)
    setPhase('idle')
    setSpinName('???')
    setStage('draw')
  }

  function startSpin() {
    if (phase !== 'idle') return
    const g = groups[groupIdx]
    const team = g.teams[revealCount]
    if (!team) return
    setPhase('spinning')
    const candidates = g.teams.map(t => t.b.name)
    let speed = 80
    let elapsed = 0
    const total = 1000
    const tick = () => {
      setSpinName(candidates[Math.floor(Math.random() * candidates.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      if (elapsed < total) {
        spinTimer.current = setTimeout(tick, speed)
      } else {
        setSpinName(team.b.name)
        setRevealCount(revealCount + 1)
        setPhase('locked')
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.55 }, colors: COLORS })
      }
    }
    tick()
  }

  function proceed() {
    if (phase !== 'locked') return
    const g = groups[groupIdx]
    if (revealCount < g.teams.length) {
      setPhase('idle')
      setSpinName('???')
      return
    }
    // 그룹 완료
    const nextDone = done.map((d, i) => (i === groupIdx ? true : d))
    setDone(nextDone)
    if (nextDone.every(Boolean)) {
      setStage('finale')
      setTimeout(() => confetti({ particleCount: 220, spread: 100, origin: { y: 0.5 }, colors: COLORS }), 300)
    } else {
      setStage('grid')
    }
  }

  const stageBox: React.CSSProperties = {
    position: 'fixed', inset: 0, background: '#010101', color: '#f1f5f9',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  }
  const Scan = () => (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35,
      background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.22) 3px,rgba(0,0,0,0.22) 4px)',
    }} />
  )
  const Brackets = () => (
    <>
      <div style={{ ...bracket, top: 16, left: 16, borderRight: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, top: 16, right: 16, borderLeft: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, left: 16, borderRight: 0, borderTop: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, right: 16, borderLeft: 0, borderTop: 0, borderWidth: 2 }} />
    </>
  )

  // ② 그룹 선택
  if (stage === 'grid') {
    return (
      <div style={stageBox}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#39ff14', textShadow: '0 0 10px #39ff14', textTransform: 'uppercase' }}>
          SELECT GROUP · {done.filter(Boolean).length} / {groups.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(groups.length, 4)}, 1fr)`, gap: 20, maxWidth: '80vw' }}>
          {groups.map((g, i) => (
            <button
              key={g.letter}
              onClick={() => !done[i] && openGroup(i)}
              disabled={done[i]}
              style={{
                aspectRatio: '1 / 1.05', minWidth: 120, cursor: done[i] ? 'default' : 'pointer',
                background: 'transparent', borderRadius: 14,
                border: `1.5px solid ${done[i] ? '#262626' : colorFor(i)}`,
                boxShadow: done[i] ? 'none' : `0 0 24px ${colorFor(i)}22`,
                opacity: done[i] ? 0.4 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, color: done[i] ? '#888' : colorFor(i), textShadow: done[i] ? 'none' : `0 0 16px ${colorFor(i)}` }}>{g.letter}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>
                {done[i] ? '✓ 완료' : `${g.teams.length}팀 · 추첨 대기`}
              </span>
            </button>
          ))}
        </div>
        {allDone && (
          <button onClick={onPublish} disabled={publishing} className="btn-cta" style={{ marginTop: 36, maxWidth: 320 }}>
            {publishing ? '발표 중...' : '결과 발표 ✓'}
          </button>
        )}
      </div>
    )
  }

  // ③ 그룹 내 팀 추첨
  if (stage === 'draw') {
    // locked 단계는 방금 확정된 팀(revealCount-1), 그 외엔 진행 중 팀(revealCount)
    const activeIdx = phase === 'locked' ? revealCount - 1 : revealCount
    const activeTeam = group.teams[Math.min(activeIdx, group.teams.length - 1)]
    const teamNo = Math.min(activeIdx + 1, group.teams.length)
    return (
      <div style={stageBox}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: colorFor(groupIdx), textShadow: `0 0 10px ${colorFor(groupIdx)}`, textTransform: 'uppercase' }}>
          GROUP {group.letter} · 팀 {teamNo} / {group.teams.length}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(30px,6.5vw,86px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
            {activeTeam?.a.name}
          </div>
          <div style={{ fontSize: 14, color: '#666', fontWeight: 700, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
            RATING {activeTeam?.a.rating}
          </div>
          <div style={{ fontSize: 26, color: '#3a3a3a', fontWeight: 700, margin: '14px 0' }}>+</div>
          <div style={{
            fontSize: 'clamp(34px,7.2vw,98px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1,
            color: phase === 'locked' ? '#39ff14' : '#555',
            textShadow: phase === 'locked' ? '0 0 22px #39ff14, 0 0 60px rgba(57,255,20,.45)' : 'none',
            transition: 'color .2s, text-shadow .2s', minHeight: '1.1em',
          }}>
            {phase === 'idle' ? '???' : spinName}
          </div>
          {phase === 'locked' && (
            <div style={{ fontSize: 14, color: '#666', fontWeight: 700, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
              RATING {activeTeam?.b.rating}
            </div>
          )}
        </div>

        {revealCount > 0 && (
          <div style={{ position: 'absolute', bottom: 30, left: 34, fontSize: 11, color: '#3f3f3f', fontWeight: 700, lineHeight: 1.7, textAlign: 'left' }}>
            {group.teams.slice(0, revealCount).map(t => (
              <div key={t.label}>{t.label} · {t.a.name} + {t.b.name}</div>
            ))}
          </div>
        )}

        <button
          onClick={phase === 'idle' ? startSpin : phase === 'locked' ? proceed : undefined}
          disabled={phase === 'spinning'}
          className="btn-cta"
          style={{ position: 'absolute', bottom: 34, maxWidth: 320 }}
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
    )
  }

  // ④ 전체 결과 발표
  return (
    <div style={stageBox}>
      <Scan /><Brackets />
      <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 10px #00d4ff', textTransform: 'uppercase' }}>
        TOURNAMENT DRAFT · 오늘의 팀
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '84vw', maxWidth: 900, maxHeight: '64vh', overflowY: 'auto', marginTop: 24 }}>
        {groups.flatMap((g, gi) => g.teams.map(t => (
          <div key={t.label} style={{ border: `1px solid ${colorFor(gi)}`, borderRadius: 9, padding: '11px 13px', boxShadow: `0 0 12px ${colorFor(gi)}22`, animation: 'slideUp 0.4s ease both' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: colorFor(gi), marginBottom: 5 }}>{t.label}</div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4 }}>{t.a.name} <span style={{ color: '#444' }}>×</span> {t.b.name}</div>
          </div>
        )))}
      </div>
      <button onClick={onPublish} disabled={publishing} className="btn-cta" style={{ marginTop: 20, maxWidth: 320 }}>
        {publishing ? '발표 중...' : '결과 발표 ✓'}
      </button>
    </div>
  )
}
