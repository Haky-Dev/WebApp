'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ExpectedParticipant, Participant } from '@/lib/types'

interface Props { token: string; eventId: string }

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        등록{' '}
        <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{registered.length}명</span>
        {' / '}미등록{' '}
        <span style={{ color: 'var(--accent-danger)', fontWeight: 900 }}>{missing.length}명</span>
      </p>

      {done.length > 0 && (
        <Section label="✓ 등록 완료" color="var(--accent-success)">
          {done.map(p => {
            const reg = registered.find(r => r.name === p.name)
            return (
              <div key={p.id} className="card-surface" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderLeft: '3px solid var(--accent-success)' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{reg?.rating.toFixed(2)}</span>
              </div>
            )
          })}
        </Section>
      )}

      {missing.length > 0 && (
        <Section label="✗ 미등록" color="var(--accent-danger)">
          {missing.map(p => (
            <div key={p.id} className="card-surface" style={{ padding: '10px 14px', borderLeft: '3px solid var(--accent-danger)' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</span>
            </div>
          ))}
        </Section>
      )}

      {extra.length > 0 && (
        <Section label="＋ 명단 외 등록" color="var(--neon-cyan)">
          {extra.map(p => (
            <div key={p.id} className="card-surface" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderLeft: '3px solid var(--neon-cyan)' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}{p.club ? ` (${p.club})` : ''}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{p.rating.toFixed(2)}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
