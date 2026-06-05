'use client'
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type { DrawnGroup } from '@/lib/algorithms/group-draw'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import RatingBadge from '@/components/ui/RatingBadge'

interface Props {
  groups: DrawnGroup[]
  publishing: boolean
  onPublish: () => void
}

type Stage = 'grid' | 'draw' | 'finale'
type Phase = 'idle' | 'spinning' | 'locked'
type SpinVisualPhase = 'idle' | 'fast' | 'slow' | 'locking' | 'locked'

const COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const colorFor = (i: number) => COLORS[i % COLORS.length]

const bracket: React.CSSProperties = {
  position: 'absolute', width: 34, height: 34,
  borderColor: 'rgba(57,255,20,0.4)', borderStyle: 'solid',
}

function Scan() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35,
      background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.22) 3px,rgba(0,0,0,0.22) 4px)',
    }} />
  )
}

function Brackets() {
  return (
    <>
      <div style={{ ...bracket, top: 16, left: 16, borderRight: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, top: 16, right: 16, borderLeft: 0, borderBottom: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, left: 16, borderRight: 0, borderTop: 0, borderWidth: 2 }} />
      <div style={{ ...bracket, bottom: 16, right: 16, borderLeft: 0, borderTop: 0, borderWidth: 2 }} />
    </>
  )
}

