'use client'
import { useState } from 'react'

interface Props {
  eventId: string
  onSuccess: (token: string) => void
}

export default function AdminPinModal({ eventId, onSuccess }: Props) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-80 space-y-4">
        <h2 className="font-bold text-lg text-center">관리자 인증</h2>
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="PIN 입력"
          value={pin}
          onChange={e => setPin(e.target.value)}
          autoFocus
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? '확인 중...' : '확인'}
        </button>
      </form>
    </div>
  )
}
