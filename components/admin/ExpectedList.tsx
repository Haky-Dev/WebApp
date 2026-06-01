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
    const res = await fetch('/api/admin/expected', { method: 'POST', headers, body: JSON.stringify({ name }) })
    if (res.ok) { const item = await res.json(); setList(l => [...l, item]); setName('') }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/expected/${id}`, { method: 'DELETE', headers })
    setList(l => l.filter(p => p.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={add} style={{ display: 'flex', gap: 8 }}>
        <input
          className="input-field"
          style={{ flex: 1 }}
          placeholder="예상 참가자 이름"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button type="submit" className="btn-secondary">추가</button>
      </form>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
        {list.length}명 등록됨
      </p>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {list.map(p => (
          <li
            key={p.id}
            className="card-surface"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px' }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</span>
            <button
              onClick={() => remove(p.id)}
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
