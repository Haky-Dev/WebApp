'use client'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import RatingBadge from '@/components/ui/RatingBadge'
import { useClubColors } from '@/hooks/useClubColors'
import ClubBadge from '@/components/ui/ClubBadge'

interface Props {
  pairs: { a: Participant; b: Participant }[]
  onEnd: () => void
}

type Phase = 'drumroll' | 'finale'
type SpinState = 'idle' | 'spinning' | 'locked'

const ITEM_H = 60
const VISIBLE = 5
const CENTER = Math.floor(VISIBLE / 2)
const SPIN_BEFORE = 22
const SPIN_DUR = 2800

const TEAM_COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const TEAM_COLORS_RGBA = [
  'rgba(255, 45, 120, 0.13)',
  'rgba(57, 255, 20, 0.13)',
  'rgba(0, 212, 255, 0.13)',
]
function teamColor(i: number) { return TEAM_COLORS[i % TEAM_COLORS.length] }
function teamColorRgba(i: number) { return TEAM_COLORS_RGBA[i % TEAM_COLORS_RGBA.length] }

export default function AssignmentAnimation({ pairs, onEnd }: Props) {
  const isDesktop = useIsDesktop()
  const clubColors = useClubColors()
  const [phase, setPhase] = useState<Phase>('drumroll')
  const [currentTeam, setCurrentTeam] = useState(0)
  const [spinState, setSpinState] = useState<SpinState>('idle')
  const [reelItems, setReelItems] = useState<string[]>([])
  const [spinTrigger, setSpinTrigger] = useState<{ teamIdx: number } | null>(null)
  const [revealedPairs, setRevealedPairs] = useState<typeof pairs>([])
  const reelRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pairsRef = useRef(pairs)

  const names = pairs.map(p => p.b.name)

  function buildReel(target: string): string[] {
    const pool = names.length > 1 ? [...names] : [target, target, target]
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const before: string[] = Array.from({ length: SPIN_BEFORE }, (_, i) => pool[i % pool.length])
    const after: string[] = Array.from({ length: 2 }, () => pool[Math.floor(Math.random() * pool.length)])
    return [...before, target, ...after]
  }

  function translateY(tIdx: number) {
    return -(tIdx - CENTER) * ITEM_H
  }

  function finale() {
    setPhase('finale')
    timerRef.current = setTimeout(() => {
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#ff2d78', '#39ff14', '#00d4ff'] })
      setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 } }), 400)
      setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 } }), 700)
    }, 300)
  }

  function startTeam(teamIdx: number) {
    if (timerRef.current) clearTimeout(timerRef.current)
    const allPairs = pairsRef.current
    if (teamIdx >= allPairs.length) { finale(); return }

    const items = buildReel(allPairs[teamIdx].b.name)
    setCurrentTeam(teamIdx)
    setSpinState('idle')
    setReelItems(items)
    setSpinTrigger({ teamIdx })
  }

  // Fires after reelItems renders — applies CSS animation directly on DOM
  useEffect(() => {
    if (!spinTrigger) return
    const el = reelRef.current
    if (!el) return

    const { teamIdx } = spinTrigger
    setSpinTrigger(null)

    // Reset reel position without transition
    el.style.transition = 'none'
    el.style.transform = 'translateY(0px)'
    el.getBoundingClientRect() // force reflow

    // Start spin
    setSpinState('spinning')
    el.style.transition = `transform ${SPIN_DUR}ms cubic-bezier(0.15, 0, 0.05, 1)`
    el.style.transform = `translateY(${translateY(SPIN_BEFORE)}px)`

    timerRef.current = setTimeout(() => {
      setSpinState('locked')
      setRevealedPairs(prev => [...prev, pairsRef.current[teamIdx]])
      timerRef.current = setTimeout(() => startTeam(teamIdx + 1), 1500)
    }, SPIN_DUR + 100)
  }, [spinTrigger])

  useEffect(() => {
    timerRef.current = setTimeout(() => startTeam(0), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const REEL_H = ITEM_H * VISIBLE
  const CARD_ZONE_H = isDesktop ? 110 : 80

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#010101',
      color: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
        opacity: 0.3, pointerEvents: 'none', zIndex: 0,
      }} />

      {phase === 'drumroll' && (
        <>
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.15), transparent 70%)', pointerEvents: 'none' }} />

          {/* 팀 카운터: 소형 고정 상단 영역 */}
          <div style={{ height: isDesktop ? 48 : 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', textTransform: 'uppercase' }}>
              TEAM {String(currentTeam + 1).padStart(2, '0')} / {pairs.length}
            </div>
          </div>

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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start', justifyContent: 'center' }}>
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
        </>
      )}

      {phase === 'finale' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 0%, rgba(255,45,120,0.18), transparent 50%), radial-gradient(ellipse at 10% 100%, rgba(57,255,20,0.15), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.07), transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: isDesktop ? 900 : 480, padding: '0 24px' }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '2px', marginBottom: 20, textTransform: 'uppercase' }}>
              배정 완료!
            </div>
            <div style={isDesktop
              ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, overflowY: 'auto', maxHeight: '60vh', marginBottom: 16 }
              : { display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: '60vh', marginBottom: 16 }
            }>
              {pairs.map((p, i) => {
                const combined = ((p.a.rating ?? 0) + (p.b.rating ?? 0)).toFixed(2)
                return (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${teamColor(i)}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                    boxShadow: `0 0 12px ${teamColorRgba(i)}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: teamColor(i), textShadow: `0 0 8px ${teamColor(i)}` }}>
                        팀 {i + 1}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>합산 {combined}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        {p.a.club && <ClubBadge name={p.a.club} color={clubColors.get(p.a.club)} fontSize={11} />}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: '#f1f5f9' }}>{p.a.name}</span>
                          <RatingBadge rating={p.a.rating} fontSize={12} />
                        </div>
                      </div>
                      <span style={{ color: '#444', fontWeight: 700, flexShrink: 0 }}>×</span>
                      <div style={{ flex: 1 }}>
                        {p.b.club && <ClubBadge name={p.b.club} color={clubColors.get(p.b.club)} fontSize={11} />}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: '#f1f5f9' }}>{p.b.name}</span>
                          <RatingBadge rating={p.b.rating} fontSize={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={onEnd} className="btn-cta">
              결과 페이지로 이동
            </button>
          </div>
        </>
      )}
    </div>
  )
}
