'use client'
import { useState } from 'react'
import type { Participant } from '@/lib/types'

interface Props {
  eventId: string
  onSuccess: (participant: Participant) => void
}

export default function RegistrationForm({ eventId, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [club, setClub] = useState('')
  const [rating, setRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, name, club, rating: parseFloat(rating) }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      return
    }
    const participant = await res.json()
    onSuccess(participant)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className="field-label">이름 *</label>
        <input
          className="input-field"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="김위로"
          required
        />
      </div>
      <div>
        <label className="field-label" style={{ color: 'var(--text-muted)' }}>동호회 (선택)</label>
        <input
          className="input-field"
          value={club}
          onChange={e => setClub(e.target.value)}
          placeholder="위로"
        />
      </div>
      <div>
        <label className="field-label">레이팅 (0.00 ~ 30.00) *</label>
        <input
          className="input-field"
          type="number"
          min="0"
          max="30"
          step="0.01"
          value={rating}
          onChange={e => setRating(e.target.value)}
          placeholder="10.00"
          required
        />
      </div>
      {error && <p style={{ color: 'var(--accent-danger)', fontSize: 12, fontWeight: 700 }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn-cta">
        {loading ? '등록 중...' : '등록하기'}
      </button>
    </form>
  )
}
