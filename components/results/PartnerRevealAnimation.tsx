'use client'
import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'
import RatingBadge from '@/components/ui/RatingBadge'
import { useClubColors } from '@/hooks/useClubColors'
import ClubBadge from '@/components/ui/ClubBadge'

interface Props {
  partner: Participant
  allNames: string[]
  onEnd: () => void
}

export default function PartnerRevealAnimation({ partner, allNames, onEnd }: Props) {
  const [spinning, setSpinning] = useState(true)
  const [spinName, setSpinName] = useState('...')
  const spinInterval = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clubColors = useClubColors()

  useEffect(() => {
    let speed = 60
    let elapsed = 0
    const totalDuration = 2500

    function tick() {
      setSpinName(allNames[Math.floor(Math.random() * allNames.length)])
      elapsed += speed
      speed = Math.min(speed * 1.08, 600)
      if (elapsed < totalDuration) {
        spinInterval.current = setTimeout(tick, speed)
      } else {
        setSpinName(partner.name)
        setSpinning(false)
        setTimeout(() => {
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#ff2d78', '#39ff14', '#00d4ff'] })
          setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 }, colors: ['#ff2d78', '#39ff14'] }), 400)
          setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 }, colors: ['#00d4ff', '#39ff14'] }), 700)
        }, 300)
      }
    }

    tick()
    return () => { if (spinInterval.current) clearTimeout(spinInterval.current) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#010101',
      color: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      zIndex: 100,
    }}>
      {/* 스캔라인 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
        opacity: 0.3, pointerEvents: 'none',
      }} />

      {/* 앰비언트 글로우 */}
      <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(57,255,20,0.18), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,45,120,0.15), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 32px', width: '100%', maxWidth: 480 }}>
        {/* 라벨 */}
        <div style={{ fontSize: 11, letterSpacing: '3px', fontWeight: 800, color: '#39ff14', textShadow: '0 0 8px #39ff14', marginBottom: 32, textTransform: 'uppercase' }}>
          내 파트너
        </div>

        {/* 스핀 이름 */}
        <div style={{
          fontSize: 40, fontWeight: 900,
          color: spinning ? '#555' : '#39ff14',
          textShadow: spinning ? 'none' : '0 0 16px #39ff14, 0 0 32px rgba(57,255,20,0.5)',
          transition: 'color 0.3s, text-shadow 0.3s',
          minHeight: '3rem',
          letterSpacing: '-1px',
          marginBottom: 16,
        }}>
          {spinName}
        </div>

        {/* 파트너 정보 (공개 후) */}
        {!spinning && (
          <div style={{ marginBottom: 40, animation: 'fadeIn 0.4s ease both' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#555', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {partner.club && <><ClubBadge name={partner.club} color={clubColors.get(partner.club)} fontSize={13} fontWeight={700} /><span>·</span></>}
              레이팅 <RatingBadge rating={partner.rating} fontSize={13} />
            </div>
          </div>
        )}

        {/* 확인 버튼 (공개 후) */}
        {!spinning && (
          <button
            onClick={onEnd}
            className="btn-cta"
            style={{ animation: 'fadeIn 0.4s ease 0.3s both' }}
          >
            파트너 확인 ✓
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
