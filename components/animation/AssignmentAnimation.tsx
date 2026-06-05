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
  const hasBottomCards = revealedPairs.length > 0
  const BOTTOM_H = isDesktop ? 130 : 80

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
          {/* 상단 스페이서: 하단 카드 영역과 동일한 높이로 슬롯 머신을 수직 중앙에 고정 */}
          <div style={{ height: BOTTOM_H, flexShrink: 0 }} />

          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.15), transparent 70%)', pointerEvents: 'none' }} />

          {/* 슬롯 머신 영역: flex:1로 나머지 공간 차지하며 중앙 정렬 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{
            textAlign: 'center',
            padding: '0 24px',
            maxWidth: isDesktop ? 560 : 400,
            width: '100%',
          }}>
            {/* Team counter */}
            <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', marginBottom: 20, textTransform: 'uppercase' }}>
              TEAM {String(currentTeam + 1).padStart(2, '0')} / {pairs.length}
            </div>

            {/* 퍼스트 player */}
            <div style={{ fontSize: 'clamp(24px, 4vw, 48px)', fontWeight: 900, color: '#f1f5f9', textShadow: '0 0 20px rgba(255,255,255,0.2)', marginBottom: 2 }}>
              {pairs[currentTeam]?.a.name}
            </div>
            <div style={{ fontSize: 12, color: '#555', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
              {pairs[currentTeam]?.a.club && (
                <><ClubBadge name={pairs[currentTeam].a.club!} color={clubColors.get(pairs[currentTeam].a.club!)} fontSize={12} fontWeight={700} /><span>·</span></>
              )}
              {pairs[currentTeam] && <RatingBadge rating={pairs[currentTeam].a.rating} fontSize={12} />}
            </div>

            <div style={{ fontSize: 13, color: '#333', fontWeight: 700, marginBottom: 14 }}>+</div>

            {/* Slot machine reel */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: 300,
              margin: '0 auto',
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
              {/* Center focus highlight */}
              <div style={{
                position: 'absolute',
                top: ITEM_H * CENTER,
                left: 0, right: 0,
                height: ITEM_H,
                background: spinState === 'locked' ? 'rgba(57,255,20,0.06)' : 'rgba(255,255,255,0.02)',
                borderTop: `1px solid ${spinState === 'locked' ? 'rgba(57,255,20,0.5)' : '#1a1a1a'}`,
                borderBottom: `1px solid ${spinState === 'locked' ? 'rgba(57,255,20,0.5)' : '#1a1a1a'}`,
                zIndex: 2,
                pointerEvents: 'none',
                transition: 'background 0.4s, border-color 0.4s',
              }} />
              {/* Top/bottom fades */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to bottom, #010101, transparent)', zIndex: 3, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to top, #010101, transparent)', zIndex: 3, pointerEvents: 'none' }} />

              {/* Reel inner */}
              <div ref={reelRef}>
                {reelItems.map((name, i) => (
                  <div key={i} style={{
                    height: ITEM_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(20px, 3vw, 30px)',
                    fontWeight: 900,
                    color: spinState === 'locked' && i === SPIN_BEFORE ? '#39ff14' : '#e2e8f0',
                    textShadow: spinState === 'locked' && i === SPIN_BEFORE
                      ? '0 0 20px #39ff14, 0 0 40px rgba(57,255,20,0.4)'
                      : 'none',
                    animation: spinState === 'locked' && i === SPIN_BEFORE ? 'spinBounce 0.3s ease both' : 'none',
                    transition: 'color 0.3s, text-shadow 0.3s',
                    userSelect: 'none',
                    letterSpacing: '-0.5px',
                  }}>
                    {name}
                  </div>
                ))}
              </div>
            </div>

            {/* Locked: show B player info */}
            {spinState === 'locked' && pairs[currentTeam] && (
              <div style={{
                fontSize: 12, color: '#555', fontWeight: 700,
                marginTop: 8,
                display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap',
                animation: 'slideUp 0.3s ease both',
              }}>
                {pairs[currentTeam].b.club && (
                  <><ClubBadge name={pairs[currentTeam].b.club!} color={clubColors.get(pairs[currentTeam].b.club!)} fontSize={12} fontWeight={700} /><span>·</span></>
                )}
                <RatingBadge rating={pairs[currentTeam].b.rating} fontSize={12} />
              </div>
            )}
          </div>
          </div>{/* 슬롯 머신 영역 끝 */}

          {/* 하단 카드 영역: 항상 BOTTOM_H 높이를 유지해 레이아웃 이동 없음 */}
          <div style={{
            height: BOTTOM_H,
            flexShrink: 0,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
            zIndex: 10,
          }}>
            {hasBottomCards && (
              <div style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                justifyContent: 'center',
                width: '100%',
              }}>
                {revealedPairs.map((p, i) => {
                  const combined = ((p.a.rating ?? 0) + (p.b.rating ?? 0)).toFixed(2)
                  return (
                    <div key={i} style={{
                      flexShrink: 0,
                      background: `linear-gradient(135deg, rgba(10,10,10,0.95), ${teamColorRgba(i)})`,
                      border: `1px solid ${teamColor(i)}25`,
                      borderRadius: 10,
                      padding: isDesktop ? '18px 26px' : '10px 14px',
                      minWidth: isDesktop ? 320 : 170,
                      animation: 'slideUp 0.4s ease both',
                    }}>
                      <div style={{ fontSize: isDesktop ? 14 : 11, fontWeight: 800, color: teamColor(i), letterSpacing: '2px', marginBottom: isDesktop ? 8 : 4 }}>
                        팀 {i + 1}
                      </div>
                      <div style={{ fontSize: isDesktop ? 30 : 16, fontWeight: 900, color: '#f1f5f9', whiteSpace: 'nowrap', letterSpacing: '-1px' }}>
                        {p.a.name} <span style={{ color: '#333', margin: isDesktop ? '0 6px' : '0 3px', fontWeight: 700 }}>×</span> {p.b.name}
                      </div>
                      <div style={{ fontSize: isDesktop ? 13 : 10, color: '#444', marginTop: isDesktop ? 6 : 3 }}>
                        합산 {combined}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>{/* 하단 카드 영역 끝 */}
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
