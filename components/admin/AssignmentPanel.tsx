'use client'
import { useEffect, useState } from 'react'
import type { Participant, EventStatus } from '@/lib/types'

interface Props {
  token: string
  eventId: string
  eventStatus: EventStatus
  onAssignStart: (pairs: { a: Participant; b: Participant }[]) => void
  onReset: () => void
}

export default function AssignmentPanel({ token, eventId, eventStatus, onAssignStart, onReset }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [algorithm, setAlgorithm] = useState<'snake' | 'group-random'>('snake')
  const [groupCount, setGroupCount] = useState<2 | 4>(2)
  const [excludeId, setExcludeId] = useState<string>('')
  const [tempName, setTempName] = useState('')
  const [tempClub, setTempClub] = useState('')
  const [tempRating, setTempRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch(`/api/participants?eventId=${eventId}`).then(r => r.json()).then(setParticipants)
  }, [eventId])

  const isOdd = participants.length % 2 !== 0

  async function handleAssign() {
    setError('')
    setLoading(true)
    const body: Record<string, unknown> = { algorithm, groupCount }
    if (excludeId) body.excludeId = excludeId
    if (tempName) body.tempParticipant = { name: tempName, club: tempClub || null, rating: parseFloat(tempRating) }

    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    const pairsRes = await fetch(`/api/pairs/${eventId}`)
    const pairsData = await pairsRes.json()
    onAssignStart(pairsData.map((p: { participant_a: Participant; participant_b: Participant }) => ({
      a: p.participant_a,
      b: p.participant_b,
    })))
  }

  async function handleResetConfirm() {
    setResetting(true)
    await onReset()
    setResetting(false)
    setShowResetConfirm(false)
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
      {/* 리셋 확인 모달 */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-panel" style={{ borderTop: '2px solid var(--accent-danger)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-danger)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
              ⚠ 배정 초기화
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
              배정을 초기화할까요?
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 20 }}>
              배정 결과가 삭제되고 다시 배정할 수 있습니다.<br />참가자는 유지됩니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="btn-ghost"
                style={{ flex: 1 }}
              >
                취소
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={resetting}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {resetting ? '초기화 중...' : '초기화'}
              </button>
            </div>
          </div>
        </div>
      )}
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
            <input style={inputStyle} placeholder="동호회 (선택)"
              value={tempClub} onChange={e => setTempClub(e.target.value)} />
            <input style={inputStyle} placeholder="레이팅" type="number" min="0" max="30" step="0.01"
              value={tempRating} onChange={e => setTempRating(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>배정 방식</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(['snake', 'group-random'] as const).map(alg => (
            <label key={alg} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="radio" checked={algorithm === alg} onChange={() => setAlgorithm(alg)} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {alg === 'snake' ? '스네이크 드래프트' : '그룹 랜덤'}
              </span>
            </label>
          ))}
        </div>
        {algorithm === 'group-random' && (
          <div style={{ marginTop: 12, marginLeft: 24 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>그룹 수</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {([2, 4] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupCount(g)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: groupCount === g ? 'var(--accent)' : 'var(--bg-surface)',
                    color: groupCount === g ? '#fff' : 'var(--text-muted)',
                    border: `1.5px solid ${groupCount === g ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
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
      {eventStatus === 'closed' && (
        <button
          onClick={() => setShowResetConfirm(true)}
          style={{
            background: 'none',
            border: '1px solid var(--accent-danger)',
            borderRadius: 6,
            padding: '10px',
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--accent-danger)',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          배정 초기화
        </button>
      )}
    </div>
  )
}
