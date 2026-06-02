'use client'
import { useEffect, useState } from 'react'
import type { Participant } from '@/lib/types'

interface Props { token: string; eventId: string }

export default function AdminParticipantPanel({ token, eventId }: Props) {
  const [list, setList] = useState<Participant[]>([])
  const [addName, setAddName] = useState('')
  const [addClub, setAddClub] = useState('')
  const [addRating, setAddRating] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editClub, setEditClub] = useState('')
  const [editRating, setEditRating] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch(`/api/participants?eventId=${eventId}`)
      .then(r => r.json())
      .then(setList)
  }, [eventId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    const res = await fetch('/api/admin/participants', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: addName, club: addClub, rating: parseFloat(addRating) }),
    })
    setAdding(false)
    if (!res.ok) { const d = await res.json(); setAddError(d.error); return }
    const created: Participant = await res.json()
    setList(l => [created, ...l])
    setAddName('')
    setAddClub('')
    setAddRating('')
  }

  function startEdit(p: Participant) {
    setEditingId(p.id)
    setEditClub(p.club ?? '')
    setEditRating(String(p.rating))
  }

  async function handleSave(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/participants/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ club: editClub, rating: parseFloat(editRating) }),
    })
    setSaving(false)
    if (!res.ok) return
    const updated: Participant = await res.json()
    setList(l => l.map(p => p.id === id ? updated : p))
    setEditingId(null)
  }

  async function handleDelete() {
    if (!deleteTargetId) return
    setDeleting(true)
    const res = await fetch(`/api/admin/participants/${deleteTargetId}`, {
      method: 'DELETE',
      headers,
    })
    setDeleting(false)
    if (!res.ok) return
    setList(l => l.filter(p => p.id !== deleteTargetId))
    setDeleteTargetId(null)
  }

  const deleteTarget = list.find(p => p.id === deleteTargetId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 삭제 확인 모달 */}
      {deleteTargetId && (
        <div className="modal-overlay">
          <div className="modal-panel" style={{ borderTop: '2px solid var(--accent-danger)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-danger)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
              ⚠ 참가자 삭제
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
              {deleteTarget?.name}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6, marginBottom: 20 }}>
              이 참가자를 삭제할까요?<br />배정 결과에서도 제거됩니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeleteTargetId(null)}
                disabled={deleting}
                className="btn-ghost"
                style={{ flex: 1 }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 참가자 추가 폼 */}
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input-field"
            style={{ flex: 2 }}
            placeholder="이름"
            value={addName}
            onChange={e => setAddName(e.target.value)}
            required
          />
          <input
            className="input-field"
            style={{ flex: 2, fontWeight: 400 }}
            placeholder="동호회"
            value={addClub}
            onChange={e => setAddClub(e.target.value)}
          />
          <input
            className="input-field"
            style={{ flex: 1, textAlign: 'center' }}
            placeholder="레이팅"
            type="number"
            min="0"
            max="30"
            step="0.01"
            value={addRating}
            onChange={e => setAddRating(e.target.value)}
            required
          />
        </div>
        {addError && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{addError}</p>}
        <button type="submit" disabled={adding} className="btn-secondary" style={{ width: '100%' }}>
          {adding ? '추가 중...' : '+ 참가자 추가'}
        </button>
      </form>

      {/* 참가자 수 */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        참가자 <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{list.length}명</span>
      </p>

      {/* 참가자 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.map(p => (
          <div key={p.id}>
            {editingId === p.id ? (
              /* 수정 모드 */
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid rgba(0,212,255,0.4)',
                borderRadius: 6,
                padding: '12px 13px',
                boxShadow: '0 0 10px rgba(0,212,255,0.08) inset',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '1px', marginBottom: 8 }}>
                  수정 중
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {p.name}{' '}
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>(이름 잠금)</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    className="input-field"
                    style={{ flex: 2, fontWeight: 400, padding: '8px 10px', fontSize: 13 }}
                    placeholder="동호회"
                    value={editClub}
                    onChange={e => setEditClub(e.target.value)}
                  />
                  <input
                    className="input-field"
                    style={{ flex: 1, textAlign: 'center', padding: '8px 10px', fontSize: 13 }}
                    type="number"
                    min="0"
                    max="30"
                    step="0.01"
                    value={editRating}
                    onChange={e => setEditRating(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setEditingId(null)}
                    className="btn-ghost"
                    style={{ flex: 1, padding: '8px' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleSave(p.id)}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '8px',
                      background: 'var(--bg-surface)',
                      border: '1.5px solid var(--neon-cyan)',
                      borderRadius: 6,
                      fontSize: 12, fontWeight: 900,
                      color: 'var(--neon-cyan)',
                      cursor: 'pointer',
                    }}
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              /* 기본 카드 */
              <div
                className="card-surface"
                style={{
                  padding: '10px 13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: editingId && editingId !== p.id ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {p.club || '—'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {p.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                    {p.rating}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => startEdit(p)}
                      disabled={!!editingId}
                      style={{
                        fontSize: 10, fontWeight: 800,
                        color: 'var(--neon-cyan)',
                        background: 'none',
                        border: '1px solid rgba(0,212,255,0.3)',
                        borderRadius: 4,
                        padding: '3px 7px',
                        cursor: 'pointer',
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(p.id)}
                      disabled={!!editingId}
                      style={{
                        fontSize: 10, fontWeight: 800,
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '3px 7px',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
