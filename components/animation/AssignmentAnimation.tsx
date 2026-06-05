'use client'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'
import { useIsDesktop } from '@/hooks/useIsDesktop'

interface Props {
  pairs: { a: Participant; b: Participant }[]
  onEnd: () => void
}

type Phase = 'drumroll' | 'finale'
type SpinPhase = 'idle' | 'fast' | 'slow' | 'locked'

const TEAM_COLORS = ['#ff2d78', '#39ff14', '#00d4ff']
const TEAM_COLORS_RGBA = [
  'rgba(255, 45, 120, 0.13)',
  'rgba(57, 255, 20, 0.13)',
  'rgba(0, 212, 255, 0.13)',
]
function teamColor(i: number) { return TEAM_COLORS[i % TEAM_COLORS.length] }
function teamColorRgba(i: number) { return TEAM_COLORS_RGBA[i % TEAM_COLORS_RGBA.length] }

function participantLabel(p: Participant): string {
  const club = p.club ? `${p.club} ` : ''
  return `${club}${p.name} (${p.rating})`
}

export default function AssignmentAnimation({ pairs, onEnd }: Props) {
  const isDesktop = useIsDesktop()
  const [phase, setPhase] = useState<Phase>('drumroll')
  const [currentTeam, setCurrentTeam] = useState(0)
  const [spinPhase, setSpinPhase] = useState<SpinPhase>('idle')
  const [spinName, setSpinName] = useState('...')
  const [revealedPairs, setRevealedPairs] = useState<typeof pairs>([])
  const spinInterval = useRef<ReturnType<typeof setTimeout> | null>(null)

  const names = pairs.map(p => p.b.name)

  useEffect(() => {
    runDrumroll(0)
    return () => { if (spinInterval.current) clearTimeout(spinInterval.current) }
  }, [])

  function runDrumroll(teamIdx: number) {
    if (teamIdx >= pairs.length) {
      setPhase('finale')
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#ff2d78', '#39ff14', '#00d4ff'] })
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 }, colors: ['#ff2d78', '#39ff14'] }), 400)
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 }, colors: ['#00d4ff', '#39ff14'] }), 700)
      }, 300)
      return
    }

    setCurrentTeam(teamIdx)
    setSpinPhase('fast')
    setSpinName('...')

    let speed = 60, elapsed = 0
    const totalDuration = 2000 + teamIdx * 200

    function tick() {
      setSpinName(names[Math.floor(Math.random() * names.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      setSpinPhase(speed < 250 ? 'fast' : 'slow')
      if (elapsed < totalDuration) {
        spinInterval.current = setTimeout(tick, speed)
      } else {
        setSpinName(pairs[teamIdx].b.name)
        setSpinPhase('locked')
        setRevealedPairs(prev => [...prev, pairs[teamIdx]])
        setTimeout(() => runDrumroll(teamIdx + 1), 1200)
      }
    }
    tick()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#010101',
      color: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* 스캔라인 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
        opacity: 0.3, pointerEvents: 'none', zIndex: 0,
      }} />

      {phase === 'drumroll' && (
        <>
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.18), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,45,120,0.15), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px', maxWidth: isDesktop ? 700 : 480, width: '100%' }}>
            <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', marginBottom: 24, textTransform: 'uppercase' }}>
              TEAM {String(currentTeam + 1).padStart(2, '0')} / {pairs.length}
            </div>

            {/* 팀A 이름 */}
            <div style={{ fontSize: 'clamp(30px, 4vw, 64px)', fontWeight: 900, color: '#f1f5f9', textShadow: '0 0 20px rgba(255,255,255,0.2)', marginBottom: 4 }}>
              {pairs[currentTeam]?.a.name}
            </div>
            <div style={{ fontSize: 13, color: '#555', fontWeight: 700, marginBottom: 4 }}>
              {pairs[currentTeam]?.a.club
                ? `${pairs[currentTeam].a.club} · ${pairs[currentTeam].a.rating}`
                : String(pairs[currentTeam]?.a.rating ?? '')}
            </div>

            <div style={{ fontSize: 16, color: '#444', fontWeight: 700, margin: '8px 0' }}>+</div>

            {/* 스핀 이름 */}
            <div style={{
              fontSize: 'clamp(30px, 4vw, 64px)', fontWeight: 900,
              color: spinPhase === 'locked' ? '#39ff14' : '#555',
              textShadow: spinPhase === 'locked' ? '0 0 22px #39ff14, 0 0 50px rgba(57,255,20,0.5)' : 'none',
              filter: spinPhase === 'fast' ? 'blur(2px)' : 'blur(0)',
              opacity: spinPhase === 'fast' ? 0.7 : 1,
              animation: spinPhase === 'locked' ? 'spinBounce 0.3s ease both' : 'none',
              transition: 'color 0.2s, text-shadow 0.2s, filter 0.15s, opacity 0.15s',
              minHeight: '2.5rem',
            }}>
              {spinName}
            </div>
            {spinPhase === 'locked' && pairs[currentTeam] && (
              <div style={{ fontSize: 13, color: '#555', fontWeight: 700, marginTop: 4 }}>
                {pairs[currentTeam].b.club
                  ? `${pairs[currentTeam].b.club} · ${pairs[currentTeam].b.rating}`
                  : String(pairs[currentTeam].b.rating)}
              </div>
            )}

            {/* 공개된 팀 목록 */}
            {revealedPairs.length > 0 && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #111' }}>
                {revealedPairs.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#444', fontWeight: 700, marginBottom: 4 }}>
                    팀{i + 1}: {participantLabel(p.a)} × {participantLabel(p.b)}
                  </div>
                ))}
              </div>
            )}
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
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${teamColor(i)}`,
                      borderRadius: 8,
                      padding: '12px 16px',
                      animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                      boxShadow: `0 0 12px ${teamColorRgba(i)}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: teamColor(i), textShadow: `0 0 8px ${teamColor(i)}` }}>
                        팀 {i + 1}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>합산 {combined}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        {p.a.club && <div style={{ fontSize: 11, color: '#555', fontWeight: 400 }}>{p.a.club}</div>}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: '#f1f5f9' }}>{p.a.name}</span>
                          <span style={{ fontSize: 12, color: '#555', fontWeight: 700 }}>{p.a.rating}</span>
                        </div>
                      </div>
                      <span style={{ color: '#444', fontWeight: 700, flexShrink: 0 }}>×</span>
                      <div style={{ flex: 1 }}>
                        {p.b.club && <div style={{ fontSize: 11, color: '#555', fontWeight: 400 }}>{p.b.club}</div>}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: '#f1f5f9' }}>{p.b.name}</span>
                          <span style={{ fontSize: 12, color: '#555', fontWeight: 700 }}>{p.b.rating}</span>
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
