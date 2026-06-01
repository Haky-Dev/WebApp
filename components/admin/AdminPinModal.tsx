'use client'
import { useState } from 'react'

interface Props {
  eventId: string
  onSuccess: (token: string) => void
  onCancel?: () => void
}

export default function AdminPinModal({ eventId, onSuccess, onCancel }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, pin }),
    })
    setLoading(false)
    if (!res.ok) { setError('PIN이 올바르지 않습니다.'); return }
    const { token } = await res.json()
    onSuccess(token)
  }

  return (
    <div className="modal-overlay">
      <form onSubmit={handleSubmit} className="modal-panel" style={{ borderTop: '2px solid var(--neon-green)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>
          🔒 주최자 인증
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 18 }}>
          PIN 번호를 입력하세요
        </div>
        <label className="field-label">PIN</label>
        <input
          type="password"
          className="input-field"
          style={{ marginBottom: 12, letterSpacing: '6px' }}
          placeholder="••••"
          value={pin}
          onChange={e => setPin(e.target.value)}
          autoFocus
        />
        {error && (
          <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</p>
        )}
        <button type="submit" disabled={loading} className="btn-cta" style={{ marginBottom: onCancel ? 10 : 0 }}>
          {loading ? '확인 중...' : '확인'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost" style={{ width: '100%' }}>
            취소
          </button>
        )}
      </form>
    </div>
  )
}
