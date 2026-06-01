'use client'
import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { Participant } from '@/lib/types'

interface Props {
  pairs: { a: Participant; b: Participant }[]
  onEnd: () => void
}

type Phase = 'drumroll' | 'finale'

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
    return () => {
      if (spinInterval.current) clearTimeout(spinInterval.current)
    }
  }, [])

  function runDrumroll(teamIdx: number) {
    if (teamIdx >= pairs.length) {
      setPhase('finale')
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } })
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 } }), 400)
        setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 } }), 700)
      }, 300)
      return
    }

    setCurrentTeam(teamIdx)
    setSpinning(true)
    setSpinName('...')

    let speed = 60
    let elapsed = 0
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
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center">
      {phase === 'drumroll' && (
        <div className="text-center space-y-8 px-6">
          <p className="text-gray-400 text-lg">
            팀 {currentTeam + 1} / {pairs.length} 배정 중...
          </p>
          <div className="space-y-4">
            <div className="text-3xl font-bold text-blue-300">
              {pairs[currentTeam]?.a.name}
            </div>
            <div className="text-2xl text-gray-400">+</div>
            <div
              className={`text-3xl font-bold transition-all ${
                spinning ? 'text-yellow-300 opacity-70' : 'text-green-300 scale-110'
              }`}
              style={{ minHeight: '2.5rem' }}
            >
              {spinName}
            </div>
          </div>
          {revealedPairs.length > 0 && (
            <div className="text-sm text-gray-500 space-y-1">
              {revealedPairs.map((p, i) => (
                <div key={i}>팀{i + 1}: {p.a.name} + {p.b.name}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'finale' && (
        <div className="w-full max-w-lg px-6 space-y-4">
          <h2 className="text-center text-2xl font-bold mb-6">
            🎉 Tournament Draft — 오늘의 파트너
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[60vh]">
            {pairs.map((p, i) => (
              <div
                key={i}
                className="bg-white/10 rounded-xl px-5 py-4 flex justify-between items-center"
                style={{
                  animation: `slideUp 0.4s ease ${i * 0.1}s both`,
                }}
              >
                <div>
                  <span className="text-gray-400 text-xs">팀 {i + 1}</span>
                  <div className="font-semibold">{p.a.name} <span className="text-gray-400">+</span> {p.b.name}</div>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  {p.a.rating.toFixed(2)}<br />{p.b.rating.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onEnd}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold"
          >
            결과 페이지로 이동
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
