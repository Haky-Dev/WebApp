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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">이름 *</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="홍길동"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">동호회 (선택)</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={club}
          onChange={e => setClub(e.target.value)}
          placeholder="한강다트클럽"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">레이팅 (0.00 ~ 30.00) *</label>
        <input
          className="w-full border rounded px-3 py-2"
          type="number"
          min="0"
          max="30"
          step="0.01"
          value={rating}
          onChange={e => setRating(e.target.value)}
          placeholder="15.00"
          required
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? '등록 중...' : '등록하기'}
      </button>
    </form>
  )
}
