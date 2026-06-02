'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import RegistrationForm from '@/components/registration/RegistrationForm'
import { useRealtimeEvent } from '@/hooks/useRealtimeEvent'
import type { Participant } from '@/lib/types'

const PARTICIPANT_KEY = 'my_participant_id'

function LogoType() {
  return (
    <span className="text-[11px] font-black tracking-[3px] uppercase">
      <span className="logo-neon-pink">TOUR</span>
      <span className="logo-neon-green">NA</span>
      <span className="logo-neon-cyan">MENT</span>
    </span>
  )
}

function sortParticipants(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => {
    const aClub = a.club ?? ''
    const bClub = b.club ?? ''
    if (!aClub && bClub) return 1
    if (aClub && !bClub) return -1
    if (aClub !== bClub) return aClub.localeCompare(bClub, 'ko')
    if (b.rating !== a.rating) return b.rating - a.rating
    return a.name.localeCompare(b.name, 'ko')
  })
}

function ParticipantCard({ p, myId }: { p: Participant; myId: string | null }) {
  const isMe = !!myId && p.id === myId
  return (
    <div style={{
      background: isMe ? '#0d1a0d' : 'var(--bg-surface)',
      border: isMe ? '1px solid rgba(57,255,20,0.35)' : '1px solid var(--border)',
      borderRadius: 6,
      padding: '10px 13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: isMe ? '0 0 10px rgba(57,255,20,0.07) inset' : 'none',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
          {p.club || '—'}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 800,
          color: isMe ? '#39ff14' : 'var(--text-primary)',
          textShadow: isMe ? '0 0 6px rgba(57,255,20,0.5)' : 'none',
        }}>
          {p.name}{isMe && ' ← 나'}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
        {p.rating}
      </span>
    </div>
  )
}

function ParticipantList({ participants, myId, onRefresh }: {
  participants: Participant[]
  myId: string | null
  onRefresh: () => void
}) {
  const sorted = sortParticipants(participants)
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
          현재 등록:{' '}
          <span style={{ color: 'var(--accent-success)', fontWeight: 900 }}>{participants.length}명</span>
        </span>
        <button
          onClick={onRefresh}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        >
          🔄 새로고침
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(p => (
          <ParticipantCard key={p.id} p={p} myId={myId} />
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const event = useRealtimeEvent(id)
  const [registered, setRegistered] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async () => {
    const res = await fetch(`/api/participants?eventId=${id}`).catch(() => null)
    if (res?.ok) setParticipants(await res.json())
  }

  useEffect(() => {
    setMyId(localStorage.getItem(PARTICIPANT_KEY))
  }, [])

  useEffect(() => {
    if (event?.status === 'closed' && registered) {
      const pid = localStorage.getItem(PARTICIPANT_KEY)
      router.push(`/events/${id}/results${pid ? `?p=${pid}` : ''}`)
    }
  }, [event?.status, registered, id, router])

  useEffect(() => {
    if (!id) return
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id])

  function handleSuccess(participant: Participant) {
    localStorage.setItem(PARTICIPANT_KEY, participant.id)
    setMyId(participant.id)
    setRegistered(true)
    setParticipants(prev => [...prev, participant])
  }

  function startPress() {
    pressTimer.current = setTimeout(() => router.push(`/events/${id}/admin`), 3000)
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  if (!event) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700 }}>불러오는 중...</span>
    </div>
  )

  if (event.status === 'closed' && !registered) {
    return (
      <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 384, width: '100%', padding: '24px', textAlign: 'center' }}>
          <LogoType />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: '12px 0 8px', letterSpacing: '-0.5px' }}>{event.name}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>참가 신청이 마감되었습니다.</p>
          <button className="btn-cta" onClick={() => router.push(`/events/${id}/results`)}>
            결과 보기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-scanline" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 384, margin: '0 auto', padding: '24px' }}>
        <div
          style={{ textAlign: 'center', marginBottom: 30, cursor: 'pointer', userSelect: 'none' }}
          onMouseDown={startPress} onMouseUp={endPress}
          onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress}
        >
          <div style={{ marginBottom: 10 }}><LogoType /></div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 5 }}>
            {event.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>참가 신청</div>
        </div>

        {registered ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12, color: 'var(--accent-success)' }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>등록 완료!</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.6 }}>
              주최자가 배정을 시작하면<br />자동으로 결과가 표시됩니다.
            </p>
            <ParticipantList participants={participants} myId={myId} onRefresh={load} />
          </div>
        ) : (
          <>
            <RegistrationForm eventId={id} onSuccess={handleSuccess} />
            <ParticipantList participants={participants} myId={myId} onRefresh={load} />
          </>
        )}
      </div>
    </main>
  )
}
