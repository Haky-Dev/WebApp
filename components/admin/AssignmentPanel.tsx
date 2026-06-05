'use client'
import { useEffect, useState } from 'react'
import type { Participant, EventStatus, Club } from '@/lib/types'
import type { DrawnGroup } from '@/lib/algorithms/group-draw'

interface Props {
  token: string
  eventId: string
  eventStatus: EventStatus
  onAssignStart: (pairs: { a: Participant; b: Participant }[]) => void
  onGroupDrawStart: (groups: DrawnGroup[]) => void
  onReset: () => void
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function GroupSizePreview({ total, teamsPerGroup, excludeId, tempName, tempRating }: {
  total: number
  teamsPerGroup: number
  excludeId: string
  tempName: string
  tempRating: string
}) {
  let n = total
  if (n % 2 !== 0) {
    if (excludeId) n -= 1
    else if (tempName && tempRating && !isNaN(parseFloat(tempRating))) n += 1
  }

  if (n < 2 || n % 2 !== 0) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 20 }}>
          {total % 2 !== 0 ? '홀수 인원 — 조정 후 미리보기' : ''}
        </p>
      </div>
    )
  }

  const groupSize = teamsPerGroup * 2
  const fullGroups = Math.floor(n / groupSize)
  const remainder = n % groupSize
  const groups: { letter: string; teams: number }[] = []
  let idx = 0
  if (remainder > 0) groups.push({ letter: LETTERS[idx++], teams: remainder / 2 })
  for (let g = 0; g < fullGroups; g++) groups.push({ letter: LETTERS[idx++], teams: teamsPerGroup })

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
        미리보기 · {groups.length}개 그룹
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {groups.map(({ letter, teams }) => (
          <div key={letter} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
          }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--accent)' }}>그룹 {letter}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              {teams}팀 · {teams * 2}명
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AssignmentPanel({ token, eventId, eventStatus, onAssignStart, onGroupDrawStart, onReset }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [algorithm, setAlgorithm] = useState<'snake' | 'group-draw'>('snake')
  const [teamsPerGroup, setTeamsPerGroup] = useState(6)
  const [excludeId, setExcludeId] = useState<string>('')
  const [tempName, setTempName] = useState('')
  const [tempClub, setTempClub] = useState('')
  const [tempRating, setTempRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clubs, setClubs] = useState<Club[]>([])
  useEffect(() => {
    fetch('/api/clubs').then(r => r.json()).then(setClubs)
  }, [])

  useEffect(() => {
    fetch(`/api/participants?eventId=${eventId}`).then(r => r.json()).then(setParticipants)
  }, [eventId])

  const isOdd = participants.length % 2 !== 0

  async function handleAssign() {
    setError('')
    setLoading(true)
    const body: Record<string, unknown> = { algorithm, eventId }
    if (algorithm === 'group-draw') body.teamsPerGroup = teamsPerGroup
    if (excludeId) body.excludeId = excludeId
    if (tempName) body.tempParticipant = { name: tempName, club: tempClub || null, rating: parseFloat(tempRating) }

    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error); setLoading(false); return }
    const data = await res.json()
    setLoading(false)

    if (algorithm === 'group-draw') {
      onGroupDrawStart(data.groups as DrawnGroup[])
      return
    }
    const pairsRes = await fetch(`/api/pairs/${eventId}`)
    const pairsData = await pairsRes.json()
    onAssignStart(pairsData.map((p: { participant_a: Participant; participant_b: Participant }) => ({
      a: p.participant_a,
      b: p.participant_b,
    })))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--bg-surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        참가자 <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{participants.length}명</span>
      </p>

      {isOdd && (
        <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1.5px solid var(--accent-danger)', borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-danger)', marginBottom: 14 }}>⚠ 홀수 인원 — 조정 필요</p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>제외할 참가자 선택</label>
            <select style={inputStyle} value={excludeId} onChange={e => setExcludeId(e.target.value)}>
              <option value="">-- 선택 --</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.rating})</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>또는 임시 참가자 추가</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input style={inputStyle} placeholder="이름"
              value={tempName} onChange={e => { setTempName(e.target.value); setExcludeId('') }} />
            {clubs.length > 0 ? (
              <select style={inputStyle} value={tempClub} onChange={e => setTempClub(e.target.value)}>
                <option value="">— 선택 안 함</option>
                {clubs.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            ) : (
              <input style={inputStyle} placeholder="동호회 (선택)" value={tempClub} onChange={e => setTempClub(e.target.value)} />
            )}
            <input style={inputStyle} placeholder="레이팅" type="number" min="0" max="30" step="0.01"
              value={tempRating} onChange={e => setTempRating(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>배정 방식</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(['snake', 'group-draw'] as const).map(alg => (
            <label key={alg} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="radio" checked={algorithm === alg} onChange={() => setAlgorithm(alg)} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {alg === 'snake' ? '레이팅 순' : '그룹 팀 추첨'}
              </span>
            </label>
          ))}
        </div>
        {algorithm === 'group-draw' && (
          <div style={{ marginTop: 12, marginLeft: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>그룹당 팀수</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setTeamsPerGroup(v => Math.max(2, v - 1))}
                  style={{ width: 36, height: 36, borderRadius: 6, fontSize: 18, fontWeight: 900, cursor: 'pointer', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border)' }}
                >−</button>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', minWidth: 32, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{teamsPerGroup}</span>
                <button
                  onClick={() => setTeamsPerGroup(v => Math.min(20, v + 1))}
                  style={{ width: 36, height: 36, borderRadius: 6, fontSize: 18, fontWeight: 900, cursor: 'pointer', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1.5px solid var(--border)' }}
                >+</button>
              </div>
            </div>
            <GroupSizePreview total={participants.length} teamsPerGroup={teamsPerGroup} excludeId={excludeId} tempName={tempName} tempRating={tempRating} />
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{error}</p>}

      <button
        onClick={handleAssign}
        disabled={loading || (isOdd && !excludeId && !tempName)}
        className="btn-cta"
      >
        {loading ? '배정 중...' : '🎯 파트너 배정 시작'}
      </button>
    </div>
  )
}
