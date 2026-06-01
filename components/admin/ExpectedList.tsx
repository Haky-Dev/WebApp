'use client'
import { useEffect, useState } from 'react'
import type { ExpectedParticipant } from '@/lib/types'

interface Props { token: string; eventId: string }

export default function ExpectedList({ token, eventId }: Props) {
  const [list, setList] = useState<ExpectedParticipant[]>([])
  const [name, setName] = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch('/api/admin/expected', { headers }).then(r => r.json()).then(setList)
  }, [token])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const res = await fetch('/api/admin/expected', {
      method: 'POST', headers,
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const item = await res.json()
      setList(l => [...l, item])
      setName('')
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/expected/${id}`, { method: 'DELETE', headers })
    setList(l => l.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="예상 참가자 이름"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">추가</button>
      </form>
      <p className="text-sm text-gray-500">{list.length}명 등록됨</p>
      <ul className="space-y-2">
        {list.map(p => (
          <li key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span>{p.name}</span>
            <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-500">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
