'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ExpectedParticipant, Participant } from '@/lib/types'

interface Props { token: string; eventId: string }

export default function AttendanceTracker({ token, eventId }: Props) {
  const [expected, setExpected] = useState<ExpectedParticipant[]>([])
  const [registered, setRegistered] = useState<Participant[]>([])

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/admin/expected', { headers }).then(r => r.json()).then(setExpected)
    fetch(`/api/participants?eventId=${eventId}`).then(r => r.json()).then(setRegistered)

    const supabase = createClient()
    const channel = supabase
      .channel(`participants:${eventId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` },
        (payload) => setRegistered(r => [...r, payload.new as Participant])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId, token])

  const registeredNames = new Set(registered.map(p => p.name))
  const done = expected.filter(e => registeredNames.has(e.name))
  const missing = expected.filter(e => !registeredNames.has(e.name))
  const extra = registered.filter(p => !expected.some(e => e.name === p.name))

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        등록 <span className="text-green-600 font-bold">{registered.length}명</span>
        {' / '}미등록 <span className="text-red-500 font-bold">{missing.length}명</span>
      </p>

      {done.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-600 mb-1">✓ 등록 완료</p>
          {done.map(p => {
            const reg = registered.find(r => r.name === p.name)
            return (
              <div key={p.id} className="flex justify-between p-2 bg-green-50 rounded mb-1 text-sm">
                <span>{p.name}</span>
                <span className="text-gray-500">{reg?.rating.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 mb-1">✗ 미등록</p>
          {missing.map(p => (
            <div key={p.id} className="p-2 bg-red-50 rounded mb-1 text-sm">{p.name}</div>
          ))}
        </div>
      )}

      {extra.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-orange-500 mb-1">＋ 명단 외 등록</p>
          {extra.map(p => (
            <div key={p.id} className="flex justify-between p-2 bg-orange-50 rounded mb-1 text-sm">
              <span>{p.name}{p.club ? ` (${p.club})` : ''}</span>
              <span className="text-gray-500">{p.rating.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