export default function GroupDrawCeremony({ groups, publishing, onPublish }: Props) {
  const isDesktop = useIsDesktop()
  const [stage, setStage] = useState<Stage>('grid')
  const [groupIdx, setGroupIdx] = useState(0)
  const [done, setDone] = useState<boolean[]>(() => groups.map(() => false))
  const [revealCount, setRevealCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [spinVisualPhase, setSpinVisualPhase] = useState<SpinVisualPhase>('idle')
  const [spinName, setSpinName] = useState('???')
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (spinTimer.current) clearTimeout(spinTimer.current) }, [])

  const group = groups[groupIdx]
  const allDone = done.every(Boolean)

  function openGroup(idx: number) {
    setGroupIdx(idx)
    setRevealCount(0)
    setPhase('idle')
    setSpinVisualPhase('idle')
    setSpinName('???')
    setStage('draw')
  }

  function startSpin() {
    if (phase !== 'idle') return
    const g = groups[groupIdx]
    const team = g.teams[revealCount]
    if (!team) return
    setPhase('spinning')
    setSpinVisualPhase('fast')
    const candidates = g.teams.map(t => t.b.name)
    let speed = 80
    let elapsed = 0
    const total = 1000
    const tick = () => {
      setSpinName(candidates[Math.floor(Math.random() * candidates.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      setSpinVisualPhase(speed < 250 ? 'fast' : 'slow')
      if (elapsed < total) {
        spinTimer.current = setTimeout(tick, speed)
      } else {
        setSpinName(team.b.name)
        setSpinVisualPhase('locking')
        setRevealCount(revealCount + 1)
        setPhase('locked')
        setTimeout(() => setSpinVisualPhase('locked'), 300)
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
      setSpinVisualPhase('idle')
      setSpinName('???')
      return
    }
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

  // 그룹 선택 단계
  if (stage === 'grid') {
    const cols = isDesktop ? Math.min(groups.length, 6) : Math.min(groups.length, 4)
    return (
      <div style={stageBox}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#39ff14', textShadow: '0 0 10px #39ff14', textTransform: 'uppercase' }}>
          SELECT GROUP · {done.filter(Boolean).length} / {groups.length}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20, maxWidth: '80vw' }}>
          {groups.map((g, i) => (
            <button
              key={g.letter}
              onClick={() => !done[i] && openGroup(i)}
              disabled={done[i]}
              style={{
                aspectRatio: '1 / 1.05',
                minWidth: isDesktop ? 160 : 120,
                cursor: done[i] ? 'default' : 'pointer',
                background: 'transparent', borderRadius: 14,
                border: `1.5px solid ${done[i] ? '#262626' : colorFor(i)}`,
                boxShadow: done[i] ? 'none' : `0 0 24px ${colorFor(i)}22`,
                opacity: done[i] ? 0.4 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: isDesktop ? 'clamp(36px,5vw,80px)' : 'clamp(36px,5vw,64px)', fontWeight: 900, color: done[i] ? '#888' : colorFor(i), textShadow: done[i] ? 'none' : `0 0 16px ${colorFor(i)}` }}>{g.letter}</span>
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

  // 추첨 단계
  if (stage === 'draw') {
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
          {/* 팀A */}
          <div style={{ fontSize: 'clamp(30px,6.5vw,86px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
            {activeTeam?.a.name}
          </div>
          <div style={{ fontSize: 14, color: '#555', fontWeight: 700, marginTop: 6 }}>
            {activeTeam?.a.club ? `${activeTeam.a.club} · ` : ''}
            {activeTeam && <RatingBadge rating={activeTeam.a.rating} fontSize={14} />}
          </div>

          <div style={{ fontSize: 26, color: '#3a3a3a', fontWeight: 700, margin: '14px 0' }}>+</div>

          {/* 스핀 이름 */}
          <div style={{
            fontSize: 'clamp(34px,7.2vw,98px)', fontWeight: 900, letterSpacing: -2, lineHeight: 1,
            color: spinVisualPhase === 'locked' || spinVisualPhase === 'locking' ? '#39ff14' : '#555',
            textShadow: spinVisualPhase === 'locked' || spinVisualPhase === 'locking'
              ? '0 0 22px #39ff14, 0 0 60px rgba(57,255,20,.45)'
              : 'none',
            filter: spinVisualPhase === 'fast' ? 'blur(2px)' : 'blur(0)',
            opacity: spinVisualPhase === 'fast' ? 0.7 : 1,
            animation: spinVisualPhase === 'locking' ? 'spinBounce 0.3s ease both' : 'none',
            transition: 'color .2s, text-shadow .2s, filter 0.15s, opacity 0.15s',
            minHeight: '1.1em',
          }}>
            {phase === 'idle' ? '???' : spinName}
          </div>
          {(spinVisualPhase === 'locked' || spinVisualPhase === 'locking') && activeTeam && (
            <div style={{ fontSize: 14, color: '#555', fontWeight: 700, marginTop: 6 }}>
              {activeTeam.b.club ? `${activeTeam.b.club} · ` : ''}
              <RatingBadge rating={activeTeam.b.rating} fontSize={14} />
            </div>
          )}
        </div>

        {revealCount > 0 && (
          <div style={{ position: 'absolute', bottom: 30, left: 34, fontSize: 11, color: '#3f3f3f', fontWeight: 700, lineHeight: 1.7, textAlign: 'left' }}>
            {group.teams.slice(0, revealCount).map(t => (
              <div key={t.label}>{t.label} · {t.a.name} (<RatingBadge rating={t.a.rating} fontSize={11} />) + {t.b.name} (<RatingBadge rating={t.b.rating} fontSize={11} />)</div>
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

  // 피날레 단계
  const finaleColumns = isDesktop ? 5 : 3
  const finaleMaxWidth = isDesktop ? 1200 : 900
  return (
    <div style={stageBox}>
      <Scan /><Brackets />
      <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: '#00d4ff', textShadow: '0 0 10px #00d4ff', textTransform: 'uppercase' }}>
        TOURNAMENT DRAFT · 오늘의 팀
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${finaleColumns}, 1fr)`, gap: 12, width: '84vw', maxWidth: finaleMaxWidth, maxHeight: '64vh', overflowY: 'auto', marginTop: 24 }}>
        {groups.flatMap((g, gi) => g.teams.map(t => {
          const combined = ((t.a.rating ?? 0) + (t.b.rating ?? 0)).toFixed(2)
          return (
            <div key={t.label} style={{ border: `1px solid ${colorFor(gi)}`, borderRadius: 9, padding: '11px 13px', boxShadow: `0 0 12px ${colorFor(gi)}22`, animation: 'slideUp 0.4s ease both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: colorFor(gi) }}>{t.label}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#555' }}>{combined}</div>
              </div>
              <div style={{ marginBottom: 2 }}>
                {t.a.club && <div style={{ fontSize: 10, color: '#555', fontWeight: 400 }}>{t.a.club}</div>}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4 }}>{t.a.name}</span>
                  <RatingBadge rating={t.a.rating} fontSize={11} />
                </div>
              </div>
              <div>
                {t.b.club && <div style={{ fontSize: 10, color: '#555', fontWeight: 400 }}>{t.b.club}</div>}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4 }}>{t.b.name}</span>
                  <RatingBadge rating={t.b.rating} fontSize={11} />
                </div>
              </div>
            </div>
          )
        }))}
      </div>
      <button onClick={onPublish} disabled={publishing} className="btn-cta" style={{ marginTop: 20, maxWidth: 320 }}>
        {publishing ? '발표 중...' : '결과 발표 ✓'}
      </button>
    </div>
  )
}
