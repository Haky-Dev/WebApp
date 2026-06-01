'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TournamentEvent } from '@/lib/types'

export default function HomePage() {
  const router = useRouter()
  const [events, setEvents] = useState<TournamentEvent[]>([])
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(setEvents)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreating(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    })
    setCreating(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error)
      return
    }
    const event = await res.json()
    router.push(`/events/${event.id}`)
  }

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8">Tournament Draft</h1>

      <form onSubmit={handleCreate} className="mb-10 p-4 border rounded-lg space-y-3">
        <h2 className="font-semibold text-lg">새 이벤트 만들기</h2>
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="이벤트 이름"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="관리자 PIN (4자리 이상)"
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          required
          minLength={4}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {creating ? '생성 중...' : '이벤트 생성'}
        </button>
      </form>

      <h2 className="font-semibold text-lg mb-3">이벤트 목록</h2>
      {events.length === 0 && <p className="text-gray-400">이벤트가 없습니다.</p>}
      <ul className="space-y-2">
        {events.map(ev => (
          <li key={ev.id}>
            <button
              onClick={() => router.push(`/events/${ev.id}`)}
              className="w-full text-left p-3 border rounded hover:bg-gray-50 flex justify-between"
            >
              <span className="font-medium">{ev.name}</span>
              <span className={`text-sm px-2 py-0.5 rounded ${
                ev.status === 'collecting'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {ev.status === 'collecting' ? '수집 중' : '마감'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
