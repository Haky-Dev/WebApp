'use client'
import { useEffect, useState } from 'react'
import type { Participant } from '@/lib/types'

interface Props {
  token: string
  eventId: string
  onAssignStart: (pairs: { a: Participant; b: Participant }[]) => void
}

export default function AssignmentPanel({ token, eventId, onAssignStart }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [algorithm, setAlgorithm] = useState<'snake' | 'group-random'>('snake')
  const [groupCount, setGroupCount] = useState<2 | 4>(2)
  const [excludeId, setExcludeId] = useState<string>('')
  const [tempName, setTempName] = useState('')
  const [tempClub, setTempClub] = useState('')
  const [tempRating, setTempRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/participants?eventId=${eventId}`)
      .then(r => r.json()).then(setParticipants)
  }, [eventId])

  const isOdd = participants.length % 2 !== 0

  async function handleAssign() {
    setError('')
    setLoading(true)
    const body: Record<string, unknown> = { algorithm, groupCount }
    if (excludeId) body.excludeId = excludeId
    if (tempName) body.tempParticipant = {
      name: tempName, club: tempClub || null,
      rating: parseFloat(tempRating)
    }

    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      return
    }
    const pairsRes = await fetch(`/api/pairs/${eventId}`)
    const pairsData = await pairsRes.json()
    onAssignStart(pairsData.map((p: { participant_a: Participant; participant_b: Participant }) => ({
      a: p.participant_a,
      b: p.participant_b,
    })))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm">참가자 {participants.length}명</p>

      {isOdd && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm space-y-3">
          <p className="font-semibold text-yellow-700">⚠ 홀수 인원 — 조정 필요</p>
          <div>
            <label className="block text-xs mb-1">제외할 참가자 선택:</label>
            <select className="w-full border rounded px-2 py-1"
              value={excludeId} onChange={e => setExcludeId(e.target.value)}>
              <option value="">-- 선택 --</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.rating})</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-center text-gray-400">또는 임시 참가자 추가:</p>
          <div className="space-y-2">
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="이름"
              value={tempName} onChange={e => { setTempName(e.target.value); setExcludeId('') }} />
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="동호회 (선택)"
              value={tempClub} onChange={e => setTempClub(e.target.value)} />
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="레이팅"
              type="number" min="0" max="30" step="0.01"
              value={tempRating} onChange={e => setTempRating(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2">배정 방식</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={algorithm === 'snake'}
              onChange={() => setAlgorithm('snake')} />
            <span className="text-sm">스네이크 드래프트</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={algorithm === 'group-random'}
              onChange={() => setAlgorithm('group-random')} />
            <span className="text-sm">그룹 랜덤</span>
          </label>
        </div>
        {algorithm === 'group-random' && (
          <div className="mt-3 ml-6">
            <p className="text-xs text-gray-500 mb-1">그룹 수</p>
            <div className="flex gap-2">
              {([2, 4] as const).map(g => (
                <button key={g}
                  onClick={() => setGroupCount(g)}
                  className={`px-4 py-1 rounded text-sm font-bold ${groupCount === g
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'}`}
                >{g}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleAssign}
        disabled={loading || (isOdd && !excludeId && !tempName)}
        className="w-full bg-red-600 text-white py-3 rounded-lg font-bold disabled:opacity-40"
      >
        {loading ? '배정 중...' : '🎯 파트너 배정 시작'}
      </button>
    </div>
  )
}
