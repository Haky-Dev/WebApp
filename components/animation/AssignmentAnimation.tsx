'use client'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'

interface Props {
  pairs: { a: Participant; b: Participant }[]
  onEnd: () => void
}

type Phase = 'drumroll' | 'finale'

const TEAM_COLORS = ['#ff2d78', '#39ff14', '#00d4ff']

function teamColor(i: number) {
  return TEAM_COLORS[i % TEAM_COLORS.length]
}

export default function AssignmentAnimation({ pairs, onEnd }: Props) {
  const [phase, setPhase] = useState<Phase>('drumroll')
  const [currentTeam, setCurrentTeam] = useState(0)
  const [spinning, setSpinning] = useState(true)
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
    setSpinning(true)
    setSpinName('...')

    let speed = 60, elapsed = 0
    const totalDuration = 2000 + teamIdx * 200

    function tick() {
      setSpinName(names[Math.floor(Math.random() * names.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      if (elapsed < totalDuration) {
        spinInterval.current = setTimeout(tick, speed)
      } else {
        setSpinName(pairs[teamIdx].b.name)
        setSpinning(false)
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
          {/* ambient glow */}
          <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.18), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,45,120,0.15), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', marginBottom: 24, textTransform: 'uppercase' }}>
              TEAM {String(currentTeam + 1).padStart(2, '0')} / {pairs.length}
            </div>

            <div style={{ fontSize: 30, fontWeight: 900, color: '#f1f5f9', textShadow: '0 0 20px rgba(255,255,255,0.2)', marginBottom: 12 }}>
              {pairs[currentTeam]?.a.name}
            </div>
            <div style={{ fontSize: 16, color: '#444', fontWeight: 700, marginBottom: 12 }}>+</div>
            <div style={{
              fontSize: 30, fontWeight: 900,
              color: spinning ? '#555' : '#39ff14',
              textShadow: spinning ? 'none' : '0 0 14px #39ff14, 0 0 30px rgba(57,255,20,0.5)',
              transition: 'color 0.2s, text-shadow 0.2s',
              minHeight: '2.5rem',
            }}>
              {spinName}
            </div>

            {revealedPairs.length > 0 && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #111' }}>
                {revealedPairs.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#333', fontWeight: 700, marginBottom: 4 }}>
                    팀{i + 1}: {p.a.name} + {p.b.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {phase === 'finale' && (
        <>
          {/* 3색 ambient glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 0%, rgba(255,45,120,0.18), transparent 50%), radial-gradient(ellipse at 10% 100%, rgba(57,255,20,0.15), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.07), transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, padding: '0 24px' }}>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '2px', marginBottom: 20, textTransform: 'uppercase' }}>
              배정 완료!
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: '60vh', marginBottom: 16 }}>
              {pairs.map((p, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${teamColor(i)}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                    boxShadow: `0 0 12px ${teamColor(i)}22`,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: teamColor(i), textShadow: `0 0 8px ${teamColor(i)}`, marginBottom: 5 }}>
                    팀 {i + 1}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9' }}>
                      {p.a.name} <span style={{ color: '#444' }}>×</span> {p.b.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#555', fontWeight: 700, textAlign: 'right' }}>
                      {p.a.rating}<br />{p.b.rating}
                    </div>
                  </div>
                </div>
              ))}
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
