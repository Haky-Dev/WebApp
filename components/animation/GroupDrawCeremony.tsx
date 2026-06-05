'use client'
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type { DrawnGroup } from '@/lib/algorithms/group-draw'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import RatingBadge from '@/components/ui/RatingBadge'
import { useClubColors } from '@/hooks/useClubColors'
import ClubBadge from '@/components/ui/ClubBadge'

interface Props {
  groups: DrawnGroup[]
  publishing: boolean
  onPublish: () => void
}

type Stage = 'grid' | 'draw' | 'finale'
type Phase = 'idle' | 'spinning' | 'locked'

const COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const colorFor = (i: number) => COLORS[i % COLORS.length]

const ITEM_H = 60
const VISIBLE = 5
const CENTER = Math.floor(VISIBLE / 2)
const SPIN_BEFORE = 18
const SPIN_DUR = 2200

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

const PLACEHOLDER_REEL = Array.from({ length: VISIBLE }, (_, i) => i === CENTER ? '?' : '')

export default function GroupDrawCeremony({ groups, publishing, onPublish }: Props) {
  const isDesktop = useIsDesktop()
  const clubColors = useClubColors()
  const [stage, setStage] = useState<Stage>('grid')
  const [groupIdx, setGroupIdx] = useState(0)
  const [done, setDone] = useState<boolean[]>(() => groups.map(() => false))
  const [revealCount, setRevealCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [reelItems, setReelItems] = useState<string[]>(PLACEHOLDER_REEL)
  const [spinTrigger, setSpinTrigger] = useState<{ teamIdx: number } | null>(null)
  const reelRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const groupsRef = useRef(groups)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const group = groups[groupIdx]
  const allDone = done.every(Boolean)

  function buildReel(targetName: string, candidates: string[]): string[] {
    const pool = candidates.length > 1 ? [...candidates] : [targetName, targetName, targetName]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const before = Array.from({ length: SPIN_BEFORE }, (_, i) => pool[i % pool.length])
    const after = Array.from({ length: 2 }, () => pool[Math.floor(Math.random() * pool.length)])
    return [...before, targetName, ...after]
  }

  function translateY(tIdx: number) {
    return -(tIdx - CENTER) * ITEM_H
  }

  function openGroup(idx: number) {
    setGroupIdx(idx)
    setRevealCount(0)
    setPhase('idle')
    setReelItems(PLACEHOLDER_REEL)
    setSpinTrigger(null)
    setStage('draw')
  }

  function startSpin() {
    if (phase !== 'idle') return
    const g = groupsRef.current[groupIdx]
    const team = g.teams[revealCount]
    if (!team) return

    const candidates = g.teams.map(t => t.b.name)
    const items = buildReel(team.b.name, candidates)
    setPhase('spinning')
    setReelItems(items)
    setSpinTrigger({ teamIdx: revealCount })
  }

  // Fires after reelItems renders
  useEffect(() => {
    if (!spinTrigger) return
    const el = reelRef.current
    if (!el) return

    const { teamIdx } = spinTrigger
    setSpinTrigger(null)

    el.style.transition = 'none'
    el.style.transform = 'translateY(0px)'
    el.getBoundingClientRect()

    el.style.transition = `transform ${SPIN_DUR}ms cubic-bezier(0.15, 0, 0.05, 1)`
    el.style.transform = `translateY(${translateY(SPIN_BEFORE)}px)`

    timerRef.current = setTimeout(() => {
      setPhase('locked')
      setRevealCount(teamIdx + 1)
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.55 }, colors: COLORS })
    }, SPIN_DUR + 100)
  }, [spinTrigger])

  function proceed() {
    if (phase !== 'locked') return
    const g = groups[groupIdx]

    // Reset reel to placeholder
    const el = reelRef.current
    if (el) {
      el.style.transition = 'none'
      el.style.transform = 'translateY(0px)'
    }

    if (revealCount < g.teams.length) {
      setPhase('idle')
      setReelItems(PLACEHOLDER_REEL)
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
    const revealedTeams = group.teams.slice(0, phase === 'locked' ? revealCount : revealCount)
    const REEL_H = ITEM_H * VISIBLE
    const groupColor = colorFor(groupIdx)
    const CARD_ZONE_H = isDesktop ? 110 : 80

    return (
      <div style={{ ...stageBox, justifyContent: undefined }}>
        <Scan /><Brackets />
        <div style={{ position: 'absolute', top: 26, fontSize: 13, letterSpacing: 4, fontWeight: 800, color: groupColor, textShadow: `0 0 10px ${groupColor}`, textTransform: 'uppercase' }}>
          GROUP {group.letter} · 팀 {teamNo} / {group.teams.length}
        </div>

        {/* 소형 상단 여백 (헤더 absolute와 겹치지 않도록) */}
        <div style={{ height: isDesktop ? 56 : 46, flexShrink: 0 }} />

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start', justifyContent: 'center' }}>
            {revealedTeams.map((t, i) => {
              const combined = ((t.a.rating ?? 0) + (t.b.rating ?? 0)).toFixed(2)
              return (
                <div key={t.label} style={{
                  background: `linear-gradient(135deg, rgba(10,10,10,0.95), ${groupColor}15)`,
                  border: `1px solid ${groupColor}25`,
                  borderRadius: 8,
                  padding: isDesktop ? '14px 18px' : '8px 10px',
                  minWidth: isDesktop ? 200 : 130,
                  animation: 'slideUp 0.4s ease both',
                }}>
                  <div style={{ fontSize: isDesktop ? 13 : 10, fontWeight: 800, color: groupColor, letterSpacing: '2px', marginBottom: isDesktop ? 6 : 3 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: isDesktop ? 20 : 13, fontWeight: 900, color: '#f1f5f9', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
                    {t.a.name} <span style={{ color: '#333', margin: '0 3px', fontWeight: 700 }}>×</span> {t.b.name}
                  </div>
                  <div style={{ fontSize: isDesktop ? 12 : 10, color: '#444', marginTop: isDesktop ? 5 : 2 }}>합산 {combined}</div>
                </div>
              )
            })}
          </div>
        </div>
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
                {t.a.club && <ClubBadge name={t.a.club} color={clubColors.get(t.a.club)} fontSize={10} />}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.4 }}>{t.a.name}</span>
                  <RatingBadge rating={t.a.rating} fontSize={11} />
                </div>
              </div>
              <div>
                {t.b.club && <ClubBadge name={t.b.club} color={clubColors.get(t.b.club)} fontSize={10} />}
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
